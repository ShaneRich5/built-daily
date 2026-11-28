import {
  catalogExerciseFromCustomName,
  EXERCISE_CATALOG,
  type CatalogExercise,
  type ExerciseMetric,
} from "@/lib/exercise-catalog";

export function isCustomExercise(exercise: CatalogExercise): boolean {
  return exercise.id.startsWith("custom-");
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Keep the custom exercises from a list (newest first stays first) and drop
 * repeats of the same name, so old duplicates show up once.
 */
export function pastCustomExercises(
  exercises: CatalogExercise[],
): CatalogExercise[] {
  const out: CatalogExercise[] = [];
  for (const exercise of exercises) {
    if (!isCustomExercise(exercise)) continue;
    if (out.some((kept) => sameName(kept.name, exercise.name))) continue;
    out.push(exercise);
  }
  return out;
}

/** Past custom exercises whose name contains the query (case-insensitive). */
export function filterPastCustom(
  query: string,
  past: CatalogExercise[],
): CatalogExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return past;
  return past.filter((exercise) => exercise.name.toLowerCase().includes(q));
}

export type CustomExerciseMatch = {
  exercise: CatalogExercise;
  /** Where it came from: a built-in, one you made before, or brand new. */
  source: "catalog" | "past" | "new";
};

/**
 * Turn a typed name into an exercise. A name that matches a built-in or one of
 * your past custom exercises (ignoring case and spaces) reuses it, so history
 * stays in one place; otherwise a new custom exercise is made with `metric`.
 */
export function resolveCustomExercise(
  name: string,
  metric: ExerciseMetric,
  past: CatalogExercise[],
): CustomExerciseMatch | null {
  const builtIn = EXERCISE_CATALOG.find((e) => sameName(e.name, name));
  if (builtIn) return { exercise: builtIn, source: "catalog" };
  const earlier = past.find((e) => sameName(e.name, name));
  if (earlier) return { exercise: earlier, source: "past" };
  const created = catalogExerciseFromCustomName(name, metric);
  return created ? { exercise: created, source: "new" } : null;
}
