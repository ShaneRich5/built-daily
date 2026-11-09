"use client";

import { Plus } from "lucide-react";
import type { CatalogExercise } from "@/lib/exercise-catalog";

type AddExerciseFooterProps = {
  /** Past-workout picks for "Usually next" (may be empty). */
  suggestions: CatalogExercise[];
  /** No exercises yet, so the picks are what you usually open with. */
  isFirst: boolean;
  atLimit: boolean;
  onOpenSearch: () => void;
  onAddSuggestion: (exercise: CatalogExercise) => void;
};

/** Sits under the last exercise: new exercises land here, in the order you do them. */
export function AddExerciseFooter({
  suggestions,
  isFirst,
  atLimit,
  onOpenSearch,
  onAddSuggestion,
}: AddExerciseFooterProps) {
  if (atLimit) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
        That&apos;s the 40-exercise limit for one workout.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border-[1.5px] border-dashed border-zinc-300 p-3 dark:border-zinc-700">
      <button
        type="button"
        onClick={onOpenSearch}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <Plus className="size-4" aria-hidden />
        Add exercise
      </button>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span id="usually-next-label" className="text-xs text-zinc-500 dark:text-zinc-400">
            {isFirst ? "You usually start with:" : "Usually next:"}
          </span>
          <ul aria-labelledby="usually-next-label" className="contents">
            {suggestions.map((exercise) => (
              <li key={exercise.id} className="contents">
                <button
                  type="button"
                  onClick={() => onAddSuggestion(exercise)}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <Plus className="size-3" aria-hidden />
                  <span className="sr-only">Add</span>
                  {exercise.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
