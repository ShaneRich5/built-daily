"use client";

import { ArrowUpToLine } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { SessionExercise } from "@/features/workout-session/session-model";

type MoveExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: SessionExercise[];
  /** The exercise being moved. */
  lineId: string;
  onMove: (lineId: string, toIndex: number) => void;
};

const slotButton =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] hover:bg-zinc-50 disabled:pointer-events-none dark:hover:bg-zinc-900";

/** One tap to put an exercise anywhere: "Move to the top" or "After …". */
export function MoveExerciseSheet({
  open,
  onOpenChange,
  exercises,
  lineId,
  onMove,
}: MoveExerciseSheetProps) {
  const from = exercises.findIndex((item) => item.lineId === lineId);
  const moving = exercises[from];
  if (!moving) return null;
  // Slots are positions in the list without the moving exercise.
  const others = exercises.filter((item) => item.lineId !== lineId);

  const moveTo = (toIndex: number) => {
    onMove(lineId, toIndex);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Move ${moving.exercise.name}`}
      description={`Currently ${from + 1} of ${exercises.length} · pick where it goes`}
      footer={
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-12 w-full rounded-lg border border-zinc-200 text-[15px] font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      }
    >
      <ul className="flex flex-col gap-0.5 px-4 pb-2">
        <li>
          <button
            type="button"
            className={slotButton}
            disabled={from === 0}
            onClick={() => moveTo(0)}
          >
            <ArrowUpToLine className="size-4 text-zinc-500" aria-hidden />
            <span className="flex-1 font-medium">Move to the top</span>
            {from === 0 ? <span className="text-xs text-zinc-500">Here now</span> : null}
          </button>
        </li>
        {others.map((item, i) => {
          const toIndex = i + 1;
          const current = toIndex === from;
          return (
            <li key={item.lineId}>
              <button
                type="button"
                className={slotButton}
                disabled={current}
                onClick={() => moveTo(toIndex)}
              >
                <span className="w-4 font-mono text-xs text-zinc-400 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  After <strong className="font-semibold">{item.exercise.name}</strong>
                </span>
                {current ? <span className="text-xs text-zinc-500">Here now</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
