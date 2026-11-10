import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeCatchUp } from "@/features/home/home-catch-up";

const noop = () => {};

const legDay = {
  id: "leg",
  title: "Leg day",
  meta: "Slid past · 4 exercises",
  dateKey: "2026-11-10",
  planId: null,
  exerciseIds: ["a", "b", "c", "d"],
  startHref: "/workout?e=a,b,c,d&t=Leg+day",
  slid: true,
};

const meta = {
  title: "Home/Catch-up card",
  component: HomeCatchUp,
  args: {
    missed: legDay,
    todayKey: "2026-11-11",
    busy: false,
    onDoToday: noop,
    onPickDay: noop,
    onSkip: noop,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Shown above the start card when a planned workout from the last 7 days slid past with nothing logged that day. Calm copy, no red. Pick a day opens the planner's move sheet.",
      },
    },
  },
} satisfies Meta<typeof HomeCatchUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Yesterday: Story = { name: "Slid past yesterday" };

export const EarlierInTheWeek: Story = {
  name: "Slid past earlier (shows the weekday)",
  args: { todayKey: "2026-11-13" },
};

export const Saving: Story = {
  name: "Saving (buttons disabled)",
  args: { busy: true },
};
