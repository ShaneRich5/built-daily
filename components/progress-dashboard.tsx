"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProgressGoalStreak } from "@/components/progress-goal-streak";
import { ProgressHeatmap } from "@/components/progress-heatmap";
import { ProgressMilestones } from "@/components/progress-milestones";
import { ProgressMomentum } from "@/components/progress-momentum";
import { ProgressMovementGoal } from "@/components/progress-movement-goal";
import { ProgressStats } from "@/components/progress-stats";
import { ProgressStrength } from "@/components/progress-strength";
import { ProgressWeeklyGoal } from "@/components/progress-weekly-goal";
import { ProgressWeight } from "@/components/progress-weight";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import {
  activityByDayFromSaved,
  currentMovementStreak,
  mergeDayDetailsWithActivities,
  movementDaysFromMaps,
  movementGoalStatus,
} from "@/lib/movement-insights";
import {
  activityFromProgressSessions,
  buildDayActivityDetails,
  computeMilestones,
  computePersonalRecords,
  computeProgressStats,
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

export function ProgressDashboard() {
  const { user, loading, firebaseReady } = useAuth();
  const [sessions, setSessions] = useState<SavedWorkoutSession[] | null>(null);
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
  const [settings, setSettings] = useState<ProgressSettingsDoc>(
    DEFAULT_PROGRESS_SETTINGS,
  );
  const [weights, setWeights] = useState<SavedBodyWeightEntry[] | null>(null);
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setSessions(null);
        setActivities(null);
      };
    }
    const unsubSessions = subscribeCompletedSessionsDetailed(setSessions, {
      maxDocs: 400,
    });
    const unsubActivities = subscribeRecentActivities(setActivities, {
      maxDocs: 200,
    });
    return () => {
      unsubSessions();
      unsubActivities();
    };
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) return;
    return subscribeProgressSettings(setSettings);
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setWeights(null);
      };
    }
    return subscribeBodyWeightEntries(setWeights, { maxDocs: 200 });
  }, [user, firebaseReady]);

  const insights = useMemo(() => {
    const rows = sessions ?? [];
    const acts = activities ?? [];
    const activity = activityFromProgressSessions(rows);
    const activityByDay = activityByDayFromSaved(acts);
    const movementDays = movementDaysFromMaps(activity, activityByDay);
    const week = weekGoalStatus(activity, settings.weeklyGoal, todayKey);
    const movementWeek = movementGoalStatus(
      movementDays,
      settings.movementGoalDays,
      todayKey,
    );
    const movementStreak = currentMovementStreak(movementDays, todayKey);
    const goalStreak = goalWeekStreak(activity, settings.weeklyGoal, todayKey);
    const momentum = computeWeekMomentum(
      activity,
      settings.weeklyGoal,
      todayKey,
    );
    const { recentPrs, bestByExercise, prDateKeys } =
      computePersonalRecords(rows);
    const dayDetails = mergeDayDetailsWithActivities(
      buildDayActivityDetails(rows, prDateKeys, bestByExercise),
      acts,
    );
    const stats = computeProgressStats(rows);
    const firstPr = [...recentPrs].sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    )[0];
    const milestones = computeMilestones(
      rows,
      goalStreak.current,
      goalStreak.longest,
      recentPrs,
      firstPr?.dateKey ?? null,
    );
    return {
      activity,
      activityByDay,
      dayDetails,
      week,
      movementWeek,
      movementStreak,
      goalStreak,
      momentum,
      recentPrs,
      lifts: strongestLifts(bestByExercise),
      stats,
      milestones,
    };
  }, [
    sessions,
    activities,
    settings.weeklyGoal,
    settings.movementGoalDays,
    todayKey,
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 pb-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">Progress</p>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Am I making progress?
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Consistency over perfection—rest days are part of the plan.
        </p>
      </header>

      {!firebaseReady ? (
        <p className="text-sm text-zinc-500">
          Add Firebase configuration to use progress insights.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading account…</p>
      ) : !user ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <p>Sign in to see your consistency, strength, and milestones.</p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </div>
      ) : sessions === null || activities === null ? (
        <p className="text-sm text-zinc-500">Loading your history…</p>
      ) : (
        <>
          <ProgressHeatmap
            activity={insights.activity}
            activityByDay={insights.activityByDay}
            dayDetails={insights.dayDetails}
            todayKey={todayKey}
          />
          <ProgressMomentum momentum={insights.momentum} />
          <ProgressWeeklyGoal
            week={insights.week}
            weeklyGoal={settings.weeklyGoal}
            momentum={insights.momentum}
          />
          <ProgressMovementGoal
            week={insights.movementWeek}
            movementGoalDays={settings.movementGoalDays}
            movementStreak={insights.movementStreak}
          />
          <ProgressGoalStreak
            current={insights.goalStreak.current}
            longest={insights.goalStreak.longest}
            weeklyGoal={settings.weeklyGoal}
            weekMet={insights.week.met}
          />
          <ProgressWeight
            entries={weights ?? []}
            goalWeightLbs={settings.goalWeightLbs}
            todayKey={todayKey}
          />
          <ProgressStrength
            recentPrs={insights.recentPrs}
            lifts={insights.lifts}
          />
          <ProgressMilestones milestones={insights.milestones} />
          <ProgressStats stats={insights.stats} />
        </>
      )}
    </div>
  );
}
