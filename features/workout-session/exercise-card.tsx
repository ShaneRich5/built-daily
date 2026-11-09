"use client";

import { ArrowRight, ChevronDown, Copy, Plus, SlidersHorizontal } from "lucide-react";
import type { SetLog } from "@/lib/workout-types";
import { cn } from "@/lib/utils";
import { ExerciseStatusIcon } from "@/features/workout-session/exercise-status-icon";
import {
  exerciseProgress,
  metricLabel,
  quickFieldsForMetric,
  suggestionForSet,
  summarizeSetLogs,
  summarizeSetRows,
  type SessionExercise,
  type SetRow,
} from "@/features/workout-session/session-model";
import { QuickSetRow, setGridColumns } from "@/features/workout-session/set-row";

export type ExerciseCardProps = {
  item: SessionExercise;
  open: boolean;
  /** Sets from the most recent past workout with this exercise. */
  lastTimeSets?: SetLog[];
  /** Another exercise still has sets left (shows "Next exercise" once this one is done). */
  hasNextExercise: boolean;
  onToggleOpen: () => void;
  onOpenDetails: () => void;
  onUpdateSet: (setIndex: number, patch: Partial<SetRow>) => void;
  onToggleSetDone: (setIndex: number, suggestion: SetRow | null) => void;
  onAddSet: () => void;
  onCopyLastSet: () => void;
  onNextExercise: () => void;
};

function cardSubtitle(item: SessionExercise, open: boolean, lastTimeSets?: SetLog[]): string {
  const { sets, exercise, note } = item;
  const lastTime = lastTimeSets ? summarizeSetLogs(lastTimeSets) : "";
  const progress = exerciseProgress(sets);
  const noteBit = note.trim() ? " · Note" : "";

  if (open) {
    return (lastTime ? `Last time · ${lastTime}` : metricLabel(exercise.metric)) + noteBit;
  }
  if (progress === "done") {
    return (summarizeSetRows(sets, exercise.metric) || `${sets.length} sets done`) + noteBit;
  }
  if (progress === "in_progress") {
    const done = sets.filter((set) => set.done).length;
    const logged = summarizeSetRows(sets, exercise.metric);
    return `${done} of ${sets.length} sets done${logged ? ` · ${logged}` : ""}${noteBit}`;
  }
  return (lastTime ? `Not started · Last ${lastTime}` : "Not started") + noteBit;
}

/** One exercise: a one-line row when closed, the quick set logger when open. */
export function ExerciseCard({
  item,
  open,
  lastTimeSets,
  hasNextExercise,
  onToggleOpen,
  onOpenDetails,
  onUpdateSet,
  onToggleSetDone,
  onAddSet,
  onCopyLastSet,
  onNextExercise,
}: ExerciseCardProps) {
  const { exercise, sets } = item;
  const progress = exerciseProgress(sets);
  const subtitle = cardSubtitle(item, open, lastTimeSets);

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={false}
        className="flex min-h-14 w-full items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      >
        <ExerciseStatusIcon progress={progress} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
            {exercise.name}
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-zinc-400" aria-hidden />
      </button>
    );
  }

  const fields = quickFieldsForMetric(exercise.metric);

  return (
    <section
      aria-label={exercise.name}
      className="rounded-xl border-[1.5px] border-zinc-900 bg-white dark:border-zinc-200 dark:bg-zinc-950"
    >
      <div className="flex items-center gap-2 py-2 pr-2 pl-3">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <ExerciseStatusIcon progress={progress} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
              {exercise.name}
            </span>
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </span>
          </span>
          <span className="sr-only">Collapse {exercise.name}</span>
        </button>
        <button
          type="button"
          onClick={onOpenDetails}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Details
          <span className="sr-only">for {exercise.name}</span>
        </button>
      </div>

      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div
          className="grid gap-2 text-[11px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
          style={{ gridTemplateColumns: setGridColumns(fields.length) }}
          aria-hidden
        >
          <span>Set</span>
          {fields.map((spec) => (
            <span key={spec.id}>{spec.label}</span>
          ))}
          <span />
        </div>

        {sets.map((set, setIndex) => {
          const suggestion = suggestionForSet(sets, setIndex, lastTimeSets);
          return (
            <QuickSetRow
              key={setIndex}
              setNumber={setIndex + 1}
              set={set}
              fields={fields}
              suggestion={suggestion}
              onChange={(patch) => onUpdateSet(setIndex, patch)}
              onToggleDone={() => onToggleSetDone(setIndex, suggestion)}
            />
          );
        })}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onAddSet}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Plus className="size-3.5" aria-hidden />
            Add set
          </button>
          <button
            type="button"
            onClick={onCopyLastSet}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Copy className="size-3.5" aria-hidden />
            Copy last set
          </button>
        </div>

        {progress === "done" && hasNextExercise ? (
          <button
            type="button"
            onClick={onNextExercise}
            className={cn(
              "mt-1 inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800",
              "dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
            )}
          >
            Next exercise
            <ArrowRight className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </section>
  );
}
