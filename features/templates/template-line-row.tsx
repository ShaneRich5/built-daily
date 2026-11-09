"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Minus, MoreVertical, NotebookText, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTE_LIMITS, type PlanLine } from "@/lib/workout-types";
import { lineMeta, targetSetsOf } from "@/features/templates/template-model";

type TemplateLineRowProps = {
  line: PlanLine;
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onTargetSetsChange: (n: number) => void;
  onNoteChange: (note: string) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

const stepButton =
  "inline-flex h-10 w-9 items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-900";

/** One exercise in a template: name, a sets stepper, and a menu for note / move / remove. */
export function TemplateLineRow({
  line,
  position,
  isFirst,
  isLast,
  onTargetSetsChange,
  onNoteChange,
  onMove,
  onRemove,
}: TemplateLineRowProps) {
  const [noteOpen, setNoteOpen] = useState(Boolean(line.notes?.trim()));
  const sets = targetSetsOf(line);
  const noteId = `template-note-${line.lineId}`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-h-16 items-center gap-2.5 py-2 pr-1.5 pl-3">
        <span className="w-5 font-mono text-xs text-zinc-400" aria-hidden>
          {position}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-zinc-900 dark:text-zinc-50">
            {line.nameSnapshot}
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{lineMeta(line)}</span>
        </span>
        <div
          role="group"
          aria-label={`Target sets for ${line.nameSnapshot}`}
          className="inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
        >
          <button
            type="button"
            className={stepButton}
            aria-label="Fewer sets"
            disabled={sets <= 1}
            onClick={() => onTargetSetsChange(sets - 1)}
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="min-w-12 text-center text-[13px] font-medium text-zinc-900 tabular-nums dark:text-zinc-100" aria-live="polite">
            {sets} {sets === 1 ? "set" : "sets"}
          </span>
          <button
            type="button"
            className={stepButton}
            aria-label="More sets"
            disabled={sets >= 20}
            onClick={() => onTargetSetsChange(sets + 1)}
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={`Actions for ${line.nameSnapshot}`}
                className="inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              />
            }
          >
            <MoreVertical className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="min-h-11 gap-2" onClick={() => setNoteOpen(true)}>
              <NotebookText className="size-4" aria-hidden />
              {line.notes?.trim() ? "Edit note" : "Add note"}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" disabled={isFirst} onClick={() => onMove(-1)}>
              <ArrowUp className="size-4" aria-hidden />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-2" disabled={isLast} onClick={() => onMove(1)}>
              <ArrowDown className="size-4" aria-hidden />
              Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="min-h-11 gap-2" onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {noteOpen ? (
        <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
          <label htmlFor={noteId} className="sr-only">
            Note for {line.nameSnapshot}
          </label>
          <input
            id={noteId}
            value={line.notes ?? ""}
            maxLength={NOTE_LIMITS.exerciseNote}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Seat height, grip, cues…"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      ) : null}
    </div>
  );
}
