"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import { addDaysToDateKey } from "@/lib/calendar-views";
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
import {
  isMissed,
  movableEntries,
  toBoardCard,
  workoutDayKeys,
} from "@/features/planner/week-board-model";

/** How far ahead home looks for the next planned workout. */
const PLAN_LOOKAHEAD_DAYS = 14;
/** How far back home looks for a planned workout that slid past. */
const MISSED_LOOKBACK_DAYS = 7;

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
    // Before this week's Sunday too, so last week's misses can still be caught up.
    const rangeStart = addDaysToDateKey(todayKey, -MISSED_LOOKBACK_DAYS);
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
      // A plan together on today's planner, for the "Training with someone today" card.
      together: pickTogetherToday(entries, todayKey),
      ...catchUp(entries, sessions, todayKey),
    };
  }, [raw, todayKey]);

  return { signedIn, loaded, todayKey, ...view };
}

function pickTogetherToday(entries: ScheduledWorkoutEntry[], todayKey: string) {
  const e = entries.find(
    (x) => x.dateKey === todayKey && x.status === "planned" && x.sharedPlanId && x.groupId,
  );
  return e?.sharedPlanId && e.groupId
    ? { groupId: e.groupId, planId: e.sharedPlanId, exerciseIds: e.exerciseIds, label: e.label }
    : null;
}

/** The most recent planned workout that slid past, and what the move sheet needs. */
function catchUp(entries: ScheduledWorkoutEntry[], sessions: SessionSummary[], todayKey: string) {
  const workoutDays = workoutDayKeys(sessions);
  const missed = entries
    .filter((e) => isMissed(e, todayKey, workoutDays))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))[0];
  return {
    missed: missed ? toBoardCard(missed, todayKey) : null,
    movable: movableEntries(entries, todayKey, workoutDays),
  };
}

export type HomeData = ReturnType<typeof useHomeData>;
