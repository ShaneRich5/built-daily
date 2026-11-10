import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AccountMenu } from "@/features/home/account-menu";
import type { HomeChartDay, HomeConsistency, HomeWeekDay } from "@/features/home/home-model";
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

/**
 * Sixteen weeks ending Sat Nov 14. Each past week is [workout days, activity days].
 * Goal (3) hit in 12 of the 15 finished weeks; the last 4 in a row.
 */
const PAST_WEEKS: Array<[number[], number[]]> = [
  [[1, 3, 5], [0]], [[1, 4], [3]], [[1, 3, 5], []], [[2, 4, 6], [0]],
  [[1, 3, 5], []], [[1, 3, 6], [4]], [[0, 2, 4], []], [[1, 3, 5], [6]],
  [[2, 5], [3]], [[1, 3, 5], []], [[1, 4], [6]], [[1, 3, 5], [0]],
  [[1, 4, 6], [3]], [[2, 4, 6], [4]], [[1, 3, 5], [3]],
];

function consistencyFor(
  thisWeek: HomeChartDay[],
  { streak, longest = 6, goalMet = false }: { streak: number; longest?: number; goalMet?: boolean },
): HomeConsistency {
  const weeks: HomeConsistency["weeks"] = PAST_WEEKS.map(([workouts, acts], w) => ({
    startKey: `week-${w}`,
    days: Array.from({ length: 7 }, (_, d): HomeChartDay =>
      workouts.includes(d) && acts.includes(d)
        ? "both"
        : workouts.includes(d)
          ? "workout"
          : acts.includes(d)
            ? "activity"
            : "rest",
    ),
    goal: workouts.length >= 3 ? ("hit" as const) : ("missed" as const),
  }));
  weeks.push({ startKey: "2026-11-08", days: thisWeek, goal: goalMet ? "hit" : "open" });
  return {
    streak,
    longest,
    weeks,
    label: `Last 16 weeks: goal hit in 12 of 15 finished weeks. Current streak ${streak} weeks, longest ${longest} weeks.`,
  };
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
    consistency: consistencyFor(["today", "ahead", "planned", "ahead", "ahead", "ahead", "ahead"], { streak: 4 }),
    planned,
    inProgress: null,
    templates,
    week: weekFrom(["empty", "empty", "planned", "empty", "empty", "empty", "empty"], 0),
    recent,
    onLogActivity: () => {},
    catchUp: null,
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
    consistency: consistencyFor(["rest", "workout", "activity", "today", "planned", "ahead", "ahead"], { streak: 4 }),
    planned: { ...planned, dateKey: "2026-11-12", label: "Push day", dayLabel: "Thu, Nov 12" },
    week: weekFrom(["empty", "workout", "empty", "empty", "planned", "empty", "empty"], 3),
  },
};

export const GoalMet: Story = {
  name: "Goal met",
  args: {
    todayKey: "2026-11-13",
    weekGoal: { completed: 3, target: 3 },
    consistency: consistencyFor(["rest", "workout", "activity", "workout", "rest", "workout", "ahead"], { streak: 5, goalMet: true }),
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
  args: {
    templates: [],
    recent: [],
    planned: null,
    week: weekFrom(Array(7).fill("empty"), 0),
    consistency: {
      streak: 0,
      longest: 0,
      weeks: Array.from({ length: 16 }, (_, w) => ({
        startKey: `week-${w}`,
        days: (w === 15
          ? ["today", "ahead", "ahead", "ahead", "ahead", "ahead", "ahead"]
          : Array(7).fill("rest")) as HomeChartDay[],
        goal: w === 15 ? ("open" as const) : ("missed" as const),
      })),
      label: "Last 16 weeks: nothing logged yet.",
    },
  },
};

export const Loading: Story = { args: { loaded: false } };

export const CatchUp: Story = {
  name: "Missed yesterday (catch up)",
  args: {
    todayKey: "2026-11-11",
    weekGoal: { completed: 1, target: 3 },
    week: weekFrom(["empty", "workout", "empty", "empty", "planned", "empty", "empty"], 3),
    catchUp: {
      missed: {
        id: "leg",
        title: "Leg day",
        meta: "Slid past · 4 exercises",
        dateKey: "2026-11-10",
        planId: "legs",
        exerciseIds: ["a", "b", "c", "d"],
        startHref: "/workout?p=legs",
        slid: true,
      },
      busy: false,
      onDoToday: () => {},
      onPickDay: () => {},
      onSkip: () => {},
    },
  },
};

export const TrainingTogether: Story = {
  name: "Training with someone today (G9)",
  args: {
    todayKey: "2026-11-12",
    together: {
      label: "Leg day",
      meta: "6:30 AM · Iron Works Gym",
      going: "Priya and you are going",
      planHref: "/groups/g-crew/plans/p-legs",
      startHref: "/workout?e=squat,rdl,lunge,plank&t=Leg+day",
    },
  },
};
