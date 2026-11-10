import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  weekNudge,
  type HomeChartDay,
  type HomeChartWeek,
  type HomeConsistency,
  type HomeWeekDay,
  type HomeWeekGoal,
} from "@/features/home/home-model";

const dayCircle: Record<HomeWeekDay["state"], string> = {
  workout: "bg-emerald-700 text-white dark:bg-emerald-600",
  activity: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  planned:
    "border-[1.5px] border-emerald-700 bg-white text-emerald-800 dark:border-emerald-500 dark:bg-zinc-950 dark:text-emerald-300",
  empty: "",
};

const chartCell: Record<HomeChartDay, string> = {
  workout: "bg-emerald-700 dark:bg-emerald-500",
  activity: "bg-blue-400 dark:bg-blue-600",
  rest: "bg-zinc-100 dark:bg-zinc-800",
  today: "border-[1.5px] border-zinc-900 bg-white dark:border-zinc-100 dark:bg-zinc-950",
  planned: "border-[1.5px] border-emerald-700 bg-white dark:border-emerald-500 dark:bg-zinc-950",
  ahead: "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
};

const goalBar: Record<HomeChartWeek["goal"], string> = {
  hit: "bg-emerald-700 dark:bg-emerald-500",
  missed: "bg-zinc-200 dark:bg-zinc-800",
  open: "bg-emerald-200 dark:bg-emerald-900",
};

const linkClass =
  "text-[13px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100";

type HomeWeekProps = {
  todayKey: string;
  days: HomeWeekDay[];
  goal: HomeWeekGoal;
  consistency: HomeConsistency;
};

/** This week's goal and streak, the Sun–Sat days, and the last 16 weeks. */
export function HomeWeek({ todayKey, days, goal, consistency }: HomeWeekProps) {
  return (
    <section aria-labelledby="home-week-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2
          id="home-week-heading"
          className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        >
          This week
        </h2>
        <Link href="/planner" className={linkClass}>
          Planner
        </Link>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
        <WeekGoal todayKey={todayKey} goal={goal} streak={consistency.streak} />
        <WeekDays days={days} />
        <ConsistencyChart consistency={consistency} />
      </div>
    </section>
  );
}

function WeekGoal({
  todayKey,
  goal,
  streak,
}: {
  todayKey: string;
  goal: HomeWeekGoal;
  streak: number;
}) {
  return (
    <div className="flex flex-col gap-2 px-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-1.5">
          <span className="font-mono text-[28px] font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
            {goal.completed}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            of {goal.target} workouts
          </span>
        </p>
        {streak > 0 ? (
          <Link
            href="/progress"
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <Flame className="size-3.5" aria-hidden />
            {streak}-week streak
          </Link>
        ) : null}
      </div>
      <div
        aria-hidden
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${goal.target}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: goal.target }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full",
              i < goal.completed
                ? "bg-emerald-700 dark:bg-emerald-500"
                : "bg-zinc-200 dark:bg-zinc-800",
            )}
          />
        ))}
      </div>
      <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
        {weekNudge(goal, streak, todayKey)}
      </p>
    </div>
  );
}

/** Tapping a planned day starts it; any other day opens the planner. */
function WeekDays({ days }: { days: HomeWeekDay[] }) {
  return (
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
                day.isToday &&
                  day.state === "empty" &&
                  "border-[1.5px] border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100",
              )}
            >
              {day.dayOfMonth}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function ConsistencyChart({ consistency }: { consistency: HomeConsistency }) {
  const { weeks, longest, label } = consistency;
  return (
    <div className="flex flex-col gap-2.5 border-t border-zinc-100 px-0.5 pt-3 dark:border-zinc-800">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Last {weeks.length} weeks
        </h3>
        {longest > 0 ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Longest streak{" "}
            <span className="font-mono text-zinc-900 dark:text-zinc-50">{longest} wk</span>
          </span>
        ) : null}
      </div>
      <div
        role="img"
        aria-label={label}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week) => (
          <div key={week.startKey} className="flex flex-col gap-1">
            {week.days.map((day, i) => (
              <span
                key={i}
                className={cn("aspect-square rounded-[3px]", chartCell[day])}
              />
            ))}
            <span className={cn("h-1 rounded-full", goalBar[week.goal])} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400" aria-hidden>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-emerald-700 dark:bg-emerald-500" />
            Workout
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-[2px] bg-blue-400 dark:bg-blue-600" />
            Activity
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-3 rounded-full bg-emerald-700 dark:bg-emerald-500" />
            Goal hit
          </span>
        </div>
        <Link href="/progress" className={cn(linkClass, "inline-flex min-h-8 items-center")}>
          Progress
        </Link>
      </div>
    </div>
  );
}
