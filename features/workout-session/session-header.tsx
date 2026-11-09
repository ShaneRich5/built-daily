"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type SessionHeaderProps = {
  title: string;
  exerciseCount: number;
  setCount: number;
  doneSetCount: number;
  onOpenWorkoutDetails: () => void;
};

function volumeLine(exerciseCount: number, setCount: number, doneSetCount: number): string {
  if (exerciseCount === 0) return "No exercises yet";
  const exercises = `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`;
  return `${exercises} · ${doneSetCount} of ${setCount} set${setCount === 1 ? "" : "s"} done`;
}

export function SessionHeader({
  title,
  exerciseCount,
  setCount,
  doneSetCount,
  onOpenWorkoutDetails,
}: SessionHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            In progress
          </span>
        </div>
        <Link
          href="/"
          className="inline-flex h-10 shrink-0 items-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Home
        </Link>
      </div>
      <button
        type="button"
        onClick={onOpenWorkoutDetails}
        className="group -mx-1 flex min-h-11 items-center gap-1 rounded-lg px-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {volumeLine(exerciseCount, setCount, doneSetCount)}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
        <span className="sr-only">Edit workout name, date and note</span>
      </button>
    </header>
  );
}
