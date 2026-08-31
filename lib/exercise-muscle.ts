import { getCatalogExerciseById } from "@/lib/exercise-catalog";
import type { MuscleGroup } from "@/lib/progress-types";

export type MuscleFocus = "full" | "upper" | "lower" | "arms";

export const MUSCLE_FOCUS_OPTIONS: Array<{ id: MuscleFocus; label: string }> = [
  { id: "full", label: "Full" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
  { id: "arms", label: "Arms" },
];

const UPPER_GROUPS: ReadonlySet<MuscleGroup> = new Set([
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
]);

const NAME_HINTS: Array<{ re: RegExp; group: MuscleGroup }> = [
  { re: /bench|chest|fly|pec/i, group: "chest" },
  { re: /row|pulldown|pull[- ]?up|lat|deadlift/i, group: "back" },
  { re: /dead[- ]?bug|leg raise|knee raise|plank|crunch|core|ab /i, group: "core" },
  { re: /squat|lunge|leg |calf|rdl|hip thrust/i, group: "legs" },
  { re: /ohp|overhead|raise|delt|shoulder/i, group: "shoulders" },
  { re: /curl|tricep|bicep|skull|extension/i, group: "arms" },
  { re: /run|bike|cardio|treadmill|elliptical|rowing/i, group: "cardio" },
];

export function muscleGroupForExercise(
  exerciseId: string,
  nameSnapshot: string,
): MuscleGroup {
  const fromCatalog = getCatalogExerciseById(exerciseId)?.primary;
  if (fromCatalog) return fromCatalog;
  for (const { re, group } of NAME_HINTS) {
    if (re.test(nameSnapshot) || re.test(exerciseId)) return group;
  }
  return "other";
}

export function muscleGroupLabel(group: MuscleGroup): string {
  switch (group) {
    case "chest":
      return "Chest";
    case "back":
      return "Back";
    case "shoulders":
      return "Shoulders";
    case "arms":
      return "Arms";
    case "legs":
      return "Legs";
    case "core":
      return "Core";
    case "cardio":
      return "Cardio";
    case "other":
      return "Other";
    default: {
      const _e: never = group;
      return _e;
    }
  }
}

/** Short picker subtitle, e.g. "Chest · also shoulders, arms". */
export function muscleTargetSummary(
  primary?: MuscleGroup,
  secondary?: MuscleGroup[],
): string | null {
  if (!primary || primary === "other") return null;
  const main = muscleGroupLabel(primary);
  const also = (secondary ?? []).filter(
    (g) => g !== primary && g !== "other" && g !== "cardio",
  );
  if (also.length === 0) return main;
  return `${main} · also ${also.map((g) => muscleGroupLabel(g).toLowerCase()).join(", ")}`;
}

function diagramGroups(
  primary?: MuscleGroup,
  secondary?: MuscleGroup[],
): MuscleGroup[] {
  const out: MuscleGroup[] = [];
  for (const g of [primary, ...(secondary ?? [])]) {
    if (!g || g === "cardio" || g === "other") continue;
    if (!out.includes(g)) out.push(g);
  }
  return out;
}

/**
 * Camera for the body diagram. Uses every tagged group so compounds like
 * deadlift stay on the full body instead of cropping out the legs.
 */
export function defaultMuscleFocus(
  primary?: MuscleGroup,
  secondary?: MuscleGroup[],
): MuscleFocus {
  const groups = diagramGroups(primary, secondary);
  if (groups.length === 0) return "full";
  const hasUpper = groups.some((g) => UPPER_GROUPS.has(g));
  const hasLower = groups.includes("legs");
  if (hasUpper && hasLower) return "full";
  if (groups.length === 1 && groups[0] === "arms") return "arms";
  if (hasLower) return "lower";
  if (hasUpper) return "upper";
  return "full";
}
