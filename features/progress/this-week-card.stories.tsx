import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { buildHomeConsistency, buildHomeWeek, buildWeekGoal } from "@/features/home/home-model";
import { sampleHistory } from "@/features/home/home-sample-history";
import { ThisWeekCard } from "@/features/progress/progress-cards";

/** Card props from sample history, through the same builders Progress uses. */
function cardArgs(options: Parameters<typeof sampleHistory>[0], activeDays: number) {
  const { sessions, activities, entries } = sampleHistory(options);
  const { todayKey } = options;
  const goal = buildWeekGoal(sessions, 3, todayKey);
  const weekStartKey = "2026-11-08";
  return {
    todayKey,
    week: { weekStartKey, target: 3 as const, completed: goal.completed, met: goal.completed >= 3 },
    movement: { weekStartKey, target: 5 as const, completed: activeDays, met: activeDays >= 5 },
    days: buildHomeWeek(todayKey, sessions, activities, entries),
    consistency: buildHomeConsistency(todayKey, sessions, activities, entries, 3),
  };
}

const meta = {
  title: "Progress/This week card",
  component: ThisWeekCard,
  args: cardArgs(
    { todayKey: "2026-11-11", shortWeeks: [5, 9], doneThisWeek: [1], walksThisWeek: [2], plannedThisWeek: [4] },
    2,
  ),
  parameters: {
    docs: {
      description: {
        component:
          "Home's This week card on the Progress tab, plus the active-days line. The streak pill and chart have no links to Progress here. The old Consistency heatmap sits below it on the page.",
      },
    },
  },
} satisfies Meta<typeof ThisWeekCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MidWeek: Story = { name: "Mid-week" };

export const GoalMet: Story = {
  name: "Goal met",
  args: cardArgs({ todayKey: "2026-11-13", shortWeeks: [5, 9], doneThisWeek: [1, 3, 5], walksThisWeek: [2] }, 4),
};

export const NewUser: Story = {
  name: "New user",
  args: cardArgs({ todayKey: "2026-11-08", pastWeeks: 0 }, 0),
};
