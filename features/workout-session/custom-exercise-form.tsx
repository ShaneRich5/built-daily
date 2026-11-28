"use client";

import { useState } from "react";
import { resolveCustomExercise } from "@/lib/custom-exercise";
import type { CatalogExercise, ExerciseMetric } from "@/lib/exercise-catalog";
import { cn } from "@/lib/utils";
import { metricLabel } from "@/features/workout-session/session-model";

/** Reps + weight is first: free weights are the most common custom move. */
const DEFAULT_METRIC: ExerciseMetric = "weight_reps";

const METRIC_CHOICES: Array<{
  metric: ExerciseMetric;
  label: string;
  hint: string;
}> = [
  {
    metric: "weight_reps",
    label: metricLabel("weight_reps"),
    hint: "Dumbbells, barbells",
  },
  {
    metric: "bodyweight_reps",
    label: metricLabel("bodyweight_reps"),
    hint: "Push-ups, sit-ups",
  },
  { metric: "duration", label: "Time", hint: "Stretching, warm-ups" },
  { metric: "cardio", label: metricLabel("cardio"), hint: "Time and distance" },
];

type CustomExerciseFormProps = {
  initialName: string;
  /** Replace and alternate modes use the exercise right away. */
  actionLabel: string;
  /** False when the workout is already full. */
  canSubmit: boolean;
  pastCustom: CatalogExercise[];
  onSubmit: (exercise: CatalogExercise) => void;
  onCancel: () => void;
};

/** One quick step: a name and how it is logged. */
export function CustomExerciseForm({
  initialName,
  actionLabel,
  canSubmit,
  pastCustom,
  onSubmit,
  onCancel,
}: CustomExerciseFormProps) {
  const [name, setName] = useState(initialName);
  const [metric, setMetric] = useState<ExerciseMetric>(DEFAULT_METRIC);

  const match = resolveCustomExercise(name, metric, pastCustom);
  const existing = match && match.source !== "new" ? match.exercise : null;

  return (
    <form
      className="flex flex-col gap-4 px-4 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (match && canSubmit) onSubmit(match.exercise);
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="custom-exercise-name"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-50"
        >
          Exercise name
        </label>
        <input
          id="custom-exercise-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dynamic stretch, dumbbell curl…"
          autoComplete="off"
          maxLength={200}
          className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {existing ? (
        <p className="rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {match?.source === "catalog"
            ? `“${existing.name}” is already in the list, so we’ll use that one`
            : `You’ve logged “${existing.name}” before, so we’ll use that one`}{" "}
          ({metricLabel(existing.metric)}).
        </p>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            How do you log it?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {METRIC_CHOICES.map((choice) => {
              const active = metric === choice.metric;
              return (
                <button
                  key={choice.metric}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMetric(choice.metric)}
                  className={cn(
                    "flex min-h-16 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left",
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
                  )}
                >
                  <span className="text-[15px] font-semibold">
                    {choice.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      active
                        ? "text-zinc-300 dark:text-zinc-600"
                        : "text-zinc-500 dark:text-zinc-400",
                    )}
                  >
                    {choice.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 shrink-0 rounded-lg border border-zinc-200 px-4 text-[15px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!match || !canSubmit}
          className="h-12 min-w-0 flex-1 rounded-lg bg-emerald-700 text-[15px] font-semibold text-white hover:bg-emerald-800 disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-emerald-600 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          {actionLabel}
        </button>
      </div>
    </form>
  );
}
