/**
 * How a workout groups its exercises beyond plain order:
 * - `section`: "plan" (doing it) or "maybe" (only if there's time).
 * - `alternates`: other exercises that fill the same slot when a machine is taken.
 *
 * Both are optional on sessions and templates. Firestore only stores them when
 * they differ from the default, so older docs (and the MCP server) are unchanged.
 */
import {
  getCatalogExerciseById,
  type CatalogExercise,
  type ExerciseMetric,
} from "@/lib/exercise-catalog";

export type LineSection = "plan" | "maybe";

/** An exercise that can stand in for a line. Snapshotted so custom moves still work. */
export type AlternateExercise = {
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
};

export const MAX_ALTERNATES = 5;

const METRICS: ReadonlySet<string> = new Set<ExerciseMetric>([
  "weight_reps",
  "bodyweight_reps",
  "duration",
  "cardio",
]);

export function parseLineSection(raw: unknown): LineSection {
  return raw === "maybe" ? "maybe" : "plan";
}

export function parseAlternates(raw: unknown): AlternateExercise[] {
  if (!Array.isArray(raw)) return [];
  const out: AlternateExercise[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const exerciseId = typeof o.exerciseId === "string" ? o.exerciseId : "";
    const nameSnapshot = typeof o.nameSnapshot === "string" ? o.nameSnapshot.slice(0, 200) : "";
    const metric = typeof o.metric === "string" && METRICS.has(o.metric) ? (o.metric as ExerciseMetric) : null;
    if (!exerciseId || !nameSnapshot || !metric) continue;
    if (out.some((alt) => alt.exerciseId === exerciseId)) continue;
    out.push({ exerciseId, nameSnapshot, metric });
    if (out.length >= MAX_ALTERNATES) break;
  }
  return out;
}

/** Firestore fields for a line's grouping: nothing at all for a plain plan line. */
export function lineGroupingToFirestore(
  section: LineSection | undefined,
  alternates: AlternateExercise[] | undefined,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  if (section === "maybe") fields.section = "maybe";
  if (alternates && alternates.length > 0) {
    fields.alternates = alternates.slice(0, MAX_ALTERNATES).map((alt) => ({
      exerciseId: alt.exerciseId,
      nameSnapshot: alt.nameSnapshot,
      metric: alt.metric,
    }));
  }
  return fields;
}

export function alternateFromExercise(exercise: CatalogExercise): AlternateExercise {
  return { exerciseId: exercise.id, nameSnapshot: exercise.name, metric: exercise.metric };
}

/** The catalog entry when there is one (it knows the muscles), else the snapshot. */
export function exerciseFromAlternate(alt: AlternateExercise): CatalogExercise {
  const fromCatalog = getCatalogExerciseById(alt.exerciseId);
  if (fromCatalog && fromCatalog.metric === alt.metric) return fromCatalog;
  return { id: alt.exerciseId, name: alt.nameSnapshot, metric: alt.metric };
}
