"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import {
  deleteAccountabilityGroup,
  getAccountabilityGroup,
  leaveAccountabilityGroup,
  rotateGroupInviteCode,
  subscribeGroupMembers,
  type SavedGroup,
  type SavedGroupMember,
} from "@/lib/group-repository";
import { GROUP_LIMITS } from "@/lib/group-types";
import {
  formatLocalDateKey,
  localDateKeyFromMs,
} from "@/lib/workout-date";

type GroupDetailProps = {
  groupId: string;
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function GroupDetail({ groupId }: GroupDetailProps) {
  const router = useRouter();
  const { user, loading, firebaseReady } = useAuth();
  const [group, setGroup] = useState<SavedGroup | null | undefined>(undefined);
  const [members, setMembers] = useState<SavedGroupMember[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));

  useEffect(() => {
    if (!user || !firebaseReady || !groupId) {
      return () => {
        setGroup(undefined);
      };
    }
    let cancelled = false;
    void (async () => {
      const row = await getAccountabilityGroup(groupId);
      if (!cancelled) setGroup(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firebaseReady, groupId]);

  useEffect(() => {
    if (!user || !firebaseReady || !groupId) {
      return () => {
        setMembers(null);
      };
    }
    return subscribeGroupMembers(groupId, setMembers);
  }, [user, firebaseReady, groupId]);

  const isOwner = Boolean(
    user && group && group.group.createdBy === user.uid,
  );
  const inviteCode = group?.group.inviteCode ?? "";

  async function onCopyCode() {
    if (!inviteCode) return;
    const ok = await copyText(inviteCode);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  async function onRotate() {
    if (busy || !isOwner) return;
    setError(null);
    setBusy(true);
    try {
      const next = await rotateGroupInviteCode(groupId);
      if (!next) {
        setError("Couldn’t rotate the invite code.");
        return;
      }
      setGroup((prev) =>
        prev
          ? { ...prev, group: { ...prev.group, inviteCode: next } }
          : prev,
      );
    } catch {
      setError("Something went wrong rotating the code.");
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    if (busy) return;
    const okConfirm = window.confirm(
      isOwner && (members?.length ?? 0) > 1
        ? "You’re the owner. Delete the whole group for everyone?"
        : "Leave this group?",
    );
    if (!okConfirm) return;
    setError(null);
    setBusy(true);
    try {
      if (isOwner && (members?.length ?? 0) > 1) {
        const deleted = await deleteAccountabilityGroup(groupId);
        if (!deleted) {
          setError("Couldn’t delete the group.");
          return;
        }
      } else {
        const left = await leaveAccountabilityGroup(groupId);
        if (!left) {
          setError(
            isOwner
              ? "Couldn’t leave. If others remain, delete the group instead."
              : "Couldn’t leave the group.",
          );
          return;
        }
      }
      router.push("/groups");
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (busy || !isOwner) return;
    if (!window.confirm("Delete this group for everyone? This can’t be undone.")) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const deleted = await deleteAccountabilityGroup(groupId);
      if (!deleted) {
        setError("Couldn’t delete the group.");
        return;
      }
      router.push("/groups");
    } catch {
      setError("Something went wrong deleting the group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/groups"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            All groups
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
        {!firebaseReady ? (
          <p className="text-sm text-zinc-500">
            Add Firebase configuration to use groups.
          </p>
        ) : loading ? (
          <p className="text-sm text-zinc-500">Loading account…</p>
        ) : !user ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
            <p>Sign in to view this group.</p>
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
            >
              Sign in
            </Link>
          </div>
        ) : group === undefined ? (
          <p className="text-sm text-zinc-500">Loading group…</p>
        ) : group === null ? (
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Group not found
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You may not be a member, or the group was deleted.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {group.group.name}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {group.group.memberCount} / {GROUP_LIMITS.maxMembers} members
            </p>
          </>
        )}
      </header>

      {user && firebaseReady && group ? (
        <>
          <section
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            aria-labelledby="invite-heading"
          >
            <h2
              id="invite-heading"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Invite code
            </h2>
            <p className="font-mono text-xl tracking-widest text-zinc-900 dark:text-zinc-50">
              {inviteCode}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void onCopyCode()}
              >
                {copied ? (
                  <>
                    <Check />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy />
                    Copy code
                  </>
                )}
              </Button>
              {isOwner ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  disabled={busy}
                  onClick={() => void onRotate()}
                >
                  New code
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500">
              Share this code so partners can join. Rotating invalidates the old
              code.
            </p>
          </section>

          <section className="space-y-3" aria-labelledby="roster-heading">
            <h2
              id="roster-heading"
              className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
            >
              Today’s check-ins
            </h2>
            {members === null ? (
              <p className="text-sm text-zinc-500">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-zinc-500">No members yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                {members.map(({ id, member }) => {
                  const workedToday =
                    member.lastWorkoutDateKey === todayKey;
                  return (
                    <li
                      key={id}
                      className="flex items-start justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {member.displayName}
                          {user.uid === member.uid ? (
                            <span className="ml-1.5 text-xs font-normal text-zinc-500">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {member.lastWorkoutDateKey
                            ? `Last: ${formatLocalDateKey(member.lastWorkoutDateKey)}`
                            : "No workout yet"}
                          {member.currentStreak > 0
                            ? ` · ${member.currentStreak}-day streak`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={
                          workedToday
                            ? "shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
                        }
                      >
                        {workedToday ? "Today" : "Not yet"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <section className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => void onLeave()}
            >
              {isOwner && (members?.length ?? 0) <= 1
                ? "Leave & delete"
                : isOwner
                  ? "Leave / delete…"
                  : "Leave group"}
            </Button>
            {isOwner && (members?.length ?? 0) > 1 ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                Delete group
              </Button>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
