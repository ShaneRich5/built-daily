"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProgressHeatmap } from "@/components/progress-heatmap";
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

/** Home workout-activity heatmap (weekly goals live on Progress). */
export function HomeWorkoutActivity() {
  const { user, loading, firebaseReady } = useAuth();
  const [sessions, setSessions] = useState<SavedWorkoutSession[] | null>(null);
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setSessions(null);
      };
    }
    return subscribeCompletedSessionsDetailed(setSessions, { maxDocs: 400 });
  }, [user, firebaseReady]);

  const { activity, dayDetails } = useMemo(() => {
    const rows = sessions ?? [];
    const { bestByExercise, prDateKeys } = computePersonalRecords(rows);
    return {
      activity: activityFromProgressSessions(rows),
      dayDetails: buildDayActivityDetails(rows, prDateKeys, bestByExercise),
    };
  }, [sessions]);

  if (!firebaseReady) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Workout activity
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
          Workout activity
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Workout activity
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to see your workout activity chart.
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

  if (sessions === null) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Workout activity
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <ProgressHeatmap
        activity={activity}
        dayDetails={dayDetails}
        todayKey={todayKey}
        footer={
          <p className="text-xs text-zinc-500">
            Recovery days are part of training—not missed workouts. Set your
            weekly goal on{" "}
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
