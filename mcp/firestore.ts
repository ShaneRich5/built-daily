import { getAdminFirestore } from "@/lib/firebase-admin";

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
