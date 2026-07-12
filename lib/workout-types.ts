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

/** Optional rest defaults stored on workout templates (used when starting from this plan). */
export type PlanRestPreferences = {
  autoRestTimer: boolean;
  defaultRestSec: 30 | 60 | 90 | 120;
};

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
  /** Rest timer hints for future active-workout behavior; optional for older docs. */
  restPreferences?: PlanRestPreferences | null;
};

/** Single performed (or draft) workout under `users/{uid}/sessions/{sessionId}`. */
export type WorkoutSessionDoc = {
  status: WorkoutSessionStatus;
  title: string;
  planId: string | null;
  /** Calendar day for this session (`YYYY-MM-DD`, local timezone). */
  workoutDate: string;
  startedAt: Date;
  /** Set when finished; null while `in_progress`. */
  endedAt: Date | null;
  /** Whole seconds from the session timer UI. */
  activeDurationSec: number | null;
  workoutNote: string | null;
  exerciseNotesByLineId: Record<string, string> | null;
  lines: SessionLine[];
  exerciseCount: number;
  setCount: number;
  previewExerciseNames: string[];
};
