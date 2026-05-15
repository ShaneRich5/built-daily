export type ExerciseMetric = "weight_reps" | "bodyweight_reps" | "duration";

export type CatalogExercise = {
  id: string;
  name: string;
  metric: ExerciseMetric;
};

/** Short `id` values (no commas) so they are safe in URL lists. */
export const EXERCISE_CATALOG: CatalogExercise[] = [
  { id: "squat", name: "Squat", metric: "weight_reps" },
  { id: "deadlift", name: "Deadlift", metric: "weight_reps" },
  { id: "bench", name: "Bench press", metric: "weight_reps" },
  { id: "row", name: "Barbell row", metric: "weight_reps" },
  { id: "ohp", name: "Overhead press", metric: "weight_reps" },
  { id: "pullup", name: "Pull-up", metric: "bodyweight_reps" },
  { id: "dip", name: "Dip", metric: "bodyweight_reps" },
  { id: "lunge", name: "Lunge", metric: "weight_reps" },
  { id: "rdl", name: "Romanian deadlift", metric: "weight_reps" },
  { id: "plank", name: "Plank", metric: "duration" },
];

const byId = new Map(EXERCISE_CATALOG.map((e) => [e.id, e]));

export function getCatalogExerciseById(
  id: string,
): CatalogExercise | undefined {
  return byId.get(id);
}

/** Ad-hoc exercise for a live session or template line (bodyweight-style logging). */
export function catalogExerciseFromCustomName(name: string): CatalogExercise | null {
  const trimmed = name.trim().slice(0, 200);
  if (!trimmed) return null;
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `custom-${crypto.randomUUID()}`
      : `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    name: trimmed,
    metric: "bodyweight_reps",
  };
}

export function resolveCatalogExercises(ids: string[]): CatalogExercise[] {
  const out: CatalogExercise[] = [];
  for (const id of ids) {
    const ex = byId.get(id);
    if (ex) out.push(ex);
  }
  return out;
}

/** Minimal line shape for resolving custom / template exercises in URLs. */
export type PlanLineLike = {
  exerciseId: string;
  nameSnapshot: string;
  metric: ExerciseMetric;
};

/**
 * Resolve exercises for an active session URL: catalog first, then plan template
 * lines (for `custom-*` ids or renames).
 */
export function resolveExercisesFromUrl(
  orderedIds: string[],
  planLines: PlanLineLike[] | null | undefined,
): CatalogExercise[] {
  const fromPlan = new Map((planLines ?? []).map((l) => [l.exerciseId, l]));
  const out: CatalogExercise[] = [];
  for (const id of orderedIds) {
    const cat = byId.get(id);
    if (cat) {
      out.push(cat);
      continue;
    }
    const line = fromPlan.get(id);
    if (line) {
      out.push({
        id: line.exerciseId,
        name: line.nameSnapshot,
        metric: line.metric,
      });
    }
  }
  return out;
}
