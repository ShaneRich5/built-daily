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

export function resolveCatalogExercises(ids: string[]): CatalogExercise[] {
  const out: CatalogExercise[] = [];
  for (const id of ids) {
    const ex = byId.get(id);
    if (ex) out.push(ex);
  }
  return out;
}
