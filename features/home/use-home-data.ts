"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import { addDaysToDateKey, startOfWeekDateKey } from "@/lib/calendar-views";
import { subscribeScheduledWorkoutsInRange } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import { subscribeProgressSettings } from "@/lib/progress-settings-repository";
import { DEFAULT_PROGRESS_SETTINGS, type WeeklyGoalTarget } from "@/lib/progress-types";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  subscribeUserWorkoutPlans,
  type SavedWorkoutPlan,
} from "@/lib/workout-plan-repository";
import {
  subscribeRecentSessions,
  type SessionSummary,
} from "@/lib/workout-session-repository";
import {
  buildHomeConsistency,
  buildHomeRecent,
  buildHomeTemplates,
  buildHomeWeek,
  buildWeekGoal,
  pickInProgress,
  pickNextPlanned,
} from "@/features/home/home-model";

/** How far ahead home looks for the next planned workout. */
const PLAN_LOOKAHEAD_DAYS = 14;

/**
 * Enough history for the 16-week chart and a fair longest streak
 * (about a year at three workouts a week).
 */
const SESSION_HISTORY_DOCS = 160;
const ACTIVITY_HISTORY_DOCS = 120;

type RawHomeData = {
  plans: SavedWorkoutPlan[];
  sessions: SessionSummary[];
  activities: SavedActivity[];
  entries: ScheduledWorkoutEntry[];
  weeklyGoal: WeeklyGoalTarget;
};

const EMPTY: RawHomeData = {
  plans: [],
  sessions: [],
  activities: [],
  entries: [],
  weeklyGoal: DEFAULT_PROGRESS_SETTINGS.weeklyGoal,
};

/** Everything home shows, live from Firestore. */
export function useHomeData() {
  const { user, firebaseReady } = useAuth();
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));
  const [raw, setRaw] = useState<RawHomeData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const signedIn = Boolean(user) && firebaseReady;

  useEffect(() => {
    if (!signedIn) return;
    const patch = (next: Partial<RawHomeData>) => setRaw((prev) => ({ ...prev, ...next }));
    const rangeStart = startOfWeekDateKey(todayKey);
    const rangeEnd = addDaysToDateKey(todayKey, PLAN_LOOKAHEAD_DAYS);
    const unsubs = [
      subscribeUserWorkoutPlans((plans) => patch({ plans })),
      subscribeRecentSessions(
        (sessions) => {
          patch({ sessions });
          setLoaded(true);
        },
        { maxDocs: SESSION_HISTORY_DOCS },
      ),
      subscribeRecentActivities((activities) => patch({ activities }), { maxDocs: ACTIVITY_HISTORY_DOCS }),
      subscribeScheduledWorkoutsInRange(rangeStart, rangeEnd, (entries) => patch({ entries })),
      subscribeProgressSettings((settings) => patch({ weeklyGoal: settings.weeklyGoal })),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
      setRaw(EMPTY);
      setLoaded(false);
    };
  }, [signedIn, todayKey]);

  const view = useMemo(() => {
    const { plans, sessions, activities, entries, weeklyGoal } = raw;
    return {
      templates: buildHomeTemplates(plans, sessions, todayKey),
      inProgress: pickInProgress(sessions),
      planned: pickNextPlanned(entries, todayKey),
      week: buildHomeWeek(todayKey, sessions, activities, entries),
      recent: buildHomeRecent(sessions, activities),
      weekGoal: buildWeekGoal(sessions, weeklyGoal, todayKey),
      consistency: buildHomeConsistency(todayKey, sessions, activities, entries, weeklyGoal),
    };
  }, [raw, todayKey]);

  return { signedIn, loaded, todayKey, ...view };
}

export type HomeData = ReturnType<typeof useHomeData>;
