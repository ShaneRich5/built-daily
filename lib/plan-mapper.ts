import { Timestamp } from "firebase/firestore";
import type { ExerciseMetric } from "@/lib/exercise-catalog";
import { getCatalogExerciseById } from "@/lib/exercise-catalog";
import { NOTE_LIMITS, type PlanLine, type PlanRestPreferences, type PlanSource, type WorkoutPlanDoc } from "@/lib/workout-types";

function newLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function planLineFromCatalogExercise(exerciseId: string): PlanLine | null {
  const ex = getCatalogExerciseById(exerciseId);
  if (!ex) return null;
  return {
    lineId: newLineId(),
    exerciseId: ex.id,
    nameSnapshot: ex.name,
    metric: ex.metric,
    targetSets: 3,
    notes: null,
  };
}

/** User-defined exercise (not in catalog); id is stable for URLs and Firestore. */
export function planLineFromCustomName(name: string): PlanLine | null {
  const trimmed = name.trim().slice(0, NOTE_LIMITS.title);
  if (!trimmed) return null;
  const exerciseId = `custom-${
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }`;
  return {
    lineId: newLineId(),
    exerciseId,
    nameSnapshot: trimmed,
    metric: "bodyweight_reps",
    targetSets: 3,
    notes: null,
  };
}

function asTimestamp(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (
    v &&
    typeof v === "object" &&
    "seconds" in v &&
    typeof (v as { seconds: unknown }).seconds === "number"
  ) {
    return new Timestamp(
      (v as { seconds: number }).seconds,
      "nanoseconds" in v && typeof (v as { nanoseconds: unknown }).nanoseconds === "number"
        ? (v as { nanoseconds: number }).nanoseconds
        : 0,
    ).toDate();
  }
  return null;
}

function asMetric(v: unknown): ExerciseMetric | null {
  if (v === "weight_reps" || v === "bodyweight_reps" || v === "duration") {
    return v;
  }
  return null;
}

function parseRestPreferences(raw: unknown): PlanRestPreferences | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.autoRestTimer !== "boolean") return null;
  const sec = o.defaultRestSec;
  if (sec !== 30 && sec !== 60 && sec !== 90 && sec !== 120) return null;
  return { autoRestTimer: o.autoRestTimer, defaultRestSec: sec };
}

function asPlanSource(v: unknown): PlanSource | null {
  if (v === "starter_copy" || v === "custom") return v;
  return null;
}

function parsePlanLine(raw: unknown): PlanLine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lineId = typeof o.lineId === "string" ? o.lineId : "";
  const exerciseId = typeof o.exerciseId === "string" ? o.exerciseId : "";
  const nameSnapshot =
    typeof o.nameSnapshot === "string" ? o.nameSnapshot.slice(0, 200) : "";
  const metric = asMetric(o.metric);
  if (!lineId || !exerciseId || !nameSnapshot || !metric) return null;

  let targetSets: number | null | undefined;
  if (o.targetSets === null || o.targetSets === undefined) {
    targetSets = o.targetSets === null ? null : undefined;
  } else if (typeof o.targetSets === "number" && Number.isFinite(o.targetSets)) {
    targetSets = Math.max(1, Math.min(99, Math.round(o.targetSets)));
  }

  let notes: string | null | undefined;
  if (o.notes === null) notes = null;
  else if (typeof o.notes === "string") {
    const t = o.notes.trim().slice(0, NOTE_LIMITS.exerciseNote);
    notes = t.length > 0 ? t : null;
  }

  const line: PlanLine = {
    lineId,
    exerciseId,
    nameSnapshot,
    metric,
  };
  if (targetSets !== undefined) line.targetSets = targetSets;
  if (notes !== undefined) line.notes = notes;
  return line;
}

/** Parse Firestore document fields into `WorkoutPlanDoc`, or null if invalid. */
export function firestoreToWorkoutPlanDoc(data: Record<string, unknown>): WorkoutPlanDoc | null {
  const name =
    typeof data.name === "string"
      ? data.name.trim().slice(0, NOTE_LIMITS.title)
      : "";
  const createdAt = asTimestamp(data.createdAt);
  const updatedAt = asTimestamp(data.updatedAt);
  const source = asPlanSource(data.source);
  if (!name || !createdAt || !updatedAt || !source) return null;
  if (!Array.isArray(data.lines) || data.lines.length === 0) return null;

  const lines: PlanLine[] = [];
  for (const item of data.lines) {
    const line = parsePlanLine(item);
    if (line) lines.push(line);
  }
  if (lines.length === 0) return null;

  const restPreferences = parseRestPreferences(data.restPreferences);

  const doc: WorkoutPlanDoc = { name, createdAt, updatedAt, source, lines };
  if (restPreferences) doc.restPreferences = restPreferences;
  return doc;
}

export function workoutPlanDocToFirestore(doc: WorkoutPlanDoc): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: doc.name,
    createdAt: Timestamp.fromDate(doc.createdAt),
    updatedAt: Timestamp.fromDate(doc.updatedAt),
    source: doc.source,
    lines: doc.lines.map((line) => ({
      lineId: line.lineId,
      exerciseId: line.exerciseId,
      nameSnapshot: line.nameSnapshot,
      metric: line.metric,
      targetSets: line.targetSets ?? null,
      notes: line.notes ?? null,
    })),
  };
  if (doc.restPreferences) {
    payload.restPreferences = doc.restPreferences;
  }
  return payload;
}
