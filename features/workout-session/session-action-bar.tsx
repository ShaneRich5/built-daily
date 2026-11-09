"use client";

import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SessionActionBarProps = {
  hasExercises: boolean;
  canAdd: boolean;
  journalCopied: boolean;
  onAddExercise: () => void;
  onFinish: () => void;
  onOpenWorkoutDetails: () => void;
  onReorder: () => void;
  onCopyJournal: () => void;
  onDownloadJournal: () => void;
  /** Omitted when the workout is not saved yet (nothing to delete). */
  onDelete?: () => void;
};

const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

/** Pinned to the bottom of the screen: more, add, finish. */
export function SessionActionBar({
  hasExercises,
  canAdd,
  journalCopied,
  onAddExercise,
  onFinish,
  onOpenWorkoutDetails,
  onReorder,
  onCopyJournal,
  onDownloadJournal,
  onDelete,
}: SessionActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-zinc-50/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-1.5 sm:px-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button type="button" className={iconButton} aria-label="More actions" />}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
            <DropdownMenuItem className="min-h-11 gap-2" onClick={onOpenWorkoutDetails}>
              <NotebookPen className="size-4" aria-hidden />
              Name &amp; note
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 gap-2"
              disabled={!hasExercises}
              onClick={onReorder}
            >
              <ArrowUpDown className="size-4" aria-hidden />
              Reorder exercises
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-h-11 gap-2" onClick={onCopyJournal}>
              {journalCopied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {journalCopied ? "Copied" : "Copy journal"}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" onClick={onDownloadJournal}>
              <Download className="size-4" aria-hidden />
              Download .txt
            </DropdownMenuItem>
            {onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="min-h-11 gap-2"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Delete workout
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={onAddExercise}
          disabled={!canAdd}
          className={iconButton}
          aria-label="Add exercise"
        >
          <Plus className="size-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="h-11 min-w-0 flex-1 rounded-lg bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          {hasExercises ? "Finish workout" : "Finish without details"}
        </button>
      </div>
    </div>
  );
}
