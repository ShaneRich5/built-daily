/** Local calendar date as `YYYY-MM-DD` (for streaks / list filters). */
export function localDateKeyFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
