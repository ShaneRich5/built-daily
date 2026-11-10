import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { crewCountsByDay, buildBuddySummary, buildComingUpRow, buildGroupPlanRow, buildGroupWeek, buildWeekDays, groupCompactSummary, groupSummary, nextPlannedLabel, nextSevenDays, trainedTodayDetail, trainedTodayOthers } from "@/features/groups/groups-model";
import { GroupView } from "@/features/groups/group-view";
import { GroupsView } from "@/features/groups/groups-view";
import { InviteSheet } from "@/features/groups/invite-sheet";
import { joinCopy } from "@/features/groups/join-screen";
import { JoinView } from "@/features/groups/join-view";
import { NewGroupSheet } from "@/features/groups/new-group-sheet";
import { PlanTogetherSheet } from "@/features/groups/plan-together-sheet";
import { PlanView } from "@/features/groups/plan-view";
import { buddyPair, crew, crewPlans, ME, templates, TODAY } from "@/features/groups/story-fixtures";

/** Groups Together (G1–G8), on mock data for Tue Nov 10, 2026. */
const meta = {
  title: "Groups/Together",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => {};
const week = buildGroupWeek(crew, TODAY, ME);
const others = trainedTodayOthers(week);

export const G1GroupsTab: Story = {
  name: "G1 · Groups tab",
  render: () => (
    <GroupsView
      loaded
      comingUp={crewPlans.map((p) => buildComingUpRow(p, "Morning Crew", crew, ME))}
      featured={{
        id: "g-crew",
        name: "Morning Crew",
        href: "#",
        summary: groupSummary(week),
        members: week.map((m) => ({ uid: m.uid, name: m.name, progress: `${m.done}/${m.goal}`, trainedToday: m.trainedToday, isMe: m.isMe })),
        cheerNames: others.map((o) => o.name),
        cheeredAll: false,
        code: "K7Q2MDXA",
      }}
      others={[
        {
          id: "g-office",
          name: "Office lunch lifters",
          href: "#",
          summary: groupCompactSummary(buildGroupWeek(crew.slice(2, 6), TODAY, ME)),
          avatarNames: ["Priya", "Jordan", "Dev", "Alex"],
        },
      ]}
      busyPlanId={null}
      cheerBusy={false}
      onJoin={noop}
      onNew={noop}
      onImIn={noop}
      onCheer={noop}
      onShare={noop}
    />
  ),
};

export const G1Empty: Story = {
  name: "G1 · No groups yet",
  render: () => (
    <GroupsView loaded comingUp={[]} featured={null} others={[]} busyPlanId={null} cheerBusy={false} onJoin={noop} onNew={noop} onImIn={noop} onCheer={noop} onShare={noop} />
  ),
};

const groupProps = {
  title: "Morning Crew",
  subtitle: "6 members · Nov 8 – 14",
  days: buildWeekDays(TODAY),
  rows: week,
  trainedToday: {
    names: "Maya and Priya",
    detail: trainedTodayDetail(crew, others, TODAY),
    cheered: false,
  },
  planRows: crewPlans.map((p) => buildGroupPlanRow(p, crew, ME)),
  busyPlanId: null,
  cheerBusy: false,
  isOwner: true,
  buddy: null,
  onInvite: noop,
  onPlan: noop,
  onImIn: noop,
  onCheer: noop,
  onLeave: noop,
  onDelete: noop,
  onConvertToGroup: noop,
};

export const G2GroupDetail: Story = {
  name: "G2 · Group detail",
  render: () => <GroupView {...groupProps} />,
};

const buddyWeek = buildGroupWeek(buddyPair, TODAY, ME);
const buddyNext = buildGroupPlanRow(
  { id: "p-sat", plan: { ...crewPlans[1]!.plan, dateKey: "2026-11-14", label: "Pull day", time: "09:00", where: "Iron Works Gym", going: [ME, "u-alex"] } },
  buddyPair,
  ME,
);

export const G8Buddy: Story = {
  name: "G8 · Gym buddy",
  render: () => (
    <GroupView
      {...groupProps}
      title="You & Alex"
      subtitle=""
      rows={buddyWeek}
      trainedToday={null}
      planRows={[buddyNext]}
      buddy={{
        otherName: "Alex",
        since: "Oct 3",
        ...buildBuddySummary(buddyPair, buddyWeek, TODAY),
        next: buddyNext,
        nextPlanned: Object.fromEntries(buddyWeek.map((r) => [r.uid, nextPlannedLabel(r, TODAY)])),
      }}
    />
  ),
};

export const G8BuddyWaiting: Story = {
  name: "G8 · Buddy, not joined yet",
  render: () => (
    <GroupView
      {...groupProps}
      title="You & Alex"
      rows={buddyWeek.slice(0, 1)}
      trainedToday={null}
      planRows={[]}
      buddy={{ otherName: "Alex", since: "Nov 10", bothOnTrack: false, weeksBothHitGoal: null, togetherDays: new Set(), next: null, nextPlanned: {} }}
    />
  ),
};

const legs = crewPlans[0]!.plan;
const planProps = {
  groupName: "Morning Crew",
  groupHref: "#",
  weekday: "Thu",
  dayOfMonth: 12,
  label: legs.label,
  meta: "6:30 AM · Iron Works Gym",
  plannedBy: "Priya",
  note: { author: "Priya", text: legs.note! },
  going: [
    { uid: "u-priya", name: "Priya", detail: "Planned it" },
    { uid: ME, name: "You", detail: "Said I’m in yesterday" },
  ],
  notYet: "Maya, Jordan and 2 others haven’t said yet. No pressure either way.",
  exercises: legs.exercises,
  isGoing: false,
  isToday: false,
  isPast: false,
  startHref: "/workout?e=squat,rdl",
  dayLabel: "Thu, Nov 12",
  isCreator: false,
  busy: false,
  onImIn: noop,
  onCantMake: noop,
  onInvite: noop,
  onCancelPlan: noop,
  onEditPlan: noop,
};

export const G7PlanDetail: Story = {
  name: "G7 · Plan detail",
  render: () => <PlanView {...planProps} going={planProps.going.slice(0, 1)} />,
};

export const G7Going: Story = {
  name: "G7 · Plan detail, going",
  render: () => <PlanView {...planProps} isGoing isCreator />,
};

export const G7Today: Story = {
  name: "G7 · Plan today (Start)",
  render: () => <PlanView {...planProps} isGoing isToday />,
};

export const G6JoinSignedOut: Story = {
  name: "G6 · Join landing (signed out, with plan)",
  render: () => (
    <JoinView
      {...joinCopy(
        {
          groupId: "g-crew",
          groupName: "Morning Crew",
          kind: "group",
          invitedByName: "Sam",
          memberFirstNames: ["Sam", "Maya", "Priya", "Jordan", "Dev", "Alex"],
          memberCount: 6,
          workoutsThisWeek: 9,
          plans: {
            "p-legs": { dateKey: "2026-11-12", time: "06:30", where: "Iron Works Gym", label: "Leg day", goingFirstNames: ["Priya", "Sam"] },
          },
          updatedAt: new Date(),
        },
        "p-legs",
      )}
      signedIn={false}
      busy={false}
      error={null}
      signUpHref="#"
      signInHref="#"
      onJoin={noop}
    />
  ),
};

export const G6JoinSignedIn: Story = {
  name: "G6 · Join landing (signed in, no preview)",
  render: () => (
    <JoinView {...joinCopy(null, null)} signedIn busy={false} error={null} signUpHref="#" signInHref="#" onJoin={noop} />
  ),
};

function Reopen({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="m-4 h-11 rounded-lg border border-zinc-200 px-4 text-sm font-medium">
      Open again
    </button>
  );
}

export const G3PlanTogether: Story = {
  name: "G3 · Plan together sheet",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <PlanTogetherSheet
          open={open}
          onOpenChange={setOpen}
          todayKey={TODAY}
          templates={templates}
          groups={[
            { id: "g-crew", name: "Morning Crew" },
            { id: "g-buddy", name: "You & Alex" },
          ]}
          defaultGroupId="g-crew"
          crewCounts={crewCountsByDay(crew, nextSevenDays(TODAY), ME)}
          onSubmit={async (input) => {
            alert(`Plan ${input.label} on ${input.dateKey} at ${input.time ?? "anytime"}`);
            return true;
          }}
        />
      </>
    );
  },
};

export const G4New: Story = {
  name: "G4 · New buddy or group",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <NewGroupSheet
          open={open}
          onOpenChange={setOpen}
          onCreate={async (input) => {
            alert(`Create ${input.kind}: ${input.name} (${input.buddyNickname ?? "-"})`);
            return true;
          }}
        />
      </>
    );
  },
};

export const G5Invite: Story = {
  name: "G5 · Invite sheet",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Reopen onClick={() => setOpen(true)} />
        <InviteSheet
          open={open}
          onOpenChange={setOpen}
          groupName="Morning Crew"
          memberCount={6}
          maxMembers={12}
          code="K7Q2MDXA"
          origin="https://builtdaily.app"
          plans={[
            { id: "p-legs", weekday: "Thu", dayOfMonth: 12, label: "Leg day", meta: "6:30 AM · Iron Works Gym" },
            { id: "p-pull", weekday: "Fri", dayOfMonth: 13, label: "Pull day", meta: "6:00 PM" },
          ]}
          initialPlanId="p-legs"
          isOwner
          onReset={async () => {}}
        />
      </>
    );
  },
};
