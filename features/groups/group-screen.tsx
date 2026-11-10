"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { joinSharedPlan } from "@/lib/group-plan-repository";
import {
  convertBuddyToGroup,
  deleteAccountabilityGroup,
  leaveAccountabilityGroup,
  toggleGroupCheer,
} from "@/lib/group-repository";
import {
  buddiesSinceLabel,
  buildBuddySummary,
  buildGroupPlanRow,
  buildGroupWeek,
  buildWeekDays,
  groupDisplayName,
  joinNames,
  nextPlannedLabel,
  pluralMembers,
  trainedTodayDetail,
  trainedTodayOthers,
  weekRangeLabel,
  type PlanRow,
} from "@/features/groups/groups-model";
import { ConnectedInviteSheet, ConnectedPlanSheet } from "@/features/groups/group-sheets";
import { GroupView, type BuddyDetails } from "@/features/groups/group-view";
import { useGroupData } from "@/features/groups/use-group-data";

const quiet = "rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800";

/** G2 / G8 wired to Firestore. `openInvite` opens G5 on arrival (right after creating). */
export function GroupScreen({ groupId, openInvite = false }: { groupId: string; openInvite?: boolean }) {
  const router = useRouter();
  const data = useGroupData(groupId);
  const myUid = data.user?.uid ?? null;
  const [inviteOpen, setInviteOpen] = useState(openInvite);
  const [planOpen, setPlanOpen] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [cheerBusy, setCheerBusy] = useState(false);

  const members = useMemo(() => data.members ?? [], [data.members]);
  const view = useMemo(() => {
    const group = data.group?.group;
    if (!group) return null;
    const days = buildWeekDays(data.todayKey);
    const rows = buildGroupWeek(members, data.todayKey, myUid);
    const title = groupDisplayName(group, members, myUid, data.buddyNickname);
    const others = trainedTodayOthers(rows);
    const cheeredByMe = new Set(data.cheers.filter((c) => c.cheer.fromUid === myUid).map((c) => c.cheer.toUid));
    const planRows: PlanRow[] = data.plans.map((p) => buildGroupPlanRow(p, members, myUid));
    let buddy: BuddyDetails | null = null;
    if (group.kind === "buddy") {
      const other = rows.find((r) => !r.isMe);
      const summary = buildBuddySummary(members, rows, data.todayKey);
      buddy = {
        otherName: other?.name ?? data.buddyNickname ?? "your buddy",
        since: buddiesSinceLabel(group, members),
        ...summary,
        next: planRows[0] ?? null,
        nextPlanned: Object.fromEntries(rows.map((r) => [r.uid, nextPlannedLabel(r, data.todayKey)])),
      };
    }
    return {
      group,
      title,
      subtitle: `${pluralMembers(members.length)} · ${weekRangeLabel(data.todayKey)}`,
      days,
      rows,
      others,
      cheeredByMe,
      trainedToday:
        others.length > 0
          ? {
              names: joinNames(others.map((o) => o.name)),
              detail: trainedTodayDetail(members, others, data.todayKey),
              cheered: others.every((o) => cheeredByMe.has(o.uid)),
            }
          : null,
      planRows,
      buddy,
    };
  }, [data.group, members, data.cheers, data.plans, data.todayKey, data.buddyNickname, myUid]);

  if (!data.firebaseReady) return <p className={quiet}>Add Firebase configuration to use groups.</p>;
  if (!data.authLoading && !data.user) {
    return (
      <p className={quiet}>
        <Link href={`/login?next=/groups/${groupId}`} className="font-semibold text-zinc-900 underline dark:text-zinc-100">
          Sign in
        </Link>{" "}
        to see this group.
      </p>
    );
  }
  if (data.group === null) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Group not found</h1>
        <p className="text-sm text-zinc-500">You may not be a member, or it was deleted.</p>
        <Link href="/groups" className="text-sm font-semibold underline">
          Back to Groups
        </Link>
      </div>
    );
  }
  if (!view || data.members === null) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
        <div className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    );
  }

  const isOwner = view.group.createdBy === myUid;

  const imIn = async (row: PlanRow) => {
    setBusyPlanId(row.id);
    try {
      if (!(await joinSharedPlan(row.groupId, row.id))) throw new Error("not saved");
    } catch {
      window.alert("Couldn’t add you to that plan. Check your connection and try again.");
    } finally {
      setBusyPlanId(null);
    }
  };

  const cheer = async () => {
    // A buddy can always cheer the other person; a group cheers whoever trained today.
    const targets = view.buddy
      ? view.rows.filter((r) => !r.isMe)
      : view.others;
    setCheerBusy(true);
    try {
      await Promise.all(
        targets
          .filter((t) => !view.cheeredByMe.has(t.uid))
          .map((t) => toggleGroupCheer(groupId, t.uid, data.todayKey)),
      );
    } finally {
      setCheerBusy(false);
    }
  };

  const leave = async () => {
    const othersRemain = members.length > 1;
    if (isOwner && othersRemain) {
      window.alert("You started this one. Delete it for everyone, or ask everyone else to leave first.");
      return;
    }
    if (!window.confirm(isOwner ? "Leave and delete it?" : "Leave this group?")) return;
    const ok = await leaveAccountabilityGroup(groupId).catch(() => false);
    if (ok) router.push("/groups");
    else window.alert("Couldn’t leave. Try again.");
  };

  const remove = async () => {
    if (!window.confirm("Delete this for everyone? This can’t be undone.")) return;
    const ok = await deleteAccountabilityGroup(groupId).catch(() => false);
    if (ok) router.push("/groups");
    else window.alert("Couldn’t delete it. Try again.");
  };

  const convert = async () => {
    const name = window.prompt("Name the group", "Gym crew");
    if (!name?.trim()) return;
    if (!(await convertBuddyToGroup(groupId, name))) window.alert("Couldn’t change it. Try again.");
  };

  return (
    <>
      <GroupView
        title={view.title}
        subtitle={view.subtitle}
        days={view.days}
        rows={view.rows}
        trainedToday={view.trainedToday}
        planRows={view.planRows}
        busyPlanId={busyPlanId}
        cheerBusy={cheerBusy}
        isOwner={isOwner}
        buddy={view.buddy}
        onInvite={() => setInviteOpen(true)}
        onPlan={() => setPlanOpen(true)}
        onImIn={(row) => void imIn(row)}
        onCheer={() => void cheer()}
        onLeave={() => void leave()}
        onDelete={() => void remove()}
        onConvertToGroup={() => void convert()}
      />
      {data.group ? (
        <ConnectedInviteSheet
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open);
            // Drop ?invite=1 so a refresh doesn't reopen it.
            if (!open && openInvite) router.replace(`/groups/${groupId}`);
          }}
          group={data.group}
          displayName={view.title}
          members={members}
          plans={data.plans}
          myUid={myUid}
        />
      ) : null}
      <ConnectedPlanSheet
        open={planOpen}
        onOpenChange={setPlanOpen}
        todayKey={data.todayKey}
        groupId={groupId}
        members={members}
        memberships={data.memberships}
        templates={data.templates}
        myUid={myUid}
      />
    </>
  );
}
