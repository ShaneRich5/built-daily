"use client";

import { useEffect } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { JoinGroupForm } from "@/components/join-group-form";
import { createSharedPlan, refreshInvitePreview, type SavedSharedPlan } from "@/lib/group-plan-repository";
import { rotateGroupInviteCode, type SavedGroup, type SavedGroupMember, type SavedGroupMembership } from "@/lib/group-repository";
import { crewCountsByDay, formatPlanTime, nextSevenDays } from "@/features/groups/groups-model";
import { InviteSheet, type InvitePlanOption } from "@/features/groups/invite-sheet";
import { PlanTogetherSheet, type PlanTemplateOption } from "@/features/groups/plan-together-sheet";
import { membershipLabel } from "@/features/groups/use-group-data";

function browserOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function invitePlanOptions(plans: SavedSharedPlan[]): InvitePlanOption[] {
  return plans.map(({ id, plan }) => {
    const d = new Date(`${plan.dateKey}T12:00:00`);
    return {
      id,
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d),
      dayOfMonth: d.getDate(),
      label: plan.label,
      meta: [formatPlanTime(plan.time) ?? "Anytime", plan.where].filter(Boolean).join(" · "),
    };
  });
}

/** G5 wired: refreshes the signed-out preview whenever it opens, so the link shows current names. */
export function ConnectedInviteSheet({
  open,
  onOpenChange,
  group,
  displayName,
  members,
  plans,
  initialPlanId,
  myUid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: SavedGroup;
  displayName: string;
  members: SavedGroupMember[];
  plans: SavedSharedPlan[];
  initialPlanId?: string | null;
  myUid: string | null;
}) {
  const memberDocs = members.map((m) => m.member);
  const inviteCode = group.group.inviteCode;
  // Re-run when the code changes (reset) as well as on open.
  useEffect(() => {
    if (!open) return;
    void refreshInvitePreview({ groupId: group.id, group: group.group, members: memberDocs, plans });
    // memberDocs / plans are read at open time on purpose; a refresh per snapshot would be noisy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group.id, inviteCode]);

  return (
    <InviteSheet
      open={open}
      onOpenChange={onOpenChange}
      groupName={displayName}
      memberCount={group.group.memberCount}
      maxMembers={group.group.maxMembers}
      code={inviteCode}
      origin={browserOrigin()}
      plans={invitePlanOptions(plans)}
      initialPlanId={initialPlanId ?? null}
      isOwner={group.group.createdBy === myUid}
      onReset={async () => {
        const next = await rotateGroupInviteCode(group.id);
        if (!next) window.alert("Couldn’t reset the link. Try again.");
      }}
    />
  );
}

/** G3 wired: creates the plan in each chosen group and puts it on your planner. */
export function ConnectedPlanSheet({
  open,
  onOpenChange,
  todayKey,
  groupId,
  members,
  memberships,
  templates,
  myUid,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todayKey: string;
  groupId: string;
  members: SavedGroupMember[];
  memberships: SavedGroupMembership[];
  templates: PlanTemplateOption[];
  myUid: string | null;
  onCreated?: (created: { groupId: string; planId: string }) => void;
}) {
  const groups = memberships.length > 0
    ? memberships.map((m) => ({ id: m.id, name: membershipLabel(m) }))
    : [{ id: groupId, name: "This group" }];
  return (
    <PlanTogetherSheet
      open={open}
      onOpenChange={onOpenChange}
      todayKey={todayKey}
      templates={templates}
      groups={groups}
      defaultGroupId={groupId}
      crewCounts={crewCountsByDay(members, nextSevenDays(todayKey), myUid)}
      onSubmit={async (input) => {
        const created = await createSharedPlan(input);
        if (created) onCreated?.(created);
        return Boolean(created);
      }}
    />
  );
}

/** Groups › Join: type a code. */
export function JoinCodeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Join with a code" description="Ask someone in the group for their code.">
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <JoinGroupForm />
      </div>
    </BottomSheet>
  );
}
