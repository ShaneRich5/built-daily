"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  CopyPlus,
  Download,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkoutSessionMuscles } from "@/components/workout-session-muscles";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import type { SavedSessionSummary } from "@/features/saved-session/saved-session-model";

export type SavedSessionActions = {
  onEdit: () => void;
  onReopen: () => void;
  onSaveAsTemplate: () => void;
  onCopyJournal: () => void;
  onDownloadJournal: () => void;
  onDelete: () => void;
};

type SavedSessionViewProps = SavedSessionActions & {
  summary: SavedSessionSummary;
  /** For the muscle map. */
  exercises: CatalogExercise[];
  backHref: string;
  journalCopied: boolean;
  /** Shown above the action bar when something fails. */
  error: string | null;
  /** Disables the actions while a reopen / delete / template request runs. */
  busy: boolean;
};

const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

/** A finished workout, read first: summary, muscles, exercises. Editing is one tap away. */
export function SavedSessionView({
  summary,
  exercises,
  backHref,
  journalCopied,
  error,
  busy,
  ...actions
}: SavedSessionViewProps) {
  const [musclesOpen, setMusclesOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <Link
          href={backHref}
          aria-label="Back"
          className="-ml-2.5 inline-flex size-11 items-center justify-center rounded-lg text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-800 uppercase dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Check className="size-3" strokeWidth={3} aria-hidden />
          Finished
        </span>
      </header>

      <section className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {summary.title}
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">{summary.when}</p>
        </div>
        <dl
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${summary.stats.length}, minmax(0, 1fr))` }}
        >
          {summary.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</dt>
              <dd className="font-mono text-lg font-medium text-zinc-900 tabular-nums dark:text-zinc-50">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        {summary.note ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm whitespace-pre-line text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {summary.note}
          </p>
        ) : null}
      </section>

      {summary.muscles ? (
        <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <button
            type="button"
            aria-expanded={musclesOpen}
            onClick={() => setMusclesOpen((open) => !open)}
            className="flex min-h-14 w-full items-center gap-3 px-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
                Muscles worked
              </span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {summary.muscles}
              </span>
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-zinc-400 transition-transform ${musclesOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {musclesOpen ? (
            <div className="px-3 pb-3">
              <WorkoutSessionMuscles exercises={exercises} />
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="saved-exercises-heading" className="flex flex-col gap-2">
        <h2
          id="saved-exercises-heading"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          Exercises
        </h2>
        {summary.exercises.length === 0 ? (
          <p className="text-sm text-zinc-500">Logged without exercise details.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {summary.exercises.map((exercise) => (
              <li
                key={exercise.lineId}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                  {exercise.name}
                </h3>
                {exercise.sets.length > 0 ? (
                  <ol className="flex flex-wrap gap-1.5" aria-label={`${exercise.name} sets`}>
                    {exercise.sets.map((set, i) => (
                      <li
                        key={i}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 font-mono text-[13px] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <span className="text-zinc-400" aria-hidden>
                          {i + 1}
                        </span>
                        {set}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-zinc-500">No set details.</p>
                )}
                {exercise.note ? (
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-400">{exercise.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-zinc-50/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        {error ? (
          <p role="alert" className="mx-auto mb-2 max-w-2xl text-center text-xs text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mx-auto flex w-full max-w-2xl items-center gap-1.5 sm:px-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button type="button" className={iconButton} aria-label="More actions" disabled={busy} />
              }
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-60">
              <DropdownMenuItem className="min-h-11 gap-2" onClick={actions.onReopen}>
                <Play className="size-4" aria-hidden />
                Move back to in progress
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 gap-2"
                disabled={summary.exercises.length === 0}
                onClick={actions.onSaveAsTemplate}
              >
                <CopyPlus className="size-4" aria-hidden />
                Save as template
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2" onClick={actions.onCopyJournal}>
                {journalCopied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {journalCopied ? "Copied" : "Copy journal entry"}
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-11 gap-2" onClick={actions.onDownloadJournal}>
                <Download className="size-4" aria-hidden />
                Download .txt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="min-h-11 gap-2" onClick={actions.onDelete}>
                <Trash2 className="size-4" aria-hidden />
                Delete workout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={actions.onEdit}
            disabled={busy}
            className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Pencil className="size-4" aria-hidden />
            Edit workout
          </button>
        </div>
      </div>
    </div>
  );
}
