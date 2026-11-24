"use client";

import { muscleGroupLabel } from "@/lib/exercise-muscle";
import type { MuscleGroup } from "@/lib/progress-types";

function filterCopy(
  group: MuscleGroup,
  shown: number,
  total: number,
  hidden: number,
): { title: string; detail: string } {
  const label = muscleGroupLabel(group);
  if (shown === 0) {
    return {
      title: `No exercises hit ${label.toLowerCase()}`,
      detail:
        total === 1
          ? "1 exercise is hidden"
          : `All ${total} exercises are hidden`,
    };
  }
  if (hidden === 0) {
    return {
      title: `Showing ${label.toLowerCase()}`,
      detail: total === 1 ? "1 exercise" : `All ${total} exercises`,
    };
  }
  return {
    title: `Showing ${label.toLowerCase()}`,
    detail: `${shown} of ${total} · ${hidden} hidden`,
  };
}

export function SessionMuscleFilterBanner({
  group,
  shown,
  total,
  onClear,
  tone = "light",
}: {
  group: MuscleGroup;
  shown: number;
  total: number;
  onClear: () => void;
  tone?: "light" | "dark";
}) {
  const hidden = Math.max(0, total - shown);
  const copy = filterCopy(group, shown, total, hidden);
  const dark = tone === "dark";

  return (
    <div
      className={
        dark
          ? "flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2"
          : "flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/40"
      }
      role="status"
      aria-live="polite"
    >
      <p className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${
            dark ? "text-slate-100" : "text-emerald-950 dark:text-emerald-100"
          }`}
        >
          {copy.title}
        </span>
        <span
          className={`mt-0.5 block text-xs ${
            dark
              ? "text-slate-400"
              : "text-emerald-800/80 dark:text-emerald-300/80"
          }`}
        >
          {copy.detail}
        </span>
      </p>
      <button
        type="button"
        onClick={onClear}
        className={
          dark
            ? "inline-flex h-10 shrink-0 items-center rounded-lg bg-white px-3 text-sm font-semibold text-zinc-900"
            : "inline-flex h-10 shrink-0 items-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-emerald-950"
        }
      >
        Show all
      </button>
    </div>
  );
}

/** Dashed list row so hidden exercises stay visible as a clear action. */
export function HiddenExercisesClearRow({
  hidden,
  onClear,
}: {
  hidden: number;
  onClear: () => void;
}) {
  if (hidden <= 0) return null;
  return (
    <li>
      <button
        type="button"
        onClick={onClear}
        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200"
      >
        {hidden === 1
          ? "1 exercise is hidden · Show all"
          : `${hidden} exercises are hidden · Show all`}
      </button>
    </li>
  );
}
