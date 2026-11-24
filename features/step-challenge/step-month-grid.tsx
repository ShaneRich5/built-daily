import { cn } from "@/lib/utils";
import { dateFromLocalDateKey } from "@/lib/workout-date";
import type { StepDayCell } from "@/features/step-challenge/step-challenge-model";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

type StepMonthGridProps = {
  days: StepDayCell[];
  /** The day being edited, when shown inside the log sheet. */
  selectedKey?: string | null;
  onPickDay: (dateKey: string) => void;
};

/**
 * A month challenge as a calendar, Sunday first, with the same day states as
 * the week dots: green once a day clears the target, plain grey when missed,
 * a dashed outline for today and a small blue dot for a synced day.
 */
export function StepMonthGrid({
  days,
  selectedKey = null,
  onPickDay,
}: StepMonthGridProps) {
  const first = days[0] ? dateFromLocalDateKey(days[0].dateKey) : null;
  // Pushes the 1st under its weekday; the rest flow from there.
  const leadingBlanks = first ? first.getDay() : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <span
            key={i}
            className="text-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400"
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const selected = day.dateKey === selectedKey;
          return (
            <button
              key={day.dateKey}
              type="button"
              disabled={day.isFuture}
              aria-label={day.label}
              aria-pressed={selectedKey != null ? selected : undefined}
              onClick={() => onPickDay(day.dateKey)}
              style={
                i === 0 ? { gridColumnStart: leadingBlanks + 1 } : undefined
              }
              className={cn(
                "relative flex h-11 min-w-0 items-center justify-center rounded-lg border text-[13px] font-semibold text-zinc-900 tabular-nums dark:text-zinc-100",
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
              <span aria-hidden>{day.dayOfMonth}</span>
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
    </div>
  );
}
