"use client";

import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

/** "3 workouts and 1 activity", "1 workout", "2 activities". */
export function selectionLabel(workouts: number, activities: number): string {
  const parts: string[] = [];
  if (workouts > 0)
    parts.push(`${workouts} workout${workouts === 1 ? "" : "s"}`);
  if (activities > 0)
    parts.push(`${activities} activit${activities === 1 ? "y" : "ies"}`);
  return parts.join(" and ") || "nothing";
}

type HistoryDeleteSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workouts: number;
  activities: number;
  deleting: boolean;
  onConfirm: () => void;
};

/** Confirms a bulk delete from History. Deleting can't be undone, so it always asks. */
export function HistoryDeleteSheet({
  open,
  onOpenChange,
  workouts,
  activities,
  deleting,
  onConfirm,
}: HistoryDeleteSheetProps) {
  const what = selectionLabel(workouts, activities);
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !deleting && onOpenChange(next)}
      title={`Delete ${what}?`}
      description="This can't be undone. Your streak, progress and groups update to match."
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
          >
            <Trash2 className="size-4" aria-hidden />
            {deleting ? "Deleting…" : `Delete ${what}`}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
            className="h-12 w-full rounded-lg border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          >
            Cancel
          </button>
        </div>
      }
    >
      <span />
    </BottomSheet>
  );
}
