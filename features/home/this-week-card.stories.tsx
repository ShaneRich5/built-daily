import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { buildHomeConsistency, buildHomeWeek, buildWeekGoal } from "@/features/home/home-model";
import { sampleHistory } from "@/features/home/home-sample-history";
import { HomeWeek } from "@/features/home/home-week";

/** Card props from sample history, through the same builders Home uses. */
function cardArgs(options: Parameters<typeof sampleHistory>[0]) {
  const { sessions, activities, entries } = sampleHistory(options);
  const { todayKey } = options;
  return {
    todayKey,
    days: buildHomeWeek(todayKey, sessions, activities, entries),
    goal: buildWeekGoal(sessions, 3, todayKey),
    consistency: buildHomeConsistency(todayKey, sessions, activities, entries, 3),
  };
}

/** Weeks 5 and 9 back fell short of 3 workouts: current streak 4, longest 6. */
const TYPICAL = { shortWeeks: [5, 9] };

const meta = {
  title: "Home/This week card",
  component: HomeWeek,
  args: cardArgs({ todayKey: "2026-11-11", ...TYPICAL, doneThisWeek: [1], walksThisWeek: [2], plannedThisWeek: [4] }),
  parameters: {
    docs: {
      description: {
        component:
          "Goal count with the streak pill, one encouraging line (never about losing the streak), Sun–Sat circles, and the last 16 weeks. Tap a past day or today in the chart to see what was logged; tap it again to close.",
      },
    },
  },
} satisfies Meta<typeof HomeWeek>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MidWeek: Story = { name: "Mid-week · two to go" };

export const FridayOneToGo: Story = {
  name: "Friday · one more keeps it going",
  args: cardArgs({ todayKey: "2026-11-13", ...TYPICAL, doneThisWeek: [1, 3], plannedThisWeek: [5] }),
};

export const SaturdayOneToGo: Story = {
  name: "Saturday · one more today",
  args: cardArgs({ todayKey: "2026-11-14", ...TYPICAL, doneThisWeek: [1, 3] }),
};

export const GoalMet: Story = {
  name: "Goal met this week",
  args: cardArgs({ todayKey: "2026-11-13", ...TYPICAL, doneThisWeek: [1, 3, 5] }),
};

export const OutOfReach: Story = {
  name: "Goal out of reach (still encouraging)",
  args: cardArgs({ todayKey: "2026-11-14", ...TYPICAL, doneThisWeek: [1] }),
};

export const NoStreakYet: Story = {
  name: "No streak yet",
  args: cardArgs({ todayKey: "2026-11-11", pastWeeks: 3, shortWeeks: [1], doneThisWeek: [1] }),
};

export const NewUser: Story = {
  name: "New user",
  args: cardArgs({ todayKey: "2026-11-08", pastWeeks: 0 }),
};

export const DesktopWidth: Story = {
  name: "Desktop width",
  globals: { width: "desktop" },
};
