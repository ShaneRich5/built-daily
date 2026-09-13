import { Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  normalizeWorkoutDate,
  normalizeWorkoutTime,
  resolveWorkoutTitle,
} from "@/lib/workout-date";
import { NOTE_LIMITS } from "@/lib/workout-types";
import {
  buildSessionLines,
  deriveSessionCounts,
  type McpExerciseInput,
} from "./session-writer";

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && !Number.isNaN(date.getTime())
        ? date
        : null;
    } catch {
      return null;
    }
  }
  if (
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const nanos =
      "nanoseconds" in value &&
      typeof (value as { nanoseconds: unknown }).nanoseconds === "number"
        ? (value as { nanoseconds: number }).nanoseconds
        : 0;
    return new Date(
      (value as { seconds: number }).seconds * 1000 + nanos / 1e6,
    );
  }
  return null;
}

function toIso(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export type SessionSummaryJson = {
  id: string;
  status: string;
  title: string;
  planId: string | null;
  workoutDate: string | null;
  workoutTime: string | null;
  startedAt: string | null;
  endedAt: string | null;
  exerciseCount: number | null;
  setCount: number | null;
  previewExerciseNames: string[];
};

function asOptionalString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return typeof value === "string" ? value : null;
}

function parseSummary(
  id: string,
  data: Record<string, unknown>,
): SessionSummaryJson | null {
  const status = data.status;
  if (status !== "completed" && status !== "in_progress") return null;
  const title = typeof data.title === "string" ? data.title : null;
  if (!title) return null;

  const previewRaw = data.previewExerciseNames;
  const previewExerciseNames = Array.isArray(previewRaw)
    ? previewRaw.filter((x): x is string => typeof x === "string").slice(0, 5)
    : [];

  return {
    id,
    status,
    title,
    planId: asOptionalString(data.planId),
    workoutDate: asOptionalString(data.workoutDate),
    workoutTime: asOptionalString(data.workoutTime),
    startedAt: toIso(data.startedAt),
    endedAt: toIso(data.endedAt),
    exerciseCount:
      typeof data.exerciseCount === "number" ? data.exerciseCount : null,
    setCount: typeof data.setCount === "number" ? data.setCount : null,
    previewExerciseNames,
  };
}

/** Last N completed sessions for `uid`, newest ended first. */
export async function listRecentCompletedSessions(
  uid: string,
  limit: number,
): Promise<{ uid: string; sessions: SessionSummaryJson[] }> {
  const firestore = getAdminFirestore();
  const snap = await firestore
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .where("status", "==", "completed")
    .orderBy("endedAt", "desc")
    .limit(limit)
    .get();

  const sessions: SessionSummaryJson[] = [];
  for (const doc of snap.docs) {
    const row = parseSummary(doc.id, doc.data() as Record<string, unknown>);
    if (row) sessions.push(row);
  }
  return { uid, sessions };
}

/** Full session document under `uid`, or null if missing. */
export async function getSessionById(
  uid: string,
  sessionId: string,
): Promise<Record<string, unknown> | null> {
  const firestore = getAdminFirestore();
  const snap = await firestore
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .doc(sessionId)
    .get();

  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    uid,
    status: data.status ?? null,
    title: data.title ?? null,
    planId: asOptionalString(data.planId),
    workoutDate: asOptionalString(data.workoutDate),
    workoutTime: asOptionalString(data.workoutTime),
    startedAt: toIso(data.startedAt),
    endedAt: toIso(data.endedAt),
    activeDurationSec:
      typeof data.activeDurationSec === "number" ? data.activeDurationSec : null,
    workoutNote: asOptionalString(data.workoutNote),
    exerciseNotesByLineId: data.exerciseNotesByLineId ?? null,
    lines: Array.isArray(data.lines) ? data.lines : [],
    exerciseCount:
      typeof data.exerciseCount === "number" ? data.exerciseCount : null,
    setCount: typeof data.setCount === "number" ? data.setCount : null,
    previewExerciseNames: Array.isArray(data.previewExerciseNames)
      ? data.previewExerciseNames.filter(
          (x): x is string => typeof x === "string",
        )
      : [],
  };
}

export type WorkoutStatusInput = "completed" | "in_progress";

/** Shared shape for create/update tool input. */
export type WorkoutSessionWriteInput = {
  title?: string;
  status?: WorkoutStatusInput;
  workoutDate?: string;
  workoutTime?: string;
  workoutNote?: string;
  /** ISO instant. */
  startedAt?: string;
  /** ISO instant. */
  endedAt?: string;
  exercises?: McpExerciseInput[];
};

type WorkoutSessionOk = { kind: "ok"; id: string; session: Record<string, unknown> };
type WorkoutSessionUnknownExerciseIds = {
  kind: "unknown_exercise_ids";
  exerciseIds: string[];
};

export type CreateWorkoutSessionResult =
  | WorkoutSessionOk
  | WorkoutSessionUnknownExerciseIds;

export type WorkoutSessionWriteResult =
  | WorkoutSessionOk
  | WorkoutSessionUnknownExerciseIds
  | { kind: "not_found" };

function trimNote(raw: string | undefined, max: number): string | null {
  if (!raw) return null;
  const t = raw.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function parseIsoDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Create a new workout session for `uid`. Defaults to a completed session ending now. */
export async function createWorkoutSession(
  uid: string,
  input: WorkoutSessionWriteInput,
): Promise<CreateWorkoutSessionResult> {
  const built = buildSessionLines(input.exercises ?? []);
  if (built.unknownExerciseIds.length > 0) {
    return { kind: "unknown_exercise_ids", exerciseIds: built.unknownExerciseIds };
  }

  const status: WorkoutStatusInput = input.status ?? "completed";
  const startedAt = parseIsoDate(input.startedAt) ?? new Date();
  const endedAt =
    status === "in_progress" ? null : (parseIsoDate(input.endedAt) ?? new Date());
  const workoutDate = input.workoutDate
    ? normalizeWorkoutDate(input.workoutDate)
    : null;
  const workoutTime = input.workoutTime
    ? normalizeWorkoutTime(input.workoutTime)
    : null;
  const dateMs = (endedAt ?? startedAt).getTime();
  const title = resolveWorkoutTitle(input.title ?? "", workoutDate, dateMs);
  const { exerciseCount, setCount, previewExerciseNames } = deriveSessionCounts(
    built.lines,
  );

  const firestore = getAdminFirestore();
  const ref = await firestore
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .add({
      status,
      title,
      planId: null,
      workoutDate,
      workoutTime,
      startedAt: Timestamp.fromDate(startedAt),
      endedAt: endedAt ? Timestamp.fromDate(endedAt) : null,
      activeDurationSec: null,
      workoutNote: trimNote(input.workoutNote, NOTE_LIMITS.workoutNote),
      exerciseNotesByLineId: built.exerciseNotesByLineId,
      lines: built.lines,
      exerciseCount,
      setCount,
      previewExerciseNames,
    });

  const session = await getSessionById(uid, ref.id);
  return { kind: "ok", id: ref.id, session: session! };
}

/**
 * Update an existing workout session for `uid`. Only fields present in
 * `input` are changed; `exercises`, if provided, fully replaces the
 * existing exercise/set list (no partial line patches).
 */
export async function updateWorkoutSession(
  uid: string,
  sessionId: string,
  input: WorkoutSessionWriteInput,
): Promise<WorkoutSessionWriteResult> {
  const firestore = getAdminFirestore();
  const ref = firestore
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return { kind: "not_found" };
  const existing = snap.data() as Record<string, unknown>;

  let lines: unknown[] = Array.isArray(existing.lines) ? existing.lines : [];
  let exerciseNotesByLineId = existing.exerciseNotesByLineId ?? null;
  let exerciseCount =
    typeof existing.exerciseCount === "number" ? existing.exerciseCount : lines.length;
  let setCount = typeof existing.setCount === "number" ? existing.setCount : 0;
  let previewExerciseNames = Array.isArray(existing.previewExerciseNames)
    ? existing.previewExerciseNames
    : [];

  if (input.exercises) {
    const built = buildSessionLines(input.exercises);
    if (built.unknownExerciseIds.length > 0) {
      return { kind: "unknown_exercise_ids", exerciseIds: built.unknownExerciseIds };
    }
    lines = built.lines;
    exerciseNotesByLineId = built.exerciseNotesByLineId;
    const counts = deriveSessionCounts(built.lines);
    exerciseCount = counts.exerciseCount;
    setCount = counts.setCount;
    previewExerciseNames = counts.previewExerciseNames;
  }

  const prevStatus: WorkoutStatusInput =
    existing.status === "in_progress" ? "in_progress" : "completed";
  const status: WorkoutStatusInput = input.status ?? prevStatus;

  const existingStartedAt = toDate(existing.startedAt) ?? new Date();
  const startedAt = parseIsoDate(input.startedAt) ?? existingStartedAt;

  let endedAt: Date | null;
  if (status === "in_progress") {
    endedAt = null;
  } else if (input.endedAt) {
    endedAt = parseIsoDate(input.endedAt);
  } else if (prevStatus === "in_progress") {
    endedAt = new Date();
  } else {
    endedAt = toDate(existing.endedAt) ?? new Date();
  }

  const workoutDate =
    input.workoutDate !== undefined
      ? normalizeWorkoutDate(input.workoutDate)
      : asOptionalString(existing.workoutDate);
  const workoutTime =
    input.workoutTime !== undefined
      ? normalizeWorkoutTime(input.workoutTime)
      : asOptionalString(existing.workoutTime);

  const dateMs = (endedAt ?? startedAt).getTime();
  const title =
    input.title !== undefined
      ? resolveWorkoutTitle(input.title, workoutDate, dateMs)
      : typeof existing.title === "string" && existing.title
        ? existing.title
        : resolveWorkoutTitle("", workoutDate, dateMs);

  const workoutNote =
    input.workoutNote !== undefined
      ? trimNote(input.workoutNote, NOTE_LIMITS.workoutNote)
      : asOptionalString(existing.workoutNote);

  await ref.set({
    status,
    title,
    planId: asOptionalString(existing.planId),
    workoutDate,
    workoutTime,
    startedAt: Timestamp.fromDate(startedAt),
    endedAt: endedAt ? Timestamp.fromDate(endedAt) : null,
    activeDurationSec:
      typeof existing.activeDurationSec === "number"
        ? existing.activeDurationSec
        : null,
    workoutNote,
    exerciseNotesByLineId,
    lines,
    exerciseCount,
    setCount,
    previewExerciseNames,
  });

  const session = await getSessionById(uid, sessionId);
  return { kind: "ok", id: sessionId, session: session! };
}
