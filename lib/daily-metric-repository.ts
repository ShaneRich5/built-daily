import {
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import {
  dailyMetricEntryToFirestore,
  firestoreToDailyMetricsDoc,
} from "@/lib/daily-metric-mapper";
import { withSourceValue } from "@/lib/daily-metric-resolve";
import {
  normalizeDailyMetricValue,
  type DailyMetricKey,
  type DailyMetricsDoc,
} from "@/lib/daily-metric-types";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";

function dailyMetricsCollectionRef() {
  const db = getFirestoreDb();
  const uid = getFirebaseAuth()?.currentUser?.uid;
  if (!db || !uid) return null;
  return collection(db, "users", uid, "dailyMetrics");
}

/** Day docs from `startKey` to `endKey` (inclusive), keyed by date. */
export function subscribeDailyMetricsInRange(
  startKey: string,
  endKey: string,
  onDays: (byDate: Record<string, DailyMetricsDoc>) => void,
): () => void {
  const col = dailyMetricsCollectionRef();
  if (!col) {
    onDays({});
    return () => {};
  }
  const q = query(
    col,
    where("dateKey", ">=", startKey),
    where("dateKey", "<=", endKey),
  );
  return onSnapshot(
    q,
    (snap) => {
      const byDate: Record<string, DailyMetricsDoc> = {};
      for (const d of snap.docs) {
        const day = firestoreToDailyMetricsDoc(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (day) byDate[day.dateKey] = day;
      }
      onDays(byDate);
    },
    () => onDays({}),
  );
}

/**
 * Sets the number the user typed for one day, or with `value: null` removes
 * it so the day falls back to its synced value. Only `sources.manual` and the
 * resolved `value` / `resolvedFrom` change; synced sources are kept.
 *
 * Setting needs no read, because a manual value always wins. That keeps the
 * write instant and offline-friendly, like sessions. Removing reads the day
 * (from the offline cache if needed) to find what to fall back to.
 */
export async function setManualDailyMetric(
  dateKey: string,
  metric: DailyMetricKey,
  value: number | null,
): Promise<boolean> {
  const col = dailyMetricsCollectionRef();
  if (!col || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const ref = doc(col, dateKey);
  const now = new Date();

  if (value != null) {
    const normalized = normalizeDailyMetricValue(metric, value);
    if (normalized == null) return false;
    const entry = withSourceValue(null, "manual", normalized, now);
    await setDoc(ref, dailyMetricEntryToFirestore(dateKey, metric, entry, now), {
      merge: true,
    });
    return true;
  }

  const snap = await getDoc(ref);
  if (!snap.exists()) return true;
  const day = firestoreToDailyMetricsDoc(
    snap.id,
    snap.data() as Record<string, unknown>,
  );
  const entry = withSourceValue(day?.metrics[metric], "manual", null, now);
  const write = dailyMetricEntryToFirestore(dateKey, metric, entry, now);
  const metrics = write.metrics as Record<string, { sources: Record<string, unknown> }>;
  metrics[metric]!.sources.manual = deleteField();
  await setDoc(ref, write, { merge: true });
  return true;
}
