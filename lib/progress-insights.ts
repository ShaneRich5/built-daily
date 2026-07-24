import {
  activityByDayFromSessions,
  shiftLocalDateKey,
  type WorkoutActivityByDay,
} from "@/lib/workout-activity";
import { muscleGroupForExercise, muscleGroupLabel } from "@/lib/exercise-muscle";
import type {
  DayActivityDetail,
  DayWorkoutSummary,
  Milestone,
  MuscleGroup,
  PersonalRecord,
  WeekGoalStatus,
  WeeklyGoalTarget,
} from "@/lib/progress-types";
import {
  dateFromLocalDateKey,
  localDateKeyFromMs,
} from "@/lib/workout-date";
import type { WorkoutSessionDoc } from "@/lib/workout-types";

export type ProgressSession = {
  id: string;
  session: WorkoutSessionDoc;
};

/** Epley estimated 1RM. */
export function estimatedOneRepMax(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function sessionDateKey(session: WorkoutSessionDoc): string {
  return (
    session.workoutDate ??
    localDateKeyFromMs((session.endedAt ?? session.startedAt).getTime())
  );
}

export function setVolumeLbs(weight: number | null, reps: number | null): number {
  if (weight == null || reps == null || !(weight > 0) || !(reps > 0)) return 0;
  return weight * reps;
}

export function sessionVolumeLbs(session: WorkoutSessionDoc): number {
  let total = 0;
  for (const line of session.lines) {
    if (line.metric !== "weight_reps") continue;
    for (const set of line.sets) {
      total += setVolumeLbs(set.weight, set.reps);
    }
  }
  return total;
}

/** Monday of the local week containing dateKey. */
export function weekStartMondayKey(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  const dow = d.getDay(); // 0 Sun … 6 Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return localDateKeyFromMs(d.getTime());
}

export function workoutsInWeek(
  activity: WorkoutActivityByDay,
  weekStartKey: string,
): number {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const key = shiftLocalDateKey(weekStartKey, i);
    n += activity.get(key) ?? 0;
  }
  return n;
}

export function weekGoalStatus(
  activity: WorkoutActivityByDay,
  weeklyGoal: WeeklyGoalTarget,
  todayKey: string,
): WeekGoalStatus {
  const weekStartKey = weekStartMondayKey(todayKey);
  const completed = workoutsInWeek(activity, weekStartKey);
  return {
    weekStartKey,
    target: weeklyGoal,
    completed,
    met: completed >= weeklyGoal,
  };
}

/**
 * Consecutive weeks (ending this week if met, else last completed week)
 * where workout count ≥ target. Current incomplete week doesn't break the
 * streak until the week ends unmet — if this week already met, include it;
 * if this week not yet met but still in progress, streak is prior weeks only
 * (don't reset mid-week).
 */
export function goalWeekStreak(
  activity: WorkoutActivityByDay,
  weeklyGoal: WeeklyGoalTarget,
  todayKey: string,
): { current: number; longest: number } {
  const thisWeekStart = weekStartMondayKey(todayKey);
  let cursor = thisWeekStart;
  const thisWeekCount = workoutsInWeek(activity, thisWeekStart);
  const thisWeekMet = thisWeekCount >= weeklyGoal;

  // Walk back week by week. Mid-week: start from previous week if current unmet.
  if (!thisWeekMet) {
    cursor = shiftLocalDateKey(thisWeekStart, -7);
  }

  let current = 0;
  // Cap lookback ~3 years
  for (let i = 0; i < 160; i++) {
    const count = workoutsInWeek(activity, cursor);
    if (count >= weeklyGoal) {
      current += 1;
      cursor = shiftLocalDateKey(cursor, -7);
    } else {
      // Empty weeks with no history shouldn't infinitely continue if never worked out
      if (count === 0 && current === 0 && !thisWeekMet) {
        // keep walking only if we haven't started counting — stop if far past first activity
        const anyEarlier = hasAnyActivityBefore(activity, cursor);
        if (!anyEarlier) break;
      }
      break;
    }
  }

  let longest = current;
  // Scan all weeks from first activity for longest
  const firstKey = earliestActivityKey(activity);
  if (firstKey) {
    let w = weekStartMondayKey(firstKey);
    const end = thisWeekStart;
    let run = 0;
    while (w <= end) {
      if (workoutsInWeek(activity, w) >= weeklyGoal) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
      w = shiftLocalDateKey(w, 7);
    }
  }

  return { current, longest };
}

function earliestActivityKey(activity: WorkoutActivityByDay): string | null {
  let min: string | null = null;
  for (const key of activity.keys()) {
    if ((activity.get(key) ?? 0) > 0 && (min === null || key < min)) min = key;
  }
  return min;
}

function hasAnyActivityBefore(
  activity: WorkoutActivityByDay,
  weekStartKey: string,
): boolean {
  for (const key of activity.keys()) {
    if ((activity.get(key) ?? 0) > 0 && key < weekStartKey) return true;
  }
  return false;
}

/** Walk sessions chronologically and find e1RM PRs (and flag first-time PRs). */
export function computePersonalRecords(
  sessions: ProgressSession[],
): {
  recentPrs: PersonalRecord[];
  bestByExercise: Map<string, PersonalRecord>;
  prDateKeys: Set<string>;
} {
  const sorted = [...sessions].sort((a, b) => {
    const ka = sessionDateKey(a.session);
    const kb = sessionDateKey(b.session);
    if (ka !== kb) return ka.localeCompare(kb);
    return a.session.startedAt.getTime() - b.session.startedAt.getTime();
  });

  const bestByExercise = new Map<string, PersonalRecord>();
  const recentPrs: PersonalRecord[] = [];
  const prDateKeys = new Set<string>();

  for (const { id, session } of sorted) {
    if (session.status !== "completed") continue;
    const dateKey = sessionDateKey(session);
    for (const line of session.lines) {
      if (line.metric !== "weight_reps") continue;
      for (const set of line.sets) {
        if (set.weight == null || set.reps == null) continue;
        if (!(set.weight > 0) || !(set.reps > 0)) continue;
        const e1rm = estimatedOneRepMax(set.weight, set.reps);
        const prev = bestByExercise.get(line.exerciseId);
        if (!prev || e1rm > prev.estimated1Rm) {
          const pr: PersonalRecord = {
            exerciseId: line.exerciseId,
            exerciseName: line.nameSnapshot,
            weight: set.weight,
            reps: set.reps,
            estimated1Rm: e1rm,
            dateKey,
            sessionId: id,
            isNewPr: true,
          };
          bestByExercise.set(line.exerciseId, pr);
          recentPrs.push(pr);
          prDateKeys.add(dateKey);
        }
      }
    }
  }

  recentPrs.reverse();
  return {
    recentPrs: recentPrs.slice(0, 12),
    bestByExercise,
    prDateKeys,
  };
}

const COMPOUND_IDS = ["bench", "squat", "deadlift", "ohp", "row"] as const;

export function strongestLifts(
  bestByExercise: Map<string, PersonalRecord>,
): PersonalRecord[] {
  const preferred: PersonalRecord[] = [];
  for (const id of COMPOUND_IDS) {
    const pr = bestByExercise.get(id);
    if (pr) preferred.push(pr);
  }
  if (preferred.length >= 4) return preferred.slice(0, 4);

  const rest = [...bestByExercise.values()]
    .filter((p) => !COMPOUND_IDS.includes(p.exerciseId as (typeof COMPOUND_IDS)[number]))
    .sort((a, b) => b.estimated1Rm - a.estimated1Rm);
  const out = [...preferred];
  for (const p of rest) {
    if (out.length >= 4) break;
    out.push(p);
  }
  return out;
}

export function buildDayActivityDetails(
  sessions: ProgressSession[],
  prDateKeys: Set<string>,
  bestByExercise: Map<string, PersonalRecord>,
): Map<string, DayActivityDetail> {
  const byDay = new Map<string, DayWorkoutSummary[]>();

  // Chronological for PR attribution per session
  const sorted = [...sessions].sort((a, b) => {
    const ka = sessionDateKey(a.session);
    const kb = sessionDateKey(b.session);
    if (ka !== kb) return ka.localeCompare(kb);
    return a.session.startedAt.getTime() - b.session.startedAt.getTime();
  });

  // Rebuild PR moments: a set is a PR if it equals the stored best and date matches
  const prKeysBySession = new Map<string, Array<{ exerciseName: string; weight: number; reps: number }>>();
  for (const pr of bestByExercise.values()) {
    const list = prKeysBySession.get(pr.sessionId) ?? [];
    list.push({
      exerciseName: pr.exerciseName,
      weight: pr.weight,
      reps: pr.reps,
    });
    prKeysBySession.set(pr.sessionId, list);
  }

  for (const { id, session } of sorted) {
    if (session.status !== "completed") continue;
    const dateKey = sessionDateKey(session);
    const summary: DayWorkoutSummary = {
      sessionId: id,
      title: session.title,
      durationSec: session.activeDurationSec,
      volumeLbs: sessionVolumeLbs(session),
      prs: prKeysBySession.get(id) ?? [],
    };
    const list = byDay.get(dateKey) ?? [];
    list.push(summary);
    byDay.set(dateKey, list);
  }

  const details = new Map<string, DayActivityDetail>();
  for (const [dateKey, workouts] of byDay) {
    details.set(dateKey, {
      dateKey,
      workouts,
      totalVolumeLbs: workouts.reduce((a, w) => a + w.volumeLbs, 0),
      totalDurationSec: workouts.reduce(
        (a, w) => a + (w.durationSec ?? 0),
        0,
      ),
      hasPr: prDateKeys.has(dateKey) || workouts.some((w) => w.prs.length > 0),
    });
  }
  return details;
}

export type ProgressStats = {
  totalWorkouts: number;
  totalDurationSec: number;
  totalVolumeLbs: number;
  favoriteExercise: string | null;
  favoriteMuscleGroup: string | null;
};

export function computeProgressStats(
  sessions: ProgressSession[],
): ProgressStats {
  let totalDurationSec = 0;
  let totalVolumeLbs = 0;
  const exerciseCounts = new Map<string, { name: string; n: number }>();
  const muscleCounts = new Map<string, number>();

  const completed = sessions.filter((s) => s.session.status === "completed");
  for (const { session } of completed) {
    totalDurationSec += session.activeDurationSec ?? 0;
    totalVolumeLbs += sessionVolumeLbs(session);
    for (const line of session.lines) {
      const prev = exerciseCounts.get(line.exerciseId);
      if (prev) prev.n += 1;
      else exerciseCounts.set(line.exerciseId, { name: line.nameSnapshot, n: 1 });
      const mg = muscleGroupForExercise(line.exerciseId, line.nameSnapshot);
      muscleCounts.set(mg, (muscleCounts.get(mg) ?? 0) + 1);
    }
  }

  let favoriteExercise: string | null = null;
  let favN = 0;
  for (const { name, n } of exerciseCounts.values()) {
    if (n > favN) {
      favN = n;
      favoriteExercise = name;
    }
  }

  let favoriteMuscleGroup: string | null = null;
  let mgN = 0;
  for (const [mg, n] of muscleCounts) {
    if (n > mgN) {
      mgN = n;
      favoriteMuscleGroup = muscleGroupLabel(mg as MuscleGroup);
    }
  }

  return {
    totalWorkouts: completed.length,
    totalDurationSec,
    totalVolumeLbs,
    favoriteExercise,
    favoriteMuscleGroup,
  };
}

export function computeMilestones(
  sessions: ProgressSession[],
  goalStreakCurrent: number,
  goalStreakLongest: number,
  recentPrs: PersonalRecord[],
  firstPrDateKey: string | null,
): Milestone[] {
  const completed = sessions
    .filter((s) => s.session.status === "completed")
    .sort(
      (a, b) =>
        sessionDateKey(a.session).localeCompare(sessionDateKey(b.session)) ||
        a.session.startedAt.getTime() - b.session.startedAt.getTime(),
    );

  const first = completed[0] ?? null;
  const firstKey = first ? sessionDateKey(first.session) : null;
  const count = completed.length;

  const nthKey = (n: number): string | null => {
    const s = completed[n - 1];
    return s ? sessionDateKey(s.session) : null;
  };

  const yearLaterKey = (start: string | null): string | null => {
    if (!start) return null;
    const d = dateFromLocalDateKey(start);
    if (!d) return null;
    d.setFullYear(d.getFullYear() + 1);
    return localDateKeyFromMs(d.getTime());
  };

  const oneYearKey = yearLaterKey(firstKey);
  const today = localDateKeyFromMs(Date.now());
  const oneYearActive =
    Boolean(oneYearKey && today >= oneYearKey && count > 0);

  const definitions: Milestone[] = [
    {
      id: "first-workout",
      title: "First workout",
      description: "You showed up and logged a session.",
      achievedAtKey: firstKey,
      achieved: Boolean(firstKey),
    },
    {
      id: "workouts-10",
      title: "10 workouts",
      description: "A solid start to the habit.",
      achievedAtKey: nthKey(10),
      achieved: count >= 10,
    },
    {
      id: "workouts-50",
      title: "50 workouts",
      description: "Consistency is compounding.",
      achievedAtKey: nthKey(50),
      achieved: count >= 50,
    },
    {
      id: "workouts-100",
      title: "100 workouts",
      description: "A hundred sessions in the journal.",
      achievedAtKey: nthKey(100),
      achieved: count >= 100,
    },
    {
      id: "first-pr",
      title: "First personal record",
      description: "A new best estimated strength mark.",
      achievedAtKey: firstPrDateKey,
      achieved: Boolean(firstPrDateKey) || recentPrs.length > 0,
    },
    {
      id: "goal-weeks-4",
      title: "4-week goal streak",
      description: "Four consecutive weeks hitting your weekly goal.",
      achievedAtKey: goalStreakLongest >= 4 || goalStreakCurrent >= 4 ? today : null,
      achieved: goalStreakLongest >= 4 || goalStreakCurrent >= 4,
    },
    {
      id: "goal-weeks-12",
      title: "12-week goal streak",
      description: "A full season of meeting your weekly goal.",
      achievedAtKey: goalStreakLongest >= 12 || goalStreakCurrent >= 12 ? today : null,
      achieved: goalStreakLongest >= 12 || goalStreakCurrent >= 12,
    },
    {
      id: "goal-weeks-30",
      title: "30 consecutive weeks",
      description: "Meeting your weekly goal for 30 weeks.",
      achievedAtKey: goalStreakLongest >= 30 || goalStreakCurrent >= 30 ? today : null,
      achieved: goalStreakLongest >= 30 || goalStreakCurrent >= 30,
    },
    {
      id: "year-active",
      title: "1 year active",
      description: "A year since your first logged workout.",
      achievedAtKey: oneYearActive ? oneYearKey : null,
      achieved: oneYearActive,
    },
  ];

  return definitions;
}

export function activityFromProgressSessions(
  sessions: ProgressSession[],
): WorkoutActivityByDay {
  return activityByDayFromSessions(
    sessions.map(({ session }) => ({
      status: session.status,
      workoutDate: session.workoutDate,
      endedAt: session.endedAt,
      startedAt: session.startedAt,
    })),
  );
}

export function formatVolumeLbs(n: number): string {
  if (!(n > 0)) return "0 lbs";
  return `${Math.round(n).toLocaleString("en-US")} lbs`;
}

export function formatDurationMinutes(sec: number | null | undefined): string {
  if (sec == null || !(sec > 0)) return "—";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`;
}
