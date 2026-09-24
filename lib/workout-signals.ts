/**
 * Show-up signals (streak, this week's count, last workout day) shared by
 * group rosters and public profiles. Pure and SDK-agnostic — callers fetch
 * completed sessions with whichever Firestore SDK they have (client or
 * Admin) and pass in plain `{status, workoutDate, endedAt, startedAt}` rows.
 *
 * Always recomputes from the session list rather than incrementing a stored
 * counter, so deleting, moving, reopening, or backdating a session self-heals
 * the result on the next call instead of leaving stale drift behind.
 */
import {
  activityByDayFromSessions,
  currentWorkoutStreak,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import { weekStartMondayKey, workoutsInWeek } from "@/lib/progress-insights";
import { localDateKeyFromMs } from "@/lib/workout-date";

export type CompletedSessionSummary = {
  status: string;
  workoutDate: string | null;
  endedAt: Date | null;
  startedAt: Date;
};

export type WorkoutSignals = {
  currentStreak: number;
  workoutsThisWeek: number;
  lastWorkoutDateKey: string | null;
  lastWorkoutAt: Date | null;
  activityByDay: WorkoutActivityByDay;
};

export function computeWorkoutSignals(
  sessions: CompletedSessionSummary[],
  todayKey: string = localDateKeyFromMs(Date.now()),
): WorkoutSignals {
  const completed = sessions.filter((s) => s.status === "completed");
  const activityByDay = activityByDayFromSessions(completed);

  let lastWorkoutDateKey: string | null = null;
  let lastWorkoutAt: Date | null = null;
  for (const s of completed) {
    const at = s.endedAt ?? s.startedAt;
    const key = s.workoutDate ?? localDateKeyFromMs(at.getTime());
    if (!lastWorkoutDateKey || key > lastWorkoutDateKey) {
      lastWorkoutDateKey = key;
      lastWorkoutAt = at;
    }
  }

  return {
    currentStreak: currentWorkoutStreak(activityByDay, todayKey),
    workoutsThisWeek: workoutsInWeek(activityByDay, weekStartMondayKey(todayKey)),
    lastWorkoutDateKey,
    lastWorkoutAt,
    activityByDay,
  };
}
