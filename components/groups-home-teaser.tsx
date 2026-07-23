"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  subscribeGroupMembers,
  subscribeUserGroupMemberships,
  type SavedGroupMember,
  type SavedGroupMembership,
} from "@/lib/group-repository";
import { localDateKeyFromMs } from "@/lib/workout-date";

/**
 * Home teaser: today’s check-ins across your groups (or a soft prompt to join).
 */
export function GroupsHomeTeaser() {
  const { user, loading, firebaseReady } = useAuth();
  const [memberships, setMemberships] = useState<SavedGroupMembership[] | null>(
    null,
  );
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [memberTotal, setMemberTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setMemberships(null);
      };
    }
    return subscribeUserGroupMemberships(setMemberships);
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady || !memberships || memberships.length === 0) {
      return () => {
        setTodayCount(null);
        setMemberTotal(null);
      };
    }

    let cancelled = false;
    const todayKey = localDateKeyFromMs(Date.now());
    const byGroup = new Map<string, SavedGroupMember[]>();

    function recompute() {
      if (cancelled) return;
      const workedByUid = new Map<string, boolean>();
      for (const rows of byGroup.values()) {
        for (const { member } of rows) {
          const worked = member.lastWorkoutDateKey === todayKey;
          workedByUid.set(
            member.uid,
            Boolean(workedByUid.get(member.uid)) || worked,
          );
        }
      }
      let today = 0;
      for (const worked of workedByUid.values()) {
        if (worked) today += 1;
      }
      setTodayCount(today);
      setMemberTotal(workedByUid.size);
    }

    const unsubs = memberships.map((m) =>
      subscribeGroupMembers(m.id, (rows) => {
        byGroup.set(m.id, rows);
        recompute();
      }),
    );

    return () => {
      cancelled = true;
      for (const u of unsubs) u();
      setTodayCount(null);
      setMemberTotal(null);
    };
  }, [user, firebaseReady, memberships]);

  if (!firebaseReady || loading) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="circle-heading"
      >
        <h2
          id="circle-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Your circle
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="circle-heading"
      >
        <h2
          id="circle-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Your circle
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to see who’s showing up with you.
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

  if (memberships === null) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="circle-heading"
      >
        <h2
          id="circle-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Your circle
        </h2>
        <p className="mt-2 text-sm text-zinc-500">Loading…</p>
      </section>
    );
  }

  if (memberships.length === 0) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="circle-heading"
      >
        <h2
          id="circle-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Your circle
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create or join a group to keep each other honest—quietly.
        </p>
        <Link
          href="/groups"
          className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
        >
          Open groups
        </Link>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="circle-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="circle-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Your circle
        </h2>
        <Link
          href="/groups"
          className="shrink-0 text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          Groups
        </Link>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {todayCount == null || memberTotal == null
          ? "—"
          : `${todayCount}/${memberTotal}`}
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Checked in today across your groups
      </p>
    </section>
  );
}
