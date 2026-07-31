import { getActivityTypeById } from "@/lib/activity-catalog";
import type { SavedActivity } from "@/lib/activity-types";
import {
  addDaysToDateKey,
  endOfWeekDateKey,
  monthDateRange,
  startOfWeekDateKey,
} from "@/lib/calendar-views";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";
import { todayDateKeyLocal } from "@/lib/calendar-month";
import type { CompletedSessionSummary } from "@/lib/workout-session-repository";

export type PlannerKindFilter =
  | "all"
  | "workouts"
  | "activities"
  | "planned"
  | "reminders"
  | "missed";

export type PlannerDatePreset =
  | "this_month"
  | "upcoming"
  | "history"
  | "this_week"
  | "custom"
  | "selected_day";

export type PlannerListItem =
  | {
      kind: "completed";
      id: string;
      dateKey: string;
      title: string;
      sortKey: string;
      planId: string | null;
      exerciseCount: number;
      setCount: number;
      previewNames: string[];
      endedAt: Date | null;
      startedAt: Date;
      timeLabel: string | null;
    }
  | {
      kind: "planned";
      id: string;
      dateKey: string;
      title: string;
      sortKey: string;
      planId: string | null;
      exerciseIds: string[];
      exerciseCount: number;
    }
  | {
      kind: "reminder";
      id: string;
      dateKey: string;
      title: string;
      sortKey: string;
    }
  | {
      kind: "activity";
      id: string;
      dateKey: string;
      title: string;
      sortKey: string;
      meta: string;
      icon: NonNullable<ReturnType<typeof getActivityTypeById>>["icon"];
      activityTypeId: string;
      timeLabel: string | null;
    };

export type PlannerDayMarkers = {
  hasWorkout: boolean;
  hasPlan: boolean;
  hasReminder: boolean;
  hasActivity: boolean;
};

export function buildPlannerListItems(
  sessions: CompletedSessionSummary[],
  scheduled: ScheduledWorkoutEntry[],
  activities: SavedActivity[],
): PlannerListItem[] {
  const items: PlannerListItem[] = [];

  for (const s of sessions) {
    if (!s.workoutDate) continue;
    const time = s.workoutTime;
    items.push({
      kind: "completed",
      id: s.id,
      dateKey: s.workoutDate,
      title: s.title,
      sortKey: `${s.workoutDate}T${time ?? "99:99"}-${(s.endedAt ?? s.startedAt).getTime()}`,
      planId: s.planId,
      exerciseCount: s.exerciseCount,
      setCount: s.setCount,
      previewNames: s.previewExerciseNames,
      endedAt: s.endedAt,
      startedAt: s.startedAt,
      timeLabel: time,
    });
  }

  for (const e of scheduled) {
    if (e.exerciseIds.length === 0) {
      items.push({
        kind: "reminder",
        id: e.id,
        dateKey: e.dateKey,
        title: e.label,
        sortKey: `${e.dateKey}T50:00-${e.createdAt.getTime()}`,
      });
    } else {
      items.push({
        kind: "planned",
        id: e.id,
        dateKey: e.dateKey,
        title: e.label,
        sortKey: `${e.dateKey}T40:00-${e.createdAt.getTime()}`,
        planId: e.planId,
        exerciseIds: e.exerciseIds,
        exerciseCount: e.exerciseIds.length,
      });
    }
  }

  for (const { id, activity } of activities) {
    const type = getActivityTypeById(activity.activityTypeId);
    const parts: string[] = [];
    if (activity.durationMin != null) parts.push(`${activity.durationMin} min`);
    if (activity.distanceMiles != null) {
      parts.push(`${activity.distanceMiles} mi`);
    }
    if (activity.locationName) parts.push(activity.locationName);
    items.push({
      kind: "activity",
      id,
      dateKey: activity.activityDate,
      title: type?.name ?? "Activity",
      sortKey: `${activity.activityDate}T${activity.activityTime ?? "99:99"}-${activity.createdAt.getTime()}`,
      meta: parts.length > 0 ? parts.join(" · ") : "Activity",
      icon: type?.icon ?? "activity",
      activityTypeId: activity.activityTypeId,
      timeLabel: activity.activityTime,
    });
  }

  return items;
}

export function markersByDate(
  items: PlannerListItem[],
): Map<string, PlannerDayMarkers> {
  const map = new Map<string, PlannerDayMarkers>();
  for (const item of items) {
    const cur = map.get(item.dateKey) ?? {
      hasWorkout: false,
      hasPlan: false,
      hasReminder: false,
      hasActivity: false,
    };
    if (item.kind === "completed") cur.hasWorkout = true;
    else if (item.kind === "planned") cur.hasPlan = true;
    else if (item.kind === "reminder") cur.hasReminder = true;
    else if (item.kind === "activity") cur.hasActivity = true;
    map.set(item.dateKey, cur);
  }
  return map;
}

export function resolveDateRange(options: {
  preset: PlannerDatePreset;
  todayKey: string;
  viewYear: number;
  viewMonthIndex: number;
  selectedDateKey: string | null;
  customFrom: string;
  customTo: string;
}): { startKey: string; endKey: string } {
  const {
    preset,
    todayKey,
    viewYear,
    viewMonthIndex,
    selectedDateKey,
    customFrom,
    customTo,
  } = options;

  if (preset === "selected_day" && selectedDateKey) {
    return { startKey: selectedDateKey, endKey: selectedDateKey };
  }

  if (preset === "this_week") {
    const anchor = selectedDateKey ?? todayKey;
    return {
      startKey: startOfWeekDateKey(anchor),
      endKey: endOfWeekDateKey(anchor),
    };
  }

  if (preset === "upcoming") {
    return {
      startKey: todayKey,
      endKey: addDaysToDateKey(todayKey, 365),
    };
  }

  if (preset === "history") {
    return {
      startKey: addDaysToDateKey(todayKey, -730),
      endKey: addDaysToDateKey(todayKey, -1),
    };
  }

  if (preset === "custom") {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(customFrom) ? customFrom : todayKey;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(customTo) ? customTo : todayKey;
    return from <= to
      ? { startKey: from, endKey: to }
      : { startKey: to, endKey: from };
  }

  // this_month (default): calendar month currently in view
  return monthDateRange(viewYear, viewMonthIndex);
}

function isMissed(
  item: PlannerListItem,
  todayKey: string,
  workoutDates: Set<string>,
): boolean {
  if (item.kind !== "planned" && item.kind !== "reminder") return false;
  if (item.dateKey >= todayKey) return false;
  return !workoutDates.has(item.dateKey);
}

export function filterPlannerListItems(
  items: PlannerListItem[],
  options: {
    kind: PlannerKindFilter;
    search: string;
    startKey: string;
    endKey: string;
    todayKey?: string;
    activityTypeId?: string | null;
    planId?: string | null;
  },
): PlannerListItem[] {
  const todayKey = options.todayKey ?? todayDateKeyLocal();
  const q = options.search.trim().toLowerCase();
  const workoutDates = new Set(
    items.filter((i) => i.kind === "completed").map((i) => i.dateKey),
  );

  const filtered = items.filter((item) => {
    if (item.dateKey < options.startKey || item.dateKey > options.endKey) {
      return false;
    }

    if (options.kind === "workouts" && item.kind !== "completed") return false;
    if (options.kind === "activities" && item.kind !== "activity") return false;
    if (options.kind === "planned" && item.kind !== "planned") return false;
    if (options.kind === "reminders" && item.kind !== "reminder") return false;
    if (options.kind === "missed" && !isMissed(item, todayKey, workoutDates)) {
      return false;
    }

    if (options.activityTypeId) {
      if (item.kind !== "activity") return false;
      if (item.activityTypeId !== options.activityTypeId) return false;
    }

    if (options.planId) {
      if (item.kind === "planned" && item.planId === options.planId) {
        // match
      } else if (item.kind === "completed" && item.planId === options.planId) {
        // match
      } else {
        return false;
      }
    }

    if (q) {
      const hay = [item.title];
      if (item.kind === "activity") {
        hay.push(item.meta);
      }
      if (item.kind === "completed") {
        hay.push(...item.previewNames);
      }
      if (!hay.some((h) => h.toLowerCase().includes(q))) return false;
    }

    return true;
  });

  // Upcoming: soonest first. History: newest first. Mixed ranges: chronological ascending.
  const historyOnly = options.endKey < todayKey;
  const upcomingOnly = options.startKey >= todayKey;

  return [...filtered].sort((a, b) => {
    if (a.dateKey !== b.dateKey) {
      if (historyOnly) return b.dateKey.localeCompare(a.dateKey);
      if (upcomingOnly) return a.dateKey.localeCompare(b.dateKey);
      return a.dateKey.localeCompare(b.dateKey);
    }
    if (historyOnly) return b.sortKey.localeCompare(a.sortKey);
    return a.sortKey.localeCompare(b.sortKey);
  });
}

export function buildWorkoutHref(
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

export function formatPlannerDayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export function formatPlannerGroupLabel(
  dateKey: string,
  todayKey: string,
): string {
  if (dateKey === todayKey) return "Today";
  if (dateKey === addDaysToDateKey(todayKey, 1)) return "Tomorrow";
  if (dateKey === addDaysToDateKey(todayKey, -1)) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function nextEmptyPlanDay(
  todayKey: string,
  markers: Map<string, PlannerDayMarkers>,
  withinDays = 7,
): string {
  for (let i = 0; i < withinDays; i++) {
    const key = addDaysToDateKey(todayKey, i);
    const m = markers.get(key);
    if (!m?.hasPlan && !m?.hasReminder) return key;
  }
  return addDaysToDateKey(todayKey, 1);
}
