"use client";

import type { WeeklyGoalTarget } from "@/lib/progress-types";

type ProgressGoalStreakProps = {
  current: number;
  longest: number;
  weeklyGoal: WeeklyGoalTarget;
  /** True when this week’s goal is already met. */
  weekMet: boolean;
};

export function ProgressGoalStreak({
  current,
  longest,
  weeklyGoal,
  weekMet,
}: ProgressGoalStreakProps) {
  const targetLabel = weeklyGoal === 7 ? "daily" : `${weeklyGoal}/week`;

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="goal-streak-heading"
    >
      <h2
        id="goal-streak-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Goal streak
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Consecutive weeks hitting your {targetLabel} goal. A recovery day
        doesn’t end the streak—only missing the weekly target does.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-8">
        <div>
          <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {current}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {weekMet ? "consecutive weeks" : "weeks banked"}
          </p>
          {!weekMet && current > 0 ? (
            <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">
              In progress this week—finish the goal to extend it.
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xl font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
            {longest}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Longest
          </p>
        </div>
      </div>
    </section>
  );
}
