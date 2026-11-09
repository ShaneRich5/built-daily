"use client";

import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  catalogExerciseFromCustomName,
  EXERCISE_CATALOG,
  filterCatalogByMuscle,
  filterCatalogExercises,
  type CatalogExercise,
} from "@/lib/exercise-catalog";
import {
  CATALOG_MUSCLE_FILTERS,
  muscleTargetSummary,
  targetingForExercise,
} from "@/lib/exercise-muscle";
import type { MuscleGroup } from "@/lib/progress-types";
import { cn } from "@/lib/utils";
import { metricLabel } from "@/features/workout-session/session-model";

export type ExerciseSearchMode =
  | { kind: "add"; afterName: string | null; room: number }
  | { kind: "replace"; currentName: string };

type Filter = "suggested" | "recent" | "all" | MuscleGroup;

type ExerciseSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ExerciseSearchMode;
  suggested: CatalogExercise[];
  recent: CatalogExercise[];
  /** Add mode: the picked exercises, in the order they were tapped. */
  onAdd: (exercises: CatalogExercise[]) => void;
  /** Replace mode: the single replacement. */
  onReplace: (exercise: CatalogExercise) => void;
};

function exerciseMeta(exercise: CatalogExercise): string {
  const { primary, secondary } = targetingForExercise(exercise);
  const muscles = muscleTargetSummary(primary, secondary);
  return muscles ? `${muscles} · ${metricLabel(exercise.metric)}` : metricLabel(exercise.metric);
}

/**
 * Search the catalog and pick several exercises at once (numbered in tap
 * order), or pick one replacement. Remount (via `key`) to reset between opens.
 */
export function ExerciseSearchSheet({
  open,
  onOpenChange,
  mode,
  suggested,
  recent,
  onAdd,
  onReplace,
}: ExerciseSearchSheetProps) {
  const isReplace = mode.kind === "replace";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>(
    suggested.length > 0 ? "suggested" : recent.length > 0 ? "recent" : "all",
  );
  const [picked, setPicked] = useState<CatalogExercise[]>([]);
  const room = mode.kind === "add" ? mode.room : 1;

  const filters: Array<{ id: Filter; label: string }> = [
    ...(suggested.length > 0 ? [{ id: "suggested" as const, label: "Suggested" }] : []),
    ...(recent.length > 0 ? [{ id: "recent" as const, label: "Recent" }] : []),
    { id: "all", label: "All" },
    ...CATALOG_MUSCLE_FILTERS,
  ];

  const results = useMemo(() => {
    const searching = query.trim().length > 0;
    let base: CatalogExercise[];
    if (searching) base = filterCatalogExercises(query);
    else if (filter === "suggested") base = suggested;
    else if (filter === "recent") base = recent;
    else base = EXERCISE_CATALOG;
    const group =
      filter === "suggested" || filter === "recent" || filter === "all" ? null : filter;
    return group ? filterCatalogByMuscle(base, group) : base;
  }, [query, filter, suggested, recent]);

  const pickedIndex = (exercise: CatalogExercise) =>
    picked.findIndex((p) => p.id === exercise.id);

  const handleTap = (exercise: CatalogExercise) => {
    if (isReplace) {
      onReplace(exercise);
      return;
    }
    const index = pickedIndex(exercise);
    if (index >= 0) {
      setPicked((prev) => prev.filter((p) => p.id !== exercise.id));
    } else if (picked.length < room) {
      setPicked((prev) => [...prev, exercise]);
    }
  };

  const customName = query.trim();
  const addCustom = () => {
    const custom = catalogExerciseFromCustomName(customName);
    if (!custom) return;
    if (isReplace) {
      onReplace(custom);
      return;
    }
    if (picked.length >= room) return;
    setPicked((prev) => [...prev, custom]);
    setQuery("");
  };

  const title = isReplace ? "Change exercise" : "Add exercises";
  const description = isReplace
    ? `Pick a replacement for ${mode.currentName}`
    : mode.afterName
      ? `Added after ${mode.afterName}, in the order you pick`
      : "Added in the order you pick";

  const footer = isReplace ? null : (
    <button
      type="button"
      disabled={picked.length === 0}
      onClick={() => onAdd(picked)}
      className="h-12 w-full rounded-lg bg-zinc-900 text-[15px] font-semibold text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
    >
      {picked.length === 0
        ? "Pick exercises to add"
        : `Add ${picked.length} exercise${picked.length === 1 ? "" : "s"}`}
    </button>
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={footer}
      className="h-[90dvh]"
    >
      <div className="sticky top-0 z-10 flex flex-col gap-2 bg-white px-4 pb-2 dark:bg-zinc-950">
        <label htmlFor="exercise-search" className="sr-only">
          Search exercises
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            id="exercise-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leg press, lat pulldown, cable…"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-3 pl-9 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter exercises">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium",
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {picked.length > 0 ? (
        <p className="px-4 pb-2 text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Picked: {picked.map((p) => p.name).join(", ")}
        </p>
      ) : null}
      <ul className="flex flex-col gap-1 px-4 pb-4">
        {results.map((exercise) => {
          const index = pickedIndex(exercise);
          const isPicked = index >= 0;
          return (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => handleTap(exercise)}
                aria-pressed={isReplace ? undefined : isPicked}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                  isPicked
                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                )}
              >
                {isReplace ? null : (
                  <span
                    className={cn(
                      "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      isPicked
                        ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-zinc-950"
                        : "border-zinc-300 dark:border-zinc-600",
                    )}
                    aria-hidden
                  >
                    {isPicked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                    {exercise.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {exerciseMeta(exercise)}
                  </span>
                </span>
                {isPicked ? (
                  <span className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    #{index + 1}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {results.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-zinc-500">
            No matches{customName ? ` for “${customName}”` : ""}.
          </li>
        ) : null}
        {customName ? (
          <li>
            <button
              type="button"
              onClick={addCustom}
              className="mt-1 flex min-h-12 w-full items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <Plus className="size-4" aria-hidden />
              {isReplace ? "Use" : "Add"} “{customName}” as a custom exercise
            </button>
          </li>
        ) : null}
      </ul>
    </BottomSheet>
  );
}
