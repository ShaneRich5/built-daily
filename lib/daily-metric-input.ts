import { addDaysToDateKey } from "@/lib/calendar-views";
import {
  DAILY_METRIC_KEYS,
  DAILY_METRICS,
  SYNCED_DAILY_METRIC_SOURCES,
  isDailyMetricKey,
  isSyncedDailyMetricSource,
  normalizeDailyMetricValue,
  type DailyMetricKey,
  type SyncedDailyMetricSource,
} from "@/lib/daily-metric-types";
import { dateFromLocalDateKey, localDateKeyFromMs } from "@/lib/workout-date";

/**
 * Validation for numbers arriving from outside the app (the ingest API and the
 * MCP tool). Pure, so both share exactly the same checks.
 */

/** One day's total from one synced source. */
export type DailyMetricInput = {
  date: string;
  metric: DailyMetricKey;
  value: number;
  source: SyncedDailyMetricSource;
};

export type ParsedDailyMetricInput =
  { ok: true; input: DailyMetricInput } | { ok: false; error: string };

/** How far back a source may backfill. */
export const DAILY_METRIC_MAX_DAYS_BACK = 366;

/** A batch covers a missed week or so; a month at most. */
export const DAILY_METRIC_MAX_BATCH = 31;

/** True for a real calendar day in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isRealDateKey(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const d = dateFromLocalDateKey(v);
  return d != null && localDateKeyFromMs(d.getTime()) === v;
}

/**
 * Checks one `{ date, metric, value, source }` item. `todayKey` is the
 * server's date; one day ahead is allowed because the sender's time zone may
 * already be on tomorrow.
 */
export function parseDailyMetricInput(
  raw: unknown,
  todayKey: string,
): ParsedDailyMetricInput {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error: "Expected an object with date, metric, value and source.",
    };
  }
  const { date, metric, value, source } = raw as Record<string, unknown>;

  if (!isRealDateKey(date)) {
    return { ok: false, error: "date must be a calendar day as YYYY-MM-DD." };
  }
  if (date > addDaysToDateKey(todayKey, 1)) {
    return { ok: false, error: "date is in the future." };
  }
  if (date < addDaysToDateKey(todayKey, -DAILY_METRIC_MAX_DAYS_BACK)) {
    return {
      ok: false,
      error: `date is more than ${DAILY_METRIC_MAX_DAYS_BACK} days ago.`,
    };
  }

  if (!isDailyMetricKey(metric)) {
    return {
      ok: false,
      error: `metric must be one of: ${DAILY_METRIC_KEYS.join(", ")}.`,
    };
  }

  if (source === "manual") {
    return {
      ok: false,
      error:
        'source "manual" is reserved for the app. Use the source that measured it.',
    };
  }
  if (!isSyncedDailyMetricSource(source)) {
    return {
      ok: false,
      error: `source must be one of: ${SYNCED_DAILY_METRIC_SOURCES.join(", ")}.`,
    };
  }

  const normalized = normalizeDailyMetricValue(metric, value);
  if (normalized == null) {
    const def = DAILY_METRICS[metric];
    return {
      ok: false,
      error: `value must be a number from ${def.min} to ${def.max.toLocaleString("en-US")} ${def.unit}.`,
    };
  }

  return { ok: true, input: { date, metric, value: normalized, source } };
}
