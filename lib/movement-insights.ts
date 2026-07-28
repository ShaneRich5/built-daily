import { activityTypeName } from "@/lib/activity-catalog";
import type { SavedActivity } from "@/lib/activity-types";
import {
  shiftLocalDateKey,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import {
  dateFromLocalDateKey,
  localDateKeyFromMs,
} from "@/lib/workout-date";
import type {
  DayActivityDetail,
  DayLoggedActivitySummary,
  MovementGoalTarget,
} from "@/lib/progress-types";

/** Activity counts per local calendar day. */
export type ActivityByDay = Map<string, number>;

function weekStartMondayKey(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  const dow = d.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return localDateKeyFromMs(d.getTime());
}

export function activityByDayFromSaved(
  rows: SavedActivity[],
): ActivityByDay {
  const map: ActivityByDay = new Map();
  for (const { activity } of rows) {
    const key = activity.activityDate;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Days with a workout or an activity (movement days). */
export function movementDaysFromMaps(
  workouts: WorkoutActivityByDay,
  activities: ActivityByDay,
): Set<string> {
  const days = new Set<string>();
  for (const [key, n] of workouts) {
    if (n > 0) days.add(key);
  }
  for (const [key, n] of activities) {
    if (n > 0) days.add(key);
  }
  return days;
}

export function movementDaysInWeek(
  movementDays: Set<string>,
  weekStartKey: string,
): number {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    if (movementDays.has(shiftLocalDateKey(weekStartKey, i))) n += 1;
  }
  return n;
}

export type MovementGoalStatus = {
  weekStartKey: string;
  target: MovementGoalTarget;
  completed: number;
  met: boolean;
};

export function movementGoalStatus(
  movementDays: Set<string>,
  target: MovementGoalTarget,
  todayKey: string = localDateKeyFromMs(Date.now()),
): MovementGoalStatus {
  const weekStartKey = weekStartMondayKey(todayKey);
  const completed = movementDaysInWeek(movementDays, weekStartKey);
  return {
    weekStartKey,
    target,
    completed,
    met: completed >= target,
  };
}

/**
 * Consecutive local days with workout or activity, walking backward from today.
 * Missing today → streak 0.
 */
export function currentMovementStreak(
  movementDays: Set<string>,
  todayKey: string = localDateKeyFromMs(Date.now()),
): number {
  let streak = 0;
  let cursor = todayKey;
  while (movementDays.has(cursor)) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }
  return streak;
}

export function longestMovementStreak(movementDays: Set<string>): number {
  if (movementDays.size === 0) return 0;
  const keys = [...movementDays].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = dateFromLocalDateKey(keys[i - 1]!);
    const cur = dateFromLocalDateKey(keys[i]!);
    if (!prev || !cur) continue;
    const diffMs = cur.getTime() - prev.getTime();
    const dayDiff = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if (dayDiff === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

export function mergeDayDetailsWithActivities(
  dayDetails: Map<string, DayActivityDetail>,
  activities: SavedActivity[],
): Map<string, DayActivityDetail> {
  const merged = new Map<string, DayActivityDetail>();

  for (const [key, detail] of dayDetails) {
    merged.set(key, { ...detail, activities: [...(detail.activities ?? [])] });
  }

  for (const { id, activity } of activities) {
    const key = activity.activityDate;
    const summary: DayLoggedActivitySummary = {
      activityId: id,
      activityTypeId: activity.activityTypeId,
      name: activityTypeName(activity.activityTypeId),
      durationMin: activity.durationMin,
      distanceMiles: activity.distanceMiles,
    };
    const existing = merged.get(key);
    if (existing) {
      existing.activities.push(summary);
    } else {
      merged.set(key, {
        dateKey: key,
        workouts: [],
        activities: [summary],
        totalVolumeLbs: 0,
        totalDurationSec: 0,
        hasPr: false,
      });
    }
  }

  return merged;
}

/** Earliest date key with either workouts or activities. */
export function earliestMovementKey(
  workouts: WorkoutActivityByDay,
  activities: ActivityByDay,
): string | null {
  let min: string | null = null;
  for (const [key, n] of workouts) {
    if (n > 0 && (min === null || key < min)) min = key;
  }
  for (const [key, n] of activities) {
    if (n > 0 && (min === null || key < min)) min = key;
  }
  return min;
}
