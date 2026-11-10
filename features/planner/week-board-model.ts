/**
 * Pure helpers for the week board: one row per day, an Unscheduled tray, and
 * the moves behind "tap a handle, tap a day". Kept free of React and Firebase
 * so Storybook can feed them directly.
 */
import type { SavedActivity } from "@/lib/activity-types";
import { getActivityTypeById } from "@/lib/activity-catalog";
import { addDaysToDateKey, endOfWeekDateKey, startOfWeekDateKey } from "@/lib/calendar-views";
import { buildWorkoutHref } from "@/lib/planner-list-items";
import type { ScheduledWorkoutMove } from "@/lib/planner-repository";
import type { ScheduledWorkoutEntry, UnscheduledWorkoutEntry } from "@/lib/planner-types";
import { dateFromLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";
import type { SessionSummary } from "@/lib/workout-session-repository";

/** A planned workout (or reminder) you can move. */
export type BoardCard = {
  id: string;
  title: string;
  meta: string;
  /** null = Unscheduled. */
  dateKey: string | null;
  planId: string | null;
  exerciseIds: string[];
  startHref: string | null;
  /** Planned for a day that has passed with no workout logged. */
  slid: boolean;
};

/** Something already logged that day. Not movable. */
export type BoardDone = {
  id: string;
  kind: "workout" | "activity";
  title: string;
  href: string;
};

export type BoardDay = {
  dateKey: string;
  /** "TUE" */
  dow: string;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  /** "Tue, Nov 10" */
  label: string;
  cards: BoardCard[];
  done: BoardDone[];
};

export type WeekBoard = {
  /** "Nov 8 – 14" */
  title: string;
  /** "1 done · 2 planned · goal 3" */
  subtitle: string;
  days: BoardDay[];
};

/** What tapping a day does while a card is picked up. */
export type BoardTarget = "Move" | "Swap" | "Add";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "Tue, Nov 10" */
export function shortDay(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
}

/** "Tue" */
function weekdayShort(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  return d ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d) : dateKey;
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  const da = dateFromLocalDateKey(a);
  const db = dateFromLocalDateKey(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/** The day a finished workout belongs to: its workout date, else when it ended. */
function sessionDay(s: SessionSummary): string {
  return s.workoutDate ?? localDateKeyFromMs((s.endedAt ?? s.startedAt).getTime());
}

/** Days with at least one finished workout. */
export function workoutDayKeys(sessions: SessionSummary[]): Set<string> {
  return new Set(sessions.filter((s) => s.status === "completed").map(sessionDay));
}

/** A planned entry as a movable card. */
export function toBoardCard(
  entry: ScheduledWorkoutEntry | UnscheduledWorkoutEntry,
  todayKey: string,
): BoardCard {
  const isWorkout = entry.exerciseIds.length > 0;
  const slid = entry.dateKey !== null && entry.dateKey < todayKey;
  const what = isWorkout
    ? plural(entry.exerciseIds.length, "exercise")
    : entry.dateKey === null
      ? "Idea"
      : "Reminder";
  return {
    id: entry.id,
    title: entry.label,
    meta: slid ? `Slid past · ${what}` : what,
    dateKey: entry.dateKey,
    planId: entry.planId,
    exerciseIds: entry.exerciseIds,
    startHref: buildWorkoutHref(entry.label, entry.planId, entry.exerciseIds),
    slid,
  };
}

/**
 * A planned day that has passed counts as done if any workout was logged that
 * day (showing up is what matters), so only real misses stay on the board.
 */
export function isMissed(
  entry: ScheduledWorkoutEntry,
  todayKey: string,
  workoutDays: Set<string>,
): boolean {
  return (
    entry.status === "planned" &&
    entry.dateKey < todayKey &&
    entry.exerciseIds.length > 0 &&
    !workoutDays.has(entry.dateKey)
  );
}

type BuildWeekBoardInput = {
  weekStartKey: string;
  todayKey: string;
  /** Open (status planned) entries for the week. */
  scheduled: ScheduledWorkoutEntry[];
  sessions: SessionSummary[];
  activities: SavedActivity[];
  weeklyGoal: number;
};

export function buildWeekBoard({
  weekStartKey,
  todayKey,
  scheduled,
  sessions,
  activities,
  weeklyGoal,
}: BuildWeekBoardInput): WeekBoard {
  const start = startOfWeekDateKey(weekStartKey);
  const end = endOfWeekDateKey(start);
  const workoutDays = workoutDayKeys(sessions);

  const days: BoardDay[] = Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDaysToDateKey(start, i);
    const isPast = dateKey < todayKey;
    const cards = scheduled
      .filter((e) => e.status === "planned" && e.dateKey === dateKey)
      // On past days only real misses stay; done days and old reminders drop off.
      .filter((e) => !isPast || isMissed(e, todayKey, workoutDays))
      .map((e) => toBoardCard(e, todayKey));
    const done: BoardDone[] = [
      ...sessions
        .filter((s) => s.status === "completed" && sessionDay(s) === dateKey)
        .map((s) => ({ id: s.id, kind: "workout" as const, title: s.title, href: `/sessions/${s.id}` })),
      ...activities
        .filter((a) => a.activity.activityDate === dateKey)
        .map(({ id, activity }) => ({
          id,
          kind: "activity" as const,
          title: getActivityTypeById(activity.activityTypeId)?.name ?? "Activity",
          href: `/activities/${id}`,
        })),
    ];
    return {
      dateKey,
      dow: weekdayShort(dateKey).toUpperCase(),
      dayOfMonth: dateFromLocalDateKey(dateKey)?.getDate() ?? 0,
      isToday: dateKey === todayKey,
      isPast,
      label: shortDay(dateKey),
      cards,
      done,
    };
  });

  const doneCount = days.reduce((n, d) => n + d.done.filter((x) => x.kind === "workout").length, 0);
  const plannedCount = days.reduce(
    (n, d) => n + d.cards.filter((c) => !c.slid && c.exerciseIds.length > 0).length,
    0,
  );
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const startDate = dateFromLocalDateKey(start);
  const endDate = dateFromLocalDateKey(end);
  const sameMonth = startDate && endDate && startDate.getMonth() === endDate.getMonth();
  const title =
    startDate && endDate
      ? `${fmt.format(startDate)} – ${sameMonth ? endDate.getDate() : fmt.format(endDate)}`
      : "";
  const subtitle = [
    doneCount > 0 ? `${doneCount} done` : null,
    `${plannedCount} planned`,
    `goal ${weeklyGoal}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return { title, subtitle, days };
}

/** What dropping the picked card on this day would do, or null if it can't go there. */
export function targetFor(day: BoardDay, picked: BoardCard, todayKey: string): BoardTarget | null {
  if (day.isPast || picked.dateKey === day.dateKey) return null;
  if (day.cards.length === 0) return "Move";
  // Swapping would push the other workout into the past, so a missed card just joins the day.
  const canSwap = picked.dateKey !== null && picked.dateKey >= todayKey;
  return canSwap ? "Swap" : "Add";
}

/** The writes for dropping `picked` on `day`. */
export function movesForDrop(day: BoardDay, picked: BoardCard, todayKey: string): ScheduledWorkoutMove[] {
  const target = targetFor(day, picked, todayKey);
  if (!target) return [];
  const moves: ScheduledWorkoutMove[] = [{ id: picked.id, dateKey: day.dateKey }];
  if (target === "Swap") {
    for (const card of day.cards) moves.push({ id: card.id, dateKey: picked.dateKey });
  }
  return moves;
}

/** "today", "tomorrow" or "Thu". */
function relativeWeekday(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "today";
  if (dateKey === addDaysToDateKey(todayKey, 1)) return "tomorrow";
  return weekdayShort(dateKey);
}

/** An open plan that can still move: upcoming, or missed (nothing logged that day). */
export type MovableEntry = { id: string; label: string; dateKey: string };

/**
 * "Push the rest of the week back": this card and everything still open after
 * it in its week slide later together. A missed card lands on today, and the
 * rest keep their spacing.
 */
export function pushBackPlan(
  card: BoardCard,
  movable: MovableEntry[],
  todayKey: string,
): { moves: ScheduledWorkoutMove[]; summary: string } | null {
  if (card.dateKey === null) return null;
  const from = card.dateKey;
  const shift = from < todayKey ? daysBetween(from, todayKey) : 1;
  const weekEnd = endOfWeekDateKey(from);
  const others = movable.filter((e) => e.id !== card.id && e.dateKey >= from && e.dateKey <= weekEnd);
  const affected = [{ id: card.id, label: card.title, dateKey: from }, ...others].sort((a, b) =>
    a.dateKey.localeCompare(b.dateKey),
  );
  const moves = affected.map((e) => ({ id: e.id, dateKey: addDaysToDateKey(e.dateKey, shift) }));
  const summary = affected
    .map((e) => `${e.label} → ${relativeWeekday(addDaysToDateKey(e.dateKey, shift), todayKey)}`)
    .join(", ");
  return { moves, summary };
}

/** Open plans that can still move: today or later, plus real misses. */
export function movableEntries(
  scheduled: ScheduledWorkoutEntry[],
  todayKey: string,
  workoutDays: Set<string>,
): MovableEntry[] {
  return scheduled
    .filter((e) => e.status === "planned")
    .filter((e) => e.dateKey >= todayKey || isMissed(e, todayKey, workoutDays))
    .map(({ id, label, dateKey }) => ({ id, label, dateKey }));
}

/** "Planned for Tue, Nov 10", "Planned for today", "Slid past Tue, Nov 10" or "Unscheduled". */
export function whenLabel(card: BoardCard, todayKey: string): string {
  if (card.dateKey === null) return "Unscheduled";
  if (card.dateKey === todayKey) return "Planned for today";
  if (card.dateKey < todayKey) return `Slid past ${shortDay(card.dateKey)}`;
  return `Planned for ${shortDay(card.dateKey)}`;
}
