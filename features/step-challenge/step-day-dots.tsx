import { cn } from "@/lib/utils";
import type { StepDayCell } from "@/features/step-challenge/step-challenge-model";

type StepDayDotsProps = {
  days: StepDayCell[];
  /** The day being edited, when shown inside the log sheet. */
  selectedKey?: string | null;
  onPickDay: (dateKey: string) => void;
};

/**
 * The week as seven tappable days. Green once a day clears the target; a
 * missed day is plain grey, never red. A small blue dot marks a synced day.
 */
export function StepDayDots({
  days,
  selectedKey = null,
  onPickDay,
}: StepDayDotsProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const selected = day.dateKey === selectedKey;
        return (
          <button
            key={day.dateKey}
            type="button"
            disabled={day.isFuture}
            aria-label={day.label}
            aria-pressed={selectedKey != null ? selected : undefined}
            onClick={() => onPickDay(day.dateKey)}
            className={cn(
              "relative flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-zinc-900 dark:text-zinc-100",
              day.isFuture
                ? "border-zinc-200 bg-white opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
                : day.hit
                  ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-600 dark:text-white"
                  : "border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900",
              day.isToday &&
                !day.hit &&
                "border-dashed border-emerald-700 dark:border-emerald-500",
              selected &&
                "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-950",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-semibold",
                day.hit && !day.isFuture
                  ? "text-white/80"
                  : "text-zinc-500 dark:text-zinc-400",
              )}
              aria-hidden
            >
              {day.letter}
            </span>
            <span className="font-mono text-[11px] tabular-nums" aria-hidden>
              {day.short}
            </span>
            {day.synced ? (
              <span
                className="absolute top-1 right-1 size-1.5 rounded-full bg-sky-500 dark:bg-sky-400"
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
