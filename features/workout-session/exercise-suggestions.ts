import {
  getCatalogExerciseById,
  type CatalogExercise,
} from "@/lib/exercise-catalog";
import type { SavedWorkoutSession } from "@/lib/workout-session-repository";
import type { SessionLine } from "@/lib/workout-types";

function exerciseFromLine(line: SessionLine): CatalogExercise {
  return (
    getCatalogExerciseById(line.exerciseId) ?? {
      id: line.exerciseId,
      name: line.nameSnapshot,
      metric: line.metric,
    }
  );
}

/** Exercises from recent workouts, most recent first, without repeats. */
export function recentExercises(
  sessions: SavedWorkoutSession[],
  limit = 12,
): CatalogExercise[] {
  const seen = new Set<string>();
  const out: CatalogExercise[] = [];
  for (const { session } of sessions) {
    for (const line of session.lines) {
      if (seen.has(line.exerciseId)) continue;
      seen.add(line.exerciseId);
      out.push(exerciseFromLine(line));
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * What you usually do next, based on past workouts:
 * - strongest signal: the exercise that followed your latest one last time(s)
 * - weaker signal: exercises that shared a workout with what you've done today
 * With an empty workout, suggests the exercises you usually open with.
 */
export function suggestNextExercises(
  sessions: SavedWorkoutSession[],
  current: CatalogExercise[],
  limit = 3,
): CatalogExercise[] {
  const currentIds = new Set(current.map((exercise) => exercise.id));
  const latestId = current[current.length - 1]?.id;
  const scores = new Map<string, { exercise: CatalogExercise; score: number; order: number }>();
  let order = 0;

  const bump = (line: SessionLine, points: number) => {
    if (currentIds.has(line.exerciseId)) return;
    const existing = scores.get(line.exerciseId);
    if (existing) {
      existing.score += points;
    } else {
      scores.set(line.exerciseId, {
        exercise: exerciseFromLine(line),
        score: points,
        order: order++,
      });
    }
  };

  for (const { session } of sessions) {
    const lines = session.lines;
    if (!latestId) {
      if (lines[0]) bump(lines[0], 1);
      continue;
    }
    const latestIndex = lines.findIndex((line) => line.exerciseId === latestId);
    const next = latestIndex >= 0 ? lines[latestIndex + 1] : undefined;
    if (next) bump(next, 3);
    const overlaps = lines.some((line) => currentIds.has(line.exerciseId));
    if (overlaps) {
      for (const line of lines) bump(line, 1);
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.exercise);
}
