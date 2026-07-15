"use client";

import Link from "next/link";
import { CopyPlus, Pause, Play, RotateCcw, Timer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkoutAddExerciseCard } from "@/components/workout-add-exercise-card";
import { WorkoutMetaFields } from "@/components/workout-meta-fields";
import {
  catalogExerciseFromCustomName,
  getCatalogExerciseById,
  type CatalogExercise,
  type ExerciseMetric,
} from "@/lib/exercise-catalog";
import type { ActiveWorkoutFinishSnapshot } from "@/lib/workout-session-mapper";
import { createLineId } from "@/lib/workout-session-mapper";
import {
  combineToTotalSeconds,
  formatMinutesSecondsLabel,
  splitTotalSeconds,
} from "@/lib/duration-input";
import {
  localDateKeyFromMs,
} from "@/lib/workout-date";

/** One row of logged fields; only fields relevant to `metric` are shown. */
type SetRow = {
  weight: string;
  reps: string;
  seconds: string;
  /** Filled by set stopwatch for weight / bodyweight (optional). Whole seconds. */
  timedSetSec: string;
  /** Optional free text for this set (form cues, RPE, how it felt). */
  note: string;
};

function emptySetRow(): SetRow {
  return { weight: "", reps: "", seconds: "", timedSetSec: "", note: "" };
}

/** Copy weight/reps/duration into a new set; leave timer + note blank. */
function duplicateSetRow(row: SetRow): SetRow {
  return {
    weight: row.weight,
    reps: row.reps,
    seconds: row.seconds,
    timedSetSec: "",
    note: "",
  };
}

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function metricHint(metric: ExerciseMetric): string {
  switch (metric) {
    case "weight_reps":
      return "Weight + reps";
    case "bodyweight_reps":
      return "Reps only";
    case "duration":
      return "Hold time";
  }
}

type ActiveWorkoutViewProps = {
  title: string;
  exercises: CatalogExercise[];
  planId?: string | null;
  /** Stable line ids parallel to `exercises` when resuming. */
  initialLineIds?: string[];
  initialSetsByExercise?: SetRow[][];
  initialWorkoutNote?: string;
  initialExerciseNotesById?: Record<string, string>;
  /** Journal date `YYYY-MM-DD`; defaults to today when omitted. */
  initialWorkoutDate?: string | null;
  /** Local `HH:mm`; empty when omitted. */
  initialWorkoutTime?: string | null;
  /** When false, start with empty title (shows default placeholder). */
  titleIsCustom?: boolean;
  /** Prior session timer value when resuming (ms). */
  initialActiveDurationMs?: number;
  /** Original session start time. */
  sessionStartedAtMs?: number;
  /** Debounced while editing; also used before finish. */
  onPersist?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>;
  onFinish?: (snapshot: ActiveWorkoutFinishSnapshot) => void | Promise<void>;
  /** Discard / delete this session (signed-in in-progress workouts). */
  onDiscard?: () => void | Promise<void>;
};

const MAX_SESSION_EXERCISES = 40;

type SetTimerActive = {
  exerciseIndex: number;
  setIndex: number;
  startedAt: number;
};

export function ActiveWorkoutView({
  title: titleProp,
  exercises,
  planId: planIdProp = null,
  initialLineIds,
  initialSetsByExercise,
  initialWorkoutNote = "",
  initialExerciseNotesById,
  initialWorkoutDate,
  initialWorkoutTime,
  titleIsCustom = true,
  initialActiveDurationMs = 0,
  sessionStartedAtMs: sessionStartedAtMsProp,
  onPersist,
  onFinish,
  onDiscard,
}: ActiveWorkoutViewProps) {
  const [sessionStartedAtMs] = useState(
    () => sessionStartedAtMsProp ?? Date.now(),
  );

  const [title, setTitle] = useState(() =>
    titleIsCustom ? titleProp : "",
  );
  const [workoutDate, setWorkoutDate] = useState(
    () =>
      initialWorkoutDate === null
        ? ""
        : (initialWorkoutDate ?? localDateKeyFromMs(sessionStartedAtMsProp ?? Date.now())),
  );
  const [workoutTime, setWorkoutTime] = useState(
    () => initialWorkoutTime ?? "",
  );

  const [activeExercises, setActiveExercises] =
    useState<CatalogExercise[]>(exercises);

  const [lineIds, setLineIds] = useState<string[]>(() =>
    initialLineIds && initialLineIds.length === exercises.length
      ? initialLineIds
      : exercises.map(() => createLineId()),
  );

  const [setsByExercise, setSetsByExercise] = useState<SetRow[][]>(() =>
    initialSetsByExercise &&
    initialSetsByExercise.length === exercises.length
      ? initialSetsByExercise
      : exercises.map(() => [emptySetRow()]),
  );

  const handleAddCatalogExercise = useCallback((exerciseId: string) => {
    const ex = getCatalogExerciseById(exerciseId);
    if (!ex) return;
    setActiveExercises((prev) => {
      if (prev.length >= MAX_SESSION_EXERCISES) return prev;
      setLineIds((idsPrev) => {
        if (idsPrev.length >= MAX_SESSION_EXERCISES) return idsPrev;
        return [createLineId(), ...idsPrev];
      });
      setSetsByExercise((setsPrev) => {
        if (setsPrev.length >= MAX_SESSION_EXERCISES) return setsPrev;
        return [[emptySetRow()], ...setsPrev];
      });
      // Newest first — keeps the new exercise near the add control.
      return [ex, ...prev];
    });
  }, []);

  const handleAddCustomExercise = useCallback((trimmed: string): boolean => {
    const ex = catalogExerciseFromCustomName(trimmed);
    if (!ex) return false;
    let didAdd = false;
    setActiveExercises((prev) => {
      if (prev.length >= MAX_SESSION_EXERCISES) return prev;
      didAdd = true;
      setLineIds((idsPrev) => {
        if (idsPrev.length >= MAX_SESSION_EXERCISES) return idsPrev;
        return [createLineId(), ...idsPrev];
      });
      setSetsByExercise((setsPrev) => {
        if (setsPrev.length >= MAX_SESSION_EXERCISES) return setsPrev;
        return [[emptySetRow()], ...setsPrev];
      });
      return [ex, ...prev];
    });
    return didAdd;
  }, []);

  const [workoutNote, setWorkoutNote] = useState(initialWorkoutNote);
  const [exerciseNotesById, setExerciseNotesById] = useState<
    Record<string, string>
  >(() => initialExerciseNotesById ?? {});

  const updateExerciseNote = useCallback((exerciseId: string, value: string) => {
    setExerciseNotesById((prev) => ({ ...prev, [exerciseId]: value }));
  }, []);

  /** Per-exercise (duration): hide manual seconds, rely on set timer + display. */
  const [durationTimerOnlyById, setDurationTimerOnlyById] = useState<
    Record<string, boolean>
  >({});

  const toggleDurationTimerOnly = useCallback((exerciseId: string) => {
    setDurationTimerOnlyById((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  }, []);

  /** `idle` = timer not started; `running` = counting; `paused` = stopped mid-session */
  const [timerPhase, setTimerPhase] = useState<"idle" | "running" | "paused">(
    () => (initialActiveDurationMs > 0 ? "paused" : "idle"),
  );
  const [accumulatedMs, setAccumulatedMs] = useState(initialActiveDurationMs);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [displayedMs, setDisplayedMs] = useState(initialActiveDurationMs);

  useEffect(() => {
    if (timerPhase !== "running" || segmentStart === null) return;

    const tick = () => {
      setDisplayedMs(accumulatedMs + (Date.now() - segmentStart));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timerPhase, segmentStart, accumulatedMs]);

  const startOrResumeTimer = useCallback(() => {
    setSegmentStart(Date.now());
    setTimerPhase("running");
  }, []);

  const pauseTimer = useCallback(() => {
    if (segmentStart === null) return;
    const nextAccumulated = accumulatedMs + (Date.now() - segmentStart);
    setAccumulatedMs(nextAccumulated);
    setDisplayedMs(nextAccumulated);
    setSegmentStart(null);
    setTimerPhase("paused");
  }, [accumulatedMs, segmentStart]);

  const resetTimer = useCallback(() => {
    setAccumulatedMs(0);
    setDisplayedMs(0);
    setSegmentStart(null);
    setTimerPhase("idle");
  }, []);

  /** Separate per-set stopwatch (at most one active). */
  const [setTimerActive, setSetTimerActive] = useState<SetTimerActive | null>(
    null,
  );
  const [setTimerLiveMs, setSetTimerLiveMs] = useState(0);

  useEffect(() => {
    if (setTimerActive === null) return;
    const { startedAt } = setTimerActive;
    const tick = () => {
      setSetTimerLiveMs(Date.now() - startedAt);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [setTimerActive]);

  const startSetTimer = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      setSetTimerLiveMs(0);
      setSetTimerActive({
        exerciseIndex,
        setIndex,
        startedAt: Date.now(),
      });
    },
    [],
  );

  const cancelSetTimer = useCallback(() => {
    setSetTimerActive(null);
    setSetTimerLiveMs(0);
  }, []);

  const setCountLabel = useMemo(
    () =>
      setsByExercise.reduce((acc, sets) => acc + sets.length, 0).toString(),
    [setsByExercise],
  );

  const updateSet = useCallback(
    (
      exerciseIndex: number,
      setIndex: number,
      field: keyof SetRow,
      value: string,
    ) => {
      setSetsByExercise((prev) => {
        const next = prev.map((sets) => sets.map((s) => ({ ...s })));
        const row = next[exerciseIndex]?.[setIndex];
        if (!row) return prev;
        row[field] = value;
        return next;
      });
    },
    [],
  );

  const saveSetTimer = useCallback(() => {
    if (setTimerActive === null) return;
    const { exerciseIndex, setIndex, startedAt } = setTimerActive;
    const sec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const metric = activeExercises[exerciseIndex]?.metric;
    if (metric === "duration") {
      updateSet(exerciseIndex, setIndex, "seconds", String(sec));
    } else {
      updateSet(exerciseIndex, setIndex, "timedSetSec", String(sec));
    }
    setSetTimerActive(null);
    setSetTimerLiveMs(0);
  }, [activeExercises, setTimerActive, updateSet]);

  const addSet = useCallback((exerciseIndex: number) => {
    setSetsByExercise((prev) => {
      const next = prev.map((sets) => [...sets]);
      const sets = next[exerciseIndex];
      if (!sets) return prev;
      sets.push(emptySetRow());
      return next;
    });
  }, []);

  const duplicateSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      setSetsByExercise((prev) => {
        const next = prev.map((sets) => [...sets]);
        const sets = next[exerciseIndex];
        const source = sets?.[setIndex];
        if (!sets || !source) return prev;
        sets.splice(setIndex + 1, 0, duplicateSetRow(source));
        return next;
      });
      setSetTimerActive((active) => {
        if (!active || active.exerciseIndex !== exerciseIndex) return active;
        if (active.setIndex > setIndex) {
          return { ...active, setIndex: active.setIndex + 1 };
        }
        return active;
      });
    },
    [],
  );

  const removeExercise = useCallback(
    (exerciseIndex: number) => {
      if (activeExercises.length <= 1) return;
      const removed = activeExercises[exerciseIndex];
      if (!removed) return;
      if (
        !window.confirm(
          `Remove “${removed.name}” and all of its sets from this workout?`,
        )
      ) {
        return;
      }
      setActiveExercises((prev) => prev.filter((_, i) => i !== exerciseIndex));
      setLineIds((ids) => ids.filter((_, i) => i !== exerciseIndex));
      setSetsByExercise((sets) => sets.filter((_, i) => i !== exerciseIndex));
      setExerciseNotesById((notes) => {
        const next = { ...notes };
        delete next[removed.id];
        return next;
      });
      setDurationTimerOnlyById((flags) => {
        const next = { ...flags };
        delete next[removed.id];
        return next;
      });
      setSetTimerActive((active) => {
        if (!active) return null;
        if (active.exerciseIndex === exerciseIndex) return null;
        if (active.exerciseIndex > exerciseIndex) {
          return { ...active, exerciseIndex: active.exerciseIndex - 1 };
        }
        return active;
      });
    },
    [activeExercises],
  );

  const handleDiscard = useCallback(async () => {
    if (!onDiscard) return;
    if (
      !window.confirm(
        "Delete this workout permanently? Progress will be removed and cannot be undone.",
      )
    ) {
      return;
    }
    await onDiscard();
  }, [onDiscard]);

  const buildSnapshot = useCallback((): ActiveWorkoutFinishSnapshot => {
    return {
      title,
      workoutDate,
      workoutTime,
      exercises: activeExercises,
      setsByExercise,
      workoutNote,
      exerciseNotesByExerciseId: exerciseNotesById,
      activeDurationMs: displayedMs,
      sessionStartedAtMs,
      planId: planIdProp,
      lineIds,
    };
  }, [
    title,
    workoutDate,
    workoutTime,
    activeExercises,
    setsByExercise,
    workoutNote,
    exerciseNotesById,
    displayedMs,
    sessionStartedAtMs,
    planIdProp,
    lineIds,
  ]);

  const displayedMsRef = useRef(displayedMs);
  displayedMsRef.current = displayedMs;

  useEffect(() => {
    if (!onPersist) return;
    const id = window.setTimeout(() => {
      void onPersist({
        title,
        workoutDate,
        workoutTime,
        exercises: activeExercises,
        setsByExercise,
        workoutNote,
        exerciseNotesByExerciseId: exerciseNotesById,
        activeDurationMs: displayedMsRef.current,
        sessionStartedAtMs,
        planId: planIdProp,
        lineIds,
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [
    onPersist,
    title,
    workoutDate,
    workoutTime,
    activeExercises,
    setsByExercise,
    workoutNote,
    exerciseNotesById,
    sessionStartedAtMs,
    planIdProp,
    lineIds,
  ]);

  const handleFinish = useCallback(async () => {
    if (!onFinish) return;
    await onFinish(buildSnapshot());
  }, [onFinish, buildSnapshot]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              In progress
            </p>
            <div
              className="inline-flex items-center gap-4 rounded-full bg-zinc-100 px-3 py-1.5 text-zinc-900 dark:bg-zinc-800/90 dark:text-zinc-50"
              role="group"
              aria-label="Workout session timer"
            >
              <div className="flex items-center gap-2">
                <Timer
                  className="h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300"
                  aria-hidden
                />
                <p
                  className="text-sm font-semibold tabular-nums tracking-tight"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {formatElapsed(displayedMs)}
                </p>
                {timerPhase === "paused" && (
                  <span className="sr-only">Timer paused</span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {timerPhase === "idle" && (
                  <button
                    type="button"
                    onClick={startOrResumeTimer}
                    aria-label="Start workout timer"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors hover:bg-zinc-200/90 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                {timerPhase === "running" && (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    aria-label="Pause workout timer"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors hover:bg-zinc-200/90 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                )}
                {timerPhase === "paused" && (
                  <button
                    type="button"
                    onClick={startOrResumeTimer}
                    aria-label="Resume workout timer"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors hover:bg-zinc-200/90 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetTimer}
                  disabled={timerPhase === "idle" && displayedMs === 0}
                  aria-label="Reset workout timer"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-900 transition-colors hover:bg-zinc-200/90 disabled:pointer-events-none disabled:opacity-30 dark:text-zinc-50 dark:hover:bg-zinc-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {activeExercises.length} exercise
            {activeExercises.length === 1 ? "" : "s"} · {setCountLabel} set
            {setCountLabel === "1" ? "" : "s"}
          </p>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Home
        </Link>
      </header>

      <section className="shrink-0 space-y-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <WorkoutMetaFields
          title={title}
          workoutDate={workoutDate}
          workoutTime={workoutTime}
          onTitleChange={setTitle}
          onWorkoutDateChange={setWorkoutDate}
          onWorkoutTimeChange={setWorkoutTime}
          titleFallbackMs={sessionStartedAtMs}
        />
        <CollapsibleNote
          id="workout-session-note"
          summary="Workout note"
          value={workoutNote}
          onChange={setWorkoutNote}
          maxLength={500}
          placeholder="How you felt, sleep, context for this session…"
        />
      </section>

      <WorkoutAddExerciseCard
        currentCount={activeExercises.length}
        maxExercises={MAX_SESSION_EXERCISES}
        onAddCatalog={handleAddCatalogExercise}
        onAddCustom={handleAddCustomExercise}
      />

      <ul className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto ${onDiscard ? "pb-40" : "pb-28"}`}>
        {activeExercises.map((exercise, exerciseIndex) => (
          <li
            key={`${exerciseIndex}-${exercise.id}`}
            className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {exercise.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {metricHint(exercise.metric)}
                </p>
                {exercise.metric === "duration" && (
                  <label className="mt-2 flex max-w-full cursor-pointer items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600/40 dark:border-zinc-600 dark:bg-zinc-900"
                      checked={Boolean(durationTimerOnlyById[exercise.id])}
                      onChange={() => toggleDurationTimerOnly(exercise.id)}
                    />
                    <span>
                      Use only the set timer for hold time (hide min / sec
                      fields)
                    </span>
                  </label>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => addSet(exerciseIndex)}
                  className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
                >
                  Add set
                </button>
                <button
                  type="button"
                  onClick={() => removeExercise(exerciseIndex)}
                  disabled={activeExercises.length <= 1}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-red-700 disabled:opacity-30 dark:hover:text-red-300"
                  aria-label={`Remove ${exercise.name}`}
                >
                  <Trash2 className="size-3" />
                  Remove
                </button>
              </div>
            </div>
            <CollapsibleNote
              id={`exercise-note-${exercise.id}`}
              summary="Exercise note"
              value={exerciseNotesById[exercise.id] ?? ""}
              onChange={(v) => updateExerciseNote(exercise.id, v)}
              maxLength={400}
              placeholder="Equipment swaps, pain/limitations, cues for this lift…"
              className="mt-2"
            />
            <div className="mt-3 space-y-2">
              {(setsByExercise[exerciseIndex] ?? []).map((set, setIndex) => (
                <SetRowFields
                  key={`${exerciseIndex}-${exercise.id}-${setIndex}`}
                  exercise={exercise}
                  exerciseIndex={exerciseIndex}
                  setIndex={setIndex}
                  set={set}
                  updateSet={updateSet}
                  onDuplicateSet={duplicateSet}
                  hideManualSeconds={Boolean(
                    durationTimerOnlyById[exercise.id],
                  )}
                  setTimerActive={setTimerActive}
                  setTimerLiveMs={setTimerLiveMs}
                  onStartSetTimer={startSetTimer}
                  onSaveSetTimer={saveSetTimer}
                  onCancelSetTimer={cancelSetTimer}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-zinc-50/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-5">
          <p className="mb-2 text-center text-xs text-zinc-500">
            {activeExercises.length === 0
              ? "Add an exercise above to start logging sets."
              : "Progress saves automatically when you’re signed in. You can leave and continue later from Recent workouts."}
          </p>
          <button
            type="button"
            onClick={handleFinish}
            disabled={activeExercises.length === 0}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-500"
          >
            {activeExercises.length === 0
              ? "Add an exercise to finish"
              : "Finish workout"}
          </button>
          {onDiscard ? (
            <button
              type="button"
              onClick={() => void handleDiscard()}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="size-4" />
              Delete workout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type CollapsibleNoteProps = {
  id: string;
  summary: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
};

function CollapsibleNote({
  id,
  summary,
  value,
  onChange,
  maxLength = 500,
  placeholder = "",
  className = "",
}: CollapsibleNoteProps) {
  const filled = value.trim().length > 0;
  return (
    <details
      className={`rounded-lg border border-zinc-100 bg-zinc-50/60 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/40 ${className}`}
    >
      <summary className="cursor-pointer list-none text-xs font-medium text-zinc-600 marker:content-none dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-2 hover:underline">{summary}</span>
        <span className="ml-1.5 font-normal text-zinc-400">(optional)</span>
        {filled ? (
          <span
            className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
            aria-hidden
          >
            · has text
          </span>
        ) : null}
      </summary>
      <div className="mt-2">
        <label htmlFor={id} className="sr-only">
          {summary}
        </label>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={2}
          maxLength={maxLength}
          className="w-full resize-y rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10"
        />
        <p className="mt-1 text-right text-[10px] text-zinc-400">
          {value.length}/{maxLength}
        </p>
      </div>
    </details>
  );
}

type SetRowFieldsProps = {
  exercise: CatalogExercise;
  exerciseIndex: number;
  setIndex: number;
  set: SetRow;
  hideManualSeconds: boolean;
  setTimerActive: SetTimerActive | null;
  setTimerLiveMs: number;
  onStartSetTimer: (exerciseIndex: number, setIndex: number) => void;
  onSaveSetTimer: () => void;
  onCancelSetTimer: () => void;
  onDuplicateSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetRow,
    value: string,
  ) => void;
};

function SetRowFields({
  exercise,
  exerciseIndex,
  setIndex,
  set,
  hideManualSeconds,
  setTimerActive,
  setTimerLiveMs,
  onStartSetTimer,
  onSaveSetTimer,
  onCancelSetTimer,
  onDuplicateSet,
  updateSet,
}: SetRowFieldsProps) {
  const setNo = setIndex + 1;
  const idBase = `${exercise.id}-${setIndex}`;

  const setHeader = (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        Set {setNo}
      </span>
      <button
        type="button"
        onClick={() => onDuplicateSet(exerciseIndex, setIndex)}
        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
        aria-label={`Duplicate set ${setNo}`}
        title="Duplicate this set’s weight and reps"
      >
        <CopyPlus className="size-3.5" aria-hidden />
        Duplicate
      </button>
    </div>
  );

  const setTimerThis =
    setTimerActive !== null &&
    setTimerActive.exerciseIndex === exerciseIndex &&
    setTimerActive.setIndex === setIndex;

  const setTimerStrip = (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/90 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Set timer
      </span>
      {setTimerThis ? (
        <>
          <span
            className="font-mono text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-200"
            aria-live="polite"
          >
            {formatElapsed(setTimerLiveMs)}
          </span>
          <button
            type="button"
            onClick={onSaveSetTimer}
            className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white dark:bg-emerald-500"
          >
            Stop &amp; save
          </button>
          <button
            type="button"
            onClick={onCancelSetTimer}
            className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onStartSetTimer(exerciseIndex, setIndex)}
          disabled={setTimerActive !== null && !setTimerThis}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          title={
            setTimerActive !== null && !setTimerThis
              ? "Stop the other set timer first, or save/cancel it"
              : undefined
          }
        >
          Start
        </button>
      )}
    </div>
  );

  const setNoteField = (
    <CollapsibleNote
      id={`set-note-${idBase}`}
      summary={`Set ${setNo} note`}
      value={set.note}
      onChange={(v) => updateSet(exerciseIndex, setIndex, "note", v)}
      maxLength={200}
      placeholder="One-off detail for this set only…"
      className="mt-1.5"
    />
  );

  const numberFieldClassName =
    "h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-zinc-800 tabular-nums outline-none placeholder:font-sans placeholder:text-zinc-400 [appearance:textfield] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  if (exercise.metric === "duration") {
    const parts = splitTotalSeconds(set.seconds);
    const setDuration = (minutes: string, seconds: string) => {
      updateSet(
        exerciseIndex,
        setIndex,
        "seconds",
        combineToTotalSeconds(minutes, seconds),
      );
    };

    return (
      <div className="space-y-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800/80">
        {setHeader}
        {!hideManualSeconds && (
          <div className="grid grid-cols-2 items-end gap-2 text-sm">
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                htmlFor={`min-${idBase}`}
              >
                Min
              </label>
              <input
                id={`min-${idBase}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                autoComplete="off"
                value={parts.minutes}
                onChange={(e) => setDuration(e.target.value, parts.seconds)}
                placeholder="0"
                className={numberFieldClassName}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
                htmlFor={`sec-${idBase}`}
              >
                Sec
              </label>
              <input
                id={`sec-${idBase}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                step={1}
                autoComplete="off"
                value={parts.seconds}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setDuration(parts.minutes, "");
                    return;
                  }
                  const n = parseInt(raw, 10);
                  if (!Number.isFinite(n)) return;
                  setDuration(parts.minutes, String(Math.min(59, Math.max(0, n))));
                }}
                placeholder="0"
                className={numberFieldClassName}
              />
            </div>
          </div>
        )}
        {hideManualSeconds && (
          <div className="flex items-center gap-2 text-sm">
            <p className="text-zinc-700 dark:text-zinc-200">
              {set.seconds ? (
                <>
                  <span className="font-medium">Hold:</span>{" "}
                  <span className="font-mono tabular-nums">
                    {formatMinutesSecondsLabel(Number(set.seconds))}
                  </span>
                </>
              ) : (
                <span className="text-zinc-500">
                  Use set timer below to record this hold.
                </span>
              )}
            </p>
          </div>
        )}
        {setTimerStrip}
        {setNoteField}
      </div>
    );
  }

  if (exercise.metric === "bodyweight_reps") {
    return (
      <div className="space-y-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800/80">
        {setHeader}
        <div className="text-sm">
          <label className="sr-only" htmlFor={`r-${idBase}`}>
            Reps, set {setNo}
          </label>
          <input
            id={`r-${idBase}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoComplete="off"
            value={set.reps}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "reps", e.target.value)
            }
            placeholder="Reps"
            className={numberFieldClassName}
          />
        </div>
        {set.timedSetSec ? (
          <p className="text-[11px] text-zinc-500">
            Set time (auto):{" "}
            <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
              {set.timedSetSec}s
            </span>
          </p>
        ) : null}
        {setTimerStrip}
        {setNoteField}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800/80">
      {setHeader}
      <div className="grid grid-cols-2 items-center gap-2 text-sm">
        <div>
          <label className="sr-only" htmlFor={`w-${idBase}`}>
            Weight for set {setNo}
          </label>
          <input
            id={`w-${idBase}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoComplete="off"
            value={set.weight}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "weight", e.target.value)
            }
            placeholder="lb"
            className={numberFieldClassName}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`r-${idBase}`}>
            Reps for set {setNo}
          </label>
          <input
            id={`r-${idBase}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            autoComplete="off"
            value={set.reps}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "reps", e.target.value)
            }
            placeholder="reps"
            className={numberFieldClassName}
          />
        </div>
      </div>
      {set.timedSetSec ? (
        <p className="text-[11px] text-zinc-500">
          Set time (auto):{" "}
          <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
            {set.timedSetSec}s
          </span>
        </p>
      ) : null}
      {setTimerStrip}
      {setNoteField}
    </div>
  );
}
