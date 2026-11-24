/**
 * Domain types for daily health metrics (steps first). One doc per local
 * calendar day holds every metric, with each source's number kept side by
 * side and one resolved value. See docs/STEP_CHALLENGE.md.
 */

/** Where a day's number came from. `manual` is the log sheet in the app. */
export const DAILY_METRIC_SOURCES = [
  "manual",
  "apple_health",
  "health_connect",
  "shortcut",
  "mcp",
] as const;

export type DailyMetricSource = (typeof DAILY_METRIC_SOURCES)[number];

/** Sources that sync in from outside the app. Only these may use the ingest API. */
export type SyncedDailyMetricSource = Exclude<DailyMetricSource, "manual">;

export const SYNCED_DAILY_METRIC_SOURCES: readonly SyncedDailyMetricSource[] =
  DAILY_METRIC_SOURCES.filter(
    (s): s is SyncedDailyMetricSource => s !== "manual",
  );

/** Short labels for source chips and the log sheet. */
export const DAILY_METRIC_SOURCE_LABELS: Record<DailyMetricSource, string> = {
  manual: "Typed in",
  apple_health: "Apple Health",
  health_connect: "Health Connect",
  shortcut: "iOS Shortcut",
  mcp: "Assistant",
};

export type DailyMetricKey = "steps";

/**
 * What the app knows about a metric. Adding one (active minutes, distance, …)
 * is a new entry here plus its key in `DailyMetricKey`; resolve, the ingest
 * API and the challenge rules work unchanged for any "sum, more is better"
 * metric.
 */
export type DailyMetricDefinition = {
  key: DailyMetricKey;
  label: string;
  unit: string;
  /** Inclusive bounds for one day's total. */
  min: number;
  max: number;
  /** Whole numbers only (values are rounded before the bounds check). */
  integer: boolean;
};

export const DAILY_METRICS: Record<DailyMetricKey, DailyMetricDefinition> = {
  steps: {
    key: "steps",
    label: "Steps",
    unit: "steps",
    min: 0,
    max: 100_000,
    integer: true,
  },
};

export const DAILY_METRIC_KEYS = Object.keys(DAILY_METRICS) as DailyMetricKey[];

export type DailyMetricSourceValue = {
  value: number;
  updatedAt: Date;
};

/** One metric on one day: every source's number, plus the one consumers read. */
export type DailyMetricEntry = {
  /** Resolved value (see `resolveDailyMetric`); null when no source has a number. */
  value: number | null;
  resolvedFrom: DailyMetricSource | null;
  sources: Partial<Record<DailyMetricSource, DailyMetricSourceValue>>;
};

/** `users/{uid}/dailyMetrics/{YYYY-MM-DD}` */
export type DailyMetricsDoc = {
  /** Same as the doc id: the user's local calendar day. */
  dateKey: string;
  metrics: Partial<Record<DailyMetricKey, DailyMetricEntry>>;
  updatedAt: Date;
};

export function isDailyMetricKey(v: unknown): v is DailyMetricKey {
  return typeof v === "string" && v in DAILY_METRICS;
}

export function isDailyMetricSource(v: unknown): v is DailyMetricSource {
  return (
    typeof v === "string" &&
    (DAILY_METRIC_SOURCES as readonly string[]).includes(v)
  );
}

export function isSyncedDailyMetricSource(
  v: unknown,
): v is SyncedDailyMetricSource {
  return isDailyMetricSource(v) && v !== "manual";
}

/**
 * Rounds (for whole-number metrics) and bounds-checks one day's value.
 * Returns null when it's not a finite number inside the metric's range.
 */
export function normalizeDailyMetricValue(
  metric: DailyMetricKey,
  raw: unknown,
): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const def = DAILY_METRICS[metric];
  const value = def.integer ? Math.round(raw) : raw;
  if (value < def.min || value > def.max) return null;
  return value;
}
