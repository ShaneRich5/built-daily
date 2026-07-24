"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  activityLevel,
  buildContributionWeeks,
  contributionMonthLabels,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import {
  formatDurationMinutes,
  formatVolumeLbs,
} from "@/lib/progress-insights";
import type { DayActivityDetail } from "@/lib/progress-types";
import { formatLocalDateKey } from "@/lib/workout-date";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-zinc-100 dark:bg-zinc-800/80",
  1: "bg-emerald-200 dark:bg-emerald-900/70",
  2: "bg-emerald-300 dark:bg-emerald-700/80",
  3: "bg-emerald-500 dark:bg-emerald-600",
  4: "bg-emerald-700 dark:bg-emerald-400",
};

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

type ProgressHeatmapProps = {
  activity: WorkoutActivityByDay;
  dayDetails: Map<string, DayActivityDetail>;
  todayKey: string;
  footer?: ReactNode;
};

export function ProgressHeatmap({
  activity,
  dayDetails,
  todayKey,
  footer,
}: ProgressHeatmapProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { weeks, monthLabels, activeDays } = useMemo(() => {
    const built = buildContributionWeeks(activity, {
      weekCount: 26,
      endDateKey: todayKey,
    });
    let windowActive = 0;
    for (const week of built) {
      for (const day of week) {
        if (day.inRange && day.count > 0) windowActive += 1;
      }
    }
    return {
      weeks: built,
      monthLabels: contributionMonthLabels(built),
      activeDays: windowActive,
    };
  }, [activity, todayKey]);

  const selected = selectedKey ? dayDetails.get(selectedKey) : null;

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="heatmap-heading"
    >
      <div>
        <h2
          id="heatmap-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Workout activity
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {activeDays === 0
            ? "Finish a workout to light up the chart."
            : `${activeDays} active day${activeDays === 1 ? "" : "s"} in the last 6 months`}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div
            className="mb-1 grid gap-1"
            style={{
              gridTemplateColumns: `1.75rem repeat(${weeks.length}, minmax(0, 1fr))`,
            }}
          >
            <span aria-hidden className="block" />
            {weeks.map((_, weekIndex) => {
              const label = monthLabels.find((m) => m.weekIndex === weekIndex);
              return (
                <span
                  key={`m-${weekIndex}`}
                  className="text-[10px] leading-none text-zinc-400"
                >
                  {label?.label ?? ""}
                </span>
              );
            })}
          </div>

          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `1.75rem repeat(${weeks.length}, minmax(0, 1fr))`,
            }}
            role="grid"
            aria-label="Workout activity for the last 26 weeks"
          >
            {WEEKDAY_LABELS.map((label, row) => (
              <div key={`row-${row}`} className="contents">
                <span className="pr-1 text-right text-[9px] leading-[11px] text-zinc-400">
                  {label}
                </span>
                {weeks.map((week, weekIndex) => {
                  const day = week[row]!;
                  const detail = dayDetails.get(day.dateKey);
                  const level = day.inRange ? activityLevel(day.count) : 0;
                  const hasPr = Boolean(detail?.hasPr);
                  const selected = selectedKey === day.dateKey;
                  return (
                    <button
                      key={`${weekIndex}-${day.dateKey}`}
                      type="button"
                      disabled={!day.inRange}
                      onClick={() =>
                        setSelectedKey((prev) =>
                          prev === day.dateKey ? null : day.dateKey,
                        )
                      }
                      title={
                        day.inRange
                          ? `${formatLocalDateKey(day.dateKey)} · ${day.count} workout${day.count === 1 ? "" : "s"}`
                          : undefined
                      }
                      className={`relative aspect-square max-h-3.5 min-h-2.5 w-full max-w-3.5 rounded-[3px] transition ${
                        day.inRange
                          ? `${LEVEL_CLASS[level]} hover:ring-2 hover:ring-zinc-400/60`
                          : "bg-transparent"
                      } ${selected ? "ring-2 ring-zinc-700 dark:ring-zinc-200" : ""}`}
                      aria-label={
                        day.inRange
                          ? `${formatLocalDateKey(day.dateKey)}, ${day.count} workouts`
                          : undefined
                      }
                      aria-pressed={selected}
                    >
                      {hasPr ? (
                        <span
                          className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-amber-400 ring-1 ring-white dark:ring-zinc-950"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-zinc-400">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className={`size-2.5 rounded-[2px] ${LEVEL_CLASS[level]}`}
            aria-hidden
          />
        ))}
        <span>More</span>
        <span className="ml-2 inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
          PR
        </span>
      </div>

      {selectedKey ? (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formatLocalDateKey(selectedKey)}
          </p>
          {!selected || selected.workouts.length === 0 ? (
            <p className="mt-2 text-zinc-500">No workout logged this day.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {selected.workouts.map((w) => (
                <li key={w.sessionId} className="space-y-1">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">
                    ✓ {w.title}
                  </p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    <div>
                      <dt className="uppercase tracking-wide text-zinc-400">
                        Duration
                      </dt>
                      <dd>{formatDurationMinutes(w.durationSec)}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-zinc-400">
                        Volume
                      </dt>
                      <dd>{formatVolumeLbs(w.volumeLbs)}</dd>
                    </div>
                  </dl>
                  {w.prs.length > 0 ? (
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        PR
                      </p>
                      <ul className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                        {w.prs.map((pr) => (
                          <li key={`${pr.exerciseName}-${pr.weight}-${pr.reps}`}>
                            {pr.exerciseName} · {pr.weight} × {pr.reps}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <SessionLink sessionId={w.sessionId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">Tap a day for details.</p>
      )}

      {footer}
    </section>
  );
}

function SessionLink({ sessionId }: { sessionId: string }) {
  return (
    <Link
      href={`/sessions/${sessionId}`}
      className="inline-block text-xs font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
    >
      Open session
    </Link>
  );
}
