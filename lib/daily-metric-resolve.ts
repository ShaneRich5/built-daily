import {
  DAILY_METRIC_SOURCES,
  type DailyMetricEntry,
  type DailyMetricSource,
} from "@/lib/daily-metric-types";

/**
 * Pure and SDK-free on purpose: the app, the ingest API and the MCP server all
 * call these, so a day resolves the same way no matter who wrote last.
 */

type SourceValues = Partial<Record<DailyMetricSource, { value: number }>>;

export type ResolvedDailyMetric = {
  value: number | null;
  resolvedFrom: DailyMetricSource | null;
};

/**
 * The resolve rule (docs/STEP_CHALLENGE.md):
 *
 * 1. A manual edit wins. The user typed it to correct the sync.
 * 2. Otherwise the highest synced value. Sources are never summed: Apple
 *    Health and Health Connect already merge phone + watch, so two sources on
 *    one day are almost always the same steps counted twice, or one source
 *    that hasn't caught up yet.
 * 3. Nothing is discarded: every source's number stays on the doc, so removing
 *    the manual edit falls back to the sync.
 *
 * Ties keep the first source in `DAILY_METRIC_SOURCES`, so the result is stable.
 */
export function resolveDailyMetric(sources: SourceValues): ResolvedDailyMetric {
  const manual = sources.manual;
  if (manual && Number.isFinite(manual.value)) {
    return { value: manual.value, resolvedFrom: "manual" };
  }

  let best: ResolvedDailyMetric = { value: null, resolvedFrom: null };
  for (const source of DAILY_METRIC_SOURCES) {
    if (source === "manual") continue;
    const v = sources[source]?.value;
    if (v == null || !Number.isFinite(v)) continue;
    if (best.value == null || v > best.value) {
      best = { value: v, resolvedFrom: source };
    }
  }
  return best;
}

/**
 * Sets (or with `value: null`, removes) one source's number on a day's entry
 * and re-resolves it. Returns a new entry; the input is not changed.
 */
export function withSourceValue(
  entry: DailyMetricEntry | null | undefined,
  source: DailyMetricSource,
  value: number | null,
  now: Date,
): DailyMetricEntry {
  const sources = { ...(entry?.sources ?? {}) };
  if (value == null) {
    delete sources[source];
  } else {
    sources[source] = { value, updatedAt: now };
  }
  return { ...resolveDailyMetric(sources), sources };
}
