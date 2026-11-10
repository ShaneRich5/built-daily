"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { getCatalogExerciseById } from "@/lib/exercise-catalog";
import { syncUpcomingPlansToGroupsThrottled } from "@/lib/group-plan-sync";
import { subscribeGroupPlansInRange, type SavedSharedPlan } from "@/lib/group-plan-repository";
import {
  subscribeAccountabilityGroup,
  subscribeGroupCheersForDay,
  subscribeGroupMembers,
  subscribeUserGroupMemberships,
  type SavedCheer,
  type SavedGroup,
  type SavedGroupMember,
  type SavedGroupMembership,
} from "@/lib/group-repository";
import { STARTER_TEMPLATE_DEFINITIONS } from "@/lib/starter-templates";
import { localDateKeyFromMs } from "@/lib/workout-date";
import { subscribeUserWorkoutPlans, type SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import { exercisesFromTemplate } from "@/features/groups/groups-model";
import type { PlanTemplateOption } from "@/features/groups/plan-together-sheet";

/** Plans together look a week ahead, like the design's "Next 7 days". */
export const PLAN_WINDOW_DAYS = 7;

/** How many template chips the plan sheet offers. */
const TEMPLATE_CHIPS = 6;

export function useTodayKey(): string {
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));
  return todayKey;
}

/** Your templates first, then starters, as plan-sheet chips (names + set counts only). */
export function templateOptions(plans: SavedWorkoutPlan[]): PlanTemplateOption[] {
  const mine = plans
    .filter((p) => p.plan.lines.length > 0)
    .map((p) => ({ id: p.id, name: p.plan.name, exercises: exercisesFromTemplate(p.plan.lines) }));
  const starters = STARTER_TEMPLATE_DEFINITIONS.map((s) => ({
    id: s.id,
    name: s.name,
    exercises: s.exerciseIds.map((id) => ({ id, name: getCatalogExerciseById(id)?.name ?? id, sets: null })),
  }));
  return [...mine, ...starters].slice(0, TEMPLATE_CHIPS);
}

/** Display names for the "share with" checkboxes. */
export function membershipLabel(m: SavedGroupMembership): string {
  if (m.membership.buddyNickname) return `You & ${m.membership.buddyNickname}`;
  return m.membership.nameSnapshot;
}

/** Everything one group page shows, live. */
export function useGroupData(groupId: string) {
  const { user, firebaseReady, loading } = useAuth();
  const todayKey = useTodayKey();
  const signedIn = Boolean(user) && firebaseReady;
  const [group, setGroup] = useState<SavedGroup | null | undefined>(undefined);
  const [members, setMembers] = useState<SavedGroupMember[] | null>(null);
  const [plans, setPlans] = useState<SavedSharedPlan[]>([]);
  const [cheers, setCheers] = useState<SavedCheer[]>([]);
  const [memberships, setMemberships] = useState<SavedGroupMembership[]>([]);
  const [templates, setTemplates] = useState<SavedWorkoutPlan[]>([]);

  useEffect(() => {
    if (!signedIn || !groupId) return;
    syncUpcomingPlansToGroupsThrottled();
    const end = addDaysToDateKey(todayKey, PLAN_WINDOW_DAYS - 1);
    const unsubs = [
      subscribeAccountabilityGroup(groupId, setGroup),
      subscribeGroupMembers(groupId, setMembers),
      subscribeGroupPlansInRange(groupId, todayKey, end, setPlans),
      subscribeGroupCheersForDay(groupId, todayKey, setCheers),
      subscribeUserGroupMemberships(setMemberships),
      subscribeUserWorkoutPlans(setTemplates),
    ];
    return () => {
      for (const u of unsubs) u();
      setGroup(undefined);
      setMembers(null);
      setPlans([]);
      setCheers([]);
    };
  }, [signedIn, groupId, todayKey]);

  const myMembership = memberships.find((m) => m.id === groupId) ?? null;
  const templateChips = useMemo(() => templateOptions(templates), [templates]);

  return {
    user,
    authLoading: loading,
    firebaseReady,
    todayKey,
    group,
    members,
    plans,
    cheers,
    memberships,
    buddyNickname: myMembership?.membership.buddyNickname ?? null,
    templates: templateChips,
  };
}

export type GroupSnapshot = {
  group: SavedGroup | null | undefined;
  members: SavedGroupMember[];
  plans: SavedSharedPlan[];
};

/** The Groups tab: every group you're in, with members and the next 7 days of plans. */
export function useGroupsHome() {
  const { user, firebaseReady, loading } = useAuth();
  const todayKey = useTodayKey();
  const signedIn = Boolean(user) && firebaseReady;
  const [memberships, setMemberships] = useState<SavedGroupMembership[] | null>(null);
  const [byGroup, setByGroup] = useState<Record<string, GroupSnapshot>>({});
  const [firstCheers, setFirstCheers] = useState<SavedCheer[]>([]);
  const [templates, setTemplates] = useState<SavedWorkoutPlan[]>([]);

  useEffect(() => {
    if (!signedIn) return;
    syncUpcomingPlansToGroupsThrottled();
    const unsubs = [subscribeUserGroupMemberships(setMemberships), subscribeUserWorkoutPlans(setTemplates)];
    return () => {
      for (const u of unsubs) u();
      setMemberships(null);
    };
  }, [signedIn]);

  const ids = (memberships ?? []).map((m) => m.id).join(",");

  useEffect(() => {
    if (!signedIn || !ids) return;
    const end = addDaysToDateKey(todayKey, PLAN_WINDOW_DAYS - 1);
    const patch = (id: string, next: Partial<GroupSnapshot>) =>
      setByGroup((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? { group: undefined, members: [], plans: [] }), ...next },
      }));
    const unsubs = ids.split(",").flatMap((id) => [
      subscribeAccountabilityGroup(id, (group) => patch(id, { group })),
      subscribeGroupMembers(id, (members) => patch(id, { members })),
      subscribeGroupPlansInRange(id, todayKey, end, (plans) => patch(id, { plans })),
    ]);
    return () => {
      for (const u of unsubs) u();
      setByGroup({});
    };
  }, [signedIn, ids, todayKey]);

  const firstId = ids.split(",")[0] ?? "";
  useEffect(() => {
    if (!signedIn || !firstId) return;
    return subscribeGroupCheersForDay(firstId, todayKey, setFirstCheers);
  }, [signedIn, firstId, todayKey]);

  const templateChips = useMemo(() => templateOptions(templates), [templates]);

  return {
    user,
    authLoading: loading,
    firebaseReady,
    todayKey,
    memberships,
    byGroup,
    firstCheers,
    templates: templateChips,
  };
}
