"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  activityLevel,
  buildContributionWeeks,
  contributionMonthLabels,
  heatmapDayKind,
  type HeatmapDayKind,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import type { ActivityByDay } from "@/lib/movement-insights";
import { earliestMovementKey } from "@/lib/movement-insights";
import {
  formatDurationMinutes,
  formatVolumeLbs,
} from "@/lib/progress-insights";
import type { DayActivityDetail } from "@/lib/progress-types";
import { formatLocalDateKey } from "@/lib/workout-date";

const EMPTY_ACTIVITY_BY_DAY: ActivityByDay = new Map();

const WORKOUT_LEVEL_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "bg-emerald-200 dark:bg-emerald-900/70",
  2: "bg-emerald-300 dark:bg-emerald-700/80",
  3: "bg-emerald-500 dark:bg-emerald-600",
  4: "bg-emerald-700 dark:bg-emerald-400",
};

/** Distinct from workout emerald and recovery gray. */
const ACTIVITY_CELL_CLASS = "bg-blue-300 dark:bg-blue-700/70";

const KIND_CLASS: Record<HeatmapDayKind, string> = {
  workout: "",
  activity: ACTIVITY_CELL_CLASS,
  both: "",
  recovery: "bg-zinc-200 dark:bg-zinc-800",
  today: "bg-white ring-1 ring-inset ring-zinc-300 dark:bg-zinc-950 dark:ring-zinc-600",
  future: "bg-transparent",
  empty: "bg-transparent",
};

const SPLIT_WORKOUT_CLIP = "polygon(0 0, 100% 0, 0 100%)";
const SPLIT_ACTIVITY_CLIP = "polygon(100% 0, 100% 100%, 0 100%)";

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

type ProgressHeatmapProps = {
  activity: WorkoutActivityByDay;
  /** Recreational activity counts by day (optional). */
  activityByDay?: ActivityByDay;
  dayDetails: Map<string, DayActivityDetail>;
  todayKey: string;
  footer?: ReactNode;
};

function kindLabel(kind: HeatmapDayKind, count: number): string {
  switch (kind) {
    case "workout":
      return count === 1 ? "Workout completed" : `${count} workouts`;
    case "activity":
      return "Activity day";
    case "both":
      return count === 1
        ? "Workout and activity"
        : `${count} workouts and activity`;
    case "recovery":
      return "Recovery day";
    case "today":
      return "Today · open";
    case "future":
      return "Future";
    case "empty":
      return "—";
    default: {
      const _e: never = kind;
      return _e;
    }
  }
}

function cellClass(kind: HeatmapDayKind, count: number): string {
  if (kind === "both") return "";
  if (kind === "workout") {
    const level = activityLevel(count);
    return level === 0
      ? KIND_CLASS.recovery
      : WORKOUT_LEVEL_CLASS[level as 1 | 2 | 3 | 4];
  }
  return KIND_CLASS[kind];
}

function dayKindFor(
  dateKey: string,
  workoutCount: number,
  activityCount: number,
  todayKey: string,
  firstKey: string | null,
): HeatmapDayKind {
  return heatmapDayKind({
    dateKey,
    count: workoutCount,
    activityCount,
    todayKey,
    firstActivityKey: firstKey,
  });
}

export function ProgressHeatmap({
  activity,
  activityByDay,
  dayDetails,
  todayKey,
  footer,
}: ProgressHeatmapProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activities = activityByDay ?? EMPTY_ACTIVITY_BY_DAY;

  const { weeks, monthLabels, workoutDays, activityDays, recoveryDays, firstKey } =
    useMemo(() => {
      const built = buildContributionWeeks(activity, {
        weekCount: 26,
        endDateKey: todayKey,
      });
      const first = earliestMovementKey(activity, activities);
      let workouts = 0;
      let acts = 0;
      let recoveries = 0;
      for (const week of built) {
        for (const day of week) {
          if (!day.inRange) continue;
          const kind = dayKindFor(
            day.dateKey,
            day.count,
            activities.get(day.dateKey) ?? 0,
            todayKey,
            first,
          );
          if (kind === "workout") workouts += 1;
          if (kind === "activity") acts += 1;
          if (kind === "both") {
            workouts += 1;
            acts += 1;
          }
          if (kind === "recovery") recoveries += 1;
        }
      }
      return {
        weeks: built,
        monthLabels: contributionMonthLabels(built),
        workoutDays: workouts,
        activityDays: acts,
        recoveryDays: recoveries,
        firstKey: first,
      };
    }, [activity, activities, todayKey]);

  const selected = selectedKey ? dayDetails.get(selectedKey) : null;
  const selectedKind = selectedKey
    ? dayKindFor(
        selectedKey,
        activity.get(selectedKey) ?? 0,
        activities.get(selectedKey) ?? 0,
        todayKey,
        firstKey,
      )
    : null;

  const summaryParts: string[] = [];
  if (workoutDays > 0) {
    summaryParts.push(
      `${workoutDays} workout day${workoutDays === 1 ? "" : "s"}`,
    );
  }
  if (activityDays > 0) {
    summaryParts.push(
      `${activityDays} activity day${activityDays === 1 ? "" : "s"}`,
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
      aria-labelledby="heatmap-heading"
    >
      <div>
        <h2
          id="heatmap-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Consistency
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {summaryParts.length === 0
            ? "Finish a workout or log an activity to light up the chart."
            : summaryParts.join(" · ")}
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
            aria-label="Workout and activity for the last 26 weeks"
          >
            {WEEKDAY_LABELS.map((label, row) => (
              <div key={`row-${row}`} className="contents">
                <span className="pr-1 text-right text-[9px] leading-[11px] text-zinc-400">
                  {label}
                </span>
                {weeks.map((week, weekIndex) => {
                  const day = week[row]!;
                  const kind = day.inRange
                    ? dayKindFor(
                        day.dateKey,
                        day.count,
                        activities.get(day.dateKey) ?? 0,
                        todayKey,
                        firstKey,
                      )
                    : "future";
                  const detail = dayDetails.get(day.dateKey);
                  const hasPr = Boolean(detail?.hasPr);
                  const isSelected = selectedKey === day.dateKey;
                  const interactive =
                    day.inRange && kind !== "empty" && kind !== "future";
                  const workoutLevel = activityLevel(day.count);
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
                      className={`relative aspect-square max-h-3.5 min-h-2.5 w-full max-w-3.5 overflow-hidden rounded-[3px] transition ${cellClass(kind, day.count)} ${
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
                    >
                      {kind === "both" ? (
                        <>
                          <span
                            className={`absolute inset-0 ${WORKOUT_LEVEL_CLASS[workoutLevel as 1 | 2 | 3 | 4]}`}
                            style={{ clipPath: SPLIT_WORKOUT_CLIP }}
                            aria-hidden
                          />
                          <span
                            className={`absolute inset-0 ${ACTIVITY_CELL_CLASS}`}
                            style={{ clipPath: SPLIT_ACTIVITY_CLIP }}
                            aria-hidden
                          />
                        </>
                      ) : null}
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

      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-[2px] ${WORKOUT_LEVEL_CLASS[2]}`}
            aria-hidden
          />
          Workout
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-2.5 rounded-[2px] ${KIND_CLASS.activity}`}
            aria-hidden
          />
          Activity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="relative size-2.5 overflow-hidden rounded-[2px]" aria-hidden>
            <span
              className={`absolute inset-0 ${WORKOUT_LEVEL_CLASS[2]}`}
              style={{ clipPath: SPLIT_WORKOUT_CLIP }}
            />
            <span
              className={`absolute inset-0 ${ACTIVITY_CELL_CLASS}`}
              style={{ clipPath: SPLIT_ACTIVITY_CLIP }}
            />
          </span>
          Both
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
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
          PR
        </span>
      </div>

      {selectedKey && selectedKind ? (
        <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formatLocalDateKey(selectedKey)}
          </p>
          {selectedKind === "recovery" ||
          (selectedKind === "today" &&
            (!selected ||
              (selected.workouts.length === 0 &&
                selected.activities.length === 0))) ? (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {selectedKind === "today" ? "Open day" : "Recovery day"}
              </p>
              <p className="text-xs text-zinc-500">
                {selectedKind === "today"
                  ? "Log a workout or activity when you’re ready—or keep it as recovery."
                  : "Recovery is part of training. Rest days don’t break your weekly workout goal."}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              {selected && selected.workouts.length > 0 ? (
                <ul className="space-y-3">
                  {selected.workouts.map((w) => (
                    <li key={w.sessionId} className="space-y-1">
                      <p className="font-medium text-zinc-800 dark:text-zinc-100">
                        Workout · {w.title}
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
                              <li
                                key={`${pr.exerciseName}-${pr.weight}-${pr.reps}`}
                              >
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
              ) : null}
              {selected && selected.activities.length > 0 ? (
                <ul className="space-y-2">
                  {selected.activities.map((a) => (
                    <li key={a.activityId}>
                      <p className="font-medium text-teal-800 dark:text-teal-300">
                        Activity · {a.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {[
                          a.durationMin != null ? `${a.durationMin} min` : null,
                          a.distanceMiles != null
                            ? `${a.distanceMiles} mi`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Logged"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
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
