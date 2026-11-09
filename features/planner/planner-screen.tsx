"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import {
  addScheduledWorkout,
  copyLastWeekPlan,
  deleteScheduledWorkout,
  type CopyLastWeekResult,
} from "@/lib/planner-repository";
import { localDateKeyFromMs } from "@/lib/workout-date";
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
  const [view, setView] = useState<View>("month");
  const [anchorKey, setAnchorKey] = useState(todayKey);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [planOpen, setPlanOpen] = useState(false);
  const [planKey, setPlanKey] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [copyState, setCopyState] = useState<{ busy: boolean; message: string | null }>({
    busy: false,
    message: null,
  });

  const range = useMemo(() => visibleRange(view, anchorKey), [view, anchorKey]);
  const { signedIn, plans, items, markers } = usePlannerData(range);

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
        onPlan={() => {
          setPlanKey((k) => k + 1);
          setPlanOpen(true);
        }}
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
      />
      <PlanSheet
        key={planKey}
        open={planOpen}
        onOpenChange={setPlanOpen}
        todayKey={todayKey}
        initialDateKey={selectedKey}
        plans={plans}
        onPlan={async (input) => {
          const id = await addScheduledWorkout(input);
          if (!id) {
            window.alert("Couldn’t add that to the calendar. Check that you’re signed in.");
            return;
          }
          setSelectedKey(input.dateKey);
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
