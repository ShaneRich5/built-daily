/**
 * Firestore-aligned domain types for Built Daily.
 * Persisted payloads use `lib/workout-session-mapper.ts` + `lib/workout-session-repository.ts`.
 */

import type { ExerciseMetric } from "@/lib/exercise-catalog";
export type { ExerciseMetric } from "@/lib/exercise-catalog";

/** Max lengths aligned with UI / rules validation. */
export const NOTE_LIMITS = {
  workoutNote: 500,
  exerciseNote: 400,
  setNote: 200,
  title: 200,
} as const;

export type WorkoutSessionStatus = "in_progress" | "completed" | "discarded";

export type PlanSource = "starter_copy" | "custom";

/** One logged set (persisted shape; numbers nullable when empty). */
export type SetLog = {
  weight: number | null;
  reps: number | null;
  /** Hold duration for `duration` metric (seconds). */
  durationSec: number | null;
  /** Set stopwatch seconds for non-duration metrics (optional). */
  timedSetSec: number | null;
  note: string | null;
};

/** One exercise line inside a session or plan template. */
export type SessionLine = {
  lineId: string;
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
  sets: SetLog[];
};

/** Embedded plan line (no performed sets). */
export type PlanLine = {
  lineId: string;
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
  targetSets?: number | null;
  /** Optional default note when instantiating a session (future). */
  notes?: string | null;
};

/** Reusable workout template under `users/{uid}/plans/{planId}`. */
export type WorkoutPlanDoc = {
  name: string;
  createdAt: Date;
  updatedAt: Date;
  source: PlanSource;
  lines: PlanLine[];
};

/** Single performed (or draft) workout under `users/{uid}/sessions/{sessionId}`. */
export type WorkoutSessionDoc = {
  status: WorkoutSessionStatus;
  title: string;
  planId: string | null;
  startedAt: Date;
  endedAt: Date;
  /** Whole seconds from the session timer UI when finished. */
  activeDurationSec: number | null;
  workoutNote: string | null;
  exerciseNotesByLineId: Record<string, string> | null;
  lines: SessionLine[];
  exerciseCount: number;
  setCount: number;
  previewExerciseNames: string[];
};
