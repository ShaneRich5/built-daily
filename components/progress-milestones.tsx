"use client";

import type { Milestone } from "@/lib/progress-types";
import { formatLocalDateKey } from "@/lib/workout-date";

type ProgressMilestonesProps = {
  milestones: Milestone[];
};

export function ProgressMilestones({ milestones }: ProgressMilestonesProps) {
  const achieved = milestones.filter((m) => m.achieved);
  const upcoming = milestones.filter((m) => !m.achieved).slice(0, 3);

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="milestones-heading"
    >
      <div>
        <h2
          id="milestones-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Milestones
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Quiet wins along the way—no leaderboards.
        </p>
      </div>

      {achieved.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Your first workout unlocks the first milestone.
        </p>
      ) : (
        <ol className="space-y-3">
          {[...achieved].reverse().map((m) => (
            <li key={m.id} className="flex gap-3">
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {m.title}
                </p>
                <p className="text-xs text-zinc-500">{m.description}</p>
                {m.achievedAtKey ? (
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {formatLocalDateKey(m.achievedAtKey)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {upcoming.length > 0 ? (
        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Coming up
          </p>
          <ul className="mt-2 space-y-2">
            {upcoming.map((m) => (
              <li key={m.id} className="text-sm text-zinc-500">
                {m.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
