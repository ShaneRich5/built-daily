"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
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
  // Latest props for the window listeners, which outlive a single render.
  const latest = useRef({ exercises, onMove });
  useEffect(() => {
    latest.current = { exercises, onMove };
  });
  const stopDrag = useRef<(() => void) | null>(null);

  // Never leave window listeners behind if the sheet closes mid-drag.
  useEffect(() => () => stopDrag.current?.(), []);

  /**
   * Follows the pointer on `window` rather than with pointer capture: moving the
   * dragged row in the DOM releases capture, and a mouse soon leaves the small
   * handle, so the drag used to stall after one step on desktop.
   */
  const startDrag = (e: PointerEvent<HTMLSpanElement>, lineId: string) => {
    if (e.button !== 0) return;
    const row = e.currentTarget.closest("li");
    if (!row) return;
    e.preventDefault(); // no text selection while dragging with a mouse
    stopDrag.current?.();

    const pointerId = e.pointerId;
    // Row height plus the 8px gap between rows.
    const rowPitch = row.getBoundingClientRect().height + 8;
    let lastY = e.clientY;

    const onPointerMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const steps = Math.trunc((ev.clientY - lastY) / rowPitch);
      if (steps === 0) return;
      const { exercises: list, onMove: move } = latest.current;
      const from = list.findIndex((item) => item.lineId === lineId);
      const to = Math.max(0, Math.min(list.length - 1, from + steps));
      if (from !== -1 && to !== from) move(lineId, to);
      lastY += steps * rowPitch;
    };
    const onPointerEnd = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId === pointerId) stop();
    };
    const stop = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      stopDrag.current = null;
      setDragLineId(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    stopDrag.current = stop;
    setDragLineId(lineId);
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
      <ol className={cn("flex flex-col gap-2 px-4 py-2", dragLineId && "select-none")}>
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
