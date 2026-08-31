"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MuscleFocusPicker } from "@/components/muscle-focus-picker";
import { MuscleTargetDiagram } from "@/components/muscle-target-diagram";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import {
  sessionMuscleSummary,
  type MuscleFocus,
} from "@/lib/exercise-muscle";

export function WorkoutSessionMuscles({
  exercises,
  emptyLabel = "Add exercises to fill in the map",
}: {
  exercises: CatalogExercise[];
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  const [focus, setFocus] = useState<MuscleFocus>("full");
  const summary = sessionMuscleSummary(exercises);
  const empty = exercises.length === 0 || !summary;

  return (
    <section className="shrink-0 overflow-hidden rounded-xl bg-[#0b1220]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            This session
          </span>
          <span className="mt-0.5 block truncate text-sm text-slate-200">
            {empty ? emptyLabel : summary}
          </span>
        </span>
        <ChevronDown
          className={`mt-0.5 size-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="px-2 pb-3">
          <MuscleTargetDiagram
            exercises={exercises}
            focus={focus}
            className="bg-transparent"
          />
          <div className="mt-2 px-1">
            <MuscleFocusPicker value={focus} onChange={setFocus} tone="dark" />
          </div>
        </div>
      ) : null}
    </section>
  );
}
