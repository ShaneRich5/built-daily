"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { CreateGroupForm } from "@/components/create-group-form";
import { JoinGroupForm } from "@/components/join-group-form";
import {
  subscribeUserGroupMemberships,
  type SavedGroupMembership,
} from "@/lib/group-repository";
import { GROUP_LIMITS } from "@/lib/group-types";

export function GroupsList() {
  const { user, loading, firebaseReady } = useAuth();
  const [memberships, setMemberships] = useState<SavedGroupMembership[] | null>(
    null,
  );

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setMemberships(null);
      };
    }
    return subscribeUserGroupMemberships(setMemberships);
  }, [user, firebaseReady]);

  const signedInReady = Boolean(user && firebaseReady);
  const atGroupLimit =
    (memberships?.length ?? 0) >= GROUP_LIMITS.maxGroupsPerUser;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">Accountability</p>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Groups
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Light check-ins with a small circle—who showed up today, last workout,
          and a simple streak. No workout details.
        </p>
      </header>

      {!firebaseReady ? (
        <p className="text-sm text-zinc-500">
          Add Firebase configuration to use groups.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading account…</p>
      ) : !user ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <p>Sign in to create or join an accountability group.</p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </div>
      ) : null}

      {signedInReady ? (
        <>
          <section className="space-y-3" aria-labelledby="my-groups-heading">
            <h2
              id="my-groups-heading"
              className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
            >
              Your groups
            </h2>
            {memberships === null ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No groups yet. Create one or join with an invite code.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                {memberships.map(({ id, membership }) => (
                  <li key={id}>
                    <Link
                      href={`/groups/${id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {membership.nameSnapshot}
                        </p>
                        <p className="text-xs text-zinc-500 capitalize">
                          {membership.role}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-zinc-500">
                        View
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            aria-labelledby="create-group-heading"
          >
            <h2
              id="create-group-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Create a group
            </h2>
            {atGroupLimit ? (
              <p className="text-sm text-zinc-500">
                You’ve reached the limit of {GROUP_LIMITS.maxGroupsPerUser}{" "}
                groups.
              </p>
            ) : (
              <CreateGroupForm />
            )}
          </section>

          <section
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            aria-labelledby="join-group-heading"
          >
            <h2
              id="join-group-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Join with a code
            </h2>
            <JoinGroupForm disabled={atGroupLimit} />
          </section>
        </>
      ) : null}
    </div>
  );
}
