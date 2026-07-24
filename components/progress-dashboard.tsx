"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProgressGoalStreak } from "@/components/progress-goal-streak";
import { ProgressMilestones } from "@/components/progress-milestones";
import { ProgressStats } from "@/components/progress-stats";
import { ProgressStrength } from "@/components/progress-strength";
import { ProgressWeeklyGoal } from "@/components/progress-weekly-goal";
import { ProgressWeight } from "@/components/progress-weight";
import {
  activityFromProgressSessions,
  computeMilestones,
  computePersonalRecords,
  computeProgressStats,
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
  const [settings, setSettings] = useState<ProgressSettingsDoc>(
    DEFAULT_PROGRESS_SETTINGS,
  );
  const [weights, setWeights] = useState<SavedBodyWeightEntry[] | null>(null);
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setSessions(null);
      };
    }
    return subscribeCompletedSessionsDetailed(setSessions, { maxDocs: 400 });
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
    const activity = activityFromProgressSessions(rows);
    const week = weekGoalStatus(activity, settings.weeklyGoal, todayKey);
    const goalStreak = goalWeekStreak(activity, settings.weeklyGoal, todayKey);
    const { recentPrs, bestByExercise } = computePersonalRecords(rows);
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
      week,
      goalStreak,
      recentPrs,
      lifts: strongestLifts(bestByExercise),
      stats,
      milestones,
    };
  }, [sessions, settings.weeklyGoal, todayKey]);

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
      ) : sessions === null ? (
        <p className="text-sm text-zinc-500">Loading your history…</p>
      ) : (
        <>
          <ProgressWeeklyGoal
            week={insights.week}
            weeklyGoal={settings.weeklyGoal}
          />
          <ProgressGoalStreak
            current={insights.goalStreak.current}
            longest={insights.goalStreak.longest}
            weeklyGoal={settings.weeklyGoal}
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
