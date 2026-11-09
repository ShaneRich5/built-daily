"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import {
  activityByDayFromSaved,
  mergeDayDetailsWithActivities,
  movementDaysFromMaps,
  movementGoalStatus,
} from "@/lib/movement-insights";
import {
  activityFromProgressSessions,
  buildDayActivityDetails,
  computeMilestones,
  computePersonalRecords,
  computeWeekMomentum,
  goalWeekStreak,
  strongestLifts,
  weekGoalStatus,
} from "@/lib/progress-insights";
import {
  subscribeBodyWeightEntries,
  subscribeProgressSettings,
} from "@/lib/progress-settings-repository";
import {
  DEFAULT_PROGRESS_SETTINGS,
  type ProgressSettingsDoc,
  type SavedBodyWeightEntry,
} from "@/lib/progress-types";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  subscribeCompletedSessionsDetailed,
  type SavedWorkoutSession,
} from "@/lib/workout-session-repository";

/** Everything the progress page shows, live from Firestore. */
export function useProgressData() {
  const { user, loading, firebaseReady } = useAuth();
  const signedIn = Boolean(user) && firebaseReady;
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));
  const [sessions, setSessions] = useState<SavedWorkoutSession[] | null>(null);
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [weights, setWeights] = useState<SavedBodyWeightEntry[]>([]);
  const [settings, setSettings] = useState<ProgressSettingsDoc>(DEFAULT_PROGRESS_SETTINGS);

  useEffect(() => {
    if (!signedIn) return;
    const unsubs = [
      subscribeCompletedSessionsDetailed(setSessions, { maxDocs: 400 }),
      subscribeRecentActivities(setActivities, { maxDocs: 200 }),
      subscribeBodyWeightEntries(setWeights, { maxDocs: 200 }),
      subscribeProgressSettings(setSettings),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [signedIn]);

  const insights = useMemo(() => {
    const rows = sessions ?? [];
    const acts = activities ?? [];
    const activity = activityFromProgressSessions(rows);
    const activityByDay = activityByDayFromSaved(acts);
    const movementDays = movementDaysFromMaps(activity, activityByDay);
    const goalStreak = goalWeekStreak(activity, settings.weeklyGoal, todayKey);
    const { recentPrs, bestByExercise, prDateKeys } = computePersonalRecords(rows);
    const firstPr = [...recentPrs].sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];
    return {
      activity,
      activityByDay,
      dayDetails: mergeDayDetailsWithActivities(
        buildDayActivityDetails(rows, prDateKeys, bestByExercise),
        acts,
      ),
      week: weekGoalStatus(activity, settings.weeklyGoal, todayKey),
      movementWeek: movementGoalStatus(movementDays, settings.movementGoalDays, todayKey),
      momentum: computeWeekMomentum(activity, settings.weeklyGoal, todayKey),
      goalStreak,
      lifts: strongestLifts(bestByExercise),
      milestones: computeMilestones(
        rows,
        goalStreak.current,
        goalStreak.longest,
        recentPrs,
        firstPr?.dateKey ?? null,
      ),
    };
  }, [sessions, activities, settings.weeklyGoal, settings.movementGoalDays, todayKey]);

  return {
    signedIn,
    authLoading: loading,
    firebaseReady,
    loaded: sessions !== null && activities !== null,
    todayKey,
    settings,
    weights,
    ...insights,
  };
}

export type ProgressData = ReturnType<typeof useProgressData>;
