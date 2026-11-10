"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { joinSharedPlan } from "@/lib/group-plan-repository";
import { createAccountabilityGroup, toggleGroupCheer } from "@/lib/group-repository";
import { GROUP_LIMITS } from "@/lib/group-types";
import {
  buildComingUpRow,
  buildGroupWeek,
  groupCompactSummary,
  groupDisplayName,
  groupSummary,
  trainedTodayOthers,
  type PlanRow,
} from "@/features/groups/groups-model";
import { ConnectedInviteSheet, JoinCodeSheet } from "@/features/groups/group-sheets";
import { GroupsHeader, GroupsView, type CompactGroup, type FeaturedGroup } from "@/features/groups/groups-view";
import { NewGroupSheet } from "@/features/groups/new-group-sheet";
import { useGroupsHome } from "@/features/groups/use-group-data";

/** G1 wired to Firestore. */
export function GroupsScreen() {
  const router = useRouter();
  const data = useGroupsHome();
  const myUid = data.user?.uid ?? null;
  const [joinOpen, setJoinOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [cheerBusy, setCheerBusy] = useState(false);

  const view = useMemo(() => {
    const memberships = data.memberships ?? [];
    const groups = memberships.map((m) => {
      const snap = data.byGroup[m.id];
      const members = snap?.members ?? [];
      const name = snap?.group
        ? groupDisplayName(snap.group.group, members, myUid, m.membership.buddyNickname)
        : m.membership.buddyNickname
          ? `You & ${m.membership.buddyNickname}`
          : m.membership.nameSnapshot;
      return { id: m.id, snap, members, name, week: buildGroupWeek(members, data.todayKey, myUid) };
    });

    const comingUp: PlanRow[] = groups
      .flatMap((g) => (g.snap?.plans ?? []).map((p) => buildComingUpRow(p, g.name, g.members, myUid)))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.meta.localeCompare(b.meta));

    const first = groups[0];
    const cheeredByMe = new Set(
      data.firstCheers.filter((c) => c.cheer.fromUid === myUid).map((c) => c.cheer.toUid),
    );
    const trainedToday = first ? trainedTodayOthers(first.week) : [];
    const featured: FeaturedGroup | null = first
      ? {
          id: first.id,
          name: first.name,
          href: `/groups/${first.id}`,
          summary: groupSummary(first.week),
          members: first.week.map((m) => ({
            uid: m.uid,
            name: m.name,
            progress: `${m.done}/${m.goal}`,
            trainedToday: m.trainedToday,
            isMe: m.isMe,
          })),
          cheerNames: trainedToday.filter((m) => !cheeredByMe.has(m.uid)).map((m) => m.name),
          cheeredAll: trainedToday.length > 0 && trainedToday.every((m) => cheeredByMe.has(m.uid)),
          code: first.snap?.group?.group.inviteCode ?? "",
        }
      : null;
    const others: CompactGroup[] = groups.slice(1).map((g) => ({
      id: g.id,
      name: g.name,
      href: `/groups/${g.id}`,
      summary: groupCompactSummary(g.week),
      avatarNames: g.week.map((m) => m.name),
    }));
    return { groups, comingUp, featured, others, trainedToday, cheeredByMe };
  }, [data.memberships, data.byGroup, data.firstCheers, data.todayKey, myUid]);

  if (!data.firebaseReady || (!data.authLoading && !data.user)) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <GroupsHeader onJoin={() => router.push("/login?next=/groups")} onNew={() => router.push("/login?next=/groups")} />
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800">
          {data.firebaseReady ? (
            <>
              <Link href="/login?next=/groups" className="font-semibold text-zinc-900 underline dark:text-zinc-100">
                Sign in
              </Link>{" "}
              to train with a buddy or a small group.
            </>
          ) : (
            "Add Firebase configuration to use groups."
          )}
        </p>
      </div>
    );
  }

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
    const first = view.groups[0];
    if (!first) return;
    setCheerBusy(true);
    try {
      // One tap cheers everyone who showed up today (toggle only the ones not cheered yet).
      await Promise.all(
        view.trainedToday
          .filter((m) => !view.cheeredByMe.has(m.uid))
          .map((m) => toggleGroupCheer(first.id, m.uid, data.todayKey)),
      );
    } finally {
      setCheerBusy(false);
    }
  };

  const invite = view.groups.find((g) => g.id === inviteGroupId);

  return (
    <>
      <GroupsView
        loaded={data.memberships !== null && view.groups.every((g) => g.snap?.group !== undefined)}
        comingUp={view.comingUp}
        featured={view.featured}
        others={view.others}
        busyPlanId={busyPlanId}
        cheerBusy={cheerBusy}
        onJoin={() => setJoinOpen(true)}
        onNew={() => setNewOpen(true)}
        onImIn={(row) => void imIn(row)}
        onCheer={() => void cheer()}
        onShare={setInviteGroupId}
      />
      <JoinCodeSheet open={joinOpen} onOpenChange={setJoinOpen} />
      <NewGroupSheet
        open={newOpen}
        onOpenChange={setNewOpen}
        atLimit={(data.memberships?.length ?? 0) >= GROUP_LIMITS.maxGroupsPerUser}
        onCreate={async (input) => {
          const created = await createAccountabilityGroup(input.name, {
            kind: input.kind,
            buddyNickname: input.buddyNickname,
          });
          if (!created) return false;
          setNewOpen(false);
          // The group page opens G5 straight away.
          router.push(`/groups/${created.groupId}?invite=1`);
          return true;
        }}
      />
      {invite?.snap?.group ? (
        <ConnectedInviteSheet
          open={inviteGroupId !== null}
          onOpenChange={(open) => !open && setInviteGroupId(null)}
          group={invite.snap.group}
          displayName={invite.name}
          members={invite.members}
          plans={invite.snap.plans}
          myUid={myUid}
        />
      ) : null}
    </>
  );
}
