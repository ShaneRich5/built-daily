"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { buildPlannerListItems, markersByDate } from "@/lib/planner-list-items";
import {
  subscribeScheduledWorkoutsInRange,
  subscribeUnscheduledWorkouts,
} from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry, UnscheduledWorkoutEntry } from "@/lib/planner-types";
import { subscribeProgressSettings } from "@/lib/progress-settings-repository";
import { DEFAULT_PROGRESS_SETTINGS } from "@/lib/progress-types";
import { subscribeUserWorkoutPlans, type SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import {
  subscribeRecentCompletedSessions,
  type SessionSummary,
} from "@/lib/workout-session-repository";

/**
 * Days around today the move sheet needs regardless of which week is on screen:
 * last week's misses and the next 7 days it offers.
 */
const NEARBY_PAST_DAYS = 7;
const NEARBY_FUTURE_DAYS = 13;

/** Workouts, activities, plans and templates for the planner, live from Firestore. */
export function usePlannerData(range: { startKey: string; endKey: string }, todayKey: string) {
  const { user, firebaseReady } = useAuth();
  const signedIn = Boolean(user) && firebaseReady;
  const [plans, setPlans] = useState<SavedWorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledWorkoutEntry[]>([]);
  const [nearby, setNearby] = useState<ScheduledWorkoutEntry[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledWorkoutEntry[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(DEFAULT_PROGRESS_SETTINGS.weeklyGoal);

  useEffect(() => {
    if (!signedIn) return;
    const unsubs = [
      subscribeUserWorkoutPlans(setPlans),
      subscribeRecentCompletedSessions(setSessions, { maxDocs: 500 }),
      subscribeRecentActivities(setActivities, { maxDocs: 400 }),
      subscribeUnscheduledWorkouts(setUnscheduled),
      subscribeProgressSettings((settings) => setWeeklyGoal(settings.weeklyGoal)),
      subscribeScheduledWorkoutsInRange(
        addDaysToDateKey(todayKey, -NEARBY_PAST_DAYS),
        addDaysToDateKey(todayKey, NEARBY_FUTURE_DAYS),
        setNearby,
      ),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [signedIn, todayKey]);

  useEffect(() => {
    if (!signedIn) return;
    return subscribeScheduledWorkoutsInRange(range.startKey, range.endKey, setScheduled);
  }, [signedIn, range.startKey, range.endKey]);

  // Done or skipped plans are history now; only open ones show on the calendar.
  const open = useMemo(() => scheduled.filter((entry) => entry.status === "planned"), [scheduled]);
  const items = useMemo(
    () => buildPlannerListItems(sessions, open, activities),
    [sessions, open, activities],
  );
  const markers = useMemo(() => markersByDate(items), [items]);

  /** Open plans on screen plus the ones near today, without duplicates. */
  const openNearby = useMemo(() => {
    const byId = new Map<string, ScheduledWorkoutEntry>();
    for (const entry of [...nearby, ...scheduled]) {
      if (entry.status === "planned") byId.set(entry.id, entry);
    }
    return [...byId.values()];
  }, [nearby, scheduled]);

  return {
    signedIn,
    plans,
    items,
    markers,
    sessions,
    activities,
    scheduled: open,
    openNearby,
    unscheduled,
    weeklyGoal,
  };
}
