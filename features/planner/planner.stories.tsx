import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { PlannerDayMarkers } from "@/lib/planner-list-items";
import type { SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import { PlanSheet } from "@/features/planner/plan-sheet";
import { calendarDays, calendarTitle } from "@/features/planner/planner-model";
import { PlannerView } from "@/features/planner/planner-view";

const TODAY = "2026-11-08";
const none: PlannerDayMarkers = { hasWorkout: false, hasPlan: false, hasReminder: false, hasActivity: false };
const markers = new Map<string, PlannerDayMarkers>([
  ["2026-11-02", { ...none, hasWorkout: true }],
  ["2026-11-04", { ...none, hasActivity: true }],
  ["2026-11-05", { ...none, hasWorkout: true }],
  ["2026-11-07", { ...none, hasWorkout: true }],
  ["2026-11-10", { ...none, hasPlan: true }],
  ["2026-11-12", { ...none, hasPlan: true }],
]);

const templates = [
  { id: "push", name: "Push day", meta: "4 exercises · used 6 times" },
  { id: "pull", name: "Pull day", meta: "5 exercises · used 5 times" },
  { id: "legs", name: "Leg day", meta: "4 exercises · used 5 times" },
];

const noop = () => {};

const meta = {
  title: "Planner/Screen",
  component: PlannerView,
  args: {
    view: "month",
    onViewChange: noop,
    calendarTitle: calendarTitle("month", TODAY),
    days: calendarDays("month", TODAY, TODAY, markers),
    selectedKey: "2026-11-10",
    onSelect: noop,
    onPrev: noop,
    onNext: noop,
    agendaHeading: "Tue, Nov 10",
    agenda: [
      { kind: "planned", id: "p1", title: "Leg day", meta: "Planned · 4 exercises", startHref: "/workout?p=legs" },
    ],
    canPlan: true,
    onPlan: noop,
    onLogActivity: noop,
    onRemovePlanned: noop,
    copyLastWeek: null,
    templates,
  },
} satisfies Meta<typeof PlannerView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MonthPlannedDay: Story = { name: "Month · planned day selected" };

export const WeekWithCopy: Story = {
  name: "Week · copy last week",
  args: {
    view: "week",
    calendarTitle: calendarTitle("week", TODAY),
    days: calendarDays("week", TODAY, TODAY, markers),
    selectedKey: TODAY,
    agendaHeading: "Today · Sun, Nov 8",
    agenda: [],
    copyLastWeek: { onCopy: noop, busy: false, message: "Added 2 workouts" },
  },
};

export const PastDay: Story = {
  name: "Past day (logged)",
  args: {
    selectedKey: "2026-11-05",
    agendaHeading: "Thu, Nov 5",
    canPlan: false,
    agenda: [
      { kind: "completed", id: "s1", title: "Push day", meta: "Done · 4 exercises · 14 sets", href: "#" },
      { kind: "activity", id: "a1", title: "Walk", meta: "35 min · 1.8 mi", href: "#" },
    ],
  },
};

export const NoTemplates: Story = { name: "New user", args: { templates: [], agenda: [] } };

const plans: SavedWorkoutPlan[] = [
  {
    id: "push",
    plan: {
      name: "Push day",
      createdAt: new Date(),
      updatedAt: new Date(),
      source: "custom",
      lines: [
        { lineId: "1", exerciseId: "bench", nameSnapshot: "Barbell bench press", metric: "weight_reps" },
        { lineId: "2", exerciseId: "ohp", nameSnapshot: "Overhead press", metric: "weight_reps" },
      ],
    },
  },
];

export const PlanASheet: StoryObj<typeof PlanSheet> = {
  name: "Plan a workout (sheet)",
  parameters: { frame: "none" },
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="m-4 h-11 rounded-lg border px-4 text-sm">
          Open again
        </button>
        <PlanSheet
          open={open}
          onOpenChange={setOpen}
          todayKey={TODAY}
          initialDateKey="2026-11-12"
          plans={plans}
          onPlan={async () => {}}
        />
      </>
    );
  },
};
