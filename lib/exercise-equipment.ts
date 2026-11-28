/** What you use for the exercise. Optional: custom exercises and new entries can leave it out. */
export type ExerciseEquipment =
  "free_weights" | "machine" | "cable" | "bodyweight" | "cardio_machine";

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  free_weights: "Free weights",
  machine: "Machines",
  cable: "Cables",
  bodyweight: "Bodyweight",
  cardio_machine: "Cardio machines",
};

/** Equipment filter chips in the exercise picker. */
export const CATALOG_EQUIPMENT_FILTERS: Array<{
  id: ExerciseEquipment;
  label: string;
}> = [
  { id: "free_weights", label: EQUIPMENT_LABELS.free_weights },
  { id: "machine", label: EQUIPMENT_LABELS.machine },
  { id: "cable", label: EQUIPMENT_LABELS.cable },
];

/** Catalog ids by equipment. Add new catalog ids to one of these lists. */
const EQUIPMENT_IDS: Record<ExerciseEquipment, string[]> = {
  free_weights: [
    "squat",
    "front-squat",
    "deadlift",
    "sumo-deadlift",
    "rdl",
    "bench",
    "incline-bench",
    "decline-bench",
    "row",
    "ohp",
    "lunge",
    "db-lunge",
    "db-bench",
    "db-incline-bench",
    "db-row",
    "db-rdl",
    "goblet-squat",
    "hip-thrust",
    "good-morning",
    "barbell-curl",
    "db-curl",
    "skull-crusher",
    "db-lateral-raise",
    "db-front-raise",
    "db-rear-delt-fly",
    "arnold-press",
    "upright-row",
    "barbell-shrug",
    "db-shrug",
    "db-fly",
    "db-decline-bench",
    "floor-press",
    "db-pullover",
    "bulgarian-split-squat",
    "split-squat",
    "db-squat",
    "step-up",
    "single-leg-rdl",
    "trap-bar-deadlift",
    "db-calf-raise",
    "glute-bridge",
    "db-hammer-curl",
    "incline-db-curl",
    "concentration-curl",
    "ez-bar-curl",
    "preacher-curl",
    "reverse-curl",
    "db-kickback",
    "close-grip-bench",
    "kb-swing",
    "landmine-press",
    "landmine-row",
    "farmer-carry",
  ],
  machine: [
    "db-shoulder-press",
    "chest-supported-db-row",
    "db-oh-extension",
    "chest-press-machine",
    "incline-chest-press-machine",
    "decline-chest-press-machine",
    "pec-deck",
    "chest-fly-machine",
    "smith-bench",
    "smith-incline-bench",
    "assisted-dip-machine",
    "lat-pulldown",
    "close-grip-lat-pulldown",
    "wide-grip-lat-pulldown",
    "seated-row-machine",
    "chest-supported-row-machine",
    "t-bar-row-machine",
    "assisted-pullup-machine",
    "back-extension-machine",
    "hyperextension",
    "smith-row",
    "shoulder-press-machine",
    "lateral-raise-machine",
    "rear-delt-fly-machine",
    "smith-ohp",
    "shrug-machine",
    "leg-press",
    "horizontal-leg-press",
    "hack-squat-machine",
    "v-squat-machine",
    "smith-squat",
    "leg-extension",
    "lying-leg-curl",
    "seated-leg-curl",
    "standing-leg-curl",
    "hip-abduction-machine",
    "hip-adduction-machine",
    "glute-kickback-machine",
    "hip-thrust-machine",
    "calf-raise-machine",
    "seated-calf-raise",
    "calf-extension-machine",
    "donkey-calf-raise-machine",
    "leg-press-calf-raise",
    "multi-hip-machine",
    "pendulum-squat",
    "belt-squat",
    "preacher-curl-machine",
    "bicep-curl-machine",
    "triceps-extension-machine",
    "triceps-pushdown-machine",
    "arm-curl-machine",
    "dip-machine",
    "ab-crunch-machine",
    "rotary-torso-machine",
    "smith-lunge",
    "smith-hip-thrust",
    "smith-calf-raise",
    "smith-shrug",
    "sled-push",
  ],
  cable: [
    "cable-fly",
    "cable-crossover",
    "cable-lat-pulldown",
    "cable-seated-row",
    "cable-face-pull",
    "cable-lateral-raise",
    "cable-rear-delt-fly",
    "cable-tricep-pushdown",
    "cable-overhead-extension",
    "cable-bicep-curl",
    "cable-hammer-curl",
    "cable-crunch",
    "cable-woodchop",
    "cable-pull-through",
    "cable-kickback",
    "cable-shrug",
    "straight-arm-pulldown",
    "cable-upright-row",
  ],
  bodyweight: [
    "pullup",
    "chinup",
    "dip",
    "plank",
    "pushup",
    "inverted-row",
    "russian-twist",
    "sit-up",
    "captains-chair",
    "hanging-leg-raise",
    "lying-leg-raise",
    "dead-bug",
    "ab-wheel",
    "side-plank",
    "hanging-knee-raise",
  ],
  cardio_machine: [
    "treadmill",
    "elliptical",
    "stair-climber",
    "stationary-bike",
    "row-erg",
    "assault-bike",
  ],
};

const EQUIPMENT_BY_ID = new Map<string, ExerciseEquipment>(
  (
    Object.entries(EQUIPMENT_IDS) as Array<[ExerciseEquipment, string[]]>
  ).flatMap(([equipment, ids]) => ids.map((id) => [id, equipment] as const)),
);

export function equipmentForId(id: string): ExerciseEquipment | undefined {
  return EQUIPMENT_BY_ID.get(id);
}

/** Words people type for each kind of equipment ("db", "kb", "free weight"…). */
const EQUIPMENT_SEARCH_TERMS: Record<ExerciseEquipment, string[]> = {
  free_weights: [
    "free weights",
    "free weight",
    "weights",
    "dumbbells",
    "dumbbell",
    "db",
    "barbells",
    "barbell",
    "bb",
    "kettlebells",
    "kettlebell",
    "kb",
  ],
  machine: ["machines", "machine", "selectorized"],
  cable: ["cables", "cable", "pulley"],
  bodyweight: ["bodyweight", "body weight", "calisthenics"],
  cardio_machine: ["cardio machine", "cardio machines"],
};

/**
 * True when the query is (the start of) a word for this equipment. Two-letter
 * shorthands like "db" must match exactly so they don't catch everything.
 */
export function equipmentMatchesQuery(
  equipment: ExerciseEquipment | undefined,
  q: string,
): boolean {
  if (!equipment) return false;
  return EQUIPMENT_SEARCH_TERMS[equipment].some((term) =>
    q.length >= 3 ? term.startsWith(q) : term === q,
  );
}
