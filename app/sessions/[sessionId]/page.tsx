"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { WorkoutSessionDetail } from "@/components/workout-session-detail";
import {
  getCompletedWorkoutSession,
  type SavedWorkoutSession,
} from "@/lib/workout-session-repository";

function sessionIdFromParams(
  raw: string | string[] | undefined,
): string | null {
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) {
    return raw[0];
  }
  return null;
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = sessionIdFromParams(params.sessionId);

  if (!sessionId) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Workout not found.
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← Home
        </Link>
      </div>
    );
  }

  return <SessionDetailLoader key={sessionId} sessionId={sessionId} />;
}

function SessionDetailLoader({ sessionId }: { sessionId: string }) {
  const { user, loading, firebaseReady } = useAuth();
  const [loaded, setLoaded] = useState<
    SavedWorkoutSession | null | "loading"
  >("loading");

  useEffect(() => {
    if (!firebaseReady || loading) return;
    if (!user) {
      setLoaded(null);
      return;
    }

    let cancelled = false;
    setLoaded("loading");
    void getCompletedWorkoutSession(sessionId).then((res) => {
      if (!cancelled) setLoaded(res);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user, loading, firebaseReady]);

  if (!firebaseReady) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Add Firebase env vars to view workouts.
      </p>
    );
  }

  if (loading || loaded === "loading") {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">Loading workout…</p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to view this workout.
        </p>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loaded === null) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Workout not found.
        </p>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← Home
        </Link>
      </div>
    );
  }

  if (loaded.session.status === "in_progress") {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This workout is still in progress.
        </p>
        <Link
          href={`/workout?s=${encodeURIComponent(loaded.id)}`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white"
        >
          Continue workout
        </Link>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <WorkoutSessionDetail
      key={loaded.id}
      sessionId={loaded.id}
      session={loaded.session}
      backHref="/"
      onSaved={(session) =>
        setLoaded((prev) =>
          prev && prev !== "loading" ? { id: prev.id, session } : prev,
        )
      }
    />
  );
}
