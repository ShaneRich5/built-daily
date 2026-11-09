"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";
import {
  exerciseProgress,
  type SessionExercise,
} from "@/features/workout-session/session-model";

type ReorderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: SessionExercise[];
  onMove: (lineId: string, toIndex: number) => void;
};

function setsLabel(item: SessionExercise): string {
  if (exerciseProgress(item.sets) === "not_started") return "Not started";
  return `${item.sets.length} set${item.sets.length === 1 ? "" : "s"}`;
}

const arrowButton =
  "inline-flex size-11 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-900 dark:hover:text-zinc-100";

/**
 * Full-screen list of one-line rows. Drag the handle, or use the arrows.
 * Every move is applied immediately (and autosaved by the session).
 */
export function ReorderSheet({ open, onOpenChange, exercises, onMove }: ReorderSheetProps) {
  const [dragLineId, setDragLineId] = useState<string | null>(null);
  const drag = useRef<{ lineId: string; lastY: number; rowPitch: number } | null>(null);

  const startDrag = (e: PointerEvent<HTMLSpanElement>, lineId: string) => {
    const row = e.currentTarget.closest("li");
    if (!row) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Row height plus the 8px gap between rows.
    drag.current = { lineId, lastY: e.clientY, rowPitch: row.getBoundingClientRect().height + 8 };
    setDragLineId(lineId);
  };

  const moveDrag = (e: PointerEvent<HTMLSpanElement>) => {
    const current = drag.current;
    if (!current) return;
    const steps = Math.trunc((e.clientY - current.lastY) / current.rowPitch);
    if (steps === 0) return;
    const from = exercises.findIndex((item) => item.lineId === current.lineId);
    onMove(current.lineId, from + steps);
    current.lastY += steps * current.rowPitch;
  };

  const endDrag = () => {
    drag.current = null;
    setDragLineId(null);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      variant="fullscreen"
      title="Reorder exercises"
      description="Drag a handle, or use the arrows. Saves as you go."
      footer={
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-12 w-full rounded-lg bg-zinc-900 text-[15px] font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Done
        </button>
      }
    >
      <ol className="flex flex-col gap-2 px-4 py-2">
        {exercises.map((item, index) => (
          <li
            key={item.lineId}
            className={cn(
              "flex min-h-14 items-center gap-2 rounded-xl border bg-white py-1 pr-1 pl-3 dark:bg-zinc-950",
              dragLineId === item.lineId
                ? "border-zinc-900 shadow-lg dark:border-zinc-100"
                : "border-zinc-200 dark:border-zinc-800",
            )}
          >
            <span className="w-5 font-mono text-xs text-zinc-400 tabular-nums">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{item.exercise.name}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{setsLabel(item)}</span>
            </span>
            <button
              type="button"
              className={arrowButton}
              disabled={index === 0}
              onClick={() => onMove(item.lineId, index - 1)}
              aria-label={`Move ${item.exercise.name} up`}
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className={arrowButton}
              disabled={index === exercises.length - 1}
              onClick={() => onMove(item.lineId, index + 1)}
              aria-label={`Move ${item.exercise.name} down`}
            >
              <ArrowDown className="size-4" aria-hidden />
            </button>
            {/* Pointer-only affordance; the arrow buttons cover keyboard and screen readers. */}
            <span
              aria-hidden
              onPointerDown={(e) => startDrag(e, item.lineId)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="inline-flex size-11 cursor-grab touch-none items-center justify-center text-zinc-400 active:cursor-grabbing"
            >
              <GripVertical className="size-5" />
            </span>
          </li>
        ))}
      </ol>
    </BottomSheet>
  );
}
