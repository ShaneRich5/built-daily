"use client";

import { Search } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EXERCISE_CATALOG, type CatalogExercise } from "@/lib/exercise-catalog";
import { muscleGroupLabel } from "@/lib/exercise-muscle";
import { metricLabel, type SessionExercise } from "@/features/workout-session/session-model";

/** How many "Similar" picks to show under the saved alternates. */
const SIMILAR_LIMIT = 4;

type SwapExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SessionExercise;
  onSwap: (exercise: CatalogExercise) => void;
  onSearchAll: () => void;
};

const rowButton =
  "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900";
const sectionLabel =
  "px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400";

/** Same main muscle; never the current exercise or a saved alternate. */
function similarTo(item: SessionExercise): CatalogExercise[] {
  const primary = item.exercise.primary;
  if (!primary) return [];
  const skip = new Set([item.exercise.id, ...item.alternates.map((alt) => alt.id)]);
  return EXERCISE_CATALOG.filter(
    (exercise) => exercise.primary === primary && !skip.has(exercise.id),
  ).slice(0, SIMILAR_LIMIT);
}

/** Machine taken? Pick what fills this slot. The current one becomes an alternate. */
export function SwapExerciseSheet({
  open,
  onOpenChange,
  item,
  onSwap,
  onSearchAll,
}: SwapExerciseSheetProps) {
  const similar = similarTo(item);
  const primary = item.exercise.primary;

  const pick = (exercise: CatalogExercise) => {
    onSwap(exercise);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Swap ${item.exercise.name}`}
      description="Machine taken? Sets you log go to whatever you pick."
      footer={
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-12 w-full rounded-lg border border-zinc-200 text-[15px] font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Keep {item.exercise.name}
        </button>
      }
    >
      <div className="flex flex-col gap-1 px-4 pb-2">
        <button
          type="button"
          onClick={onSearchAll}
          className="flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Search className="size-4" aria-hidden />
          Search any exercise
        </button>

        {item.alternates.length > 0 ? (
          <SwapList label="Your alternates for this slot" exercises={item.alternates} onPick={pick} />
        ) : null}
        {similar.length > 0 && primary ? (
          <SwapList label={`Similar · ${muscleGroupLabel(primary)}`} exercises={similar} onPick={pick} />
        ) : null}
      </div>
    </BottomSheet>
  );
}

function SwapList({
  label,
  exercises,
  onPick,
}: {
  label: string;
  exercises: CatalogExercise[];
  onPick: (exercise: CatalogExercise) => void;
}) {
  return (
    <section className="flex flex-col">
      <h3 className={sectionLabel}>{label}</h3>
      <ul className="flex flex-col">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <button type="button" className={rowButton} onClick={() => onPick(exercise)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{exercise.name}</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {metricLabel(exercise.metric)}
                </span>
              </span>
              <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                Use<span className="sr-only"> {exercise.name}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
