import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { bumpGroupWorkoutSignals } from "@/lib/group-repository";
import {
  buildWorkoutSessionDoc,
  firestoreToWorkoutSessionDoc,
  sessionDocToFirestore,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";
import type {
  SessionLine,
  WorkoutSessionDoc,
  WorkoutSessionStatus,
} from "@/lib/workout-types";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { localDateKeyFromMs, resolveWorkoutTitle } from "@/lib/workout-date";

/** Slim row for home / history lists. */
export type SessionSummary = {
  id: string;
  status: Extract<WorkoutSessionStatus, "completed" | "in_progress">;
  workoutDate: string | null;
  workoutTime: string | null;
  title: string;
  planId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  exerciseCount: number;
  setCount: number;
  previewExerciseNames: string[];
};

/** @deprecated Prefer SessionSummary */
export type CompletedSessionSummary = SessionSummary;

export type ExerciseHistoryEntry = {
  sessionId: string;
  sessionTitle: string;
  performedAt: Date;
  workoutDate: string | null;
  line: SessionLine;
};

export type ExerciseHistoryById = Record<string, ExerciseHistoryEntry[]>;

function sessionsCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "sessions");
}

function parseSessionSummary(
  id: string,
  data: Record<string, unknown>,
): SessionSummary | null {
  const status = data.status;
  if (status !== "completed" && status !== "in_progress") return null;
  const workoutDateRaw = data.workoutDate;
  const workoutDate =
    workoutDateRaw == null || workoutDateRaw === ""
      ? null
      : typeof workoutDateRaw === "string" && workoutDateRaw.length === 10
        ? workoutDateRaw
        : null;
  const workoutTimeRaw = data.workoutTime;
  const workoutTime =
    workoutTimeRaw == null || workoutTimeRaw === ""
      ? null
      : typeof workoutTimeRaw === "string"
        ? workoutTimeRaw
        : null;
  const title = data.title;
  const planId = data.planId;
  const startedAt = data.startedAt;
  const endedAt = data.endedAt;
  const exerciseCount = data.exerciseCount;
  const setCount = data.setCount;
  const previewExerciseNames = data.previewExerciseNames;
  if (typeof title !== "string" || title.length === 0) return null;
  if (planId != null && typeof planId !== "string") return null;
  if (!(startedAt instanceof Timestamp)) return null;
  if (status === "completed" && !(endedAt instanceof Timestamp)) return null;
  if (typeof exerciseCount !== "number" || typeof setCount !== "number") {
    return null;
  }
  if (!Array.isArray(previewExerciseNames)) return null;
  const names = previewExerciseNames.filter(
    (x): x is string => typeof x === "string",
  );
  if (names.length !== previewExerciseNames.length) return null;

  return {
    id,
    status,
    workoutDate,
    workoutTime,
    title: title.slice(0, 200),
    planId: planId == null || planId === "" ? null : planId,
    startedAt: startedAt.toDate(),
    endedAt: endedAt instanceof Timestamp ? endedAt.toDate() : null,
    exerciseCount,
    setCount,
    previewExerciseNames: names.slice(0, 5),
  };
}

/**
 * Recent sessions (in progress + completed), newest started first.
 */
export function subscribeRecentSessions(
  onSessions: (sessions: SessionSummary[]) => void,
  options?: { maxDocs?: number },
): () => void {
  const col = sessionsCollectionRef();
  const maxDocs = options?.maxDocs ?? 40;
  if (!col) {
    onSessions([]);
    return () => {};
  }

  const q = query(col, orderBy("startedAt", "desc"), limit(maxDocs));

  return onSnapshot(
    q,
    (snap) => {
      const out: SessionSummary[] = [];
      for (const d of snap.docs) {
        const row = parseSessionSummary(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (row) out.push(row);
      }
      // In-progress first, then by startedAt desc (query already sorts by startedAt)
      out.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "in_progress" ? -1 : 1;
        }
        return b.startedAt.getTime() - a.startedAt.getTime();
      });
      onSessions(out);
    },
    () => {
      onSessions([]);
    },
  );
}

/**
 * Recent completed sessions (newest finished first). Used by the planner calendar.
 */
export function subscribeRecentCompletedSessions(
  onSessions: (sessions: SessionSummary[]) => void,
  options?: { maxDocs?: number },
): () => void {
  const col = sessionsCollectionRef();
  const maxDocs = options?.maxDocs ?? 400;
  if (!col) {
    onSessions([]);
    return () => {};
  }

  const q = query(
    col,
    where("status", "==", "completed"),
    orderBy("endedAt", "desc"),
    limit(maxDocs),
  );

  return onSnapshot(
    q,
    (snap) => {
      const out: SessionSummary[] = [];
      for (const d of snap.docs) {
        const row = parseSessionSummary(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (row && row.status === "completed") out.push(row);
      }
      onSessions(out);
    },
    () => {
      onSessions([]);
    },
  );
}

/**
 * Full completed session docs for progress insights (PRs, volume, day detail).
 */
export function subscribeCompletedSessionsDetailed(
  onSessions: (rows: SavedWorkoutSession[]) => void,
  options?: { maxDocs?: number },
): () => void {
  const col = sessionsCollectionRef();
  const maxDocs = options?.maxDocs ?? 400;
  if (!col) {
    onSessions([]);
    return () => {};
  }

  const q = query(
    col,
    where("status", "==", "completed"),
    orderBy("endedAt", "desc"),
    limit(maxDocs),
  );

  return onSnapshot(
    q,
    (snap) => {
      const out: SavedWorkoutSession[] = [];
      for (const d of snap.docs) {
        const session = firestoreToWorkoutSessionDoc(
          d.data() as Record<string, unknown>,
        );
        if (session && session.status === "completed") {
          out.push({ id: d.id, session });
        }
      }
      onSessions(out);
    },
    () => onSessions([]),
  );
}

/**
 * Load recent completed sets for several exercises with one Firestore query.
 * We scan a bounded recent window so this also works for older session docs
 * that do not have a denormalized exercise-id array.
 */
export async function getExerciseHistories(
  exercises: CatalogExercise[],
  options?: { maxSessions?: number; maxPerExercise?: number },
): Promise<ExerciseHistoryById> {
  const col = sessionsCollectionRef();
  if (!col || exercises.length === 0) return {};

  const maxSessions = options?.maxSessions ?? 80;
  const maxPerExercise = options?.maxPerExercise ?? 10;
  const result: ExerciseHistoryById = Object.fromEntries(
    exercises.map((exercise) => [exercise.id, []]),
  );
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const byNormalizedName = new Map(
    exercises.map((exercise) => [
      `${exercise.metric}:${exercise.name.trim().toLocaleLowerCase()}`,
      exercise,
    ]),
  );

  const snap = await getDocs(
    query(
      col,
      where("status", "==", "completed"),
      orderBy("endedAt", "desc"),
      limit(maxSessions),
    ),
  );

  for (const sessionSnap of snap.docs) {
    const session = firestoreToWorkoutSessionDoc(
      sessionSnap.data() as Record<string, unknown>,
    );
    if (!session || session.status !== "completed") continue;

    for (const line of session.lines) {
      const exercise =
        byId.get(line.exerciseId) ??
        byNormalizedName.get(
          `${line.metric}:${line.nameSnapshot.trim().toLocaleLowerCase()}`,
        );
      if (!exercise) continue;

      const entries = result[exercise.id]!;
      if (entries.length >= maxPerExercise) continue;
      entries.push({
        sessionId: sessionSnap.id,
        sessionTitle: session.title,
        performedAt: session.endedAt ?? session.startedAt,
        workoutDate: session.workoutDate,
        line: {
          ...line,
          sets: line.sets.map((set) => ({ ...set })),
        },
      });
    }
  }

  return result;
}

function normalizeSessionForWrite(draft: WorkoutSessionDoc): WorkoutSessionDoc | null {
  const normalizedLines = draft.lines;
  if (normalizedLines.length === 0 && draft.status !== "in_progress") {
    return null;
  }

  const setCount = normalizedLines.reduce((acc, l) => acc + l.sets.length, 0);
  if (draft.status === "completed" && setCount <= 0) return null;

  const notes = draft.exerciseNotesByLineId;
  const exerciseNotesByLineId =
    notes && Object.keys(notes).length > 0
      ? Object.fromEntries(
          Object.entries(notes).filter(([lineId, text]) =>
            normalizedLines.some((l) => l.lineId === lineId && text.trim()),
          ),
        )
      : null;

  return {
    ...draft,
    title: resolveWorkoutTitle(
      draft.title,
      draft.workoutDate,
      draft.startedAt.getTime(),
    ),
    workoutDate: draft.workoutDate,
    workoutTime: draft.workoutTime,
    lines: normalizedLines,
    exerciseCount: normalizedLines.length,
    setCount,
    previewExerciseNames: normalizedLines
      .slice(0, 3)
      .map((l) => l.nameSnapshot),
    exerciseNotesByLineId:
      exerciseNotesByLineId && Object.keys(exerciseNotesByLineId).length > 0
        ? exerciseNotesByLineId
        : null,
    workoutNote:
      draft.workoutNote && draft.workoutNote.trim()
        ? draft.workoutNote.trim().slice(0, 500)
        : null,
    endedAt: draft.status === "in_progress" ? null : draft.endedAt,
  };
}

/** Create a new in-progress session; returns id + doc. */
export async function createInProgressWorkoutSession(
  snap: ActiveWorkoutFinishSnapshot,
): Promise<{ id: string; doc: WorkoutSessionDoc } | null> {
  const db = getFirestoreDb();
  const user = getFirebaseAuth()?.currentUser;
  if (!db || !user) return null;

  const docData = buildWorkoutSessionDoc(snap, {
    status: "in_progress",
    endedAt: null,
  });
  const normalized = normalizeSessionForWrite(docData);
  if (!normalized) return null;

  const ref = await addDoc(
    collection(db, "users", user.uid, "sessions"),
    sessionDocToFirestore(normalized),
  );
  return { id: ref.id, doc: normalized };
}

/** Upsert full session document (in progress or completed). */
export async function upsertWorkoutSession(
  sessionId: string,
  draft: WorkoutSessionDoc,
): Promise<WorkoutSessionDoc | null> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !sessionId) return null;

  const saved = normalizeSessionForWrite(draft);
  if (!saved) return null;

  await setDoc(
    doc(db, "users", uid, "sessions", sessionId),
    sessionDocToFirestore(saved),
  );
  return saved;
}

/**
 * Persist a completed session. If `sessionId` is set, updates that doc;
 * otherwise creates a new completed doc.
 */
export async function saveCompletedWorkoutSession(
  snap: ActiveWorkoutFinishSnapshot,
  sessionId?: string | null,
): Promise<{ id: string; doc: WorkoutSessionDoc } | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return null;

  const docData = buildWorkoutSessionDoc(snap, {
    status: "completed",
    endedAt: new Date(),
  });
  const normalized = normalizeSessionForWrite(docData);
  if (!normalized) return null;

  let saved: { id: string; doc: WorkoutSessionDoc };
  if (sessionId) {
    await setDoc(
      doc(db, "users", user.uid, "sessions", sessionId),
      sessionDocToFirestore(normalized),
    );
    saved = { id: sessionId, doc: normalized };
  } else {
    const ref = await addDoc(
      collection(db, "users", user.uid, "sessions"),
      sessionDocToFirestore(normalized),
    );
    saved = { id: ref.id, doc: normalized };
  }

  // Best-effort accountability signals — never block the finished workout.
  try {
    const workoutDateKey =
      saved.doc.workoutDate ??
      localDateKeyFromMs(saved.doc.endedAt?.getTime() ?? Date.now());
    await bumpGroupWorkoutSignals({
      workoutDateKey,
      workoutAtMs: saved.doc.endedAt?.getTime() ?? Date.now(),
    });
  } catch {
    /* ignore */
  }

  return saved;
}

export type SavedWorkoutSession = {
  id: string;
  session: WorkoutSessionDoc;
};

/** Load one session by id for the signed-in user. */
export async function getWorkoutSession(
  sessionId: string,
): Promise<SavedWorkoutSession | null> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !sessionId) return null;

  const snap = await getDoc(doc(db, "users", uid, "sessions", sessionId));
  if (!snap.exists()) return null;
  const session = firestoreToWorkoutSessionDoc(
    snap.data() as Record<string, unknown>,
  );
  if (!session) return null;
  return { id: snap.id, session };
}

/** @deprecated Use getWorkoutSession */
export const getCompletedWorkoutSession = getWorkoutSession;

/**
 * Overwrites a session (typically completed edits). Recomputes denormalized counts.
 */
export async function updateCompletedWorkoutSession(
  sessionId: string,
  draft: WorkoutSessionDoc,
): Promise<WorkoutSessionDoc | null> {
  return upsertWorkoutSession(sessionId, {
    ...draft,
    status: draft.status === "in_progress" ? "in_progress" : "completed",
    endedAt:
      draft.status === "in_progress"
        ? null
        : (draft.endedAt ?? new Date()),
  });
}

/** Move a completed session back to in progress so it can be resumed. */
export async function reopenSessionAsInProgress(
  sessionId: string,
): Promise<SavedWorkoutSession | null> {
  const existing = await getWorkoutSession(sessionId);
  if (!existing) return null;

  const reopened: WorkoutSessionDoc = {
    ...existing.session,
    status: "in_progress",
    endedAt: null,
  };
  const saved = await upsertWorkoutSession(sessionId, reopened);
  if (!saved) return null;
  return { id: sessionId, session: saved };
}

/** Permanently delete a session (in progress or completed). */
export async function deleteWorkoutSession(
  sessionId: string,
): Promise<boolean> {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid || !sessionId) return false;
  await deleteDoc(doc(db, "users", uid, "sessions", sessionId));
  return true;
}
