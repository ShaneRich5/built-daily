import { getAdminFirestore } from "@/lib/firebase-admin";
import type { DailyMetricInput } from "@/lib/daily-metric-input";
import {
  dailyMetricEntryToFirestore,
  firestoreToDailyMetricsDoc,
} from "@/lib/daily-metric-mapper";
import { withSourceValue } from "@/lib/daily-metric-resolve";
import type { DailyMetricKey, DailyMetricSource } from "@/lib/daily-metric-types";

/**
 * Admin-SDK writer for synced daily metrics (ingest API + MCP). Server-side
 * only. Each input writes `metrics.<metric>.sources.<source>` and re-resolves
 * `value` with the same `resolveDailyMetric` the app uses.
 */

export type DailyMetricWriteResult = {
  date: string;
  metric: DailyMetricKey;
  /** The day's resolved value after this write (a manual edit still wins). */
  value: number | null;
  resolvedFrom: DailyMetricSource | null;
};

/**
 * Writes already-validated inputs (see `parseDailyMetricInput`). One
 * transaction per day, so a sync racing the log sheet can't leave `value`
 * out of step with `sources`. Later items win over earlier ones for the same
 * day, metric and source.
 */
export async function writeSyncedDailyMetrics(
  uid: string,
  inputs: DailyMetricInput[],
): Promise<DailyMetricWriteResult[]> {
  const byDate = new Map<string, DailyMetricInput[]>();
  for (const input of inputs) {
    byDate.set(input.date, [...(byDate.get(input.date) ?? []), input]);
  }

  const db = getAdminFirestore();
  const col = db.collection("users").doc(uid).collection("dailyMetrics");
  const results: DailyMetricWriteResult[] = [];

  for (const [date, dayInputs] of byDate) {
    const ref = col.doc(date);
    const dayResults = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const day = snap.exists
        ? firestoreToDailyMetricsDoc(date, snap.data() ?? {})
        : null;
      const now = new Date();
      const entries = { ...(day?.metrics ?? {}) };
      for (const input of dayInputs) {
        entries[input.metric] = withSourceValue(
          entries[input.metric],
          input.source,
          input.value,
          now,
        );
      }

      // One write per day: each changed metric's fields merged together.
      const out: DailyMetricWriteResult[] = [];
      const metrics: Record<string, unknown> = {};
      for (const metric of new Set(dayInputs.map((i) => i.metric))) {
        const entry = entries[metric]!;
        const fields = dailyMetricEntryToFirestore(date, metric, entry, now);
        Object.assign(metrics, fields.metrics as Record<string, unknown>);
        out.push({
          date,
          metric,
          value: entry.value,
          resolvedFrom: entry.resolvedFrom,
        });
      }
      tx.set(ref, { dateKey: date, metrics, updatedAt: now }, { merge: true });
      return out;
    });
    results.push(...dayResults);
  }

  return results;
}
