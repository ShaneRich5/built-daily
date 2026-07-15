"use client";

import { History, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { formatLocalDateKey, formatWorkoutHeaderDate } from "@/lib/workout-date";
import { formatSetSummary } from "@/lib/workout-journal-export";
import type { ExerciseHistoryEntry } from "@/lib/workout-session-repository";
import type { SetLog } from "@/lib/workout-types";

type ApplyMode = "replace" | "append";

type ExerciseHistoryControlsProps = {
  exerciseName: string;
  entries: ExerciseHistoryEntry[];
  loading: boolean;
  hasCurrentValues: boolean;
  onUseSets: (sets: SetLog[], mode: ApplyMode) => void;
};

function dateLabel(entry: ExerciseHistoryEntry): string {
  return entry.workoutDate
    ? formatLocalDateKey(entry.workoutDate)
    : formatWorkoutHeaderDate(entry.performedAt.getTime());
}

function setsLabel(sets: SetLog[]): string {
  if (sets.length === 0) return "No sets recorded";
  const summaries = sets.map(formatSetSummary);
  const allSame = summaries.every((summary) => summary === summaries[0]);
  if (allSame) {
    return `${sets.length} set${sets.length === 1 ? "" : "s"} · ${summaries[0]}`;
  }
  return summaries.join(" · ");
}

export function ExerciseHistoryControls({
  exerciseName,
  entries,
  loading,
  hasCurrentValues,
  onUseSets,
}: ExerciseHistoryControlsProps) {
  const [open, setOpen] = useState(false);
  const latest = entries[0];

  const useLatest = () => {
    if (!latest) {
      setOpen(true);
      return;
    }
    if (hasCurrentValues) {
      setOpen(true);
      return;
    }
    onUseSets(latest.line.sets, "replace");
  };

  return (
    <>
      <div className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        {loading ? (
          <p className="text-xs text-zinc-400">Checking previous workouts…</p>
        ) : latest ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Last workout · {dateLabel(latest)}
              </p>
              <p className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                {setsLabel(latest.line.sets)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={useLatest}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-zinc-900 px-2.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                <RotateCcw className="size-3" aria-hidden />
                Use last
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <History className="size-3" aria-hidden />
                History
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center gap-1 text-xs font-medium text-zinc-500"
          >
            <History className="size-3.5" aria-hidden />
            Exercise history
          </button>
        )}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${exerciseName} history`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[82vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl dark:bg-zinc-950">
            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Exercise history
                </p>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {exerciseName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                aria-label="Close exercise history"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="max-h-[calc(82vh-76px)] overflow-y-auto p-4">
              {loading ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Loading history…
                </p>
              ) : entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No previous completed workouts found for this exercise.
                </p>
              ) : (
                <ul className="space-y-3">
                  {entries.map((entry) => (
                    <li
                      key={`${entry.sessionId}-${entry.line.lineId}`}
                      className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {dateLabel(entry)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {entry.sessionTitle}
                      </p>
                      <ol className="mt-2 space-y-1">
                        {entry.line.sets.map((set, index) => (
                          <li
                            key={index}
                            className="text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="mr-2 text-xs text-zinc-400">
                              {index + 1}.
                            </span>
                            {formatSetSummary(set)}
                          </li>
                        ))}
                      </ol>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onUseSets(entry.line.sets, "replace");
                            setOpen(false);
                          }}
                          className="h-9 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Replace current sets
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUseSets(entry.line.sets, "append");
                            setOpen(false);
                          }}
                          className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                        >
                          Add these sets
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
