import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import {
  buildWorkoutSessionDoc,
  sessionDocToFirestore,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";

/** Slim row for calendar / history lists (read from Firestore). */
export type CompletedSessionSummary = {
  id: string;
  workoutDate: string;
  title: string;
  planId: string | null;
  endedAt: Date;
  exerciseCount: number;
  setCount: number;
  previewExerciseNames: string[];
};

function sessionsCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "sessions");
}

function parseCompletedSessionSummary(
  id: string,
  data: Record<string, unknown>,
): CompletedSessionSummary | null {
  if (data.status !== "completed") return null;
  const workoutDate = data.workoutDate;
  const title = data.title;
  const planId = data.planId;
  const endedAt = data.endedAt;
  const exerciseCount = data.exerciseCount;
  const setCount = data.setCount;
  const previewExerciseNames = data.previewExerciseNames;
  if (typeof workoutDate !== "string" || workoutDate.length !== 10) return null;
  if (typeof title !== "string" || title.length === 0) return null;
  if (planId != null && typeof planId !== "string") return null;
  if (!(endedAt instanceof Timestamp)) return null;
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
    workoutDate,
    title: title.slice(0, 200),
    planId: planId == null || planId === "" ? null : planId,
    endedAt: endedAt.toDate(),
    exerciseCount,
    setCount,
    previewExerciseNames: names.slice(0, 5),
  };
}

/**
 * Recent completed sessions (newest first). Used by the planner calendar.
 */
export function subscribeRecentCompletedSessions(
  onSessions: (sessions: CompletedSessionSummary[]) => void,
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
      const out: CompletedSessionSummary[] = [];
      for (const d of snap.docs) {
        const row = parseCompletedSessionSummary(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (row) out.push(row);
      }
      onSessions(out);
    },
    () => {
      onSessions([]);
    },
  );
}

/**
 * Persists a completed session under `users/{uid}/sessions`.
 * Returns the new document id, or null if Firebase is not configured or user is not signed in.
 */
export async function saveCompletedWorkoutSession(
  snap: ActiveWorkoutFinishSnapshot,
): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return null;

  const doc = buildWorkoutSessionDoc(snap);
  const payload = sessionDocToFirestore(doc);

  const ref = await addDoc(
    collection(db, "users", user.uid, "sessions"),
    payload,
  );
  return ref.id;
}
