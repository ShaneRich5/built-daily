"use client";

import { ChevronDown, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { SetLog } from "@/lib/workout-types";
import { cn } from "@/lib/utils";
import {
  exerciseProgress,
  summarizeSetLogs,
  summarizeSetRows,
  type SessionExercise,
} from "@/features/workout-session/session-model";

type MaybeSectionProps = {
  items: SessionExercise[];
  /** Most recent past sets per exercise id, for "Last …". */
  lastTimeById: Record<string, SetLog[] | undefined>;
  canAdd: boolean;
  onDoIt: (lineId: string) => void;
  onOpenDetails: (lineId: string) => void;
  onAddMaybe: () => void;
};

function maybeSubtitle(item: SessionExercise, lastTime: SetLog[] | undefined): string {
  if (exerciseProgress(item.sets) !== "not_started") {
    return summarizeSetRows(item.sets, item.exercise.metric) || "Started";
  }
  const last = lastTime ? summarizeSetLogs(lastTime) : "";
  return last ? `Last ${last}` : "Not started";
}

/**
 * Exercises you might get to. They sit apart from the plan, never count as
 * missed, and "Do it" moves one into the plan when you're ready.
 */
export function MaybeSection({
  items,
  lastTimeById,
  canAdd,
  onDoIt,
  onOpenDetails,
  onAddMaybe,
}: MaybeSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <section
      aria-labelledby="maybe-heading"
      className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-zinc-300 bg-zinc-100/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2
            id="maybe-heading"
            className="text-xs font-semibold tracking-wide text-zinc-900 uppercase dark:text-zinc-100"
          >
            Maybe
            <span className="ml-1.5 font-normal text-zinc-500 normal-case">{items.length}</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">If there&apos;s time. Skipping is fine.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="maybe-list"
          className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
          <span className="sr-only">{open ? "Hide maybes" : "Show maybes"}</span>
        </button>
      </div>

      {open ? (
        <>
          <ul id="maybe-list" className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.lineId}
                id={`exercise-${item.lineId}`}
                className="flex min-h-14 items-center gap-2 rounded-xl border border-zinc-200 bg-white py-1.5 pr-1.5 pl-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-zinc-700 dark:text-zinc-200">
                    {item.exercise.name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {maybeSubtitle(item, lastTimeById[item.exercise.id])}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onDoIt(item.lineId)}
                  className="inline-flex h-10 shrink-0 items-center rounded-lg bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-950"
                >
                  Do it<span className="sr-only">: move {item.exercise.name} into the plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDetails(item.lineId)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <SlidersHorizontal className="size-4" aria-hidden />
                  <span className="sr-only">Details for {item.exercise.name}</span>
                </button>
              </li>
            ))}
          </ul>
          {canAdd ? <AddMaybeButton onClick={onAddMaybe} /> : null}
        </>
      ) : null}
    </section>
  );
}

/** Also used on its own when there are no maybes yet. */
export function AddMaybeButton({ onClick, quiet = false }: { onClick: () => void; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium text-zinc-700 dark:text-zinc-300",
        quiet
          ? "self-center px-3 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          : "border border-dashed border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900",
      )}
    >
      <Plus className="size-3.5" aria-hidden />
      Add a maybe
    </button>
  );
}
