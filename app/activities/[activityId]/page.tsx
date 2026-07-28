"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ActivityDetail } from "@/components/activity-detail";
import { useAuth } from "@/components/auth-provider";
import {
  getActivity,
} from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";

function activityIdFromParams(
  raw: string | string[] | undefined,
): string | null {
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].length > 0) {
    return raw[0];
  }
  return null;
}

export default function ActivityDetailPage() {
  const params = useParams();
  const activityId = activityIdFromParams(params.activityId);

  if (!activityId) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Activity not found.
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

  return <ActivityDetailLoader key={activityId} activityId={activityId} />;
}

function ActivityDetailLoader({ activityId }: { activityId: string }) {
  const { user, loading, firebaseReady } = useAuth();
  const [loaded, setLoaded] = useState<SavedActivity | null | "loading">(
    "loading",
  );

  useEffect(() => {
    if (!firebaseReady || loading) return;
    if (!user) {
      setLoaded(null);
      return;
    }

    let cancelled = false;
    setLoaded("loading");
    void getActivity(activityId).then((res) => {
      if (!cancelled) setLoaded(res);
    });
    return () => {
      cancelled = true;
    };
  }, [activityId, user, loading, firebaseReady]);

  if (!firebaseReady) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Add Firebase env vars to view activities.
      </p>
    );
  }

  if (loading || loaded === "loading") {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">Loading activity…</p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to view this activity.
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
          Activity not found.
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

  return (
    <ActivityDetail
      key={loaded.id}
      activityId={loaded.id}
      activity={loaded.activity}
      backHref="/"
      onSaved={(activity) =>
        setLoaded((prev) =>
          prev && prev !== "loading" ? { id: prev.id, activity } : prev,
        )
      }
    />
  );
}
