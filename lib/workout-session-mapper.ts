import { Timestamp } from "firebase/firestore";
import type { CatalogExercise, ExerciseMetric } from "@/lib/exercise-catalog";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  NOTE_LIMITS,
  type SessionLine,
  type SetLog,
  type WorkoutSessionDoc,
} from "@/lib/workout-types";

/** UI set row shape (matches active workout component). */
export type UiSetRow = {
  weight: string;
  reps: string;
  seconds: string;
  timedSetSec: string;
  note: string;
};

/** Snapshot passed from the active workout screen on finish. */
export type ActiveWorkoutFinishSnapshot = {
  title: string;
  exercises: CatalogExercise[];
  setsByExercise: UiSetRow[][];
  workoutNote: string;
  exerciseNotesByExerciseId: Record<string, string>;
  /** Milliseconds shown on the session timer at finish (0 if never started). */
  activeDurationMs: number;
  /** `Date.now()` when the session screen mounted. */
  sessionStartedAtMs: number;
  planId?: string | null;
};

function trimToNull(s: string, max: number): string | null {
  const t = s.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

function parseNumberLoose(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntLoose(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function uiSetRowToSetLog(row: UiSetRow, metric: ExerciseMetric): SetLog {
  const note = trimToNull(row.note, NOTE_LIMITS.setNote);
  const timedSetSec = parseIntLoose(row.timedSetSec);

  switch (metric) {
    case "weight_reps":
      return {
        weight: parseNumberLoose(row.weight),
        reps: parseIntLoose(row.reps),
        durationSec: null,
        timedSetSec,
        note,
      };
    case "bodyweight_reps":
      return {
        weight: null,
        reps: parseIntLoose(row.reps),
        durationSec: null,
        timedSetSec,
        note,
      };
    case "duration":
      return {
        weight: null,
        reps: null,
        durationSec: parseIntLoose(row.seconds),
        timedSetSec,
        note,
      };
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function newLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildWorkoutSessionDoc(
  snap: ActiveWorkoutFinishSnapshot,
): WorkoutSessionDoc {
  const endedAt = new Date();
  const startedAt = new Date(snap.sessionStartedAtMs);

  const lines: SessionLine[] = snap.exercises.map((ex, i) => {
    const lineId = newLineId();
    const rows = snap.setsByExercise[i] ?? [];
    const sets = rows.map((row) => uiSetRowToSetLog(row, ex.metric));
    return {
      lineId,
      exerciseId: ex.id,
      nameSnapshot: ex.name,
      metric: ex.metric,
      sets,
    };
  });

  const exerciseNotesByLineId: Record<string, string> = {};
  for (const line of lines) {
    const raw = snap.exerciseNotesByExerciseId[line.exerciseId];
    const n = trimToNull(raw ?? "", NOTE_LIMITS.exerciseNote);
    if (n) exerciseNotesByLineId[line.lineId] = n;
  }

  const setCount = lines.reduce((acc, l) => acc + l.sets.length, 0);
  const previewExerciseNames = lines.slice(0, 3).map((l) => l.nameSnapshot);

  const activeDurationSec =
    snap.activeDurationMs > 0
      ? Math.max(0, Math.round(snap.activeDurationMs / 1000))
      : null;

  const workoutDate = localDateKeyFromMs(endedAt.getTime());

  return {
    status: "completed",
    title: snap.title.trim().slice(0, NOTE_LIMITS.title) || "Workout",
    planId: snap.planId ?? null,
    workoutDate,
    startedAt,
    endedAt,
    activeDurationSec,
    workoutNote: trimToNull(snap.workoutNote, NOTE_LIMITS.workoutNote),
    exerciseNotesByLineId:
      Object.keys(exerciseNotesByLineId).length > 0
        ? exerciseNotesByLineId
        : null,
    lines,
    exerciseCount: lines.length,
    setCount,
    previewExerciseNames,
  };
}

/** Firestore-serializable object (Timestamps, plain objects). */
export function sessionDocToFirestore(
  doc: WorkoutSessionDoc,
): Record<string, unknown> {
  return {
    status: doc.status,
    title: doc.title,
    planId: doc.planId,
    workoutDate: doc.workoutDate,
    startedAt: Timestamp.fromDate(doc.startedAt),
    endedAt: Timestamp.fromDate(doc.endedAt),
    activeDurationSec: doc.activeDurationSec,
    workoutNote: doc.workoutNote,
    exerciseNotesByLineId: doc.exerciseNotesByLineId,
    lines: doc.lines.map((line) => ({
      lineId: line.lineId,
      exerciseId: line.exerciseId,
      nameSnapshot: line.nameSnapshot,
      metric: line.metric,
      sets: line.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        durationSec: s.durationSec,
        timedSetSec: s.timedSetSec,
        note: s.note,
      })),
    })),
    exerciseCount: doc.exerciseCount,
    setCount: doc.setCount,
    previewExerciseNames: doc.previewExerciseNames,
  };
}
