/** Pure helpers for the planner: calendar cells, the selected day's agenda, date ranges. */
import { buildMonthCalendarGrid } from "@/lib/calendar-month";
import {
  addDaysToDateKey,
  buildWeekCalendarCells,
  endOfWeekDateKey,
  shiftMonth,
  startOfWeekDateKey,
} from "@/lib/calendar-views";
import {
  buildWorkoutHref,
  type PlannerDayMarkers,
  type PlannerListItem,
} from "@/lib/planner-list-items";
import { dateFromLocalDateKey } from "@/lib/workout-date";

export type PlannerView = "week" | "month";

export type PlannerCalendarDay = {
  dateKey: string;
  dayOfMonth: number;
  /** False for the leading/trailing days of other months in month view. */
  inRange: boolean;
  isToday: boolean;
  markers: PlannerDayMarkers | undefined;
  /** Screen-reader label, e.g. "Tuesday, November 10: workout planned". */
  label: string;
};

export type PlannerAgendaItem =
  | { kind: "completed"; id: string; title: string; meta: string; href: string }
  | { kind: "activity"; id: string; title: string; meta: string; href: string }
  | { kind: "planned"; id: string; title: string; meta: string; startHref: string | null }
  | { kind: "reminder"; id: string; title: string; meta: string };

function parts(dateKey: string): { year: number; monthIndex: number } {
  const d = dateFromLocalDateKey(dateKey) ?? new Date();
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

function longDayLabel(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(d);
}

/** "Tue, Nov 10" */
export function agendaHeading(dateKey: string, todayKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
  if (dateKey === todayKey) return `Today · ${label}`;
  if (dateKey === addDaysToDateKey(todayKey, 1)) return `Tomorrow · ${label}`;
  return label;
}

function markerSummary(markers: PlannerDayMarkers | undefined): string {
  if (!markers) return "nothing logged or planned";
  const bits: string[] = [];
  if (markers.hasWorkout) bits.push("workout logged");
  if (markers.hasActivity) bits.push("activity logged");
  if (markers.hasPlan) bits.push("workout planned");
  if (markers.hasReminder) bits.push("reminder");
  return bits.join(", ") || "nothing logged or planned";
}

export function calendarDays(
  view: PlannerView,
  anchorKey: string,
  todayKey: string,
  markers: Map<string, PlannerDayMarkers>,
): PlannerCalendarDay[] {
  const cells =
    view === "week"
      ? buildWeekCalendarCells(anchorKey, todayKey)
      : (() => {
          const { year, monthIndex } = parts(anchorKey);
          return buildMonthCalendarGrid(year, monthIndex, todayKey);
        })();
  return cells.map((cell) => ({
    dateKey: cell.dateKey,
    dayOfMonth: cell.dayOfMonth,
    inRange: cell.isCurrentMonth,
    isToday: cell.isToday,
    markers: markers.get(cell.dateKey),
    label: `${longDayLabel(cell.dateKey)}${cell.isToday ? " (today)" : ""}: ${markerSummary(markers.get(cell.dateKey))}`,
  }));
}

/** Move the calendar a week or a month. Month view anchors on the 1st. */
export function shiftAnchor(view: PlannerView, anchorKey: string, delta: -1 | 1): string {
  if (view === "week") return addDaysToDateKey(anchorKey, delta * 7);
  const { year, monthIndex } = parts(anchorKey);
  const next = shiftMonth(year, monthIndex, delta);
  return `${next.year}-${String(next.monthIndex + 1).padStart(2, "0")}-01`;
}

export function calendarTitle(view: PlannerView, anchorKey: string): string {
  if (view === "month") {
    const d = dateFromLocalDateKey(anchorKey);
    return d ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d) : "";
  }
  const start = dateFromLocalDateKey(startOfWeekDateKey(anchorKey));
  const end = dateFromLocalDateKey(endOfWeekDateKey(anchorKey));
  if (!start || !end) return "";
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** The date range to subscribe to so every visible cell has its markers. */
export function visibleRange(view: PlannerView, anchorKey: string): { startKey: string; endKey: string } {
  if (view === "week") {
    return { startKey: startOfWeekDateKey(anchorKey), endKey: endOfWeekDateKey(anchorKey) };
  }
  const { year, monthIndex } = parts(anchorKey);
  const first = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  // The grid shows up to 6 weeks starting the Sunday on or before the 1st.
  const start = startOfWeekDateKey(first);
  return { startKey: start, endKey: addDaysToDateKey(start, 41) };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Everything on one day, in the order it happened (planned and reminders last). */
export function dayAgenda(items: PlannerListItem[], dateKey: string): PlannerAgendaItem[] {
  return items
    .filter((item) => item.dateKey === dateKey)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((item): PlannerAgendaItem => {
      switch (item.kind) {
        case "completed":
          return {
            kind: "completed",
            id: item.id,
            title: item.title,
            meta:
              item.exerciseCount > 0
                ? `Done · ${plural(item.exerciseCount, "exercise")} · ${plural(item.setCount, "set")}`
                : "Done",
            href: `/sessions/${item.id}`,
          };
        case "activity":
          return { kind: "activity", id: item.id, title: item.title, meta: item.meta, href: `/activities/${item.id}` };
        case "planned":
          return {
            kind: "planned",
            id: item.id,
            title: item.title,
            meta: `Planned · ${plural(item.exerciseCount, "exercise")}`,
            startHref: buildWorkoutHref(item.title, item.planId, item.exerciseIds),
          };
        case "reminder":
          return { kind: "reminder", id: item.id, title: item.title, meta: "Reminder" };
      }
    });
}
