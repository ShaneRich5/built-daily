"use client";

import { setWeeklyGoal } from "@/lib/progress-settings-repository";
import {
  WEEKLY_GOAL_OPTIONS,
  type WeekGoalStatus,
  type WeeklyGoalTarget,
} from "@/lib/progress-types";

type ProgressWeeklyGoalProps = {
  week: WeekGoalStatus;
  weeklyGoal: WeeklyGoalTarget;
};

function goalLabel(n: WeeklyGoalTarget): string {
  return n === 7 ? "Daily" : `${n} / week`;
}

export function ProgressWeeklyGoal({
  week,
  weeklyGoal,
}: ProgressWeeklyGoalProps) {
  const pct = Math.min(100, Math.round((week.completed / week.target) * 100));

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="weekly-goal-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="weekly-goal-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Weekly goal
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Hit your weekly target—remaining days are recovery, not failure.
          </p>
        </div>
        {week.met ? (
          <p className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            Goal complete
          </p>
        ) : null}
      </div>

      <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {week.completed}{" "}
        <span className="text-base font-medium text-zinc-500">
          / {week.target} workouts
        </span>
      </p>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={week.completed}
        aria-valuemin={0}
        aria-valuemax={week.target}
        aria-label="Weekly workouts completed"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] dark:bg-emerald-400"
          style={{ width: `${pct}%` }}
        />
      </div>

      {week.met ? (
        <p className="text-sm text-sky-800 dark:text-sky-300">
          Nice work. Any leftover days this week are recovery opportunities.
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          {Math.max(0, week.target - week.completed)} workout
          {week.target - week.completed === 1 ? "" : "s"} left this week—recovery
          days still count as part of a healthy plan.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Target
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKLY_GOAL_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => void setWeeklyGoal(n)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                weeklyGoal === n
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              }`}
            >
              {goalLabel(n)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
