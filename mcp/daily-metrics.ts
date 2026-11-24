import { writeSyncedDailyMetrics } from "@/lib/daily-metric-admin";
import { parseDailyMetricInput } from "@/lib/daily-metric-input";
import { DAILY_METRIC_SOURCE_LABELS } from "@/lib/daily-metric-types";
import { localDateKeyFromMs } from "@/lib/workout-date";

export type LogDailyMetricResult =
  | {
      ok: true;
      date: string;
      metric: string;
      saved: number;
      /** What the app shows for the day after this write. */
      shown: number | null;
      shownFrom: string | null;
      note: string;
    }
  | { ok: false; error: string };

/**
 * `log_daily_metric`: one day's total from the assistant, written as the
 * `mcp` source. Same validation and resolve rule as POST /api/health/daily.
 */
export async function logDailyMetric(
  uid: string,
  raw: { date: string; metric: string; value: number },
): Promise<LogDailyMetricResult> {
  const parsed = parseDailyMetricInput(
    { ...raw, source: "mcp" },
    localDateKeyFromMs(Date.now()),
  );
  if (!parsed.ok) return parsed;

  const [result] = await writeSyncedDailyMetrics(uid, [parsed.input]);
  const { date, metric, value } = parsed.input;
  const shownFrom = result?.resolvedFrom ?? null;
  const note =
    shownFrom === "mcp"
      ? `Saved. The app shows ${value.toLocaleString("en-US")} ${metric} for ${date}.`
      : `Saved, but the app shows ${result?.value?.toLocaleString("en-US") ?? "nothing"} for ${date} ` +
        `(${shownFrom ? DAILY_METRIC_SOURCE_LABELS[shownFrom] : "no source"}): a number the user typed wins, ` +
        "and otherwise the highest synced number does.";

  return {
    ok: true,
    date,
    metric,
    saved: value,
    shown: result?.value ?? null,
    shownFrom,
    note,
  };
}
