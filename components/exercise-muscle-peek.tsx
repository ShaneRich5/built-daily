"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MuscleFocusPicker } from "@/components/muscle-focus-picker";
import { MuscleTargetDiagram } from "@/components/muscle-target-diagram";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import {
  defaultMuscleFocus,
  muscleGroupLabel,
  muscleTargetSummary,
  type MuscleFocus,
} from "@/lib/exercise-muscle";

type ExerciseMusclePeekProps = {
  exercise: CatalogExercise | null;
  open: boolean;
  onClose: () => void;
  /** Optional workout start URL, e.g. `/workout?e=bench`. */
  startHref?: string;
};

export function ExerciseMusclePeek({
  exercise,
  open,
  onClose,
  startHref,
}: ExerciseMusclePeekProps) {
  const [focusOverride, setFocusOverride] = useState<MuscleFocus | null>(null);

  useEffect(() => {
    if (!open) return;
    setFocusOverride(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, exercise?.id]);

  if (!open || !exercise) return null;

  const autoFocus = defaultMuscleFocus(exercise.primary, exercise.secondary);
  const focus = focusOverride ?? autoFocus;
  const summary = muscleTargetSummary(exercise.primary, exercise.secondary);
  const isCardio = exercise.primary === "cardio";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-muscle-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-zinc-950 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="exercise-muscle-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {exercise.name}
            </h2>
            {summary ? (
              <p className="mt-0.5 text-sm text-zinc-500">{summary}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {isCardio ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Cardio is a full-body effort, not a single muscle group.
            </p>
          ) : null}

          <MuscleTargetDiagram
            primary={exercise.primary}
            secondary={exercise.secondary}
            focus={focus}
          />

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">View</p>
            <MuscleFocusPicker value={focus} onChange={setFocusOverride} />
          </div>

          {!isCardio && exercise.primary && exercise.primary !== "other" ? (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              <li className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
                {muscleGroupLabel(exercise.primary)} (main)
              </li>
              {(exercise.secondary ?? []).map((g) => (
                <li key={g} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-800" />
                  {muscleGroupLabel(g)}
                </li>
              ))}
            </ul>
          ) : null}

          {startHref ? (
            <Link
              href={startHref}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Start workout
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
