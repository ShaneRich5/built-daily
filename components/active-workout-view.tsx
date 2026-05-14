"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogExercise, ExerciseMetric } from "@/lib/exercise-catalog";

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
  onFinish?: () => void;
};

type SetTimerActive = {
  exerciseIndex: number;
  setIndex: number;
  startedAt: number;
};

export function ActiveWorkoutView({
  title,
  exercises,
  onFinish,
}: ActiveWorkoutViewProps) {
  const [setsByExercise, setSetsByExercise] = useState<SetRow[][]>(() =>
    exercises.map(() => [emptySetRow()]),
  );

  const [workoutNote, setWorkoutNote] = useState("");
  const [exerciseNotesById, setExerciseNotesById] = useState<
    Record<string, string>
  >({});

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
    "idle",
  );
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [segmentStart, setSegmentStart] = useState<number | null>(null);
  const [displayedMs, setDisplayedMs] = useState(0);

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
    const metric = exercises[exerciseIndex]?.metric;
    if (metric === "duration") {
      updateSet(exerciseIndex, setIndex, "seconds", String(sec));
    } else {
      updateSet(exerciseIndex, setIndex, "timedSetSec", String(sec));
    }
    setSetTimerActive(null);
    setSetTimerLiveMs(0);
  }, [exercises, setTimerActive, updateSet]);

  const addSet = useCallback((exerciseIndex: number) => {
    setSetsByExercise((prev) => {
      const next = prev.map((sets) => [...sets]);
      const sets = next[exerciseIndex];
      if (!sets) return prev;
      sets.push(emptySetRow());
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              In progress
            </p>
            <p
              className="font-mono text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatElapsed(displayedMs)}
            </p>
            {timerPhase === "paused" && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/80 dark:text-amber-100">
                Paused
              </span>
            )}
            {timerPhase === "idle" && (
              <button
                type="button"
                onClick={startOrResumeTimer}
                aria-label="Start workout timer"
                className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Start timer
              </button>
            )}
            {timerPhase === "running" && (
              <button
                type="button"
                onClick={pauseTimer}
                aria-label="Pause workout timer"
                className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                Pause
              </button>
            )}
            {timerPhase === "paused" && (
              <button
                type="button"
                onClick={startOrResumeTimer}
                aria-label="Resume workout timer"
                className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Resume
              </button>
            )}
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {exercises.length} exercise
            {exercises.length === 1 ? "" : "s"} · {setCountLabel} set
            {setCountLabel === "1" ? "" : "s"}
          </p>
          <CollapsibleNote
            id="workout-session-note"
            summary="Workout note"
            value={workoutNote}
            onChange={setWorkoutNote}
            maxLength={500}
            placeholder="How you felt, sleep, context for this session…"
          />
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Home
        </Link>
      </header>

      <ul className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-28">
        {exercises.map((exercise, exerciseIndex) => (
          <li
            key={exercise.id}
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
                      Use only the set timer for hold time (hide manual seconds
                      field)
                    </span>
                  </label>
                )}
              </div>
              <button
                type="button"
                onClick={() => addSet(exerciseIndex)}
                className="shrink-0 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
              >
                Add set
              </button>
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
                  key={`${exercise.id}-${setIndex}`}
                  exercise={exercise}
                  exerciseIndex={exerciseIndex}
                  setIndex={setIndex}
                  set={set}
                  updateSet={updateSet}
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
        <div className="mx-auto w-full max-w-lg px-4 sm:px-5">
          <p className="mb-2 text-center text-xs text-zinc-500">
            Session: Start / Pause above. Optional notes live on the workout,
            each exercise, and each set until you add persistence.
          </p>
          <button
            type="button"
            onClick={onFinish}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 text-base font-semibold text-white dark:bg-emerald-500"
          >
            Finish workout
          </button>
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
  updateSet,
}: SetRowFieldsProps) {
  const setNo = setIndex + 1;
  const idBase = `${exercise.id}-${setIndex}`;

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

  if (exercise.metric === "duration") {
    return (
      <div className="space-y-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800/80">
        {!hideManualSeconds && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
            <div>
              <label className="sr-only" htmlFor={`sec-${idBase}`}>
                Hold time in seconds, set {setNo}
              </label>
              <input
                id={`sec-${idBase}`}
                inputMode="numeric"
                autoComplete="off"
                value={set.seconds}
                onChange={(e) =>
                  updateSet(exerciseIndex, setIndex, "seconds", e.target.value)
                }
                placeholder="Seconds"
                className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-800 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <span className="w-8 text-center text-xs text-zinc-400">{setNo}</span>
          </div>
        )}
        {hideManualSeconds && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="text-zinc-700 dark:text-zinc-200">
              {set.seconds ? (
                <>
                  <span className="font-medium">Hold:</span>{" "}
                  <span className="font-mono tabular-nums">{set.seconds}s</span>
                </>
              ) : (
                <span className="text-zinc-500">
                  Use set timer below to record this hold.
                </span>
              )}
            </p>
            <span className="w-8 shrink-0 text-center text-xs text-zinc-400">
              {setNo}
            </span>
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
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
          <div>
            <label className="sr-only" htmlFor={`r-${idBase}`}>
              Reps, set {setNo}
            </label>
            <input
              id={`r-${idBase}`}
              inputMode="numeric"
              autoComplete="off"
              value={set.reps}
              onChange={(e) =>
                updateSet(exerciseIndex, setIndex, "reps", e.target.value)
              }
              placeholder="Reps"
              className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-800 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <span className="w-8 text-center text-xs text-zinc-400">{setNo}</span>
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
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-sm">
        <div>
          <label className="sr-only" htmlFor={`w-${idBase}`}>
            Weight for set {setNo}
          </label>
          <input
            id={`w-${idBase}`}
            inputMode="decimal"
            autoComplete="off"
            value={set.weight}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "weight", e.target.value)
            }
            placeholder="lb"
            className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-800 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor={`r-${idBase}`}>
            Reps for set {setNo}
          </label>
          <input
            id={`r-${idBase}`}
            inputMode="numeric"
            autoComplete="off"
            value={set.reps}
            onChange={(e) =>
              updateSet(exerciseIndex, setIndex, "reps", e.target.value)
            }
            placeholder="reps"
            className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-zinc-800 outline-none placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <span className="w-8 text-center text-xs text-zinc-400">{setNo}</span>
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
