import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountMenu } from "@/features/home/account-menu";
import type { HomeWeekDay } from "@/features/home/home-model";
import { HomeView } from "@/features/home/home-view";

/** Sun Nov 8 – Sat Nov 14, 2026, seen from Sunday. */
function weekFrom(states: HomeWeekDay["state"][], todayIndex: number): HomeWeekDay[] {
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  return states.map((state, i) => ({
    dateKey: `2026-11-${String(8 + i).padStart(2, "0")}`,
    weekday: letters[i]!,
    dayOfMonth: 8 + i,
    isToday: i === todayIndex,
    isPast: i < todayIndex,
    state,
    label: `Nov ${8 + i}: ${state}`,
    href: "/planner",
  }));
}

const templates = [
  { id: "push", name: "Push day", meta: "4 exercises · last done Thu", startHref: "/workout?p=push", editHref: "/templates/push" },
  { id: "legs", name: "Leg day", meta: "4 exercises · last done Mon", startHref: "/workout?p=legs", editHref: "/templates/legs" },
  { id: "pull", name: "Pull day", meta: "5 exercises · last done Sat", startHref: "/workout?p=pull", editHref: "/templates/pull" },
];

const recent = [
  { id: "s3", kind: "workout" as const, title: "Pull day", meta: "Sat, Nov 7 · 5 exercises · 16 sets", href: "#" },
  { id: "s2", kind: "workout" as const, title: "Push day", meta: "Thu, Nov 5 · 4 exercises · 14 sets", href: "#" },
  { id: "a1", kind: "activity" as const, title: "Walk", meta: "Wed, Nov 4 · 35 min · 1.8 mi", href: "#" },
  { id: "s1", kind: "workout" as const, title: "Leg day", meta: "Mon, Nov 2 · 4 exercises · 15 sets", href: "#" },
];

const planned = { dateKey: "2026-11-10", label: "Leg day", dayLabel: "Tue, Nov 10", startHref: "/workout?p=legs" };

const meta = {
  title: "Home/Screen",
  component: HomeView,
  args: {
    todayKey: "2026-11-08",
    account: <AccountMenu email="sam@example.com" onSignOut={() => {}} />,
    loaded: true,
    weekGoal: { completed: 0, target: 3 },
    planned,
    inProgress: null,
    templates,
    week: weekFrom(["empty", "empty", "planned", "empty", "empty", "empty", "empty"], 0),
    recent,
    onLogActivity: () => {},
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FreshWeek: Story = { name: "Fresh week" };

export const MidWeek: Story = {
  name: "Mid-week, on your way",
  args: {
    todayKey: "2026-11-11",
    weekGoal: { completed: 1, target: 3 },
    planned: { ...planned, dateKey: "2026-11-12", label: "Push day", dayLabel: "Thu, Nov 12" },
    week: weekFrom(["empty", "workout", "empty", "empty", "planned", "empty", "empty"], 3),
  },
};

export const GoalMet: Story = {
  name: "Goal met",
  args: {
    todayKey: "2026-11-13",
    weekGoal: { completed: 3, target: 3 },
    planned: null,
    week: weekFrom(["empty", "workout", "activity", "workout", "empty", "workout", "empty"], 5),
  },
};

export const InProgress: Story = {
  name: "Workout in progress",
  args: {
    inProgress: {
      id: "s4",
      title: "Push day",
      meta: "Started 6:10 PM · 3 exercises · 8 sets",
      href: "#",
    },
  },
};

export const NewUser: Story = {
  name: "New user (nothing yet)",
  args: { templates: [], recent: [], planned: null, week: weekFrom(Array(7).fill("empty"), 0) },
};

export const Loading: Story = { args: { loaded: false } };
