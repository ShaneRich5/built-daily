/**
 * Pure builders that turn Firestore data into what the home screen shows.
 * Kept free of React and Firebase so Storybook can feed them directly.
 */
import { getActivityTypeById } from "@/lib/activity-catalog";
import type { SavedActivity } from "@/lib/activity-types";
import { addDaysToDateKey, startOfWeekDateKey } from "@/lib/calendar-views";
import { buildWorkoutHref } from "@/lib/planner-list-items";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import { goalWeekStreak, workoutsInWeek } from "@/lib/progress-insights";
import type { WeeklyGoalTarget } from "@/lib/progress-types";
import { activityByDayFromSessions } from "@/lib/workout-activity";
import { dateFromLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";
import type { SavedWorkoutPlan } from "@/lib/workout-plan-repository";
import type { SessionSummary } from "@/lib/workout-session-repository";

export type HomeTemplate = {
  id: string;
  name: string;
  meta: string;
  startHref: string | null;
  editHref: string;
};

export type HomeDayState = "workout" | "activity" | "planned" | "empty";

export type HomeWeekDay = {
  dateKey: string;
  weekday: string;
  dayOfMonth: number;
  isToday: boolean;
  isPast: boolean;
  state: HomeDayState;
  /** Screen-reader label, e.g. "Tue, Nov 10: Leg day planned". */
  label: string;
  /** A planned workout starts; any other day opens the planner. */
  href: string;
};

export type HomePlanned = {
  dateKey: string;
  label: string;
  dayLabel: string;
  startHref: string | null;
};

export type HomeInProgress = {
  id: string;
  title: string;
  meta: string;
  href: string;
};

export type HomeRecentItem = {
  id: string;
  kind: "workout" | "activity";
  title: string;
  meta: string;
  href: string;
};

export type HomeWeekGoal = { completed: number; target: number };

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "Thu, Nov 5" */
export function shortDayLabel(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** "today", "yesterday", "Thu" (within the past week), or "Oct 24". */
function relativeDayLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "today";
  if (dateKey === addDaysToDateKey(todayKey, -1)) return "yesterday";
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  if (dateKey >= addDaysToDateKey(todayKey, -6)) {
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

/** The calendar day a session belongs to: its workout date, else when it ended or started. */
export function sessionDayKey(s: SessionSummary): string {
  if (s.workoutDate) return s.workoutDate;
  const ms = s.status === "completed" && s.endedAt ? s.endedAt.getTime() : s.startedAt.getTime();
  return localDateKeyFromMs(ms);
}

/** Templates, most recently used first, each with a one-tap start link. */
export function buildHomeTemplates(
  plans: SavedWorkoutPlan[],
  sessions: SessionSummary[],
  todayKey: string,
): HomeTemplate[] {
  const lastUsed = new Map<string, string>();
  for (const s of sessions) {
    if (s.status !== "completed" || !s.planId) continue;
    const key = sessionDayKey(s);
    const prev = lastUsed.get(s.planId);
    if (!prev || key > prev) lastUsed.set(s.planId, key);
  }
  return [...plans]
    .sort((a, b) => {
      const la = lastUsed.get(a.id) ?? "";
      const lb = lastUsed.get(b.id) ?? "";
      if (la !== lb) return lb.localeCompare(la);
      return a.plan.name.localeCompare(b.plan.name);
    })
    .map(({ id, plan }) => {
      const last = lastUsed.get(id);
      const exercises = plural(plan.lines.length, "exercise");
      return {
        id,
        name: plan.name,
        meta: last ? `${exercises} · last done ${relativeDayLabel(last, todayKey)}` : exercises,
        startHref: buildWorkoutHref(
          plan.name,
          id,
          plan.lines.map((line) => line.exerciseId),
        ),
        editHref: `/templates/${id}`,
      };
    });
}

/** The newest workout still in progress, if any. */
export function pickInProgress(sessions: SessionSummary[]): HomeInProgress | null {
  const open = sessions
    .filter((s) => s.status === "in_progress")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
  if (!open) return null;
  const started = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(open.startedAt);
  const parts = [`Started ${started}`];
  if (open.exerciseCount > 0) {
    parts.push(plural(open.exerciseCount, "exercise"), plural(open.setCount, "set"));
  }
  return {
    id: open.id,
    title: open.title,
    meta: parts.join(" · "),
    href: `/workout?s=${encodeURIComponent(open.id)}`,
  };
}

/** The soonest planned workout from today on. */
export function pickNextPlanned(
  entries: ScheduledWorkoutEntry[],
  todayKey: string,
): HomePlanned | null {
  const next = entries
    .filter((e) => e.status === "planned" && e.dateKey >= todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0];
  if (!next) return null;
  return {
    dateKey: next.dateKey,
    label: next.label.trim() || "Workout",
    dayLabel: next.dateKey === todayKey ? "Today" : shortDayLabel(next.dateKey),
    startHref: buildWorkoutHref(next.label, next.planId, next.exerciseIds),
  };
}

function dayDetail(
  state: HomeDayState,
  planned: ScheduledWorkoutEntry | undefined,
  isPast: boolean,
): string {
  if (state === "workout") return "workout logged";
  if (state === "activity") return "activity logged";
  if (state === "planned") return `${planned?.label.trim() || "Workout"} planned`;
  return isPast ? "rest day" : "nothing planned";
}

/** Sun–Sat around today: what happened (or is planned) each day. */
export function buildHomeWeek(
  todayKey: string,
  sessions: SessionSummary[],
  activities: SavedActivity[],
  entries: ScheduledWorkoutEntry[],
): HomeWeekDay[] {
  const workoutDays = activityByDayFromSessions(sessions);
  const activityDays = new Set(activities.map((a) => a.activity.activityDate));
  const plannedByDay = new Map<string, ScheduledWorkoutEntry>();
  for (const e of entries) {
    if (e.status === "planned" && !plannedByDay.has(e.dateKey)) plannedByDay.set(e.dateKey, e);
  }

  const start = startOfWeekDateKey(todayKey);
  return Array.from({ length: 7 }, (_, i) => {
    const dateKey = addDaysToDateKey(start, i);
    const planned = plannedByDay.get(dateKey);
    const isPast = dateKey < todayKey;
    const state: HomeDayState = workoutDays.has(dateKey)
      ? "workout"
      : activityDays.has(dateKey)
        ? "activity"
        : planned
          ? "planned"
          : "empty";
    const startHref =
      state === "planned" && planned
        ? buildWorkoutHref(planned.label, planned.planId, planned.exerciseIds)
        : null;
    const isToday = dateKey === todayKey;
    return {
      dateKey,
      weekday: WEEKDAY_INITIALS[i] ?? "",
      dayOfMonth: dateFromLocalDateKey(dateKey)?.getDate() ?? 0,
      isToday,
      isPast,
      state,
      label: `${isToday ? "Today, " : ""}${shortDayLabel(dateKey)}: ${dayDetail(state, planned, isPast)}`,
      href: startHref ?? "/planner",
    };
  });
}

/** Finished workouts and logged activities, newest first. */
export function buildHomeRecent(
  sessions: SessionSummary[],
  activities: SavedActivity[],
  limit = 5,
): HomeRecentItem[] {
  const rows: Array<{ item: HomeRecentItem; sortKey: string }> = [];
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const dayKey = sessionDayKey(s);
    const parts = [shortDayLabel(dayKey)];
    if (s.exerciseCount > 0) {
      parts.push(plural(s.exerciseCount, "exercise"), plural(s.setCount, "set"));
    }
    rows.push({
      item: {
        id: s.id,
        kind: "workout",
        title: s.title,
        meta: parts.join(" · "),
        href: `/sessions/${s.id}`,
      },
      sortKey: `${dayKey}T${s.workoutTime ?? "99:99"}-${s.startedAt.getTime()}`,
    });
  }
  for (const { id, activity } of activities) {
    const type = getActivityTypeById(activity.activityTypeId);
    const parts = [shortDayLabel(activity.activityDate)];
    if (activity.durationMin != null) parts.push(`${activity.durationMin} min`);
    if (activity.distanceMiles != null) parts.push(`${activity.distanceMiles} mi`);
    rows.push({
      item: {
        id,
        kind: "activity",
        title: type?.name ?? "Activity",
        meta: parts.join(" · "),
        href: `/activities/${id}`,
      },
      sortKey: `${activity.activityDate}T${activity.activityTime ?? "99:99"}-${activity.createdAt.getTime()}`,
    });
  }
  return rows
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
    .slice(0, limit)
    .map((row) => row.item);
}

/** Completed workouts this Sun–Sat week against the weekly goal. */
export function buildWeekGoal(
  sessions: SessionSummary[],
  target: number,
  todayKey: string,
): HomeWeekGoal {
  const start = startOfWeekDateKey(todayKey);
  const end = addDaysToDateKey(start, 6);
  let completed = 0;
  for (const s of sessions) {
    if (s.status !== "completed") continue;
    const key = sessionDayKey(s);
    if (key >= start && key <= end) completed += 1;
  }
  return { completed, target };
}

/** "today", "tomorrow", "Thu", or "Thu, Nov 19" for a planned day. */
function plannedWhen(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "today";
  if (dateKey === addDaysToDateKey(todayKey, 1)) return "tomorrow";
  const label = shortDayLabel(dateKey);
  return dateKey <= addDaysToDateKey(todayKey, 6) ? (label.split(",")[0] ?? label) : label;
}

/** The start card's headline and one line under it. The weekly count lives in This week. */
export function startCopy(
  planned: HomePlanned | null,
  hasTemplates: boolean,
  todayKey: string,
): { headline: string; detail: string } {
  if (planned) {
    return {
      headline: "Ready when you are",
      detail: `${planned.label} is planned for ${plannedWhen(planned.dateKey, todayKey)}.`,
    };
  }
  return {
    headline: "Ready when you are",
    detail: hasTemplates ? "Pick a template or start empty." : "Start an empty workout, or make a template.",
  };
}

export type HomeChartDay = "workout" | "activity" | "rest" | "today" | "planned" | "ahead";

export type HomeChartWeek = {
  startKey: string;
  /** Sun–Sat. */
  days: HomeChartDay[];
  /** Finished weeks are hit or missed; this week is hit or still open. */
  goal: "hit" | "missed" | "open";
};

export type HomeConsistency = {
  /** Weeks in a row hitting the goal (this week counts once it's hit). */
  streak: number;
  longest: number;
  /** Oldest first, ending with this week. */
  weeks: HomeChartWeek[];
  /** Screen-reader summary of the chart. */
  label: string;
};

/** The goal streak plus a day-by-day grid of the last few weeks. */
export function buildHomeConsistency(
  todayKey: string,
  sessions: SessionSummary[],
  activities: SavedActivity[],
  entries: ScheduledWorkoutEntry[],
  weeklyGoal: WeeklyGoalTarget,
  weekCount = 16,
): HomeConsistency {
  const workoutDays = activityByDayFromSessions(sessions);
  const activityDays = new Set(activities.map((a) => a.activity.activityDate));
  const plannedDays = new Set(
    entries.filter((e) => e.status === "planned").map((e) => e.dateKey),
  );
  const { current, longest } = goalWeekStreak(workoutDays, weeklyGoal, todayKey);

  const thisWeekStart = startOfWeekDateKey(todayKey);
  const weeks: HomeChartWeek[] = [];
  for (let w = weekCount - 1; w >= 0; w--) {
    const startKey = addDaysToDateKey(thisWeekStart, -7 * w);
    const days = Array.from({ length: 7 }, (_, i): HomeChartDay => {
      const dateKey = addDaysToDateKey(startKey, i);
      if (workoutDays.has(dateKey)) return "workout";
      if (activityDays.has(dateKey)) return "activity";
      if (dateKey === todayKey) return "today";
      if (dateKey < todayKey) return "rest";
      return plannedDays.has(dateKey) ? "planned" : "ahead";
    });
    const hit = workoutsInWeek(workoutDays, startKey) >= weeklyGoal;
    weeks.push({ startKey, days, goal: hit ? "hit" : w === 0 ? "open" : "missed" });
  }

  const finished = weeks.slice(0, -1);
  const finishedHit = finished.filter((week) => week.goal === "hit").length;
  const label =
    `Last ${weekCount} weeks: goal hit in ${finishedHit} of ${finished.length} finished weeks. ` +
    `Current streak ${plural(current, "week")}, longest ${plural(longest, "week")}.`;

  return { streak: current, longest, weeks, label };
}

function moreWorkouts(n: number): string {
  if (n === 1) return "One more";
  if (n === 2) return "Two more";
  if (n === 3) return "Three more";
  return `${n} more`;
}

/** One encouraging line under the weekly count. Never talks about losing the streak. */
export function weekNudge(goal: HomeWeekGoal, streak: number, todayKey: string): string {
  const remaining = goal.target - goal.completed;
  if (remaining <= 0) {
    return streak > 1
      ? `Goal met. That's ${streak} weeks in a row.`
      : "Goal met this week. Anything extra is a bonus.";
  }
  const weekday = dateFromLocalDateKey(todayKey)?.getDay() ?? 0;
  const daysLeft = 7 - weekday; // including today; weeks end Saturday
  if (remaining > daysLeft) return "Every workout this week still counts.";
  const when = daysLeft === 1 ? "today" : "by Saturday";
  return streak > 0
    ? `${moreWorkouts(remaining)} ${when} makes it ${streak + 1} weeks in a row.`
    : `${moreWorkouts(remaining)} ${when} hits your weekly goal.`;
}
