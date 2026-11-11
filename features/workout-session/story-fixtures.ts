/**
 * Sample data for Storybook stories only. Not imported by the app.
 */
import { getCatalogExerciseById, type CatalogExercise } from "@/lib/exercise-catalog";
import type { ExerciseHistoryEntry } from "@/lib/workout-session-repository";
import type { SetLog } from "@/lib/workout-types";
import {
  emptySetRow,
  type SessionExercise,
  type SetRow,
} from "@/features/workout-session/session-model";

export function catalog(id: string): CatalogExercise {
  const exercise = getCatalogExerciseById(id);
  if (!exercise) throw new Error(`Unknown catalog exercise "${id}" in story fixtures`);
  return exercise;
}

export function row(values: Partial<SetRow> = {}): SetRow {
  return { ...emptySetRow(), ...values };
}

export function log(weight: number | null, reps: number | null): SetLog {
  return {
    weight,
    reps,
    durationSec: null,
    timedSetSec: null,
    paceMph: null,
    inclinePercent: null,
    resistanceLevel: null,
    distanceMiles: null,
    note: null,
  };
}

export function sessionExercise(
  lineId: string,
  exerciseId: string,
  sets: SetRow[],
  note = "",
  grouping: Partial<Pick<SessionExercise, "section" | "alternates">> = {},
): SessionExercise {
  return {
    lineId,
    exercise: catalog(exerciseId),
    sets,
    note,
    section: grouping.section ?? "plan",
    alternates: grouping.alternates ?? [],
  };
}

/** A push day partway through: two done, one in progress, one not started. */
export const pushDay: SessionExercise[] = [
  sessionExercise("bench", "bench", [
    row({ weight: "135", reps: "8", done: true }),
    row({ weight: "145", reps: "6", done: true }),
    row({ weight: "145", reps: "6", done: true }),
  ]),
  sessionExercise("incline", "db-incline-bench", [
    row({ weight: "50", reps: "10", done: true }),
    row({ weight: "50", reps: "9", done: true }),
    row({ weight: "50", reps: "8", done: true }),
  ]),
  sessionExercise("fly", "cable-fly", [
    row({ weight: "30", reps: "12", done: true }),
    row({ weight: "30", reps: "12", done: true }),
    row(),
  ]),
  sessionExercise("lateral", "lateral-raise-machine", [row(), row(), row()]),
];

export const lastTimeFly: SetLog[] = [log(30, 12), log(30, 12), log(30, 12)];

export const flyHistory: ExerciseHistoryEntry[] = [
  {
    sessionId: "s1",
    sessionTitle: "Push day",
    performedAt: new Date("2026-10-31T18:00:00"),
    workoutDate: "2026-10-31",
    line: {
      lineId: "l1",
      exerciseId: "cable-fly",
      nameSnapshot: "Cable chest fly",
      metric: "weight_reps",
      sets: [log(30, 12), log(30, 12), log(30, 11)],
    },
  },
  {
    sessionId: "s2",
    sessionTitle: "Push day",
    performedAt: new Date("2026-10-27T18:00:00"),
    workoutDate: "2026-10-27",
    line: {
      lineId: "l2",
      exerciseId: "cable-fly",
      nameSnapshot: "Cable chest fly",
      metric: "weight_reps",
      sets: [log(27.5, 12), log(27.5, 12), log(27.5, 12)],
    },
  },
];

export const suggested: CatalogExercise[] = [
  catalog("lateral-raise-machine"),
  catalog("cable-fly"),
  catalog("ohp"),
];
