"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { LogActivitySheet } from "@/components/log-activity-sheet";
import { PlannerCalendar } from "@/components/planner/planner-calendar";
import { PlannerFilters } from "@/components/planner/planner-filters";
import {
  PlannerScheduleForm,
  type PlanPickerValue,
} from "@/components/planner/planner-schedule-form";
import { PlannerWorkoutList } from "@/components/planner/planner-workout-list";
import { subscribeRecentActivities } from "@/lib/activity-repository";
import type { SavedActivity } from "@/lib/activity-types";
import {
  buildMonthCalendarGrid,
  formatMonthHeading,
  todayDateKeyLocal,
} from "@/lib/calendar-month";
import {
  addDaysToDateKey,
  buildThreeMonthBlocks,
  buildWeekCalendarCells,
  endOfWeekDateKey,
  shiftMonth,
  startOfWeekDateKey,
  subscriptionRangeAroundMonth,
  threeMonthDateRange,
  type PlannerCalendarView,
} from "@/lib/calendar-views";
import {
  buildPlannerListItems,
  filterPlannerListItems,
  markersByDate,
  nextEmptyPlanDay,
  resolveDateRange,
  type PlannerDatePreset,
  type PlannerKindFilter,
} from "@/lib/planner-list-items";
import {
  addScheduledWorkout,
  deleteScheduledWorkout,
  subscribeScheduledWorkoutsInRange,
} from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import { STARTER_TEMPLATE_DEFINITIONS } from "@/lib/starter-templates";
import {
  subscribeRecentCompletedSessions,
  type CompletedSessionSummary,
} from "@/lib/workout-session-repository";
import {
  subscribeUserWorkoutPlans,
  type SavedWorkoutPlan,
} from "@/lib/workout-plan-repository";

const LS_VISIBLE = "built-daily-planner-calendar-visible";
const LS_VIEW = "built-daily-planner-calendar-view";

function readStoredVisible(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(LS_VISIBLE);
  if (v === null) return true;
  return v !== "0";
}

function readStoredView(): PlannerCalendarView {
  if (typeof window === "undefined") return "month";
  const v = window.localStorage.getItem(LS_VIEW);
  if (v === "week" || v === "month" || v === "three_months") return v;
  return "month";
}

export function WorkoutPlanner() {
  const { user, loading, firebaseReady } = useAuth();
  const now = useMemo(() => new Date(), []);
  const todayKey = todayDateKeyLocal();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(now.getMonth());
  const [weekAnchorKey, setWeekAnchorKey] = useState(todayKey);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    todayKey,
  );
  const [scheduleDateKey, setScheduleDateKey] = useState(todayKey);

  const [calendarVisible, setCalendarVisible] = useState(true);
  const [calendarView, setCalendarView] =
    useState<PlannerCalendarView>("month");
  const [prefsReady, setPrefsReady] = useState(false);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<PlannerKindFilter>("all");
  const [datePreset, setDatePreset] =
    useState<PlannerDatePreset>("this_month");
  const [customFrom, setCustomFrom] = useState(todayKey);
  const [customTo, setCustomTo] = useState(todayKey);
  const [prevPreset, setPrevPreset] =
    useState<PlannerDatePreset>("this_month");

  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledWorkoutEntry[]>([]);
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [plans, setPlans] = useState<SavedWorkoutPlan[]>([]);

  const [planPick, setPlanPick] = useState<PlanPickerValue>("");
  const [reminderLabel, setReminderLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [logActivityOpen, setLogActivityOpen] = useState(false);

  useEffect(() => {
    setCalendarVisible(readStoredVisible());
    setCalendarView(readStoredView());
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    window.localStorage.setItem(LS_VISIBLE, calendarVisible ? "1" : "0");
  }, [calendarVisible, prefsReady]);

  useEffect(() => {
    if (!prefsReady) return;
    window.localStorage.setItem(LS_VIEW, calendarView);
  }, [calendarView, prefsReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setPlans([]);
      return;
    }
    return subscribeUserWorkoutPlans(setPlans);
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setSessions([]);
      return;
    }
    return subscribeRecentCompletedSessions(setSessions, { maxDocs: 500 });
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setActivities([]);
      return;
    }
    return subscribeRecentActivities(setActivities, { maxDocs: 400 });
  }, [user, firebaseReady]);

  const scheduledSubRange = useMemo(() => {
    if (datePreset === "upcoming") {
      return {
        startKey: todayKey,
        endKey: addDaysToDateKey(todayKey, 400),
      };
    }
    if (datePreset === "history") {
      return {
        startKey: addDaysToDateKey(todayKey, -400),
        endKey: todayKey,
      };
    }
    if (calendarView === "three_months") {
      const span = threeMonthDateRange(viewYear, viewMonthIndex);
      return {
        startKey: addDaysToDateKey(span.startKey, -40),
        endKey: addDaysToDateKey(span.endKey, 40),
      };
    }
    if (calendarView === "week") {
      return {
        startKey: addDaysToDateKey(startOfWeekDateKey(weekAnchorKey), -60),
        endKey: addDaysToDateKey(endOfWeekDateKey(weekAnchorKey), 120),
      };
    }
    return subscriptionRangeAroundMonth(viewYear, viewMonthIndex, 2, 6);
  }, [
    calendarView,
    datePreset,
    todayKey,
    viewMonthIndex,
    viewYear,
    weekAnchorKey,
  ]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      setScheduled([]);
      return;
    }
    return subscribeScheduledWorkoutsInRange(
      scheduledSubRange.startKey,
      scheduledSubRange.endKey,
      setScheduled,
    );
  }, [user, firebaseReady, scheduledSubRange.startKey, scheduledSubRange.endKey]);

  const allItems = useMemo(
    () => buildPlannerListItems(sessions, scheduled, activities),
    [sessions, scheduled, activities],
  );

  const dayMarkers = useMemo(() => markersByDate(allItems), [allItems]);

  const filterRange = useMemo(
    () =>
      resolveDateRange({
        preset: datePreset,
        todayKey,
        viewYear,
        viewMonthIndex,
        selectedDateKey,
        customFrom,
        customTo,
      }),
    [
      datePreset,
      todayKey,
      viewYear,
      viewMonthIndex,
      selectedDateKey,
      customFrom,
      customTo,
    ],
  );

  const filteredItems = useMemo(
    () =>
      filterPlannerListItems(allItems, {
        kind,
        search,
        startKey: filterRange.startKey,
        endKey: filterRange.endKey,
        todayKey,
      }),
    [allItems, kind, search, filterRange, todayKey],
  );

  const weekCells = useMemo(
    () => buildWeekCalendarCells(weekAnchorKey, todayKey),
    [weekAnchorKey, todayKey],
  );

  const monthCells = useMemo(
    () => buildMonthCalendarGrid(viewYear, viewMonthIndex, todayKey),
    [viewYear, viewMonthIndex, todayKey],
  );

  const threeMonthBlocks = useMemo(
    () => buildThreeMonthBlocks(viewYear, viewMonthIndex, todayKey),
    [viewYear, viewMonthIndex, todayKey],
  );

  const calendarHeading = useMemo(() => {
    if (calendarView === "week") {
      const start = startOfWeekDateKey(weekAnchorKey);
      const end = endOfWeekDateKey(weekAnchorKey);
      const fmt = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      });
      const [ys, ms, ds] = start.split("-").map(Number);
      const [ye, me, de] = end.split("-").map(Number);
      return `${fmt.format(new Date(ys, ms - 1, ds))} – ${fmt.format(new Date(ye, me - 1, de))}`;
    }
    if (calendarView === "three_months") {
      const third = shiftMonth(viewYear, viewMonthIndex, 2);
      return `${formatMonthHeading(viewYear, viewMonthIndex)} – ${formatMonthHeading(third.year, third.monthIndex)}`;
    }
    return formatMonthHeading(viewYear, viewMonthIndex);
  }, [calendarView, viewMonthIndex, viewYear, weekAnchorKey]);

  const goPrev = useCallback(() => {
    if (calendarView === "week") {
      setWeekAnchorKey((k) => addDaysToDateKey(k, -7));
      return;
    }
    const delta = calendarView === "three_months" ? -3 : -1;
    const next = shiftMonth(viewYear, viewMonthIndex, delta);
    setViewYear(next.year);
    setViewMonthIndex(next.monthIndex);
  }, [calendarView, viewMonthIndex, viewYear]);

  const goNext = useCallback(() => {
    if (calendarView === "week") {
      setWeekAnchorKey((k) => addDaysToDateKey(k, 7));
      return;
    }
    const delta = calendarView === "three_months" ? 3 : 1;
    const next = shiftMonth(viewYear, viewMonthIndex, delta);
    setViewYear(next.year);
    setViewMonthIndex(next.monthIndex);
  }, [calendarView, viewMonthIndex, viewYear]);

  const goToday = useCallback(() => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonthIndex(t.getMonth());
    setWeekAnchorKey(todayDateKeyLocal());
    setSelectedDateKey(todayDateKeyLocal());
    setScheduleDateKey(todayDateKeyLocal());
  }, []);

  const handleDatePresetChange = useCallback(
    (preset: PlannerDatePreset) => {
      setDatePreset(preset);
      if (preset !== "selected_day") setPrevPreset(preset);

      if (preset === "this_month") {
        const t = new Date();
        setViewYear(t.getFullYear());
        setViewMonthIndex(t.getMonth());
      } else if (preset === "this_week") {
        setWeekAnchorKey(todayKey);
        setCalendarView("week");
        setCalendarVisible(true);
      } else if (preset === "upcoming") {
        const t = new Date();
        setViewYear(t.getFullYear());
        setViewMonthIndex(t.getMonth());
      } else if (preset === "history") {
        const t = new Date();
        setViewYear(t.getFullYear());
        setViewMonthIndex(t.getMonth());
      } else if (preset === "custom") {
        setCustomFrom(todayKey);
        setCustomTo(addDaysToDateKey(todayKey, 30));
      }
    },
    [todayKey],
  );

  const handleSelectDate = useCallback(
    (dateKey: string) => {
      setSelectedDateKey(dateKey);
      setScheduleDateKey(dateKey);
      setPrevPreset(datePreset === "selected_day" ? prevPreset : datePreset);
      setDatePreset("selected_day");
      const [y, m] = dateKey.split("-").map(Number);
      setViewYear(y);
      setViewMonthIndex(m - 1);
      setWeekAnchorKey(dateKey);
    },
    [datePreset, prevPreset],
  );

  const handleClearSelectedDay = useCallback(() => {
    setDatePreset(prevPreset === "selected_day" ? "this_month" : prevPreset);
    setSelectedDateKey(todayKey);
  }, [prevPreset, todayKey]);

  const handleAddToCalendar = useCallback(async () => {
    if (!user || !firebaseReady) return;
    const dateKey = scheduleDateKey;

    const trimmedReminder = reminderLabel.trim();
    if (planPick === "") {
      if (!trimmedReminder) return;
      setAdding(true);
      try {
        await addScheduledWorkout({
          dateKey,
          label: trimmedReminder,
          planId: null,
          exerciseIds: [],
        });
        setReminderLabel("");
      } finally {
        setAdding(false);
      }
      return;
    }

    if (planPick.startsWith("tpl:")) {
      const id = planPick.slice(4);
      const p = plans.find((x) => x.id === id);
      if (!p) return;
      setAdding(true);
      try {
        await addScheduledWorkout({
          dateKey,
          label: p.plan.name,
          planId: id,
          exerciseIds: p.plan.lines.map((l) => l.exerciseId),
        });
        setPlanPick("");
      } finally {
        setAdding(false);
      }
      return;
    }

    if (planPick.startsWith("starter:")) {
      const id = planPick.slice("starter:".length);
      const def = STARTER_TEMPLATE_DEFINITIONS.find((s) => s.id === id);
      if (!def) return;
      setAdding(true);
      try {
        await addScheduledWorkout({
          dateKey,
          label: def.name,
          planId: def.id,
          exerciseIds: [...def.exerciseIds],
        });
        setPlanPick("");
      } finally {
        setAdding(false);
      }
    }
  }, [
    user,
    firebaseReady,
    scheduleDateKey,
    planPick,
    plans,
    reminderLabel,
  ]);

  const handleRemoveScheduled = useCallback(async (entryId: string) => {
    if (!window.confirm("Remove this scheduled workout from the calendar?")) {
      return;
    }
    await deleteScheduledWorkout(entryId);
  }, []);

  const signedInReady = Boolean(user && firebaseReady);
  const isFutureOrToday = scheduleDateKey >= todayKey;

  const emptyCopy = useMemo(() => {
    if (datePreset === "upcoming") {
      return {
        title: "Nothing upcoming",
        hint: "Schedule a template for today or this week to project your progress.",
      };
    }
    if (datePreset === "history") {
      return {
        title: "No history in this range",
        hint: "Completed workouts and activities will show up here.",
      };
    }
    return {
      title: "Nothing in this range",
      hint: "Try another filter, or plan a workout for a future day.",
    };
  }, [datePreset]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-zinc-500">Calendar</p>
          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Planner
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Browse workouts and activities, filter what you need, and plan
          sessions for today and ahead.
        </p>
      </header>

      {!firebaseReady ? (
        <p className="text-sm text-zinc-500">
          Add Firebase configuration to use the planner.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading account…</p>
      ) : !user ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <p>
            Sign in to load your workout history, activities, and scheduled
            sessions.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </div>
      ) : null}

      {signedInReady ? (
        <>
          <PlannerFilters
            search={search}
            onSearchChange={setSearch}
            datePreset={datePreset}
            onDatePresetChange={handleDatePresetChange}
            kind={kind}
            onKindChange={setKind}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            selectedDateKey={
              datePreset === "selected_day" ? selectedDateKey : null
            }
            onClearSelectedDay={handleClearSelectedDay}
          />

          <PlannerCalendar
            visible={calendarVisible}
            onVisibleChange={setCalendarVisible}
            view={calendarView}
            onViewChange={setCalendarView}
            heading={calendarHeading}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            selectedDateKey={selectedDateKey}
            onSelectDate={handleSelectDate}
            rangeStartKey={filterRange.startKey}
            rangeEndKey={filterRange.endKey}
            markersByDate={dayMarkers}
            cells={
              calendarView === "week"
                ? weekCells
                : calendarView === "month"
                  ? monthCells
                  : undefined
            }
            monthBlocks={
              calendarView === "three_months" ? threeMonthBlocks : undefined
            }
            compact={calendarView === "three_months"}
          />

          <PlannerScheduleForm
            dateKey={scheduleDateKey}
            isFutureOrToday={isFutureOrToday}
            plans={plans}
            adding={adding}
            disabled={!signedInReady}
            planPick={planPick}
            reminderLabel={reminderLabel}
            onPlanPickChange={setPlanPick}
            onReminderChange={setReminderLabel}
            onAdd={() => void handleAddToCalendar()}
            onPickTomorrow={() => {
              const key = addDaysToDateKey(todayKey, 1);
              setScheduleDateKey(key);
              handleSelectDate(key);
            }}
            onPickNextEmpty={() => {
              const key = nextEmptyPlanDay(todayKey, dayMarkers);
              setScheduleDateKey(key);
              handleSelectDate(key);
            }}
            onLogActivity={() => setLogActivityOpen(true)}
          />

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Browse
              </h2>
              <p className="text-xs text-zinc-500">
                {filteredItems.length} item
                {filteredItems.length === 1 ? "" : "s"}
              </p>
            </div>
            <PlannerWorkoutList
              items={filteredItems}
              todayKey={todayKey}
              emptyTitle={emptyCopy.title}
              emptyHint={emptyCopy.hint}
              onRemoveScheduled={(id) => void handleRemoveScheduled(id)}
            />
          </div>

          <LogActivitySheet
            open={logActivityOpen}
            onClose={() => setLogActivityOpen(false)}
            defaultDateKey={scheduleDateKey}
          />
        </>
      ) : null}
    </div>
  );
}
