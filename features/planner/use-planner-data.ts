"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import { buildPlannerListItems, markersByDate } from "@/lib/planner-list-items";
import { subscribeScheduledWorkoutsInRange } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import { subscribeUserWorkoutPlans, type SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import {
  subscribeRecentCompletedSessions,
  type SessionSummary,
} from "@/lib/workout-session-repository";

/** Workouts, activities, plans and templates for the planner, live from Firestore. */
export function usePlannerData(range: { startKey: string; endKey: string }) {
  const { user, firebaseReady } = useAuth();
  const signedIn = Boolean(user) && firebaseReady;
  const [plans, setPlans] = useState<SavedWorkoutPlan[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledWorkoutEntry[]>([]);

  useEffect(() => {
    if (!signedIn) return;
    const unsubs = [
      subscribeUserWorkoutPlans(setPlans),
      subscribeRecentCompletedSessions(setSessions, { maxDocs: 500 }),
      subscribeRecentActivities(setActivities, { maxDocs: 400 }),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    return subscribeScheduledWorkoutsInRange(range.startKey, range.endKey, setScheduled);
  }, [signedIn, range.startKey, range.endKey]);

  const items = useMemo(
    () =>
      buildPlannerListItems(
        sessions,
        // Done or skipped plans are history now; only open ones show on the calendar.
        scheduled.filter((entry) => entry.status === "planned"),
        activities,
      ),
    [sessions, scheduled, activities],
  );
  const markers = useMemo(() => markersByDate(items), [items]);

  return { signedIn, plans, items, markers };
}
