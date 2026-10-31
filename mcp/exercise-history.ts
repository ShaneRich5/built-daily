import { getCatalogExerciseById, type ExerciseMetric } from "@/lib/exercise-catalog";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { estimatedOneRepMax } from "@/lib/progress-insights";
import type { SessionLine, SetLog } from "@/lib/workout-types";
import { toIso } from "./firestore";

/**
 * Sessions don't index lines by exercise, so history scans this many recent
 * completed sessions (~6 months at 4 workouts a week).
 */
const SCAN_SESSION_LIMIT = 100;

/** A logged set with its empty (null) fields left out. */
type CompactSet = Partial<SetLog>;

type ExerciseHistoryEntry = {
  sessionId: string;
  title: string | null;
  workoutDate: string | null;
  endedAt: string | null;
  sets: CompactSet[];
};

type BestSet = {
  /** Which set field "best" is measured by, for this exercise's metric. */
  basis: "estimated1Rm" | "reps" | "durationSec" | "distanceMiles";
  value: number;
  set: CompactSet;
  sessionId: string;
  workoutDate: string | null;
  endedAt: string | null;
};

export type ExerciseHistoryJson = {
  exerciseId: string;
  exerciseName: string | null;
  metric: ExerciseMetric | null;
  scannedSessions: number;
  best: BestSet | null;
  entries: ExerciseHistoryEntry[];
};

function compactSet(set: SetLog): CompactSet {
  return Object.fromEntries(
    Object.entries(set).filter(([, value]) => value != null),
  ) as CompactSet;
}

/** How a set is scored for "best", per metric. Null when the set can't be scored. */
function scoreSet(
  metric: ExerciseMetric,
  set: SetLog,
): { basis: BestSet["basis"]; value: number } | null {
  switch (metric) {
    case "weight_reps": {
      const value = estimatedOneRepMax(set.weight ?? 0, set.reps ?? 0);
      return value > 0 ? { basis: "estimated1Rm", value } : null;
    }
    case "bodyweight_reps":
      return set.reps ? { basis: "reps", value: set.reps } : null;
    case "duration":
      return set.durationSec
        ? { basis: "durationSec", value: set.durationSec }
        : null;
    case "cardio":
      return set.distanceMiles
        ? { basis: "distanceMiles", value: set.distanceMiles }
        : null;
    default: {
      const _exhaustive: never = metric;
      return _exhaustive;
    }
  }
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Recent completed sessions that include `exerciseId` (newest first), plus the
 * best set across every scanned session.
 */
export async function getExerciseHistory(
  uid: string,
  exerciseId: string,
  limit: number,
): Promise<ExerciseHistoryJson> {
  const snap = await getAdminFirestore()
    .collection("users")
    .doc(uid)
    .collection("sessions")
    .where("status", "==", "completed")
    .orderBy("endedAt", "desc")
    .limit(SCAN_SESSION_LIMIT)
    .get();

  // Catalog first; custom exercises fall back to the line's own snapshot.
  const catalog = getCatalogExerciseById(exerciseId);
  let exerciseName: string | null = catalog?.name ?? null;
  let metric: ExerciseMetric | null = catalog?.metric ?? null;

  const entries: ExerciseHistoryEntry[] = [];
  let best: BestSet | null = null;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const lines = Array.isArray(data.lines) ? (data.lines as SessionLine[]) : [];
    const matching = lines.filter((line) => line.exerciseId === exerciseId);
    if (matching.length === 0) continue;

    exerciseName ??= matching[0].nameSnapshot;
    metric ??= matching[0].metric;

    const sets = matching.flatMap((line) => line.sets);
    const workoutDate = asOptionalString(data.workoutDate);
    const endedAt = toIso(data.endedAt);

    if (entries.length < limit) {
      entries.push({
        sessionId: doc.id,
        title: asOptionalString(data.title),
        workoutDate,
        endedAt,
        sets: sets.map(compactSet),
      });
    }

    for (const set of sets) {
      const score = scoreSet(metric, set);
      if (score && (!best || score.value > best.value)) {
        best = {
          ...score,
          set: compactSet(set),
          sessionId: doc.id,
          workoutDate,
          endedAt,
        };
      }
    }
  }

  return {
    exerciseId,
    exerciseName,
    metric,
    scannedSessions: snap.size,
    best,
    entries,
  };
}
