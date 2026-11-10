"use client";

import { useEffect, useMemo, useState } from "react";
import { firstName } from "@/lib/group-mapper";
import { syncUpcomingPlansToGroupsThrottled } from "@/lib/group-plan-sync";
import { subscribeSharedPlan, type SavedSharedPlan } from "@/lib/group-plan-repository";
import { subscribeGroupMembers, type SavedGroupMember } from "@/lib/group-repository";
import { buildWorkoutHref } from "@/lib/planner-list-items";
import { formatPlanTime, joinNames } from "@/features/groups/groups-model";
import type { HomeTogether } from "@/features/home/home-together-card";

type TogetherEntry = { groupId: string; planId: string; exerciseIds: string[]; label: string } | null;

/**
 * Home's "Training with someone today": reads the one shared plan linked from
 * today's planner entry. Also keeps your planned days fresh for your groups
 * (throttled), since opening the app is the cheapest moment to do it.
 */
export function useTogetherToday(entry: TogetherEntry, myUid: string | null): HomeTogether | null {
  const [plan, setPlan] = useState<SavedSharedPlan | null>(null);
  const [members, setMembers] = useState<SavedGroupMember[]>([]);
  const groupId = entry?.groupId ?? "";
  const planId = entry?.planId ?? "";

  useEffect(() => {
    if (myUid) syncUpcomingPlansToGroupsThrottled();
  }, [myUid]);

  useEffect(() => {
    if (!myUid || !groupId || !planId) return;
    const unsubs = [subscribeSharedPlan(groupId, planId, setPlan), subscribeGroupMembers(groupId, setMembers)];
    return () => {
      for (const u of unsubs) u();
      setPlan(null);
      setMembers([]);
    };
  }, [myUid, groupId, planId]);

  return useMemo(() => {
    if (!entry || !plan) return null;
    const names = new Map(members.map(({ member }) => [member.uid, firstName(member.displayName)]));
    const others = plan.plan.going.filter((uid) => uid !== myUid).map((uid) => names.get(uid) ?? "Someone");
    const who = plan.plan.going.includes(myUid ?? "") ? [...others, "you"] : others;
    return {
      label: plan.plan.label,
      meta: [formatPlanTime(plan.plan.time) ?? "Anytime", plan.plan.where].filter(Boolean).join(" · "),
      going: who.length > 0 ? `${joinNames(who)} ${who.length === 1 && who[0] !== "you" ? "is" : "are"} going` : "",
      planHref: `/groups/${entry.groupId}/plans/${entry.planId}`,
      startHref: buildWorkoutHref(plan.plan.label, null, entry.exerciseIds),
    };
  }, [entry, plan, members, myUid]);
}
