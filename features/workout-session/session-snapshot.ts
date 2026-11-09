import type { CatalogExercise } from "@/lib/exercise-catalog";
import {
  createLineId,
  emptyUiSetRow,
  setLogToUiSetRow,
  type ActiveWorkoutFinishSnapshot,
} from "@/lib/workout-session-mapper";
import { isDefaultWorkoutTitle, localDateKeyFromMs } from "@/lib/workout-date";
import type { WorkoutSessionDoc } from "@/lib/workout-types";
import {
  emptySetRow,
  exerciseProgress,
  type SessionExercise,
  type SetRow,
} from "@/features/workout-session/session-model";
import type { SessionState } from "@/features/workout-session/session-reducer";

/** Everything the session screen needs to start or resume a workout. */
export type WorkoutSessionInitialData = {
  title: string;
  /** When false, the title starts empty so the date-based default shows. */
  titleIsCustom?: boolean;
  exercises: CatalogExercise[];
  planId?: string | null;
  /** Stable line ids parallel to `exercises` when resuming. */
  initialLineIds?: string[];
  initialSetsByExercise?: SetRow[][];
  initialWorkoutNote?: string;
  /** Exercise notes keyed by exercise id. */
  initialExerciseNotesById?: Record<string, string>;
  /** Journal date `YYYY-MM-DD`; defaults to today. `null` means unset. */
  initialWorkoutDate?: string | null;
  /** Local `HH:mm`. */
  initialWorkoutTime?: string | null;
  /** Saved session duration when resuming (ms); kept as-is, no timer UI. */
  initialActiveDurationMs?: number;
  /** Original session start time. */
  sessionStartedAtMs?: number;
  /** Editing a saved workout: leave it out of "last time" values and suggestions. */
  historyExcludeSessionId?: string;
};

export function initialSessionState(
  data: WorkoutSessionInitialData,
  startedAtMs: number,
): SessionState {
  const lineIdsMatch = data.initialLineIds?.length === data.exercises.length;
  const setsMatch = data.initialSetsByExercise?.length === data.exercises.length;

  const exercises: SessionExercise[] = data.exercises.map((exercise, i) => ({
    lineId: lineIdsMatch ? data.initialLineIds![i]! : createLineId(),
    exercise,
    sets:
      setsMatch && data.initialSetsByExercise![i]!.length > 0
        ? data.initialSetsByExercise![i]!
        : [emptySetRow()],
    note: data.initialExerciseNotesById?.[exercise.id] ?? "",
  }));

  return {
    title: data.titleIsCustom === false ? "" : data.title,
    workoutDate:
      data.initialWorkoutDate === null
        ? ""
        : (data.initialWorkoutDate ?? localDateKeyFromMs(startedAtMs)),
    workoutTime: data.initialWorkoutTime ?? "",
    workoutNote: data.initialWorkoutNote ?? "",
    exercises,
    // Resume where you left off: the first exercise that still has sets to do.
    openLineId:
      exercises.find((item) => exerciseProgress(item.sets) !== "done")?.lineId ?? null,
  };
}

/** Convert session state into the shape the save / finish code expects. */
export function toFinishSnapshot(
  state: SessionState,
  extras: {
    activeDurationMs: number;
    sessionStartedAtMs: number;
    planId: string | null;
  },
): ActiveWorkoutFinishSnapshot {
  const exerciseNotesByExerciseId: Record<string, string> = {};
  for (const item of state.exercises) {
    if (item.note.trim()) exerciseNotesByExerciseId[item.exercise.id] = item.note;
  }
  return {
    title: state.title,
    workoutDate: state.workoutDate,
    workoutTime: state.workoutTime,
    exercises: state.exercises.map((item) => item.exercise),
    setsByExercise: state.exercises.map((item) => item.sets),
    lineIds: state.exercises.map((item) => item.lineId),
    workoutNote: state.workoutNote,
    exerciseNotesByExerciseId,
    activeDurationMs: extras.activeDurationMs,
    sessionStartedAtMs: extras.sessionStartedAtMs,
    planId: extras.planId,
  };
}

/** Load a saved session (finished or in progress) into the session screen. */
export function initialDataFromSavedSession(session: WorkoutSessionDoc): WorkoutSessionInitialData {
  const exerciseNotesById: Record<string, string> = {};
  for (const line of session.lines) {
    const note = session.exerciseNotesByLineId?.[line.lineId];
    if (note) exerciseNotesById[line.exerciseId] = note;
  }
  return {
    title: session.title,
    titleIsCustom: !isDefaultWorkoutTitle(
      session.title,
      session.workoutDate,
      session.startedAt.getTime(),
    ),
    exercises: session.lines.map((line) => ({
      id: line.exerciseId,
      name: line.nameSnapshot,
      metric: line.metric,
    })),
    planId: session.planId,
    initialLineIds: session.lines.map((line) => line.lineId),
    initialSetsByExercise: session.lines.map((line) =>
      line.sets.length > 0 ? line.sets.map(setLogToUiSetRow) : [emptyUiSetRow()],
    ),
    initialWorkoutNote: session.workoutNote ?? "",
    initialExerciseNotesById: exerciseNotesById,
    initialWorkoutDate: session.workoutDate,
    initialWorkoutTime: session.workoutTime,
    initialActiveDurationMs:
      session.activeDurationSec != null && session.activeDurationSec > 0
        ? session.activeDurationSec * 1000
        : 0,
    sessionStartedAtMs: session.startedAt.getTime(),
  };
}
