/**
 * Sample workout history for Storybook stories of the This week card (Home and
 * Progress). Not used by the app. The stories run it through the real builders,
 * so they show what those builders actually produce.
 */
import type { SavedActivity } from "@/lib/activity-types";
import { addDaysToDateKey, startOfWeekDateKey } from "@/lib/calendar-views";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import type { SessionSummary } from "@/lib/workout-session-repository";

const NAMES = ["Push day", "Pull day", "Leg day"];

export type SampleHistory = {
  sessions: SessionSummary[];
  activities: SavedActivity[];
  entries: ScheduledWorkoutEntry[];
};

type SampleOptions = {
  todayKey: string;
  /** How many weeks before this one have history (0 = brand new user). */
  pastWeeks?: number;
  /** Weeks back (1 = last week) with only two workouts, which breaks the goal of 3. */
  shortWeeks?: number[];
  /** Weekdays (0 = Sun) this week with a finished workout. */
  doneThisWeek?: number[];
  /** Weekdays this week with a walk logged (can overlap a workout). */
  walksThisWeek?: number[];
  /** Weekdays this week with a planned workout, from today on. */
  plannedThisWeek?: number[];
};

function session(dateKey: string, i: number): SessionSummary {
  return {
    id: `s-${dateKey}`,
    status: "completed",
    workoutDate: dateKey,
    workoutTime: "07:00",
    title: NAMES[i % NAMES.length]!,
    planId: null,
    startedAt: new Date(`${dateKey}T07:00:00`),
    endedAt: new Date(`${dateKey}T08:00:00`),
    exerciseCount: 5,
    setCount: 16,
    previewExerciseNames: [],
  };
}

function walk(dateKey: string): SavedActivity {
  const at = new Date(`${dateKey}T18:00:00`);
  return {
    id: `a-${dateKey}`,
    activity: {
      activityTypeId: "walk",
      activityDate: dateKey,
      activityTime: "18:00",
      durationMin: 35,
      distanceMiles: 1.8,
      locationName: null,
      notes: null,
      visibility: "private",
      source: "manual",
      startedAt: null,
      endedAt: null,
      createdAt: at,
      updatedAt: at,
    },
  };
}

/** Mon/Wed/Fri workouts and a Saturday walk most weeks, then this week as described. */
export function sampleHistory({
  todayKey,
  pastWeeks = 15,
  shortWeeks = [],
  doneThisWeek = [],
  walksThisWeek = [],
  plannedThisWeek = [],
}: SampleOptions): SampleHistory {
  const weekStart = startOfWeekDateKey(todayKey);
  const sessions: SessionSummary[] = [];
  const activities: SavedActivity[] = [];
  let n = 0;
  for (let back = pastWeeks; back >= 1; back--) {
    const start = addDaysToDateKey(weekStart, -7 * back);
    const days = shortWeeks.includes(back) ? [1, 4] : [1, 3, 5];
    for (const d of days) sessions.push(session(addDaysToDateKey(start, d), n++));
    if (back % 2 === 0) activities.push(walk(addDaysToDateKey(start, 6)));
  }
  for (const d of doneThisWeek) sessions.push(session(addDaysToDateKey(weekStart, d), n++));
  for (const d of walksThisWeek) activities.push(walk(addDaysToDateKey(weekStart, d)));
  const entries = plannedThisWeek.map((d, i): ScheduledWorkoutEntry => {
    const dateKey = addDaysToDateKey(weekStart, d);
    return {
      id: `p-${dateKey}`,
      dateKey,
      label: NAMES[(n + i) % NAMES.length]!,
      planId: null,
      exerciseIds: ["a", "b", "c", "d"],
      status: "planned",
      sessionId: null,
      createdAt: new Date(`${weekStart}T00:00:00`),
    };
  });
  return { sessions, activities, entries };
}
