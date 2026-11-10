import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import type { ScheduledWorkoutMove } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry, UnscheduledWorkoutEntry } from "@/lib/planner-types";
import type { SessionSummary } from "@/lib/workout-session-repository";
import { MoveSheet } from "@/features/planner/move-sheet";
import { WeekBoard } from "@/features/planner/week-board";
import {
  buildWeekBoard,
  movableEntries,
  movesForDrop,
  toBoardCard,
  workoutDayKeys,
  type BoardCard,
} from "@/features/planner/week-board-model";

/** Wednesday, so the board shows a done day, a missed day and days ahead. */
const TODAY = "2026-11-11";

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

function unscheduled(id: string, label: string, exercises: number): UnscheduledWorkoutEntry {
  return { ...planned(id, TODAY, label, exercises), dateKey: null };
}

/** Mon's plan was done, Tue's slid past, Thu and Sat are ahead, two ideas wait in the tray. */
const WEEK: Array<ScheduledWorkoutEntry | UnscheduledWorkoutEntry> = [
  planned("push-mon", "2026-11-09", "Push day", 5),
  planned("leg", "2026-11-10", "Leg day", 4),
  planned("push", "2026-11-12", "Push day", 5),
  planned("pull", "2026-11-14", "Pull day", 5),
  unscheduled("mob", "Mobility", 0),
  unscheduled("left", "Face pull + lateral raise", 2),
];

const SESSIONS: SessionSummary[] = [
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

type DemoProps = {
  entries: Array<ScheduledWorkoutEntry | UnscheduledWorkoutEntry>;
  sessions: SessionSummary[];
  /** Start with this card picked up by its handle. */
  pickedId?: string;
  /** Start with the move sheet open for this card. */
  sheetFor?: string;
};

/** The board with local state: tap a handle, tap a day, or tap a card for the move sheet. */
function BoardDemo({ entries: initial, sessions, pickedId, sheetFor }: DemoProps) {
  const [entries, setEntries] = useState(initial);
  const dated = entries.filter((e): e is ScheduledWorkoutEntry => e.dateKey !== null);
  const tray = entries
    .filter((e): e is UnscheduledWorkoutEntry => e.dateKey === null)
    .map((e) => toBoardCard(e, TODAY));
  const board = buildWeekBoard({
    weekStartKey: TODAY,
    todayKey: TODAY,
    scheduled: dated,
    sessions,
    activities: [],
    weeklyGoal: 3,
  });
  const cards = [...board.days.flatMap((d) => d.cards), ...tray];
  const [picked, setPicked] = useState<BoardCard | null>(cards.find((c) => c.id === pickedId) ?? null);
  const [sheetCard, setSheetCard] = useState<BoardCard | null>(cards.find((c) => c.id === sheetFor) ?? null);
  const apply = (moves: ScheduledWorkoutMove[]) =>
    setEntries((prev) =>
      prev.map((e) => {
        const move = moves.find((m) => m.id === e.id);
        return move ? ({ ...e, dateKey: move.dateKey } as (typeof prev)[number]) : e;
      }),
    );
  return (
    <>
      <WeekBoard
        board={board}
        tray={tray}
        todayKey={TODAY}
        picked={picked}
        onPick={setPicked}
        onDrop={(day) => {
          if (picked) apply(movesForDrop(day, picked, TODAY));
          setPicked(null);
        }}
        onDropInTray={() => {
          if (picked) apply([{ id: picked.id, dateKey: null }]);
          setPicked(null);
        }}
        onOpenCard={setSheetCard}
        onPlanDay={() => {}}
        onPrev={() => {}}
        onNext={() => {}}
      />
      {/* In Storybook nothing is signed in, so the sheet's own writes are no-ops. */}
      <MoveSheet
        open={sheetCard !== null}
        onOpenChange={(open) => !open && setSheetCard(null)}
        card={sheetCard}
        todayKey={TODAY}
        movable={movableEntries(dated, TODAY, workoutDayKeys(sessions))}
      />
    </>
  );
}

const meta = {
  title: "Planner/Week board",
  component: BoardDemo,
  args: { entries: WEEK, sessions: SESSIONS },
  parameters: {
    docs: {
      description: {
        component:
          "Week view of the planner. Tap a card's handle, then tap a day: Move (empty day), Swap (both upcoming) or Add (a missed or unscheduled card joins the day). Tap a card itself for the move sheet.",
      },
    },
  },
} satisfies Meta<typeof BoardDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TryIt: Story = { name: "Try it" };

export const MovingUpcoming: Story = {
  name: "Moving an upcoming workout (Move / Swap)",
  args: { pickedId: "push" },
};

export const MovingFromTray: Story = {
  name: "Moving from Unscheduled (Move / Add)",
  args: { pickedId: "left" },
};

export const MovingMissed: Story = {
  name: "Moving a missed workout (Add, never Swap)",
  args: { pickedId: "leg" },
};

export const EmptyWeek: Story = {
  name: "Empty week (new user)",
  args: { entries: [], sessions: [] },
};

export const SheetMissed: Story = {
  name: "Move sheet · missed (Pick up from today)",
  args: { sheetFor: "leg" },
};

export const SheetUpcoming: Story = {
  name: "Move sheet · upcoming (Push the week back)",
  args: { sheetFor: "push" },
};

export const SheetUnscheduled: Story = {
  name: "Move sheet · from Unscheduled",
  args: { sheetFor: "left" },
};
