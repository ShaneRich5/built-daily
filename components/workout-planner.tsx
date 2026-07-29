"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildMonthCalendarGrid,
  formatMonthHeading,
  todayDateKeyLocal,
  WEEKDAY_LABELS_SHORT,
} from "@/lib/calendar-month";
import {
  addScheduledWorkout,
  deleteScheduledWorkout,
  subscribeScheduledWorkoutsForYear,
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
import { formatSessionVolumeMeta } from "@/lib/workout-date";

function buildWorkoutHref(
  title: string,
  planId: string | null,
  exerciseIds: string[],
): string | null {
  if (exerciseIds.length === 0) return null;
  const params = new URLSearchParams();
  params.set("e", exerciseIds.join(","));
  const t = title.trim().slice(0, 200);
  if (t) params.set("t", t);
  if (planId) params.set("p", planId);
  return `/workout?${params.toString()}`;
}

function parseDateKeyToLocalDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatDayHeading(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateKeyToLocalDate(dateKey));
}

function formatSessionTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

type PlanPickerValue = "" | `tpl:${string}` | `starter:${string}`;

export function WorkoutPlanner() {
  const { user, loading, firebaseReady } = useAuth();
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    todayDateKeyLocal(),
  );

  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledWorkoutEntry[]>([]);
  const [plans, setPlans] = useState<SavedWorkoutPlan[]>([]);

  const [planPick, setPlanPick] = useState<PlanPickerValue>("");
  const [reminderLabel, setReminderLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const todayKey = todayDateKeyLocal();

  const cells = useMemo(
    () => buildMonthCalendarGrid(viewYear, viewMonthIndex, todayKey),
    [viewYear, viewMonthIndex, todayKey],
  );

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setPlans([]);
      };
    }
    const unsub = subscribeUserWorkoutPlans(setPlans);
    return () => {
      unsub();
      setPlans([]);
    };
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setSessions([]);
      };
    }
    const unsub = subscribeRecentCompletedSessions(setSessions, {
      maxDocs: 400,
    });
    return () => {
      unsub();
      setSessions([]);
    };
  }, [user, firebaseReady]);

  useEffect(() => {
    if (!user || !firebaseReady) {
      return () => {
        setScheduled([]);
      };
    }
    const unsub = subscribeScheduledWorkoutsForYear(viewYear, setScheduled);
    return () => {
      unsub();
      setScheduled([]);
    };
  }, [user, firebaseReady, viewYear]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, CompletedSessionSummary[]>();
    for (const s of sessions) {
      if (!s.workoutDate) continue;
      const list = map.get(s.workoutDate);
      if (list) list.push(s);
      else map.set(s.workoutDate, [s]);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (b.endedAt ?? b.startedAt).getTime() -
          (a.endedAt ?? a.startedAt).getTime(),
      );
    }
    return map;
  }, [sessions]);

  const scheduledByDate = useMemo(() => {
    const map = new Map<string, ScheduledWorkoutEntry[]>();
    for (const e of scheduled) {
      const list = map.get(e.dateKey);
      if (list) list.push(e);
      else map.set(e.dateKey, [e]);
    }
    return map;
  }, [scheduled]);

  const goPrevMonth = useCallback(() => {
    setViewMonthIndex((m) => {
      if (m > 0) return m - 1;
      setViewYear((y) => y - 1);
      return 11;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonthIndex((m) => {
      if (m < 11) return m + 1;
      setViewYear((y) => y + 1);
      return 0;
    });
  }, []);

  const goThisMonth = useCallback(() => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonthIndex(t.getMonth());
    setSelectedDateKey(todayDateKeyLocal());
  }, []);

  const handleAddToCalendar = useCallback(async () => {
    if (!selectedDateKey || !user || !firebaseReady) return;

    const trimmedReminder = reminderLabel.trim();
    if (planPick === "") {
      if (!trimmedReminder) return;
      setAdding(true);
      try {
        await addScheduledWorkout({
          dateKey: selectedDateKey,
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
          dateKey: selectedDateKey,
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
          dateKey: selectedDateKey,
          label: def.name,
          planId: def.id,
          exerciseIds: [...def.exerciseIds],
        });
        setPlanPick("");
      } finally {
        setAdding(false);
      }
    }
  }, [selectedDateKey, user, firebaseReady, planPick, plans, reminderLabel]);

  const handleRemoveScheduled = useCallback(async (entryId: string) => {
    if (!window.confirm("Remove this scheduled workout from the calendar?")) {
      return;
    }
    await deleteScheduledWorkout(entryId);
  }, []);

  const selectedSessions =
    selectedDateKey != null ? (sessionsByDate.get(selectedDateKey) ?? []) : [];
  const selectedScheduled =
    selectedDateKey != null ? (scheduledByDate.get(selectedDateKey) ?? []) : [];

  const signedInReady = Boolean(user && firebaseReady);

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
          See completed workouts by day and drop planned sessions on your
          calendar. Scheduled rows with exercises include a quick link to start
          a live session.
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
          <p>Sign in to load your workout history and scheduled sessions.</p>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm font-semibold text-zinc-900 underline dark:text-zinc-100"
          >
            Sign in
          </Link>
        </div>
      ) : null}

      <section
        className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:p-4"
        aria-labelledby="planner-cal-heading"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="planner-cal-heading" className="sr-only">
            Month calendar
          </h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goPrevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={goNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {formatMonthHeading(viewYear, viewMonthIndex)}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 text-xs"
            onClick={goThisMonth}
          >
            Today
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs">
          {WEEKDAY_LABELS_SHORT.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const daySessions = sessionsByDate.get(cell.dateKey) ?? [];
            const dayScheduled = scheduledByDate.get(cell.dateKey) ?? [];
            const hasLog = daySessions.length > 0;
            const hasPlan = dayScheduled.some((e) => e.exerciseIds.length > 0);
            const hasNote = dayScheduled.some((e) => e.exerciseIds.length === 0);
            const selected = selectedDateKey === cell.dateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`flex min-h-[44px] flex-col items-center justify-start rounded-lg border px-0.5 py-1 text-xs transition sm:min-h-[52px] ${
                  selected
                    ? "border-zinc-900 bg-zinc-100 ring-2 ring-zinc-900/20 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-100/20"
                    : "border-transparent bg-zinc-50/80 hover:border-zinc-200 dark:bg-zinc-900/40 dark:hover:border-zinc-700"
                } ${cell.isCurrentMonth ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500"}`}
              >
                <span
                  className={`text-[11px] font-semibold tabular-nums sm:text-sm ${
                    cell.isToday ? "text-emerald-700 dark:text-emerald-400" : ""
                  }`}
                >
                  {cell.dayOfMonth}
                </span>
                <span className="mt-0.5 flex h-3 items-center justify-center gap-0.5">
                  {hasLog ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                      title="Logged workout"
                    />
                  ) : null}
                  {hasPlan ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full border border-sky-500 bg-sky-100 dark:bg-sky-950"
                      title="Scheduled session"
                    />
                  ) : null}
                  {hasNote && !hasPlan ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600"
                      title="Reminder"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {user && firebaseReady ? (
        <section
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          aria-labelledby="day-detail-heading"
        >
          <h2
            id="day-detail-heading"
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {selectedDateKey ? formatDayHeading(selectedDateKey) : "Pick a day"}
          </h2>

          {selectedDateKey ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Logged
                </p>
                {selectedSessions.length === 0 ? (
                  <p className="text-sm text-zinc-500">No completed workout.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedSessions.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/sessions/${s.id}`}
                          className="block rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm transition hover:border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {s.title}
                            </p>
                            <time
                              className="shrink-0 text-xs tabular-nums text-zinc-500"
                              dateTime={(s.endedAt ?? s.startedAt).toISOString()}
                            >
                              {formatSessionTime(s.endedAt ?? s.startedAt)}
                            </time>
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {formatSessionVolumeMeta(
                              s.exerciseCount,
                              s.setCount,
                              s.status,
                            )}
                            {s.previewExerciseNames.length > 0
                              ? ` · ${s.previewExerciseNames.slice(0, 3).join(", ")}`
                              : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Scheduled
                </p>
                {selectedScheduled.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nothing planned.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedScheduled.map((e) => {
                      const href = buildWorkoutHref(
                        e.label,
                        e.planId,
                        e.exerciseIds,
                      );
                      return (
                        <li
                          key={e.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">
                              {e.label}
                            </p>
                            {e.exerciseIds.length === 0 ? (
                              <p className="text-xs text-zinc-500">Reminder</p>
                            ) : (
                              <p className="text-xs text-zinc-500">
                                {e.exerciseIds.length} exercise
                                {e.exerciseIds.length === 1 ? "" : "s"}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {href ? (
                              <Link
                                href={href}
                                className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-white dark:bg-zinc-50 dark:text-zinc-900"
                              >
                                Start
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void handleRemoveScheduled(e.id)}
                              className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Add to this day
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Template or starter
                    <select
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                      value={planPick}
                      onChange={(ev) =>
                        setPlanPick(ev.target.value as PlanPickerValue)
                      }
                    >
                      <option value="">Choose one (optional)</option>
                      <optgroup label="Your templates">
                        {plans.map((p) => (
                          <option key={p.id} value={`tpl:${p.id}`}>
                            {p.plan.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Starters">
                        {STARTER_TEMPLATE_DEFINITIONS.map((s) => (
                          <option key={s.id} value={`starter:${s.id}`}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Or reminder only
                    <Input
                      placeholder="e.g. Rest, walk, mobility"
                      value={reminderLabel}
                      onChange={(ev) => setReminderLabel(ev.target.value)}
                      maxLength={200}
                      className="h-11"
                    />
                  </label>
                  <Button
                    type="button"
                    className="h-11 w-full shrink-0 sm:w-auto"
                    disabled={
                      adding ||
                      !signedInReady ||
                      (planPick === "" && !reminderLabel.trim())
                    }
                    onClick={() => void handleAddToCalendar()}
                  >
                    {adding ? "Adding…" : "Add"}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  Pick a template or starter for a session you can start from here,
                  or enter a reminder without a Start link.
                </p>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
