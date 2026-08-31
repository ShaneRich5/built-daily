"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MuscleTargetDiagram } from "@/components/muscle-target-diagram";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import {
  defaultMuscleFocus,
  MUSCLE_FOCUS_OPTIONS,
  muscleGroupLabel,
  muscleTargetSummary,
  type MuscleFocus,
} from "@/lib/exercise-muscle";

type ExerciseMusclePeekProps = {
  exercise: CatalogExercise | null;
  open: boolean;
  onClose: () => void;
};

export function ExerciseMusclePeek({
  exercise,
  open,
  onClose,
}: ExerciseMusclePeekProps) {
  const [focusOverride, setFocusOverride] = useState<MuscleFocus | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
            <p className="mb-2 text-xs font-medium text-zinc-500">Focus</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MUSCLE_FOCUS_OPTIONS.map((option) => {
                const on = focus === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFocusOverride(option.id)}
                    className={`h-10 rounded-lg border text-xs font-semibold transition ${
                      on
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
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
        </div>
      </div>
    </div>
  );
}
