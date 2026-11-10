import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { PlannerDayMarkers } from "@/lib/planner-list-items";
import type { ScheduledWorkoutMove } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry, UnscheduledWorkoutEntry } from "@/lib/planner-types";
import type { SessionSummary } from "@/lib/workout-session-repository";
import type { SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import { PlanSheet } from "@/features/planner/plan-sheet";
import { calendarDays, calendarTitle } from "@/features/planner/planner-model";
import { PlannerView } from "@/features/planner/planner-view";
import { MoveSheet } from "@/features/planner/move-sheet";
import {
  buildWeekBoard,
  movableEntries,
  movesForDrop,
  toBoardCard,
  workoutDayKeys,
  type BoardCard,
} from "@/features/planner/week-board-model";

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
    board: null,
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

/* ---------- Week board ---------- */

/** Wednesday, so the board shows a done day, a missed day and days ahead. */
const BOARD_TODAY = "2026-11-11";

function planned(id: string, dateKey: string, label: string, exercises: number): ScheduledWorkoutEntry {
  return {
    id,
    dateKey,
    label,
    planId: null,
    exerciseIds: Array.from({ length: exercises }, (_, i) => `ex-${id}-${i}`),
    status: "planned",
    sessionId: null,
    createdAt: new Date(2026, 10, 1),
  };
}

const boardEntries: Array<ScheduledWorkoutEntry | UnscheduledWorkoutEntry> = [
  planned("push-mon", "2026-11-09", "Push day", 5),
  planned("leg", "2026-11-10", "Leg day", 4),
  planned("push", "2026-11-12", "Push day", 5),
  planned("pull", "2026-11-14", "Pull day", 5),
  { ...planned("mob", "2026-11-11", "Mobility", 0), dateKey: null },
  { ...planned("left", "2026-11-11", "Face pull + lateral raise", 2), dateKey: null },
];

const boardSessions: SessionSummary[] = [
  {
    id: "s-mon",
    status: "completed",
    workoutDate: "2026-11-09",
    workoutTime: "07:10",
    title: "Push day",
    planId: null,
    startedAt: new Date(2026, 10, 9, 7, 10),
    endedAt: new Date(2026, 10, 9, 8, 0),
    exerciseCount: 5,
    setCount: 17,
    previewExerciseNames: [],
  },
];

/** The board with local state, so handles, drops and the sheet can be tried. */
function BoardDemo({ initialPicked, openSheetFor }: { initialPicked?: string; openSheetFor?: string }) {
  const [entries, setEntries] = useState(boardEntries);
  const dated = entries.filter((e): e is ScheduledWorkoutEntry => e.dateKey !== null);
  const tray = entries
    .filter((e): e is UnscheduledWorkoutEntry => e.dateKey === null)
    .map((e) => toBoardCard(e, BOARD_TODAY));
  const board = buildWeekBoard({
    weekStartKey: BOARD_TODAY,
    todayKey: BOARD_TODAY,
    scheduled: dated,
    sessions: boardSessions,
    activities: [],
    weeklyGoal: 3,
  });
  const allCards = [...board.days.flatMap((d) => d.cards), ...tray];
  const [picked, setPicked] = useState<BoardCard | null>(
    allCards.find((c) => c.id === initialPicked) ?? null,
  );
  const [sheetCard, setSheetCard] = useState<BoardCard | null>(
    allCards.find((c) => c.id === openSheetFor) ?? null,
  );
  const apply = (moves: ScheduledWorkoutMove[]) =>
    setEntries((prev) =>
      prev.map((e) => {
        const move = moves.find((m) => m.id === e.id);
        return move ? ({ ...e, dateKey: move.dateKey } as (typeof prev)[number]) : e;
      }),
    );

  return (
    <>
      <PlannerView
        {...meta.args}
        view="week"
        templates={templates}
        board={{
          board,
          tray,
          todayKey: BOARD_TODAY,
          picked,
          onPick: setPicked,
          onDrop: (day) => {
            if (picked) apply(movesForDrop(day, picked, BOARD_TODAY));
            setPicked(null);
          },
          onDropInTray: () => {
            if (picked) apply([{ id: picked.id, dateKey: null }]);
            setPicked(null);
          },
          onOpenCard: setSheetCard,
          onPlanDay: noop,
          onPrev: noop,
          onNext: noop,
        }}
      />
      <MoveSheet
        open={sheetCard !== null}
        onOpenChange={(open) => !open && setSheetCard(null)}
        card={sheetCard}
        todayKey={BOARD_TODAY}
        movable={movableEntries(dated, BOARD_TODAY, workoutDayKeys(boardSessions))}
      />
    </>
  );
}

export const WeekBoard: Story = {
  name: "Week board (try it)",
  args: { board: null },
  render: () => <BoardDemo />,
};

export const WeekBoardMoving: Story = {
  name: "Week board · moving Push day",
  args: { board: null },
  render: () => <BoardDemo initialPicked="push" />,
};

export const MoveSheetMissed: Story = {
  name: "Move sheet · missed Leg day",
  args: { board: null },
  parameters: { frame: "none" },
  render: () => <BoardDemo openSheetFor="leg" />,
};

export const MoveSheetUpcoming: Story = {
  name: "Move sheet · upcoming Push day",
  args: { board: null },
  parameters: { frame: "none" },
  render: () => <BoardDemo openSheetFor="push" />,
};
