"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProgressHeatmap } from "@/components/progress-heatmap";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import {
  activityByDayFromSaved,
  mergeDayDetailsWithActivities,
} from "@/lib/movement-insights";
import {
  activityFromProgressSessions,
  buildDayActivityDetails,
  computePersonalRecords,
} from "@/lib/progress-insights";
import { localDateKeyFromMs } from "@/lib/workout-date";
import {
  subscribeCompletedSessionsDetailed,
  type SavedWorkoutSession,
} from "@/lib/workout-session-repository";

/** Home consistency heatmap (weekly goals live on Progress). */
export function HomeWorkoutActivity() {
  const { user, loading, firebaseReady } = useAuth();
  const [sessions, setSessions] = useState<SavedWorkoutSession[] | null>(null);
  const [activities, setActivities] = useState<SavedActivity[] | null>(null);
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

  const { activity, activityByDay, dayDetails } = useMemo(() => {
    const rows = sessions ?? [];
    const acts = activities ?? [];
    const { bestByExercise, prDateKeys } = computePersonalRecords(rows);
    const baseDetails = buildDayActivityDetails(
      rows,
      prDateKeys,
      bestByExercise,
    );
    return {
      activity: activityFromProgressSessions(rows),
      activityByDay: activityByDayFromSaved(acts),
      dayDetails: mergeDayDetailsWithActivities(baseDetails, acts),
    };
  }, [sessions, activities]);

  if (!firebaseReady) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Consistency
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Add Firebase configuration to see your activity chart.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Consistency
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Consistency
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to see your consistency chart.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
        >
          Sign in
        </Link>
      </section>
    );
  }

  if (sessions === null || activities === null) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Consistency
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <ProgressHeatmap
        activity={activity}
        activityByDay={activityByDay}
        dayDetails={dayDetails}
        todayKey={todayKey}
        footer={
          <p className="text-xs text-zinc-500">
            Workouts and activities both light up the chart. Set goals on{" "}
            <Link
              href="/progress"
              className="font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Progress
            </Link>
            .
          </p>
        }
      />
    </div>
  );
}
