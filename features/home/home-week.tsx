import Link from "next/link";
import { cn } from "@/lib/utils";
import type { HomePlanned, HomeWeekDay } from "@/features/home/home-model";

const dayCircle: Record<HomeWeekDay["state"], string> = {
  workout: "bg-emerald-700 text-white dark:bg-emerald-600",
  activity: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  planned:
    "border-[1.5px] border-emerald-700 bg-white text-emerald-800 dark:border-emerald-500 dark:bg-zinc-950 dark:text-emerald-300",
  empty: "",
};

type HomeWeekProps = {
  days: HomeWeekDay[];
  planned: HomePlanned | null;
};

/** Sun–Sat at a glance. Tapping a planned day starts it; any other day opens the planner. */
export function HomeWeek({ days, planned }: HomeWeekProps) {
  return (
    <section aria-labelledby="home-week-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2
          id="home-week-heading"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          This week
        </h2>
        <Link
          href="/planner"
          className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Planner
        </Link>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <ol className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <li key={day.dateKey}>
              <Link
                href={day.href}
                aria-label={day.label}
                aria-current={day.isToday ? "date" : undefined}
                className="flex flex-col items-center gap-1.5 rounded-lg py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <span className="text-[11px] font-medium text-zinc-500" aria-hidden>
                  {day.weekday}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-full text-sm font-semibold",
                    day.state === "empty" &&
                      (day.isPast
                        ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                        : "border border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500"),
                    dayCircle[day.state],
                    day.isToday && day.state === "empty" &&
                      "border-[1.5px] border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100",
                  )}
                >
                  {day.dayOfMonth}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2.5 border-t border-zinc-100 pt-2.5 text-[13px] dark:border-zinc-800">
          {planned ? (
            <>
              <span
                className="size-2 shrink-0 rounded-full border-[1.5px] border-emerald-700 dark:border-emerald-500"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">
                {planned.dayLabel} · {planned.label} planned
              </span>
            </>
          ) : (
            <span className="flex-1 text-zinc-500 dark:text-zinc-400">Nothing planned yet.</span>
          )}
          <span className="shrink-0 text-xs text-zinc-500">Tap a day to plan</span>
        </div>
      </div>
    </section>
  );
}
