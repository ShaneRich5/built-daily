import type { MuscleGroup } from "@/lib/progress-types";

/** Lightweight tags for progress “favorite muscle group” (catalog ids). */
const BY_ID: Record<string, MuscleGroup> = {
  bench: "chest",
  "incline-bench": "chest",
  "decline-bench": "chest",
  "db-bench": "chest",
  "db-incline-bench": "chest",
  "chest-press-machine": "chest",
  "incline-chest-press-machine": "chest",
  "push-up": "chest",
  row: "back",
  "db-row": "back",
  "lat-pulldown": "back",
  "pull-up": "back",
  "chin-up": "back",
  "seated-row-machine": "back",
  "cable-seated-row": "back",
  deadlift: "back",
  "romanian-deadlift": "legs",
  squat: "legs",
  "front-squat": "legs",
  "goblet-squat": "legs",
  "leg-press": "legs",
  "horizontal-leg-press": "legs",
  lunge: "legs",
  "bulgarian-split-squat": "legs",
  "leg-curl": "legs",
  "leg-extension": "legs",
  "standing-calf-raise": "legs",
  "seated-calf-raise": "legs",
  ohp: "shoulders",
  "db-shoulder-press": "shoulders",
  "shoulder-press-machine": "shoulders",
  "lateral-raise": "shoulders",
  "face-pull": "shoulders",
  "bicep-curl": "arms",
  "hammer-curl": "arms",
  "tricep-pushdown": "arms",
  dip: "arms",
  plank: "core",
  "side-plank": "core",
  crunch: "core",
  "lying-leg-raise": "core",
  "hanging-leg-raise": "core",
  "hanging-knee-raise": "core",
  "dead-bug": "core",
  "ab-wheel": "core",
  "cable-crunch": "core",
  "captains-chair": "core",
  "treadmill-run": "cardio",
  "treadmill-walk": "cardio",
  "stationary-bike": "cardio",
  elliptical: "cardio",
  "row-erg": "cardio",
};

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
  const fromId = BY_ID[exerciseId];
  if (fromId) return fromId;
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
