"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import {
  addScheduledWorkout,
  copyLastWeekPlan,
  deleteScheduledWorkout,
  moveScheduledWorkouts,
  type CopyLastWeekResult,
  type ScheduledWorkoutMove,
} from "@/lib/planner-repository";
import { localDateKeyFromMs } from "@/lib/workout-date";
import { MoveSheet } from "@/features/planner/move-sheet";
import { PlanSheet } from "@/features/planner/plan-sheet";
import {
  agendaHeading,
  calendarDays,
  calendarTitle,
  dayAgenda,
  shiftAnchor,
  visibleRange,
  type PlannerView as View,
} from "@/features/planner/planner-model";
import { PlannerView } from "@/features/planner/planner-view";
import { usePlannerData } from "@/features/planner/use-planner-data";
import {
  buildWeekBoard,
  movableEntries,
  movesForDrop,
  toBoardCard,
  workoutDayKeys,
  type BoardCard,
} from "@/features/planner/week-board-model";

async function applyMoves(moves: ScheduledWorkoutMove[]) {
  if (moves.length === 0) return;
  const ok = await moveScheduledWorkouts(moves).catch(() => false);
  if (!ok) window.alert("Couldn’t move that. Check your connection and try again.");
}

function copyMessage(result: CopyLastWeekResult | null): string {
  if (!result) return "Couldn’t copy last week’s plan.";
  if (result.added === 0 && result.skippedExisting === 0) return "Last week had nothing to copy.";
  if (result.added === 0) return "This week is already planned.";
  const added = `Added ${result.added} workout${result.added === 1 ? "" : "s"}`;
  return result.skippedExisting > 0
    ? `${added} · ${result.skippedExisting} day${result.skippedExisting === 1 ? "" : "s"} already planned`
    : added;
}

export function PlannerScreen() {
  const [todayKey] = useState(() => localDateKeyFromMs(Date.now()));
  const [view, setView] = useState<View>("week");
  const [anchorKey, setAnchorKey] = useState(todayKey);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [planOpen, setPlanOpen] = useState(false);
  const [planKey, setPlanKey] = useState(0);
  const [planDayKey, setPlanDayKey] = useState(todayKey);
  /** Week board: the card picked up by its handle, waiting for a day. */
  const [picked, setPicked] = useState<BoardCard | null>(null);
  const [moveCard, setMoveCard] = useState<BoardCard | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [copyState, setCopyState] = useState<{ busy: boolean; message: string | null }>({
    busy: false,
    message: null,
  });

  const range = useMemo(() => visibleRange(view, anchorKey), [view, anchorKey]);
  const data = usePlannerData(range, todayKey);
  const { signedIn, plans, items, markers } = data;

  const board = useMemo(
    () =>
      buildWeekBoard({
        weekStartKey: anchorKey,
        todayKey,
        scheduled: data.scheduled,
        sessions: data.sessions,
        activities: data.activities,
        weeklyGoal: data.weeklyGoal,
      }),
    [anchorKey, todayKey, data.scheduled, data.sessions, data.activities, data.weeklyGoal],
  );
  const tray = useMemo(
    () => data.unscheduled.map((entry) => toBoardCard(entry, todayKey)),
    [data.unscheduled, todayKey],
  );
  const movable = useMemo(
    () => movableEntries(data.openNearby, todayKey, workoutDayKeys(data.sessions)),
    [data.openNearby, todayKey, data.sessions],
  );

  const days = useMemo(
    () => calendarDays(view, anchorKey, todayKey, markers),
    [view, anchorKey, todayKey, markers],
  );
  const agenda = useMemo(() => dayAgenda(items, selectedKey), [items, selectedKey]);
  const templates = useMemo(() => {
    const uses = new Map<string, number>();
    for (const item of items) {
      if (item.kind === "completed" && item.planId) uses.set(item.planId, (uses.get(item.planId) ?? 0) + 1);
    }
    return plans.map(({ id, plan }) => {
      const n = plan.lines.length;
      const used = uses.get(id) ?? 0;
      return {
        id,
        name: plan.name,
        meta: `${n} exercise${n === 1 ? "" : "s"}${used > 0 ? ` · used ${used} time${used === 1 ? "" : "s"}` : ""}`,
      };
    });
  }, [plans, items]);

  if (!signedIn) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Planner</h1>
        <p className="text-sm text-zinc-500">
          <Link href="/login" className="font-semibold text-zinc-900 underline dark:text-zinc-100">
            Sign in
          </Link>{" "}
          to plan your week.
        </p>
      </div>
    );
  }

  const changeView = (next: View) => {
    setView(next);
    setAnchorKey(selectedKey);
    setPicked(null);
  };

  const openPlanSheet = (dateKey: string) => {
    setPlanDayKey(dateKey);
    setPlanKey((k) => k + 1);
    setPlanOpen(true);
  };

  return (
    <>
      <PlannerView
        view={view}
        onViewChange={changeView}
        calendarTitle={calendarTitle(view, anchorKey)}
        days={days}
        selectedKey={selectedKey}
        onSelect={setSelectedKey}
        onPrev={() => setAnchorKey((key) => shiftAnchor(view, key, -1))}
        onNext={() => setAnchorKey((key) => shiftAnchor(view, key, 1))}
        agendaHeading={agendaHeading(selectedKey, todayKey)}
        agenda={agenda}
        canPlan={selectedKey >= todayKey}
        onPlan={() => openPlanSheet(view === "week" ? (selectedKey < todayKey ? todayKey : selectedKey) : selectedKey)}
        onLogActivity={() => setLogOpen(true)}
        onRemovePlanned={(id) => {
          if (window.confirm("Remove this from the calendar?")) void deleteScheduledWorkout(id);
        }}
        copyLastWeek={
          view === "week" && startOfWeekDateKey(anchorKey) === startOfWeekDateKey(todayKey)
            ? {
                ...copyState,
                onCopy: () => {
                  setCopyState({ busy: true, message: null });
                  void copyLastWeekPlan(startOfWeekDateKey(todayKey))
                    .catch(() => null)
                    .then((result) => setCopyState({ busy: false, message: copyMessage(result) }));
                },
              }
            : null
        }
        templates={templates}
        board={
          view === "week"
            ? {
                board,
                tray,
                todayKey,
                picked,
                onPick: setPicked,
                onDrop: (day) => {
                  if (!picked) return;
                  const moves = movesForDrop(day, picked, todayKey);
                  setPicked(null);
                  void applyMoves(moves);
                },
                onDropInTray: () => {
                  if (!picked) return;
                  setPicked(null);
                  void applyMoves([{ id: picked.id, dateKey: null }]);
                },
                onOpenCard: (card) => {
                  setPicked(null);
                  setMoveCard(card);
                  setMoveOpen(true);
                },
                onPlanDay: openPlanSheet,
                onPrev: () => setAnchorKey((key) => shiftAnchor("week", key, -1)),
                onNext: () => setAnchorKey((key) => shiftAnchor("week", key, 1)),
              }
            : null
        }
      />
      <MoveSheet
        open={moveOpen}
        onOpenChange={setMoveOpen}
        card={moveCard}
        todayKey={todayKey}
        movable={movable}
      />
      <PlanSheet
        key={planKey}
        open={planOpen}
        onOpenChange={setPlanOpen}
        todayKey={todayKey}
        initialDateKey={planDayKey}
        plans={plans}
        onPlan={async (input) => {
          const id = await addScheduledWorkout(input);
          if (!id) {
            window.alert("Couldn’t add that to the calendar. Check that you’re signed in.");
            return;
          }
          if (input.dateKey) setSelectedKey(input.dateKey);
        }}
      />
      <LogActivitySheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        defaultDateKey={selectedKey <= todayKey ? selectedKey : todayKey}
      />
    </>
  );
}
