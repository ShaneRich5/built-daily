"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { normalizeInviteCode } from "@/lib/group-mapper";
import { getInvitePreview, joinSharedPlan } from "@/lib/group-plan-repository";
import { joinAccountabilityGroupByCode } from "@/lib/group-repository";
import type { InvitePreviewDoc } from "@/lib/group-types";
import { formatPlanTime, joinNames } from "@/features/groups/groups-model";
import { JoinView, type JoinPlanCard } from "@/features/groups/join-view";

/** Pure: the landing's words from the preview doc (first names and counts only). */
export function joinCopy(preview: InvitePreviewDoc | null, planId: string | null) {
  if (!preview) {
    return {
      headline: "You’re invited to train together",
      blurb: "Join to see each other’s week, plan workouts together and cheer each other on.",
      initials: [] as string[],
      plan: null,
      joinLabel: "Join",
    };
  }
  const others = preview.memberFirstNames.filter((n) => n !== preview.invitedByName);
  const buddy = preview.kind === "buddy";
  const headline = buddy
    ? `${preview.invitedByName} invited you to be gym buddies`
    : `${preview.invitedByName} invited you to ${preview.groupName}`;
  const workouts = preview.workoutsThisWeek;
  const between = workouts > 0 ? ` ${workouts} workout${workouts === 1 ? "" : "s"} between them this week.` : "";
  const blurb = buddy
    ? "Just the two of you. See each other’s week, plan sessions, keep each other going."
    : others.length > 0
      ? `${others.length === 1 ? `${preview.invitedByName} and ${others[0]}` : joinNames(others, 4)} keep each other showing up.${between}`
      : null;
  const p = planId ? preview.plans[planId] : undefined;
  let plan: JoinPlanCard | null = null;
  if (p) {
    const d = new Date(`${p.dateKey}T12:00:00`);
    plan = {
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d),
      dayOfMonth: d.getDate(),
      label: p.label,
      meta: [formatPlanTime(p.time), p.where].filter(Boolean).join(" · "),
      going:
        p.goingFirstNames.length > 0
          ? `${joinNames(p.goingFirstNames)} ${p.goingFirstNames.length === 1 ? "is" : "are"} going`
          : null,
    };
  }
  return {
    headline,
    blurb,
    initials: preview.memberFirstNames,
    plan,
    joinLabel: buddy ? "Join as gym buddies" : `Join ${preview.groupName}`,
  };
}

/** G6 wired: works signed out; after sign-up it comes back with `auto=1` and joins. */
export function JoinScreen({ code: rawCode, planId, auto }: { code: string; planId: string | null; auto: boolean }) {
  const code = normalizeInviteCode(rawCode);
  const router = useRouter();
  const { user, loading, firebaseReady } = useAuth();
  const [preview, setPreview] = useState<InvitePreviewDoc | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (!firebaseReady) return;
    let cancelled = false;
    void getInvitePreview(code).then((p) => {
      if (!cancelled) setPreview(p);
    });
    return () => {
      cancelled = true;
    };
  }, [firebaseReady, code]);

  const join = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await joinAccountabilityGroupByCode(code);
      if (!result) {
        setError("Couldn’t join. The link may have been reset, or it’s full.");
        return;
      }
      if (planId) {
        const joinedPlan = await joinSharedPlan(result.groupId, planId).catch(() => false);
        if (joinedPlan) {
          router.push(`/groups/${result.groupId}/plans/${planId}`);
          return;
        }
      }
      router.push(`/groups/${result.groupId}`);
    } catch {
      setError("Something went wrong joining. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Back from sign-up: join in one go instead of asking twice.
  useEffect(() => {
    if (!auto || !user || autoStarted.current) return;
    autoStarted.current = true;
    const t = window.setTimeout(() => void join(), 0);
    return () => window.clearTimeout(t);
    // `join` is recreated each render; the ref makes this run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, user]);

  if (!firebaseReady || loading || preview === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const copy = joinCopy(preview, planId);
  const back = `/join/${code}?${planId ? `plan=${encodeURIComponent(planId)}&` : ""}auto=1`;
  return (
    <JoinView
      {...copy}
      signedIn={Boolean(user)}
      busy={busy}
      error={error}
      signUpHref={`/login?mode=signup&next=${encodeURIComponent(back)}`}
      signInHref={`/login?next=${encodeURIComponent(back)}`}
      onJoin={() => void join()}
    />
  );
}
