import { localDateKeyFromMs } from "@/lib/workout-date";

/** `monthIndex` is 0–11 (JavaScript `Date` month). */
export function localDateKeyFromYmd(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(dayOfMonth).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export type CalendarDayCell = {
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export const WEEKDAY_LABELS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Full weeks (Sun–Sat) covering `monthIndex`, with leading/trailing days from
 * adjacent months. Length is a multiple of 7 (35 or 42 cells).
 */
export function buildMonthCalendarGrid(
  year: number,
  monthIndex: number,
  todayKey: string,
): CalendarDayCell[] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: CalendarDayCell[] = [];

  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  for (let i = 0; i < startPad; i++) {
    const dom = daysInPrevMonth - startPad + i + 1;
    const dk = localDateKeyFromYmd(prevYear, prevMonthIndex, dom);
    cells.push({
      dateKey: dk,
      dayOfMonth: dom,
      isCurrentMonth: false,
      isToday: dk === todayKey,
    });
  }

  for (let dom = 1; dom <= daysInMonth; dom++) {
    const dk = localDateKeyFromYmd(year, monthIndex, dom);
    cells.push({
      dateKey: dk,
      dayOfMonth: dom,
      isCurrentMonth: true,
      isToday: dk === todayKey,
    });
  }

  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  let nextDom = 1;
  const totalCells = Math.ceil(cells.length / 7) * 7;
  while (cells.length < totalCells) {
    const dk = localDateKeyFromYmd(nextYear, nextMonthIndex, nextDom);
    cells.push({
      dateKey: dk,
      dayOfMonth: nextDom,
      isCurrentMonth: false,
      isToday: dk === todayKey,
    });
    nextDom += 1;
  }

  return cells;
}

export function todayDateKeyLocal(): string {
  return localDateKeyFromMs(Date.now());
}

export function formatMonthHeading(
  year: number,
  monthIndex: number,
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}
