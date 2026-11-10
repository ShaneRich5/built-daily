/**
 * Show-up signals (streak, this week's count, last workout day) shared by
 * group rosters and public profiles. Pure and SDK-agnostic — callers fetch
 * completed sessions and logged activities with whichever Firestore SDK they
 * have (client or Admin) and pass in plain summary rows.
 *
 * A logged activity (walk, ride, etc.) counts as "showing up" the same as a
 * completed workout — matches how personal consistency tracking already
 * treats them (see lib/movement-insights.ts's movementDaysFromMaps).
 *
 * Always recomputes from the session/activity lists rather than incrementing
 * a stored counter, so deleting, moving, reopening, or backdating either one
 * self-heals the result on the next call instead of leaving stale drift
 * behind.
 */
import {
  activityByDayFromSessions,
  currentWorkoutStreak,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import { workoutsInWeek } from "@/lib/progress-insights";
import { localDateKeyFromMs } from "@/lib/workout-date";
import { shiftLocalDateKey } from "@/lib/workout-activity";

export type CompletedSessionSummary = {
  status: string;
  workoutDate: string | null;
  endedAt: Date | null;
  startedAt: Date;
  /** Workout name, for the group's "Maya: Push day" line. */
  title?: string;
};

/** A logged activity, reduced to just what show-up signals need. */
export type ActivityDaySummary = {
  activityDate: string;
  /** Best available timestamp for ordering (endedAt ?? startedAt ?? createdAt). */
  at: Date;
  /** Activity name ("Run"). */
  label?: string;
};

export type WorkoutSignals = {
  currentStreak: number;
  workoutsThisWeek: number;
  lastWorkoutDateKey: string | null;
  lastWorkoutAt: Date | null;
  /** Name of the latest workout or activity, when callers pass titles. */
  lastWorkoutLabel: string | null;
  activityByDay: WorkoutActivityByDay;
};

/** Days (`YYYY-MM-DD`) with any workout or activity, from last week's Sunday through today. */
export function trainedDaysThisAndLastWeek(
  activityByDay: WorkoutActivityByDay,
  todayKey: string,
): string[] {
  const from = shiftLocalDateKey(startOfWeekDateKey(todayKey), -7);
  return [...activityByDay.entries()]
    .filter(([key, count]) => count > 0 && key >= from && key <= todayKey)
    .map(([key]) => key)
    .sort();
}

export function computeWorkoutSignals(
  sessions: CompletedSessionSummary[],
  activities: ActivityDaySummary[] = [],
  todayKey: string = localDateKeyFromMs(Date.now()),
): WorkoutSignals {
  const completed = sessions.filter((s) => s.status === "completed");
  const activityByDay = activityByDayFromSessions(completed);
  for (const a of activities) {
    if (!a.activityDate) continue;
    activityByDay.set(a.activityDate, (activityByDay.get(a.activityDate) ?? 0) + 1);
  }

  let lastWorkoutDateKey: string | null = null;
  let lastWorkoutAt: Date | null = null;
  let lastWorkoutLabel: string | null = null;
  const considerLast = (key: string, at: Date, label: string | undefined) => {
    const later =
      !lastWorkoutDateKey ||
      key > lastWorkoutDateKey ||
      (key === lastWorkoutDateKey && lastWorkoutAt !== null && at > lastWorkoutAt);
    if (later) {
      lastWorkoutDateKey = key;
      lastWorkoutAt = at;
      lastWorkoutLabel = label?.trim() || null;
    }
  };
  for (const s of completed) {
    const at = s.endedAt ?? s.startedAt;
    considerLast(s.workoutDate ?? localDateKeyFromMs(at.getTime()), at, s.title);
  }
  for (const a of activities) {
    considerLast(a.activityDate, a.at, a.label);
  }

  return {
    currentStreak: currentWorkoutStreak(activityByDay, todayKey),
    workoutsThisWeek: workoutsInWeek(activityByDay, startOfWeekDateKey(todayKey)),
    lastWorkoutDateKey,
    lastWorkoutAt,
    lastWorkoutLabel,
    activityByDay,
  };
}
