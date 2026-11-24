import { resolveDailyMetric } from "@/lib/daily-metric-resolve";
import {
  DAILY_METRIC_KEYS,
  DAILY_METRIC_SOURCES,
  normalizeDailyMetricValue,
  type DailyMetricEntry,
  type DailyMetricKey,
  type DailyMetricsDoc,
} from "@/lib/daily-metric-types";

/**
 * Firestore mapping for `users/{uid}/dailyMetrics/{dateKey}`. Shared by the
 * client SDK (log sheet) and the Admin SDK (ingest API, MCP), so it only uses
 * plain `Date`s: both SDKs store a `Date` as a Timestamp, and both read
 * Timestamps back as objects with `toDate()`.
 */

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function asDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (v && typeof v === "object") {
    if (typeof (v as { toDate?: unknown }).toDate === "function") {
      const d = (v as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    const seconds = (v as { seconds?: unknown }).seconds;
    if (typeof seconds === "number") return new Date(seconds * 1000);
  }
  return null;
}

function parseEntry(
  metric: DailyMetricKey,
  raw: unknown,
): DailyMetricEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const rawSources = (raw as { sources?: unknown }).sources;
  if (!rawSources || typeof rawSources !== "object") return null;

  const sources: DailyMetricEntry["sources"] = {};
  for (const source of DAILY_METRIC_SOURCES) {
    const s = (rawSources as Record<string, unknown>)[source];
    if (!s || typeof s !== "object") continue;
    const value = normalizeDailyMetricValue(
      metric,
      (s as { value?: unknown }).value,
    );
    if (value == null) continue;
    sources[source] = {
      value,
      updatedAt: asDate((s as { updatedAt?: unknown }).updatedAt) ?? new Date(0),
    };
  }
  // Re-resolve on read rather than trusting the stored `value`, so a doc
  // written by an older client can never disagree with the rule.
  return { ...resolveDailyMetric(sources), sources };
}

export function firestoreToDailyMetricsDoc(
  id: string,
  data: Record<string, unknown>,
): DailyMetricsDoc | null {
  const dateKey = typeof data.dateKey === "string" ? data.dateKey : id;
  if (!DATE_KEY.test(dateKey)) return null;

  const metrics: DailyMetricsDoc["metrics"] = {};
  const rawMetrics = data.metrics;
  if (rawMetrics && typeof rawMetrics === "object") {
    for (const key of DAILY_METRIC_KEYS) {
      const entry = parseEntry(key, (rawMetrics as Record<string, unknown>)[key]);
      if (entry) metrics[key] = entry;
    }
  }

  return {
    dateKey,
    metrics,
    updatedAt: asDate(data.updatedAt) ?? new Date(0),
  };
}

/**
 * The fields to merge into a day's doc after one metric changed. Written with
 * `{ merge: true }`, so other metrics on the same day are left alone. Removed
 * sources are handled by the caller (each SDK has its own delete sentinel).
 */
export function dailyMetricEntryToFirestore(
  dateKey: string,
  metric: DailyMetricKey,
  entry: DailyMetricEntry,
  now: Date,
): Record<string, unknown> {
  const sources: Record<string, unknown> = {};
  for (const [source, s] of Object.entries(entry.sources)) {
    if (s) sources[source] = { value: s.value, updatedAt: s.updatedAt };
  }
  return {
    dateKey,
    metrics: {
      [metric]: {
        value: entry.value,
        resolvedFrom: entry.resolvedFrom,
        sources,
      },
    },
    updatedAt: now,
  };
}
