/** Pure helpers for building workout templates. */
import {
  getCatalogExerciseById,
  type CatalogExercise,
} from "@/lib/exercise-catalog";
import {
  alternateFromExercise,
  MAX_ALTERNATES,
  type LineSection,
} from "@/lib/line-grouping";
import {
  NOTE_LIMITS,
  type PlanLine,
  type WorkoutPlanDoc,
} from "@/lib/workout-types";
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
export function lineFromExercise(
  exercise: CatalogExercise,
  section: LineSection = "plan",
): PlanLine {
  return {
    lineId: newLineId(),
    exerciseId: exercise.id,
    nameSnapshot: exercise.name,
    metric: exercise.metric,
    targetSets: DEFAULT_TARGET_SETS,
    notes: null,
    ...(section === "maybe" ? { section } : {}),
  };
}

export function sectionOf(line: PlanLine): LineSection {
  return line.section ?? "plan";
}

/** Plan lines first, then maybes, each keeping its order. Sessions list them the same way. */
export function orderBySection(lines: PlanLine[]): PlanLine[] {
  return [
    ...lines.filter((line) => sectionOf(line) === "plan"),
    ...lines.filter((line) => sectionOf(line) === "maybe"),
  ];
}

/** Move a line to the other section; it lands at the end of that section. */
export function setLineSection(
  lines: PlanLine[],
  lineId: string,
  section: LineSection,
): PlanLine[] {
  const line = lines.find((l) => l.lineId === lineId);
  if (!line || sectionOf(line) === section) return lines;
  const moved: PlanLine = { ...line, section };
  // Plan is the default, so a plan line carries no section field.
  if (section === "plan") delete moved.section;
  return orderBySection([...lines.filter((l) => l.lineId !== lineId), moved]);
}

/** Swap a line with its neighbour in the same section. */
export function moveLineInSection(
  lines: PlanLine[],
  lineId: string,
  delta: -1 | 1,
): PlanLine[] {
  const ordered = orderBySection(lines);
  const section = ordered.find((l) => l.lineId === lineId);
  if (!section) return lines;
  const ids = ordered
    .filter((l) => sectionOf(l) === sectionOf(section))
    .map((l) => l.lineId);
  const at = ids.indexOf(lineId);
  const swapWith = ids[at + delta];
  if (!swapWith) return lines;
  const from = ordered.findIndex((l) => l.lineId === lineId);
  const to = ordered.findIndex((l) => l.lineId === swapWith);
  const next = [...ordered];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/** Can this exercise stand in for the line? Not itself, not twice, and only up to the limit. */
export function canAddAlternate(
  line: PlanLine,
  exercise: CatalogExercise,
): boolean {
  const alternates = line.alternates ?? [];
  return (
    exercise.id !== line.exerciseId &&
    alternates.length < MAX_ALTERNATES &&
    !alternates.some((alt) => alt.exerciseId === exercise.id)
  );
}

export function addAlternate(
  line: PlanLine,
  exercise: CatalogExercise,
): PlanLine {
  if (!canAddAlternate(line, exercise)) return line;
  return {
    ...line,
    alternates: [...(line.alternates ?? []), alternateFromExercise(exercise)],
  };
}

export function removeAlternate(line: PlanLine, exerciseId: string): PlanLine {
  const alternates = (line.alternates ?? []).filter(
    (alt) => alt.exerciseId !== exerciseId,
  );
  const next: PlanLine = { ...line, alternates };
  if (alternates.length === 0) delete next.alternates;
  return next;
}

export function clampTargetSets(n: number): number {
  return Math.max(1, Math.min(MAX_TARGET_SETS, Math.round(n)));
}

export function targetSetsOf(line: PlanLine): number {
  return line.targetSets ?? DEFAULT_TARGET_SETS;
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
    restPreferences: initial?.restPreferences ?? {
      autoRestTimer: false,
      defaultRestSec: 60,
    },
    lines: orderBySection(lines).map((line) => ({
      ...line,
      nameSnapshot:
        getCatalogExerciseById(line.exerciseId)?.name ?? line.nameSnapshot,
      notes: line.notes?.trim() || null,
    })),
  };
}
