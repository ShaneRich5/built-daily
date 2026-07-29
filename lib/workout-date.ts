/** Local calendar date as `YYYY-MM-DD` (for streaks / list filters). */
export function localDateKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local-calendar Date at midnight. */
export function dateFromLocalDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Human-readable date for headers (locale-aware). */
export function formatWorkoutHeaderDate(
  ms: number,
  locale: string = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

/** Format a `YYYY-MM-DD` key for display. */
export function formatLocalDateKey(
  dateKey: string,
  locale: string = "en-US",
): string {
  const d = dateFromLocalDateKey(dateKey);
  if (!d) return dateKey;
  return formatWorkoutHeaderDate(d.getTime(), locale);
}

/**
 * Friendly preview for date pickers — adds Today/Yesterday when relevant.
 * Returns null when the key is missing or invalid.
 */
export function formatActivityDatePreview(
  dateKey: string,
  locale: string = "en-US",
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const formatted = formatLocalDateKey(dateKey, locale);
  const todayKey = localDateKeyFromMs(Date.now());
  if (dateKey === todayKey) return `Today · ${formatted}`;

  const today = dateFromLocalDateKey(todayKey);
  if (today) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateKey === localDateKeyFromMs(yesterday.getTime())) {
      return `Yesterday · ${formatted}`;
    }
  }

  return formatted;
}

/** Validate optional `HH:mm` (24-hour). */
export function isValidWorkoutTime(raw: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw);
}

/** Format `HH:mm` for display (locale-aware). */
export function formatWorkoutTimeLabel(
  time: string,
  locale: string = "en-US",
): string {
  if (!isValidWorkoutTime(time)) return time;
  const [h, m] = time.split(":").map((x) => Number(x));
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Default title when the user leaves the name blank. */
export function defaultWorkoutTitle(
  workoutDate: string | null,
  fallbackMs: number = Date.now(),
): string {
  const dateLabel = workoutDate
    ? formatLocalDateKey(workoutDate)
    : formatWorkoutHeaderDate(fallbackMs);
  return `Workout on ${dateLabel}`;
}

/**
 * Persistable title: trimmed user input, or `Workout on {date}` when empty.
 */
export function resolveWorkoutTitle(
  raw: string,
  workoutDate: string | null,
  fallbackMs: number = Date.now(),
): string {
  const t = raw.trim().slice(0, 200);
  return t.length > 0 ? t : defaultWorkoutTitle(workoutDate, fallbackMs);
}

/** Normalize optional date field from UI. */
export function normalizeWorkoutDate(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

/** Normalize optional time field from UI. */
export function normalizeWorkoutTime(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return isValidWorkoutTime(t) ? t : null;
}

/**
 * Short label for lists / headers from optional journal date + time.
 * Falls back to `startedAt`/`endedAt` when no workout date is set.
 */
export function formatSessionJournalMeta(
  workoutDate: string | null,
  workoutTime: string | null,
  fallbackMs: number,
  locale: string = "en-US",
): string {
  const parts: string[] = [];
  if (workoutDate) {
    parts.push(formatLocalDateKey(workoutDate, locale));
  } else {
    parts.push(formatWorkoutHeaderDate(fallbackMs, locale));
  }
  if (workoutTime) {
    parts.push(formatWorkoutTimeLabel(workoutTime, locale));
  }
  return parts.join(" · ");
}

/** True when `title` matches the auto-generated default for this date. */
export function isDefaultWorkoutTitle(
  title: string,
  workoutDate: string | null,
  fallbackMs: number,
): boolean {
  return title.trim() === defaultWorkoutTitle(workoutDate, fallbackMs);
}

/**
 * Volume line for session lists / export.
 * Empty completed sessions read as intentional thin logs, not "0 exercises".
 */
export function formatSessionVolumeMeta(
  exerciseCount: number,
  setCount?: number | null,
  status: "completed" | "in_progress" | "discarded" = "completed",
): string {
  if (exerciseCount <= 0) {
    return status === "in_progress"
      ? "No exercises yet"
      : "Logged without details";
  }
  const parts = [
    `${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`,
  ];
  if (setCount != null) {
    parts.push(`${setCount} set${setCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}
