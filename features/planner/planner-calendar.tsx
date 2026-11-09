import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerCalendarDay, PlannerView } from "@/features/planner/planner-model";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type PlannerCalendarProps = {
  view: PlannerView;
  title: string;
  days: PlannerCalendarDay[];
  selectedKey: string;
  onSelect: (dateKey: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

/** One dot per day: filled green = workout, blue = activity, green ring = planned. */
function DayDot({ day, selected }: { day: PlannerCalendarDay; selected: boolean }) {
  const m = day.markers;
  if (!m) return <span className="size-1.5" aria-hidden />;
  if (m.hasWorkout) {
    return <span className={cn("size-1.5 rounded-full", selected ? "bg-emerald-300" : "bg-emerald-700 dark:bg-emerald-400")} aria-hidden />;
  }
  if (m.hasActivity) return <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />;
  if (m.hasPlan || m.hasReminder) {
    return (
      <span
        className={cn(
          "size-1.5 rounded-full border-[1.5px]",
          selected ? "border-emerald-300" : "border-emerald-700 dark:border-emerald-400",
        )}
        aria-hidden
      />
    );
  }
  return <span className="size-1.5" aria-hidden />;
}

export function PlannerCalendar({
  view,
  title,
  days,
  selectedKey,
  onSelect,
  onPrev,
  onNext,
}: PlannerCalendarProps) {
  const unit = view === "week" ? "week" : "month";
  return (
    <section
      aria-label="Calendar"
      className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          aria-label={`Previous ${unit}`}
          className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <ChevronLeft className="size-[18px]" aria-hidden />
        </button>
        <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50" aria-live="polite">
          {title}
        </h2>
        <button
          type="button"
          onClick={onNext}
          aria-label={`Next ${unit}`}
          className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <ChevronRight className="size-[18px]" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-zinc-500" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const selected = day.dateKey === selectedKey;
          return (
            <button
              key={day.dateKey}
              type="button"
              aria-label={day.label}
              aria-pressed={selected}
              onClick={() => onSelect(day.dateKey)}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-[10px] text-sm",
                selected
                  ? "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                !selected && day.isToday && "border-[1.5px] border-zinc-900 font-semibold dark:border-zinc-100",
                !selected && !day.inRange && "text-zinc-300 dark:text-zinc-700",
                !selected && day.inRange && "text-zinc-900 dark:text-zinc-100",
              )}
            >
              {day.dayOfMonth}
              <DayDot day={day} selected={selected} />
            </button>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-3 pt-1 text-[11px] text-zinc-500">
        <li className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400" aria-hidden />
          Workout
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
          Activity
        </li>
        <li className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full border-[1.5px] border-emerald-700 dark:border-emerald-400" aria-hidden />
          Planned
        </li>
      </ul>
    </section>
  );
}
