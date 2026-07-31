"use client";

import { useMemo, useState } from "react";
import {
  activityLevel,
  buildContributionWeeks,
  contributionMonthLabels,
  earliestActivityKey,
  heatmapDayKind,
  type HeatmapDayKind,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import { formatLocalDateKey } from "@/lib/workout-date";

const WORKOUT_LEVEL_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-emerald-200 dark:bg-emerald-900/70",
  2: "bg-emerald-300 dark:bg-emerald-700/80",
  3: "bg-emerald-500 dark:bg-emerald-600",
  4: "bg-emerald-700 dark:bg-emerald-400",
};

const CELL_OUTLINE =
  "ring-1 ring-inset ring-zinc-200/90 dark:ring-zinc-700/90";

const KIND_CLASS: Record<"recovery" | "today" | "future" | "empty", string> = {
  recovery: "bg-zinc-200 dark:bg-zinc-800",
  today: "bg-white ring-zinc-300 dark:bg-zinc-950 dark:ring-zinc-600",
  future: "bg-zinc-50/80 dark:bg-zinc-900/40",
  empty: "bg-zinc-50/80 dark:bg-zinc-900/40",
};

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

type PublicConsistencyHeatmapProps = {
  activity: WorkoutActivityByDay;
  todayKey: string;
};

function cellClass(kind: HeatmapDayKind, count: number): string {
  if (kind === "workout" || kind === "both") {
    const level = activityLevel(count);
    return level === 0
      ? KIND_CLASS.recovery
      : WORKOUT_LEVEL_CLASS[level as 1 | 2 | 3 | 4];
  }
  if (kind === "activity") return KIND_CLASS.recovery;
  return KIND_CLASS[kind];
}

function kindLabel(kind: HeatmapDayKind, count: number): string {
  if (kind === "workout" || kind === "both" || kind === "activity") {
    return count === 1 ? "Workout completed" : `${count} workouts`;
  }
  if (kind === "recovery") return "Recovery day";
  if (kind === "today") return "Today · open";
  if (kind === "future") return "Future";
  return "—";
}

/** Workout-only consistency chart for public profiles (no private day details). */
export function PublicConsistencyHeatmap({
  activity,
  todayKey,
}: PublicConsistencyHeatmapProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { weeks, monthLabels, workoutDays, recoveryDays, firstKey } =
    useMemo(() => {
      const first = earliestActivityKey(activity);
      const built = buildContributionWeeks(activity, {
        weekCount: 52,
        endDateKey: todayKey,
        startDateKey: first,
      });
      let workouts = 0;
      let recoveries = 0;
      for (const week of built) {
        for (const day of week) {
          if (!day.inRange) continue;
          const kind = heatmapDayKind({
            dateKey: day.dateKey,
            count: day.count,
            todayKey,
            firstActivityKey: first,
          });
          if (kind === "workout") workouts += 1;
          if (kind === "recovery") recoveries += 1;
        }
      }
      return {
        weeks: built,
        monthLabels: contributionMonthLabels(built),
        workoutDays: workouts,
        recoveryDays: recoveries,
        firstKey: first,
      };
    }, [activity, todayKey]);

  const selectedCount = selectedKey ? (activity.get(selectedKey) ?? 0) : 0;
  const selectedKind = selectedKey
    ? heatmapDayKind({
        dateKey: selectedKey,
        count: selectedCount,
        todayKey,
        firstActivityKey: firstKey,
      })
    : null;

  const summaryParts: string[] = [];
  if (workoutDays > 0) {
    summaryParts.push(
      `${workoutDays} workout day${workoutDays === 1 ? "" : "s"}`,
    );
  }
  if (recoveryDays > 0) {
    summaryParts.push(
      `${recoveryDays} recovery day${recoveryDays === 1 ? "" : "s"}`,
    );
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="public-heatmap-heading"
    >
      <div>
        <h2
          id="public-heatmap-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Consistency
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {summaryParts.length === 0
            ? "No workouts shared on this chart yet."
            : summaryParts.join(" · ")}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div
            className="mb-1 grid gap-1"
            style={{
              gridTemplateColumns: `1.75rem repeat(${weeks.length}, 0.875rem)`,
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
              gridTemplateColumns: `1.75rem repeat(${weeks.length}, 0.875rem)`,
            }}
            role="grid"
            aria-label="Workout consistency calendar"
          >
            {WEEKDAY_LABELS.map((label, row) => (
              <div key={`row-${row}`} className="contents">
                <span className="pr-1 text-right text-[9px] leading-[11px] text-zinc-400">
                  {label}
                </span>
                {weeks.map((week, weekIndex) => {
                  const day = week[row]!;
                  const kind = day.inRange
                    ? heatmapDayKind({
                        dateKey: day.dateKey,
                        count: day.count,
                        todayKey,
                        firstActivityKey: firstKey,
                      })
                    : "future";
                  const isSelected = selectedKey === day.dateKey;
                  const interactive =
                    day.inRange && kind !== "empty" && kind !== "future";
                  return (
                    <button
                      key={`${weekIndex}-${day.dateKey}`}
                      type="button"
                      disabled={!interactive}
                      onClick={() =>
                        setSelectedKey((prev) =>
                          prev === day.dateKey ? null : day.dateKey,
                        )
                      }
                      title={
                        day.inRange
                          ? `${formatLocalDateKey(day.dateKey)} · ${kindLabel(kind, day.count)}`
                          : undefined
                      }
                      className={`relative size-3.5 shrink-0 overflow-hidden rounded-[3px] transition ${CELL_OUTLINE} ${cellClass(kind, day.count)} ${
                        interactive
                          ? "hover:ring-2 hover:ring-zinc-400/60"
                          : "pointer-events-none"
                      } ${isSelected ? "ring-2 ring-zinc-700 dark:ring-zinc-200" : ""}`}
                      aria-label={
                        day.inRange
                          ? `${formatLocalDateKey(day.dateKey)}, ${kindLabel(kind, day.count)}`
                          : undefined
                      }
                      aria-pressed={isSelected}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-[2px] ${WORKOUT_LEVEL_CLASS[2]}`}
            aria-hidden
          />
          Workout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-[2px] ${KIND_CLASS.recovery}`}
            aria-hidden
          />
          Recovery
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-[2px] ${KIND_CLASS.today}`}
            aria-hidden
          />
          Today
        </span>
      </div>

      {selectedKey && selectedKind ? (
        <div className="text-sm">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formatLocalDateKey(selectedKey)}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {kindLabel(selectedKind, selectedCount)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
