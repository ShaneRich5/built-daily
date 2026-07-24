"use client";

import {
  formatDurationMinutes,
  formatVolumeLbs,
  type ProgressStats,
} from "@/lib/progress-insights";

type ProgressStatsProps = {
  stats: ProgressStats;
};

export function ProgressStats({ stats }: ProgressStatsProps) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Total workouts", value: String(stats.totalWorkouts) },
    {
      label: "Total workout time",
      value: formatDurationMinutes(stats.totalDurationSec),
    },
    {
      label: "Total volume",
      value: formatVolumeLbs(stats.totalVolumeLbs),
    },
    {
      label: "Favorite exercise",
      value: stats.favoriteExercise ?? "—",
    },
    {
      label: "Favorite muscle group",
      value: stats.favoriteMuscleGroup ?? "—",
    },
  ];

  return (
    <section
      className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="stats-heading"
    >
      <h2
        id="stats-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Statistics
      </h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs text-zinc-500">{row.label}</dt>
            <dd className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
