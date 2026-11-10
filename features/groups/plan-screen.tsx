"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { addDaysToDateKey } from "@/lib/calendar-views";
import { firstName } from "@/lib/group-mapper";
import {
  cancelSharedPlan,
  joinSharedPlan,
  leaveSharedPlan,
  subscribeSharedPlan,
  updateSharedPlanDetails,
  type SavedSharedPlan,
} from "@/lib/group-plan-repository";
import { SHARED_PLAN_LIMITS } from "@/lib/group-types";
import { buildWorkoutHref } from "@/lib/planner-list-items";
import { localDateKeyFromMs } from "@/lib/workout-date";
import { formatPlanDay, formatPlanTime, groupDisplayName, joinNames } from "@/features/groups/groups-model";
import { primaryGreen } from "@/features/groups/group-ui";
import { ConnectedInviteSheet } from "@/features/groups/group-sheets";
import { PlanView } from "@/features/groups/plan-view";
import { useGroupData } from "@/features/groups/use-group-data";

const quiet = "rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800";

/** "Planned it" / "Said I'm in today" / "Said I'm in yesterday" / "Said I'm in Mon". */
export function goingDetail(at: Date | undefined, isCreator: boolean, todayKey: string): string {
  if (isCreator) return "Planned it";
  if (!at) return "Going";
  const key = localDateKeyFromMs(at.getTime());
  if (key === todayKey) return "Said I’m in today";
  if (key === addDaysToDateKey(todayKey, -1)) return "Said I’m in yesterday";
  return `Said I’m in ${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(at)}`;
}

export function PlanScreen({ groupId, planId }: { groupId: string; planId: string }) {
  const router = useRouter();
  const data = useGroupData(groupId);
  const myUid = data.user?.uid ?? null;
  const [plan, setPlan] = useState<SavedSharedPlan | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!myUid) return;
    return subscribeSharedPlan(groupId, planId, setPlan);
  }, [myUid, groupId, planId]);

  const members = useMemo(() => data.members ?? [], [data.members]);
  const view = useMemo(() => {
    if (!plan || !data.group) return null;
    const p = plan.plan;
    const names = new Map(members.map(({ member }) => [member.uid, firstName(member.displayName)]));
    const nameOf = (uid: string) => (uid === myUid ? "You" : (names.get(uid) ?? "Someone"));
    const notGoing = members.filter(({ member }) => !p.going.includes(member.uid) && member.uid !== myUid);
    const notYetNames = notGoing.map(({ member }) => firstName(member.displayName));
    const d = new Date(`${p.dateKey}T12:00:00`);
    const catalogIds = p.exercises.map((e) => e.id).filter((id) => !id.startsWith("custom-"));
    return {
      groupName: groupDisplayName(data.group.group, members, myUid, data.buddyNickname),
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d),
      dayOfMonth: d.getDate(),
      meta: [formatPlanTime(p.time) ?? "Anytime", p.where].filter(Boolean).join(" · "),
      plannedBy: p.createdBy === myUid ? "you" : firstName(p.createdByName),
      note: p.note ? { author: p.createdBy === myUid ? "You" : firstName(p.createdByName), text: p.note } : null,
      going: p.going.map((uid) => ({
        uid,
        name: nameOf(uid),
        detail: goingDetail(p.goingAt[uid], uid === p.createdBy, data.todayKey),
      })),
      notYet:
        notYetNames.length > 0
          ? `${joinNames(notYetNames)} ${notYetNames.length === 1 ? "hasn’t" : "haven’t"} said yet. No pressure either way.`
          : null,
      isGoing: myUid !== null && p.going.includes(myUid),
      isToday: p.dateKey === data.todayKey,
      isPast: p.dateKey < data.todayKey,
      startHref: buildWorkoutHref(p.label, null, catalogIds),
      dayLabel: formatPlanDay(p.dateKey),
      isCreator: p.createdBy === myUid,
    };
  }, [plan, data.group, members, myUid, data.todayKey, data.buddyNickname]);

  if (!data.firebaseReady) return <p className={quiet}>Add Firebase configuration to use groups.</p>;
  if (!data.authLoading && !data.user) {
    return (
      <p className={quiet}>
        <Link href={`/login?next=/groups/${groupId}/plans/${planId}`} className="font-semibold text-zinc-900 underline dark:text-zinc-100">
          Sign in
        </Link>{" "}
        to see this plan.
      </p>
    );
  }
  if (plan === null || data.group === null) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">This plan isn’t here anymore</h1>
        <p className="text-sm text-zinc-500">It may have been cancelled.</p>
        <Link href={`/groups/${groupId}`} className="text-sm font-semibold underline">
          Back to the group
        </Link>
      </div>
    );
  }
  if (!view || !plan) {
    return <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" aria-busy="true" aria-label="Loading" />;
  }

  const run = async (write: () => Promise<boolean>) => {
    setBusy(true);
    try {
      if (!(await write())) throw new Error("not saved");
    } catch {
      window.alert("Couldn’t save that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PlanView
        groupName={view.groupName}
        groupHref={`/groups/${groupId}`}
        weekday={view.weekday}
        dayOfMonth={view.dayOfMonth}
        label={plan.plan.label}
        meta={view.meta}
        plannedBy={view.plannedBy}
        note={view.note}
        going={view.going}
        notYet={view.notYet}
        exercises={plan.plan.exercises}
        isGoing={view.isGoing}
        isToday={view.isToday}
        isPast={view.isPast}
        startHref={view.startHref}
        dayLabel={view.dayLabel}
        isCreator={view.isCreator}
        busy={busy}
        onImIn={() => void run(() => joinSharedPlan(groupId, planId))}
        onCantMake={() => void run(() => leaveSharedPlan(groupId, planId))}
        onInvite={() => setInviteOpen(true)}
        onEditPlan={() => setEditOpen(true)}
        onCancelPlan={() => {
          if (!window.confirm("Cancel this plan for everyone?")) return;
          void run(async () => {
            const ok = await cancelSharedPlan(groupId, planId);
            if (ok) router.push(`/groups/${groupId}`);
            return ok;
          });
        }}
      />
      {data.group ? (
        <ConnectedInviteSheet
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          group={data.group}
          displayName={view.groupName}
          members={members}
          plans={[plan, ...data.plans.filter((p) => p.id !== plan.id)]}
          initialPlanId={plan.id}
          myUid={myUid}
        />
      ) : null}
      <EditPlanSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={plan}
        onSave={(patch) => updateSharedPlanDetails(groupId, planId, patch)}
      />
    </>
  );
}

const input =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-[15px] dark:border-zinc-700 dark:bg-zinc-950";

function EditPlanSheet({
  open,
  onOpenChange,
  plan,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SavedSharedPlan;
  onSave: (patch: { time: string | null; where: string | null; note: string | null }) => Promise<boolean>;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Edit plan" description="Everyone going sees the change.">
      {open ? <EditPlanForm plan={plan} onSave={onSave} onDone={() => onOpenChange(false)} /> : null}
    </BottomSheet>
  );
}

function EditPlanForm({
  plan,
  onSave,
  onDone,
}: {
  plan: SavedSharedPlan;
  onSave: (patch: { time: string | null; where: string | null; note: string | null }) => Promise<boolean>;
  onDone: () => void;
}) {
  const [time, setTime] = useState(plan.plan.time ?? "");
  const [where, setWhere] = useState(plan.plan.where ?? "");
  const [note, setNote] = useState(plan.plan.note ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void onSave({ time: time || null, where: where || null, note: note || null })
          .then((ok) => (ok ? onDone() : window.alert("Couldn’t save. Try again.")))
          .catch(() => window.alert("Couldn’t save. Try again."))
          .finally(() => setBusy(false));
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Time (leave empty for anytime)
        <input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Where
        <input className={input} value={where} maxLength={SHARED_PLAN_LIMITS.where} onChange={(e) => setWhere(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Note
        <input className={input} value={note} maxLength={SHARED_PLAN_LIMITS.note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button type="submit" disabled={busy} className={primaryGreen}>
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
