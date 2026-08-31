"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { ExerciseMusclePeek } from "@/components/exercise-muscle-peek";
import { MuscleFocusPicker } from "@/components/muscle-focus-picker";
import { MuscleTargetDiagram } from "@/components/muscle-target-diagram";
import {
  filterCatalogByMuscle,
  filterCatalogExercises,
  type CatalogExercise,
} from "@/lib/exercise-catalog";
import {
  CATALOG_MUSCLE_FILTERS,
  focusForMuscleGroup,
  muscleGroupLabel,
  muscleTargetSummary,
  type MuscleFocus,
} from "@/lib/exercise-muscle";
import type { MuscleGroup } from "@/lib/progress-types";

export function ExerciseCatalogBrowser() {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [viewFocus, setViewFocus] = useState<MuscleFocus>("full");
  const [peekExercise, setPeekExercise] = useState<CatalogExercise | null>(
    null,
  );

  const filtered = useMemo(() => {
    return filterCatalogByMuscle(filterCatalogExercises(query), muscleFilter);
  }, [query, muscleFilter]);

  const filterLabel = muscleFilter ? muscleGroupLabel(muscleFilter) : null;
  const isCardioFilter = muscleFilter === "cardio";

  function toggleFilter(group: MuscleGroup) {
    const next = muscleFilter === group ? null : group;
    setMuscleFilter(next);
    setViewFocus(focusForMuscleGroup(next));
  }

  function clearFilter() {
    setMuscleFilter(null);
    setViewFocus("full");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">Exercises</p>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Exercise catalog
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Crop the body to a region, then tap a muscle to filter the list.
        </p>
      </header>

      <section
        className="rounded-2xl bg-[#0b1220] px-3 py-4"
        aria-label="Muscle map"
      >
        <MuscleTargetDiagram
          primary={isCardioFilter ? undefined : (muscleFilter ?? undefined)}
          focus={viewFocus}
          onSelectGroup={toggleFilter}
          className="bg-transparent"
        />
        <div className="mt-3">
          <MuscleFocusPicker
            value={viewFocus}
            onChange={setViewFocus}
            tone="dark"
          />
        </div>
        <p className="mt-2 text-center text-sm font-medium text-slate-400">
          {isCardioFilter
            ? "Cardio is a full-body effort, not a single muscle group."
            : filterLabel
              ? `${filterLabel} highlighted`
              : "All muscle groups"}
        </p>
      </section>

      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (bench, lunge, cable…)"
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-600"
          aria-label="Search exercises"
        />

        <div
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="toolbar"
          aria-label="Filter by muscle group"
        >
          <FilterChip
            label="All"
            selected={muscleFilter === null}
            onClick={clearFilter}
          />
          {CATALOG_MUSCLE_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              label={option.label}
              selected={muscleFilter === option.id}
              onClick={() => toggleFilter(option.id)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs font-medium tabular-nums text-zinc-500">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
        {filterLabel ? ` · ${filterLabel}` : ""}
        {query.trim() ? ` · “${query.trim()}”` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No exercises match. Try another search or clear the muscle filter.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((ex) => {
            const targeting = muscleTargetSummary(ex.primary, ex.secondary);
            return (
              <li key={ex.id}>
                <div className="flex min-h-16 w-full items-stretch rounded-xl border border-zinc-200 bg-zinc-50 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setPeekExercise(ex)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 text-left active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {ex.name}
                      </span>
                      {targeting ? (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {targeting}
                        </span>
                      ) : ex.primary === "cardio" ? (
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          Cardio
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <Link
                    href={`/workout?e=${encodeURIComponent(ex.id)}`}
                    className="flex w-11 shrink-0 items-center justify-center border-l border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label={`Start a workout with ${ex.name}`}
                  >
                    <Play className="size-4" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ExerciseMusclePeek
        exercise={peekExercise}
        open={Boolean(peekExercise)}
        onClose={() => setPeekExercise(null)}
        startHref={
          peekExercise
            ? `/workout?e=${encodeURIComponent(peekExercise.id)}`
            : undefined
        }
      />
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition ${
        selected
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}
