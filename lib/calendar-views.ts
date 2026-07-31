import {
  buildMonthCalendarGrid,
  localDateKeyFromYmd,
  type CalendarDayCell,
} from "@/lib/calendar-month";
import { dateFromLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";

export type PlannerCalendarView = "week" | "month" | "three_months";

export type CalendarMonthBlock = {
  year: number;
  monthIndex: number;
  cells: CalendarDayCell[];
};

/** Add `days` to a `YYYY-MM-DD` key (local calendar). */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  d.setDate(d.getDate() + days);
  return localDateKeyFromMs(d.getTime());
}

/** Sunday-start week containing `dateKey`. */
export function startOfWeekDateKey(dateKey: string): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  d.setDate(d.getDate() - d.getDay());
  return localDateKeyFromMs(d.getTime());
}

export function endOfWeekDateKey(dateKey: string): string {
  return addDaysToDateKey(startOfWeekDateKey(dateKey), 6);
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number,
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function monthDateRange(
  year: number,
  monthIndex: number,
): { startKey: string; endKey: string } {
  const startKey = localDateKeyFromYmd(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const endKey = localDateKeyFromYmd(year, monthIndex, lastDay);
  return { startKey, endKey };
}

export function threeMonthDateRange(
  year: number,
  monthIndex: number,
): { startKey: string; endKey: string } {
  const start = monthDateRange(year, monthIndex);
  const third = shiftMonth(year, monthIndex, 2);
  const end = monthDateRange(third.year, third.monthIndex);
  return { startKey: start.startKey, endKey: end.endKey };
}

/** Seven Sun–Sat cells for the week containing `anchorDateKey`. */
export function buildWeekCalendarCells(
  anchorDateKey: string,
  todayKey: string,
): CalendarDayCell[] {
  const startKey = startOfWeekDateKey(anchorDateKey);
  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const dateKey = addDaysToDateKey(startKey, i);
    const d = dateFromLocalDateKey(dateKey);
    if (!d) continue;
    cells.push({
      dateKey,
      dayOfMonth: d.getDate(),
      isCurrentMonth: true,
      isToday: dateKey === todayKey,
    });
  }
  return cells;
}

export function buildThreeMonthBlocks(
  year: number,
  monthIndex: number,
  todayKey: string,
): CalendarMonthBlock[] {
  const blocks: CalendarMonthBlock[] = [];
  for (let i = 0; i < 3; i++) {
    const { year: y, monthIndex: m } = shiftMonth(year, monthIndex, i);
    blocks.push({
      year: y,
      monthIndex: m,
      cells: buildMonthCalendarGrid(y, m, todayKey),
    });
  }
  return blocks;
}

/** Inclusive range spanning `monthsBack` before and `monthsForward` after anchor month. */
export function subscriptionRangeAroundMonth(
  year: number,
  monthIndex: number,
  monthsBack: number,
  monthsForward: number,
): { startKey: string; endKey: string } {
  const start = shiftMonth(year, monthIndex, -monthsBack);
  const end = shiftMonth(year, monthIndex, monthsForward);
  return {
    startKey: monthDateRange(start.year, start.monthIndex).startKey,
    endKey: monthDateRange(end.year, end.monthIndex).endKey,
  };
}
