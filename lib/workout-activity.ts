import {
  dateFromLocalDateKey,
  localDateKeyFromMs,
} from "@/lib/workout-date";

/** Completed workouts per local calendar day (`YYYY-MM-DD` → count). */
export type WorkoutActivityByDay = Map<string, number>;

export function shiftLocalDateKey(dateKey: string, dayDelta: number): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  d.setDate(d.getDate() + dayDelta);
  return localDateKeyFromMs(d.getTime());
}

/**
 * Count completed sessions by workout calendar day.
 * Falls back to endedAt / startedAt when workoutDate is missing.
 */
export function activityByDayFromSessions(
  sessions: Array<{
    status: string;
    workoutDate: string | null;
    endedAt: Date | null;
    startedAt: Date;
  }>,
): WorkoutActivityByDay {
  const map: WorkoutActivityByDay = new Map();
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const key =
      s.workoutDate ??
      localDateKeyFromMs((s.endedAt ?? s.startedAt).getTime());
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/**
 * Consecutive local days with ≥1 workout, walking backward from today.
 * Missing today → streak 0.
 */
export function currentWorkoutStreak(
  activity: WorkoutActivityByDay,
  todayKey: string = localDateKeyFromMs(Date.now()),
): number {
  let streak = 0;
  let cursor = todayKey;
  while ((activity.get(cursor) ?? 0) > 0) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }
  return streak;
}

export type ContributionDay = {
  dateKey: string;
  count: number;
  /** Outside the visible window (padding cells). */
  inRange: boolean;
};

export type ContributionWeek = ContributionDay[];

/**
 * GitHub-style week columns (Sun→Sat), ending with the week that contains `endDateKey`.
 */
export function buildContributionWeeks(
  activity: WorkoutActivityByDay,
  options?: { weekCount?: number; endDateKey?: string },
): ContributionWeek[] {
  const weekCount = options?.weekCount ?? 26;
  const endKey = options?.endDateKey ?? localDateKeyFromMs(Date.now());
  const end = dateFromLocalDateKey(endKey);
  if (!end) return [];

  // Align to Saturday of the week containing end (Sun=0 … Sat=6).
  const endDow = end.getDay();
  const saturday = new Date(end);
  saturday.setDate(end.getDate() + (6 - endDow));
  const rangeEndKey = localDateKeyFromMs(saturday.getTime());

  const totalDays = weekCount * 7;
  const rangeStartKey = shiftLocalDateKey(rangeEndKey, -(totalDays - 1));

  const weeks: ContributionWeek[] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: ContributionDay[] = [];
    for (let d = 0; d < 7; d++) {
      const dateKey = shiftLocalDateKey(rangeStartKey, w * 7 + d);
      week.push({
        dateKey,
        count: activity.get(dateKey) ?? 0,
        inRange: dateKey <= endKey,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** 0 = none, 1–4 = increasing intensity (GitHub-like). */
export function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

/**
 * Heatmap day classification (recovery is intentional — never “missed”
 * unless a scheduled plan exists later).
 * Workout days win over activity-only days.
 */
export type HeatmapDayKind =
  | "workout"
  | "activity"
  | "recovery"
  | "today"
  | "future"
  | "empty";

export function heatmapDayKind(options: {
  dateKey: string;
  count: number;
  todayKey: string;
  /** First day the user logged a workout or activity; earlier days stay blank. */
  firstActivityKey: string | null;
  /** Recreational activities that day (ignored when count > 0). */
  activityCount?: number;
}): HeatmapDayKind {
  const {
    dateKey,
    count,
    todayKey,
    firstActivityKey,
    activityCount = 0,
  } = options;
  if (dateKey > todayKey) return "future";
  if (count > 0) return "workout";
  if (activityCount > 0) return "activity";
  if (!firstActivityKey || dateKey < firstActivityKey) return "empty";
  if (dateKey === todayKey) return "today";
  return "recovery";
}

export function earliestActivityKey(
  activity: WorkoutActivityByDay,
): string | null {
  let min: string | null = null;
  for (const [key, count] of activity) {
    if (count > 0 && (min === null || key < min)) min = key;
  }
  return min;
}

/** Month label positions for the top of a contribution grid. */
export function contributionMonthLabels(
  weeks: ContributionWeek[],
): Array<{ weekIndex: number; label: string }> {
  const out: Array<{ weekIndex: number; label: string }> = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const first = weeks[i]?.[0];
    if (!first) continue;
    const d = dateFromLocalDateKey(first.dateKey);
    if (!d) continue;
    const month = d.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      // Skip label on first column if it would crowd; still show when month changes.
      if (i === 0 && d.getDate() > 7) {
        // Mid-month start — wait for next month boundary.
        continue;
      }
      out.push({
        weekIndex: i,
        label: d.toLocaleString("en-US", { month: "short" }),
      });
    }
  }
  return out;
}
