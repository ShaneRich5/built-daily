"use client";

import type { CatalogExercise } from "@/lib/exercise-catalog";

type AlternateChipsProps = {
  /** The exercise in the slot now, for screen-reader labels. */
  currentName: string;
  alternates: CatalogExercise[];
  onSwap: (exercise: CatalogExercise) => void;
};

/** "or Pec deck · Dumbbell fly": one tap swaps when the machine is taken. */
export function AlternateChips({ currentName, alternates, onSwap }: AlternateChipsProps) {
  if (alternates.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 pl-[38px]">
      <span className="text-xs text-zinc-500 dark:text-zinc-400" aria-hidden>
        or
      </span>
      {alternates.map((exercise) => (
        <button
          key={exercise.id}
          type="button"
          onClick={() => onSwap(exercise)}
          className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <span className="sr-only">Swap {currentName} for </span>
          {exercise.name}
        </button>
      ))}
    </div>
  );
}
