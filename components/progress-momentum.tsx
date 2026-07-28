"use client";

import type { WeekMomentum } from "@/lib/progress-insights";

type ProgressMomentumProps = {
  momentum: WeekMomentum;
};

const STATUS_STYLES: Record<
  WeekMomentum["status"],
  { badge: string; badgeText: string }
> = {
  complete: {
    badge: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    badgeText: "Week locked",
  },
  protecting: {
    badge: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
    badgeText: "Streak safe",
  },
  on_track: {
    badge: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    badgeText: "On track",
  },
  at_risk: {
    badge: "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    badgeText: "Still possible",
  },
  starting: {
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    badgeText: "New week",
  },
};

export function ProgressMomentum({ momentum }: ProgressMomentumProps) {
  const style = STATUS_STYLES[momentum.status];

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="momentum-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            This week
          </p>
          <h2
            id="momentum-heading"
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            {momentum.title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {momentum.detail}
          </p>
        </div>
        <p
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${style.badge}`}
        >
          {style.badgeText}
        </p>
      </div>

      {momentum.bankedStreak > 0 && momentum.status !== "complete" ? (
        <p className="mt-3 text-xs text-zinc-500">
          Banked streak stays at{" "}
          <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
            {momentum.bankedStreak}
          </span>{" "}
          until the week ends—Monday isn’t a reset.
        </p>
      ) : null}
    </section>
  );
}
