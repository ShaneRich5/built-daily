"use client";

import type { PersonalRecord } from "@/lib/progress-types";
import { formatLocalDateKey } from "@/lib/workout-date";

type ProgressStrengthProps = {
  recentPrs: PersonalRecord[];
  lifts: PersonalRecord[];
};

export function ProgressStrength({
  recentPrs,
  lifts,
}: ProgressStrengthProps) {
  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="strength-heading"
    >
      <div>
        <h2
          id="strength-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Strength progress
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Estimated from your logged sets—celebrating best efforts, not
          perfection.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Strongest lifts
        </h3>
        {lifts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Log weighted sets to see your best lifts here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {lifts.map((pr) => (
              <li
                key={pr.exerciseId}
                className="flex items-baseline justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {pr.exerciseName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Best set {pr.weight} × {pr.reps}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                  ~{pr.estimated1Rm}{" "}
                  <span className="text-xs text-zinc-400">e1RM</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Recent personal records
        </h3>
        {recentPrs.length === 0 ? (
          <p className="text-sm text-zinc-500">No PRs yet—keep showing up.</p>
        ) : (
          <ul className="space-y-2">
            {recentPrs.slice(0, 6).map((pr) => (
              <li
                key={`${pr.sessionId}-${pr.exerciseId}-${pr.dateKey}-${pr.estimated1Rm}`}
                className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {pr.exerciseName}
                </p>
                <p className="text-xs text-zinc-500">
                  {pr.weight} × {pr.reps} · {formatLocalDateKey(pr.dateKey)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
