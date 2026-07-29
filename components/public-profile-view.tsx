"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PublicConsistencyHeatmap } from "@/components/public-consistency-heatmap";
import { activityRecordToMap } from "@/lib/public-profile-mapper";
import {
  effectiveWorkoutsThisWeek,
  getPublicProfile,
  type SavedPublicProfile,
} from "@/lib/public-profile-repository";
import { formatLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";

function firstNameFromDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

type LoadState =
  | { status: "loading" }
  | { status: "private" }
  | { status: "ready"; row: SavedPublicProfile };

export function PublicProfileView({ userId }: { userId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));

  useEffect(() => {
    if (!userId) {
      setState({ status: "private" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      const row = await getPublicProfile(userId);
      if (cancelled) return;
      if (!row) {
        setState({ status: "private" });
        return;
      }
      setState({ status: "ready", row });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activity = useMemo(() => {
    if (state.status !== "ready") return new Map();
    return activityRecordToMap(state.row.profile.activityByDay);
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className="flex flex-1 flex-col gap-4 py-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-28 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (state.status === "private") {
    return (
      <div className="flex flex-1 flex-col gap-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profile unavailable
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This profile isn’t public.
        </p>
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          Built Daily
        </Link>
      </div>
    );
  }

  const { profile } = state.row;
  const firstName = firstNameFromDisplayName(profile.displayName);
  const title = firstName ? `${firstName}'s progress` : "Progress";
  const weekCount = effectiveWorkoutsThisWeek(profile, todayKey);
  const lastActive = profile.lastWorkoutDateKey
    ? formatLocalDateKey(profile.lastWorkoutDateKey)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-8 py-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-zinc-500">Built Daily</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
      </header>

      <PublicConsistencyHeatmap activity={activity} todayKey={todayKey} />

      <dl className="space-y-5">
        <div>
          <dt className="text-sm text-zinc-500">Current streak</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {profile.currentStreak > 0
              ? `${profile.currentStreak}-day`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">Workouts this week</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {weekCount}
          </dd>
        </div>
        {lastActive ? (
          <div>
            <dt className="text-sm text-zinc-500">Last active</dt>
            <dd className="mt-1 text-base font-medium text-zinc-800 dark:text-zinc-200">
              {lastActive}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
