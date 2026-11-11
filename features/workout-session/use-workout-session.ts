"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import type { ActiveWorkoutFinishSnapshot } from "@/lib/workout-session-mapper";
import {
  exerciseHistoriesFromSessions,
  getRecentCompletedSessions,
  type SavedWorkoutSession,
} from "@/lib/workout-session-repository";
import {
  recentExercises,
  suggestNextExercises,
} from "@/features/workout-session/exercise-suggestions";
import { sessionReducer } from "@/features/workout-session/session-reducer";
import {
  finishState,
  initialSessionState,
  toFinishSnapshot,
  type WorkoutSessionInitialData,
} from "@/features/workout-session/session-snapshot";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Owns the live workout: session state, debounced autosave, and past
 * workouts (for "last time" values and suggestions).
 */
export function useWorkoutSession(
  data: WorkoutSessionInitialData,
  onPersist?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>,
) {
  const [startedAtMs] = useState(() => data.sessionStartedAtMs ?? Date.now());
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    initialSessionState(data, startedAtMs),
  );
  // The session timer UI is gone; keep any duration an older session already has.
  const activeDurationMs = data.initialActiveDurationMs ?? 0;
  const planId = data.planId ?? null;

  const buildSnapshot = useCallback(
    () =>
      toFinishSnapshot(state, {
        activeDurationMs,
        sessionStartedAtMs: startedAtMs,
        planId,
      }),
    [state, activeDurationMs, startedAtMs, planId],
  );

  /** What Finish saves: maybes you never started are left out. */
  const buildFinishSnapshot = useCallback(
    () =>
      toFinishSnapshot(finishState(state), {
        activeDurationMs,
        sessionStartedAtMs: startedAtMs,
        planId,
      }),
    [state, activeDurationMs, startedAtMs, planId],
  );

  // Autosave on content changes only — not on opening a card.
  const { title, workoutDate, workoutTime, workoutNote, exercises } = state;
  useEffect(() => {
    if (!onPersist) return;
    const id = window.setTimeout(() => {
      void onPersist(
        toFinishSnapshot(
          { title, workoutDate, workoutTime, workoutNote, exercises, openLineId: null },
          {
            activeDurationMs,
            sessionStartedAtMs: startedAtMs,
            planId,
          },
        ),
      );
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [onPersist, title, workoutDate, workoutTime, workoutNote, exercises, activeDurationMs, startedAtMs, planId]);

  const [recent, setRecent] = useState<{
    loaded: boolean;
    sessions: SavedWorkoutSession[];
  }>({ loaded: false, sessions: [] });
  const excludeId = data.historyExcludeSessionId;
  useEffect(() => {
    let cancelled = false;
    getRecentCompletedSessions()
      .catch(() => [])
      .then((sessions) => {
        if (!cancelled) {
          setRecent({ loaded: true, sessions: sessions.filter((s) => s.id !== excludeId) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  // Only recompute history when the exercise list itself changes, not on every keystroke.
  const exerciseKey = exercises
    .map((item) => `${item.exercise.id}:${item.exercise.metric}:${item.exercise.name}`)
    .join("|");
  const catalogExercises = useMemo(
    () => exercises.map((item) => item.exercise),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on exerciseKey on purpose
    [exerciseKey],
  );
  const history = useMemo(
    () => exerciseHistoriesFromSessions(recent.sessions, catalogExercises),
    [recent.sessions, catalogExercises],
  );
  const suggestions = useMemo(
    () => suggestNextExercises(recent.sessions, catalogExercises),
    [recent.sessions, catalogExercises],
  );
  const recent12 = useMemo(() => recentExercises(recent.sessions), [recent.sessions]);
  // The search sheet's "Suggested" tab: next-up picks first, topped up with recent ones.
  const suggestedForSearch = useMemo(() => {
    const inWorkout = new Set(catalogExercises.map((exercise) => exercise.id));
    const seen = new Set<string>();
    return [...suggestNextExercises(recent.sessions, catalogExercises, 8), ...recent12]
      .filter((exercise) => {
        if (inWorkout.has(exercise.id) || seen.has(exercise.id)) return false;
        seen.add(exercise.id);
        return true;
      })
      .slice(0, 8);
  }, [recent.sessions, catalogExercises, recent12]);

  return {
    state,
    dispatch,
    startedAtMs,
    planId,
    buildSnapshot,
    buildFinishSnapshot,
    history,
    historyLoading: !recent.loaded,
    suggestions,
    suggestedForSearch,
    recentExercises: recent12,
  };
}

export type WorkoutSessionController = ReturnType<typeof useWorkoutSession>;
