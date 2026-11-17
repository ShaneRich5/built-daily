"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Minus,
  MoreVertical,
  NotebookText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MAX_ALTERNATES } from "@/lib/line-grouping";
import { NOTE_LIMITS, type PlanLine } from "@/lib/workout-types";
import { lineMeta, sectionOf, targetSetsOf } from "@/features/templates/template-model";

type TemplateLineRowProps = {
  line: PlanLine;
  /** Position within its section (Plan and Maybe each count from 1). */
  position: number;
  isFirst: boolean;
  isLast: boolean;
  onTargetSetsChange: (n: number) => void;
  onNoteChange: (note: string) => void;
  onMove: (delta: -1 | 1) => void;
  /** Plan ⇄ Maybe. */
  onToggleSection: () => void;
  onAddAlternate: () => void;
  onRemoveAlternate: (exerciseId: string) => void;
  onRemove: () => void;
};

const stepButton =
  "inline-flex h-10 w-9 items-center justify-center text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-900";

/**
 * One exercise in a template: name, a sets stepper, and a menu for note / move /
 * Plan ⇄ Maybe / remove. Plan lines also list their alternates ("or …").
 */
export function TemplateLineRow({
  line,
  position,
  isFirst,
  isLast,
  onTargetSetsChange,
  onNoteChange,
  onMove,
  onToggleSection,
  onAddAlternate,
  onRemoveAlternate,
  onRemove,
}: TemplateLineRowProps) {
  const [noteOpen, setNoteOpen] = useState(Boolean(line.notes?.trim()));
  const sets = targetSetsOf(line);
  const noteId = `template-note-${line.lineId}`;
  const isMaybe = sectionOf(line) === "maybe";

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
            <DropdownMenuItem className="min-h-11 gap-2" onClick={onToggleSection}>
              {isMaybe ? (
                <ArrowUpToLine className="size-4" aria-hidden />
              ) : (
                <ArrowDownToLine className="size-4" aria-hidden />
              )}
              {isMaybe ? "Move to plan" : "Move to maybe"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" className="min-h-11 gap-2" onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isMaybe ? null : (
        <AlternateRow line={line} onAdd={onAddAlternate} onRemove={onRemoveAlternate} />
      )}
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

/** "or Smith bench · DB bench  + alternate": stand-ins offered as one-tap swaps in the session. */
function AlternateRow({
  line,
  onAdd,
  onRemove,
}: {
  line: PlanLine;
  onAdd: () => void;
  onRemove: (exerciseId: string) => void;
}) {
  const alternates = line.alternates ?? [];
  return (
    <div className="flex flex-wrap items-center gap-1.5 pr-3 pb-2.5 pl-[42px]">
      {alternates.length > 0 ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400" aria-hidden>
          or
        </span>
      ) : null}
      {alternates.map((alt) => (
        <span
          key={alt.exerciseId}
          className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-zinc-50 pl-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {alt.nameSnapshot}
          <button
            type="button"
            aria-label={`Remove ${alt.nameSnapshot} as an alternate`}
            onClick={() => onRemove(alt.exerciseId)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      {alternates.length < MAX_ALTERNATES ? (
        <button
          type="button"
          aria-label={`Add an alternate for ${line.nameSnapshot}`}
          onClick={onAdd}
          className="inline-flex h-8 items-center rounded-full border border-dashed border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          + alternate
        </button>
      ) : null}
    </div>
  );
}
