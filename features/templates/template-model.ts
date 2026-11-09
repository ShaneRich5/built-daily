/** Pure helpers for building workout templates. */
import { getCatalogExerciseById, type CatalogExercise } from "@/lib/exercise-catalog";
import { NOTE_LIMITS, type PlanLine, type WorkoutPlanDoc } from "@/lib/workout-types";
import { metricLabel } from "@/features/workout-session/session-model";

export const MAX_TEMPLATE_LINES = 40;
const DEFAULT_TARGET_SETS = 3;
const MAX_TARGET_SETS = 20;

function newLineId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** A template line for a catalog (or custom) exercise, starting at 3 sets. */
export function lineFromExercise(exercise: CatalogExercise): PlanLine {
  return {
    lineId: newLineId(),
    exerciseId: exercise.id,
    nameSnapshot: exercise.name,
    metric: exercise.metric,
    targetSets: DEFAULT_TARGET_SETS,
    notes: null,
  };
}

export function clampTargetSets(n: number): number {
  return Math.max(1, Math.min(MAX_TARGET_SETS, Math.round(n)));
}

export function targetSetsOf(line: PlanLine): number {
  return line.targetSets ?? DEFAULT_TARGET_SETS;
}

/** Swap a line with its neighbour. */
export function moveLine(lines: PlanLine[], index: number, delta: -1 | 1): PlanLine[] {
  const to = index + delta;
  if (to < 0 || to >= lines.length) return lines;
  const next = [...lines];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}

/** "Weight × reps" (plus "· note" when the line has one). */
export function lineMeta(line: PlanLine): string {
  const parts = [metricLabel(line.metric)];
  if (line.notes?.trim()) parts.push("note");
  return parts.join(" · ");
}

/** The Firestore doc to save. Keeps createdAt and rest preferences from the loaded template. */
export function templateDoc(
  name: string,
  lines: PlanLine[],
  initial: WorkoutPlanDoc | null,
): WorkoutPlanDoc {
  const now = new Date();
  return {
    name: name.trim().slice(0, NOTE_LIMITS.title),
    createdAt: initial?.createdAt ?? now,
    updatedAt: now,
    source: "custom",
    // No UI edits this yet; carry over whatever the template already had.
    restPreferences: initial?.restPreferences ?? { autoRestTimer: false, defaultRestSec: 60 },
    lines: lines.map((line) => ({
      ...line,
      nameSnapshot: getCatalogExerciseById(line.exerciseId)?.name ?? line.nameSnapshot,
      notes: line.notes?.trim() || null,
    })),
  };
}
