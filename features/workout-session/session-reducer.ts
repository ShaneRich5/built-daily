import type { CatalogExercise } from "@/lib/exercise-catalog";
import { createLineId } from "@/lib/workout-session-mapper";
import {
  copySetRow,
  emptySetRow,
  exerciseProgress,
  fillFromSuggestion,
  MAX_SESSION_EXERCISES,
  type SessionExercise,
  type SetRow,
} from "@/features/workout-session/session-model";

export type SessionState = {
  title: string;
  workoutDate: string;
  workoutTime: string;
  workoutNote: string;
  exercises: SessionExercise[];
  /** The exercise whose quick card is open (at most one). */
  openLineId: string | null;
};

export type SessionAction =
  | {
      type: "updateMeta";
      patch: Partial<
        Pick<SessionState, "title" | "workoutDate" | "workoutTime" | "workoutNote">
      >;
    }
  | { type: "openExercise"; lineId: string | null }
  /** Open the next exercise (after this one, wrapping) that still has work left. */
  | { type: "openNextExercise"; afterLineId: string }
  | { type: "addExercises"; exercises: CatalogExercise[] }
  | { type: "replaceExercise"; lineId: string; exercise: CatalogExercise }
  | { type: "removeExercise"; lineId: string }
  | { type: "moveExercise"; lineId: string; toIndex: number }
  | { type: "setExerciseNote"; lineId: string; note: string }
  | { type: "updateSet"; lineId: string; setIndex: number; patch: Partial<SetRow> }
  | { type: "addSet"; lineId: string }
  | { type: "copyLastSet"; lineId: string }
  | { type: "removeSet"; lineId: string; setIndex: number }
  | {
      type: "toggleSetDone";
      lineId: string;
      setIndex: number;
      /** Values shown greyed out; copied into empty fields when checking off. */
      suggestion: SetRow | null;
    }
  | { type: "replaceSets"; lineId: string; sets: SetRow[] };

function updateExercise(
  state: SessionState,
  lineId: string,
  update: (item: SessionExercise) => SessionExercise,
): SessionState {
  return {
    ...state,
    exercises: state.exercises.map((item) =>
      item.lineId === lineId ? update(item) : item,
    ),
  };
}

function updateSets(
  state: SessionState,
  lineId: string,
  update: (sets: SetRow[]) => SetRow[],
): SessionState {
  return updateExercise(state, lineId, (item) => ({
    ...item,
    sets: update(item.sets),
  }));
}

/** The next exercise after `lineId` (wrapping around) that is not done yet. */
export function nextUnfinishedAfter(exercises: SessionExercise[], lineId: string): string | null {
  const start = exercises.findIndex((item) => item.lineId === lineId);
  for (let step = 1; step < exercises.length; step++) {
    const candidate = exercises[(start + step) % exercises.length]!;
    if (exerciseProgress(candidate.sets) !== "done") return candidate.lineId;
  }
  return null;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "updateMeta":
      return { ...state, ...action.patch };

    case "openExercise":
      return { ...state, openLineId: action.lineId };

    case "openNextExercise":
      return {
        ...state,
        openLineId: nextUnfinishedAfter(state.exercises, action.afterLineId),
      };

    case "addExercises": {
      const room = MAX_SESSION_EXERCISES - state.exercises.length;
      if (room <= 0 || action.exercises.length === 0) return state;
      const added: SessionExercise[] = action.exercises
        .slice(0, room)
        .map((exercise) => ({
          lineId: createLineId(),
          exercise,
          sets: [emptySetRow()],
          note: "",
        }));
      return {
        ...state,
        exercises: [...state.exercises, ...added],
        openLineId: added[0]!.lineId,
      };
    }

    case "replaceExercise":
      return updateExercise(state, action.lineId, (item) => {
        const metricChanged = item.exercise.metric !== action.exercise.metric;
        return {
          ...item,
          exercise: action.exercise,
          // Different metrics log different fields, so old values would not fit.
          sets: metricChanged ? [emptySetRow()] : item.sets,
        };
      });

    case "removeExercise": {
      const index = state.exercises.findIndex((item) => item.lineId === action.lineId);
      if (index < 0) return state;
      const exercises = state.exercises.filter((item) => item.lineId !== action.lineId);
      const openLineId =
        state.openLineId === action.lineId
          ? (exercises[Math.min(index, exercises.length - 1)]?.lineId ?? null)
          : state.openLineId;
      return { ...state, exercises, openLineId };
    }

    case "moveExercise": {
      const from = state.exercises.findIndex((item) => item.lineId === action.lineId);
      if (from < 0) return state;
      const to = Math.max(0, Math.min(state.exercises.length - 1, action.toIndex));
      if (from === to) return state;
      const exercises = [...state.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved!);
      return { ...state, exercises };
    }

    case "setExerciseNote":
      return updateExercise(state, action.lineId, (item) => ({
        ...item,
        note: action.note,
      }));

    case "updateSet":
      return updateSets(state, action.lineId, (sets) =>
        sets.map((set, i) => (i === action.setIndex ? { ...set, ...action.patch } : set)),
      );

    case "addSet":
      return updateSets(state, action.lineId, (sets) => [...sets, emptySetRow()]);

    case "copyLastSet":
      return updateSets(state, action.lineId, (sets) => {
        const last = sets[sets.length - 1];
        return [...sets, last ? copySetRow(last) : emptySetRow()];
      });

    case "removeSet":
      return updateSets(state, action.lineId, (sets) => {
        if (sets.length <= 1) return [emptySetRow()];
        return sets.filter((_, i) => i !== action.setIndex);
      });

    case "toggleSetDone":
      return updateSets(state, action.lineId, (sets) =>
        sets.map((set, i) => {
          if (i !== action.setIndex) return set;
          if (set.done) return { ...set, done: false };
          return { ...fillFromSuggestion(set, action.suggestion), done: true };
        }),
      );

    case "replaceSets":
      return updateSets(state, action.lineId, () =>
        action.sets.length > 0 ? action.sets : [emptySetRow()],
      );
  }
}
