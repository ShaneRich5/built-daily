"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { WorkoutCard } from "@/components/workout-card";
import { formatWorkoutHeaderDate } from "@/lib/workout-date";
import {
  subscribeRecentSessions,
  type SessionSummary,
} from "@/lib/workout-session-repository";

export function RecentWorkoutsList() {
  const { user, loading, firebaseReady } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!firebaseReady || loading) {
      setReady(false);
      return;
    }
    if (!user) {
      setSessions([]);
      setReady(true);
      return;
    }

    const unsub = subscribeRecentSessions(
      (rows) => {
        setSessions(rows);
        setReady(true);
      },
      { maxDocs: 30 },
    );
    return () => {
      unsub();
    };
  }, [user, loading, firebaseReady]);

  if (!firebaseReady) {
    return (
      <EmptyState
        title="Sign-in not configured"
        detail="Add Firebase env vars to save and list workouts here."
      />
    );
  }

  if (loading || !ready) {
    return (
      <div className="space-y-2">
        <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your log"
        detail="In-progress and finished workouts are saved to your account."
        action={
          <Link
            href="/login"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No workouts yet"
        detail="Start a session — it will stay here even if you leave mid-workout."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {sessions.map((s) => {
        const dateMs =
          s.status === "completed" && s.endedAt
            ? s.endedAt.getTime()
            : s.startedAt.getTime();
        const href =
          s.status === "in_progress"
            ? `/workout?s=${encodeURIComponent(s.id)}`
            : `/sessions/${s.id}`;
        return (
          <li key={s.id}>
            <WorkoutCard
              name={s.title}
              dateLabel={formatWorkoutHeaderDate(dateMs)}
              exerciseCount={s.exerciseCount}
              setCount={s.setCount}
              previewNames={s.previewExerciseNames}
              status={s.status}
              href={href}
            />
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
      <p>{title}</p>
      <p className="mt-1 text-zinc-400 dark:text-zinc-500">{detail}</p>
      {action}
    </div>
  );
}
