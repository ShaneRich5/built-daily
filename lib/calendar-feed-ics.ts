import { addDaysToDateKey } from "@/lib/calendar-views";
import { buildWorkoutHref } from "@/lib/planner-list-items";
import type { ScheduledWorkoutEntry } from "@/lib/planner-types";

/**
 * Turns planner entries into an iCalendar (.ics) feed that Google Calendar,
 * Apple Calendar and Outlook can subscribe to. Pure: no Firestore, no
 * request, so it's easy to reason about and to check by hand.
 *
 * Every entry is an all-day event on its `dateKey`. All-day events carry no
 * time zone, so the day you planned is the day the calendar shows, wherever
 * the calendar is. They're marked free (TRANSPARENT) so a planned workout
 * never blocks a meeting slot.
 */

/** The slice of a planner entry the feed needs. */
export type CalendarFeedEntry = Pick<
  ScheduledWorkoutEntry,
  "id" | "dateKey" | "label" | "planId" | "exerciseIds" | "status"
>;

type BuildFeedInput = {
  entries: CalendarFeedEntry[];
  /** The site's origin, e.g. `https://builtdaily.app`, for links back into the app. */
  origin: string;
  now: Date;
};

const CRLF = "\r\n";

export function buildPlannerIcs({ entries, origin, now }: BuildFeedInput): string {
  const stamp = formatUtcStamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Built Daily//Planner feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Built Daily",
    "X-WR-CALDESC:Your planned workouts from Built Daily",
    // Hints only: Google Calendar ignores both and refreshes on its own schedule.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const entry of entries) {
    if (entry.status === "skipped") continue;
    lines.push(...eventLines(entry, origin, stamp));
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}

function eventLines(entry: CalendarFeedEntry, origin: string, stamp: string): string[] {
  const done = entry.status === "completed";
  const title = done ? `✓ ${entry.label}` : entry.label;
  const startHref = done ? null : buildWorkoutHref(entry.label, entry.planId, entry.exerciseIds);
  const link = `${origin}${startHref ?? "/planner"}`;
  const description = startHref
    ? `Start this workout in Built Daily: ${link}`
    : `Open your planner in Built Daily: ${link}`;

  return [
    "BEGIN:VEVENT",
    `UID:${entry.id}@built-daily`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(entry.dateKey)}`,
    `DTEND;VALUE=DATE:${compactDate(addDaysToDateKey(entry.dateKey, 1))}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${link}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
}

/** `2026-11-25` → `20261125`. */
function compactDate(dateKey: string): string {
  return dateKey.replaceAll("-", "");
}

/** `20261124T153000Z`, the UTC form DTSTAMP requires. */
function formatUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes a TEXT value (RFC 5545 §3.3.11): backslash, semicolon, comma, newline. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Folds a content line so no physical line is longer than 75 bytes
 * (RFC 5545 §3.1). Continuation lines start with a space. Counts UTF-8 bytes
 * and never splits a character, so emoji and accents survive.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74; // the leading space takes one byte
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}
