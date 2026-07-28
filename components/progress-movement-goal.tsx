"use client";

import { setMovementGoalDays } from "@/lib/progress-settings-repository";
import type { MovementGoalStatus } from "@/lib/movement-insights";
import {
  MOVEMENT_GOAL_OPTIONS,
  type MovementGoalTarget,
} from "@/lib/progress-types";

type ProgressMovementGoalProps = {
  week: MovementGoalStatus;
  movementGoalDays: MovementGoalTarget;
  movementStreak: number;
};

function goalLabel(n: MovementGoalTarget): string {
  return n === 7 ? "Daily" : `${n} / week`;
}

export function ProgressMovementGoal({
  week,
  movementGoalDays,
  movementStreak,
}: ProgressMovementGoalProps) {
  const pct = Math.min(100, Math.round((week.completed / week.target) * 100));

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="movement-goal-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="movement-goal-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Movement goal
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Active days from workouts or activities. Doesn’t change workout
            progress.
          </p>
        </div>
        {week.met ? (
          <p className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
            Week active
          </p>
        ) : null}
      </div>

      <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {week.completed}{" "}
        <span className="text-base font-medium text-zinc-500">
          / {week.target} days
        </span>
      </p>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={week.completed}
        aria-valuemin={0}
        aria-valuemax={week.target}
        aria-label="Active days this week"
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-[width] dark:bg-teal-400"
          style={{ width: `${pct}%` }}
        />
      </div>

      {movementStreak > 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Movement streak:{" "}
          <span className="font-semibold tabular-nums">{movementStreak}</span>{" "}
          day{movementStreak === 1 ? "" : "s"}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">
          A walk, ride, or sport counts as moving—even on recovery from lifting.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Target
        </p>
        <div className="flex flex-wrap gap-2">
          {MOVEMENT_GOAL_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => void setMovementGoalDays(n)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                movementGoalDays === n
                  ? "bg-teal-700 text-white dark:bg-teal-300 dark:text-teal-950"
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
