import type { MuscleGroup } from "@/lib/progress-types";

export type ExerciseMetric =
  | "weight_reps"
  | "bodyweight_reps"
  | "duration"
  | "cardio";

export type CatalogExercise = {
  id: string;
  name: string;
  metric: ExerciseMetric;
  /** Main muscle group this move trains. Omitted on custom exercises. */
  primary?: MuscleGroup;
  /** Other groups that work as helpers. */
  secondary?: MuscleGroup[];
};

/**
 * Short `id` values (no commas) so they are safe in URL lists.
 * Keep existing starter ids stable: squat, deadlift, bench, row, ohp, pullup, dip, lunge, rdl, plank.
 */
function ex(
  id: string,
  name: string,
  metric: ExerciseMetric,
  primary: MuscleGroup,
  secondary?: MuscleGroup[],
): CatalogExercise {
  return secondary && secondary.length > 0
    ? { id, name, metric, primary, secondary }
    : { id, name, metric, primary };
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // —— Free weight / bodyweight staples ——
  ex("squat", "Barbell back squat", "weight_reps", "legs", ["core"]),
  ex("front-squat", "Barbell front squat", "weight_reps", "legs", ["core"]),
  ex("deadlift", "Conventional deadlift", "weight_reps", "back", ["legs"]),
  ex("sumo-deadlift", "Sumo deadlift", "weight_reps", "legs", ["back"]),
  ex("rdl", "Romanian deadlift", "weight_reps", "legs", ["back"]),
  ex("bench", "Barbell bench press", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex("incline-bench", "Incline barbell bench press", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex("decline-bench", "Decline barbell bench press", "weight_reps", "chest", [
    "arms",
  ]),
  ex("row", "Barbell row", "weight_reps", "back", ["arms"]),
  ex("ohp", "Overhead press", "weight_reps", "shoulders", ["arms"]),
  ex("pullup", "Pull-up", "bodyweight_reps", "back", ["arms"]),
  ex("chinup", "Chin-up", "bodyweight_reps", "back", ["arms"]),
  ex("dip", "Dip", "bodyweight_reps", "arms", ["chest", "shoulders"]),
  ex("lunge", "Walking lunge", "weight_reps", "legs"),
  ex("db-lunge", "Dumbbell reverse lunge", "weight_reps", "legs"),
  ex("plank", "Plank", "duration", "core"),
  ex("pushup", "Push-up", "bodyweight_reps", "chest", ["shoulders", "arms"]),
  ex("db-bench", "Dumbbell bench press", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex("db-incline-bench", "Dumbbell incline press", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex("db-shoulder-press", "Dumbbell shoulder press", "weight_reps", "shoulders", [
    "arms",
  ]),
  ex("db-row", "Dumbbell row", "weight_reps", "back", ["arms"]),
  ex("db-rdl", "Dumbbell Romanian deadlift", "weight_reps", "legs", ["back"]),
  ex("goblet-squat", "Goblet squat", "weight_reps", "legs", ["core"]),
  ex("hip-thrust", "Barbell hip thrust", "weight_reps", "legs"),
  ex("good-morning", "Good morning", "weight_reps", "legs", ["back"]),
  ex("barbell-curl", "Barbell curl", "weight_reps", "arms"),
  ex("db-curl", "Dumbbell curl", "weight_reps", "arms"),
  ex("skull-crusher", "Skull crusher", "weight_reps", "arms"),
  ex("db-lateral-raise", "Dumbbell lateral raise", "weight_reps", "shoulders"),
  ex("db-front-raise", "Dumbbell front raise", "weight_reps", "shoulders"),
  ex("db-rear-delt-fly", "Dumbbell rear delt fly", "weight_reps", "shoulders"),
  ex("arnold-press", "Arnold press", "weight_reps", "shoulders", ["arms"]),
  ex("upright-row", "Barbell upright row", "weight_reps", "shoulders", ["arms"]),
  ex("barbell-shrug", "Barbell shrug", "weight_reps", "back", ["shoulders"]),
  ex("db-shrug", "Dumbbell shrug", "weight_reps", "back", ["shoulders"]),
  ex("db-fly", "Dumbbell fly", "weight_reps", "chest"),
  ex("db-decline-bench", "Dumbbell decline press", "weight_reps", "chest", [
    "arms",
  ]),
  ex("floor-press", "Dumbbell floor press", "weight_reps", "chest", ["arms"]),
  ex("db-pullover", "Dumbbell pullover", "weight_reps", "back", ["chest"]),
  ex("bulgarian-split-squat", "Bulgarian split squat", "weight_reps", "legs"),
  ex("split-squat", "Split squat", "weight_reps", "legs"),
  ex("db-squat", "Dumbbell squat", "weight_reps", "legs", ["core"]),
  ex("step-up", "Dumbbell step-up", "weight_reps", "legs"),
  ex("single-leg-rdl", "Single-leg Romanian deadlift", "weight_reps", "legs", [
    "back",
  ]),
  ex("trap-bar-deadlift", "Trap-bar deadlift", "weight_reps", "legs", ["back"]),
  ex("db-calf-raise", "Dumbbell calf raise", "weight_reps", "legs"),
  ex("glute-bridge", "Glute bridge", "weight_reps", "legs"),
  ex("chest-supported-db-row", "Chest-supported dumbbell row", "weight_reps", "back", [
    "arms",
  ]),
  ex("inverted-row", "Inverted row", "bodyweight_reps", "back", ["arms"]),
  ex("db-hammer-curl", "Dumbbell hammer curl", "weight_reps", "arms"),
  ex("incline-db-curl", "Incline dumbbell curl", "weight_reps", "arms"),
  ex("concentration-curl", "Concentration curl", "weight_reps", "arms"),
  ex("ez-bar-curl", "EZ-bar curl", "weight_reps", "arms"),
  ex("preacher-curl", "Preacher curl", "weight_reps", "arms"),
  ex("reverse-curl", "Reverse curl", "weight_reps", "arms"),
  ex("db-kickback", "Dumbbell triceps kickback", "weight_reps", "arms"),
  ex(
    "db-oh-extension",
    "Dumbbell overhead triceps extension",
    "weight_reps",
    "arms",
  ),
  ex("close-grip-bench", "Close-grip bench press", "weight_reps", "arms", [
    "chest",
  ]),
  ex("kb-swing", "Kettlebell swing", "weight_reps", "legs", ["back", "core"]),
  ex("russian-twist", "Russian twist", "bodyweight_reps", "core"),
  ex("sit-up", "Sit-up", "bodyweight_reps", "core"),

  // —— Chest machines ——
  ex("chest-press-machine", "Chest press machine", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex(
    "incline-chest-press-machine",
    "Incline chest press machine",
    "weight_reps",
    "chest",
    ["shoulders", "arms"],
  ),
  ex(
    "decline-chest-press-machine",
    "Decline chest press machine",
    "weight_reps",
    "chest",
    ["arms"],
  ),
  ex("pec-deck", "Pec deck", "weight_reps", "chest"),
  ex("chest-fly-machine", "Chest fly machine", "weight_reps", "chest"),
  ex("smith-bench", "Smith machine bench press", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex("smith-incline-bench", "Smith machine incline press", "weight_reps", "chest", [
    "shoulders",
    "arms",
  ]),
  ex("assisted-dip-machine", "Assisted dip machine", "weight_reps", "arms", [
    "chest",
    "shoulders",
  ]),

  // —— Back machines ——
  ex("lat-pulldown", "Lat pulldown", "weight_reps", "back", ["arms"]),
  ex("close-grip-lat-pulldown", "Close-grip lat pulldown", "weight_reps", "back", [
    "arms",
  ]),
  ex("wide-grip-lat-pulldown", "Wide-grip lat pulldown", "weight_reps", "back", [
    "arms",
  ]),
  ex("seated-row-machine", "Seated row machine", "weight_reps", "back", ["arms"]),
  ex(
    "chest-supported-row-machine",
    "Chest-supported row machine",
    "weight_reps",
    "back",
    ["arms"],
  ),
  ex("t-bar-row-machine", "T-bar row machine", "weight_reps", "back", ["arms"]),
  ex("assisted-pullup-machine", "Assisted pull-up machine", "weight_reps", "back", [
    "arms",
  ]),
  ex("back-extension-machine", "Back extension machine", "weight_reps", "back", [
    "legs",
  ]),
  ex("hyperextension", "Hyperextension (back raise)", "weight_reps", "back", [
    "legs",
  ]),
  ex("smith-row", "Smith machine row", "weight_reps", "back", ["arms"]),

  // —— Shoulder machines ——
  ex(
    "shoulder-press-machine",
    "Shoulder press machine",
    "weight_reps",
    "shoulders",
    ["arms"],
  ),
  ex("lateral-raise-machine", "Lateral raise machine", "weight_reps", "shoulders"),
  ex("rear-delt-fly-machine", "Rear delt fly machine", "weight_reps", "shoulders"),
  ex("smith-ohp", "Smith machine overhead press", "weight_reps", "shoulders", [
    "arms",
  ]),
  ex("shrug-machine", "Shrug machine", "weight_reps", "back", ["shoulders"]),

  // —— Leg machines ——
  ex("leg-press", "Leg press", "weight_reps", "legs"),
  ex("horizontal-leg-press", "Horizontal leg press", "weight_reps", "legs"),
  ex("hack-squat-machine", "Hack squat machine", "weight_reps", "legs"),
  ex("v-squat-machine", "V-squat machine", "weight_reps", "legs"),
  ex("smith-squat", "Smith machine squat", "weight_reps", "legs"),
  ex("leg-extension", "Leg extension", "weight_reps", "legs"),
  ex("lying-leg-curl", "Lying leg curl", "weight_reps", "legs"),
  ex("seated-leg-curl", "Seated leg curl", "weight_reps", "legs"),
  ex("standing-leg-curl", "Standing leg curl", "weight_reps", "legs"),
  ex("hip-abduction-machine", "Hip abduction machine", "weight_reps", "legs"),
  ex("hip-adduction-machine", "Hip adduction machine", "weight_reps", "legs"),
  ex("glute-kickback-machine", "Glute kickback machine", "weight_reps", "legs"),
  ex("hip-thrust-machine", "Hip thrust machine", "weight_reps", "legs"),
  ex("calf-raise-machine", "Standing calf raise machine", "weight_reps", "legs"),
  ex("seated-calf-raise", "Seated calf raise machine", "weight_reps", "legs"),
  ex("calf-extension-machine", "Calf extension machine", "weight_reps", "legs"),
  ex(
    "donkey-calf-raise-machine",
    "Donkey calf raise machine",
    "weight_reps",
    "legs",
  ),
  ex("leg-press-calf-raise", "Leg press calf raise", "weight_reps", "legs"),
  ex("adductor-machine", "Adductor machine", "weight_reps", "legs"),
  ex("abductor-machine", "Abductor machine", "weight_reps", "legs"),
  ex("multi-hip-machine", "Multi-hip machine", "weight_reps", "legs"),
  ex("pendulum-squat", "Pendulum squat", "weight_reps", "legs"),
  ex("belt-squat", "Belt squat machine", "weight_reps", "legs"),

  // —— Arm machines ——
  ex("preacher-curl-machine", "Preacher curl machine", "weight_reps", "arms"),
  ex("bicep-curl-machine", "Biceps curl machine", "weight_reps", "arms"),
  ex(
    "triceps-extension-machine",
    "Triceps extension machine",
    "weight_reps",
    "arms",
  ),
  ex(
    "triceps-pushdown-machine",
    "Triceps pushdown (machine stack)",
    "weight_reps",
    "arms",
  ),
  ex("arm-curl-machine", "Arm curl machine", "weight_reps", "arms"),
  ex("dip-machine", "Triceps dip machine", "weight_reps", "arms", ["chest"]),

  // —— Cable station ——
  ex("cable-fly", "Cable chest fly", "weight_reps", "chest"),
  ex("cable-crossover", "Cable crossover", "weight_reps", "chest"),
  ex("cable-lat-pulldown", "Cable lat pulldown", "weight_reps", "back", ["arms"]),
  ex("cable-seated-row", "Cable seated row", "weight_reps", "back", ["arms"]),
  ex("cable-face-pull", "Cable face pull", "weight_reps", "shoulders", ["back"]),
  ex("cable-lateral-raise", "Cable lateral raise", "weight_reps", "shoulders"),
  ex("cable-rear-delt-fly", "Cable rear delt fly", "weight_reps", "shoulders"),
  ex("cable-tricep-pushdown", "Cable triceps pushdown", "weight_reps", "arms"),
  ex(
    "cable-overhead-extension",
    "Cable overhead triceps extension",
    "weight_reps",
    "arms",
  ),
  ex("cable-bicep-curl", "Cable biceps curl", "weight_reps", "arms"),
  ex("cable-hammer-curl", "Cable hammer curl", "weight_reps", "arms"),
  ex("cable-crunch", "Cable crunch", "weight_reps", "core"),
  ex("cable-woodchop", "Cable woodchop", "weight_reps", "core", ["shoulders"]),
  ex("cable-pull-through", "Cable pull-through", "weight_reps", "legs", ["back"]),
  ex("cable-kickback", "Cable glute kickback", "weight_reps", "legs"),
  ex("cable-shrug", "Cable shrug", "weight_reps", "back", ["shoulders"]),
  ex("straight-arm-pulldown", "Straight-arm pulldown", "weight_reps", "back"),
  ex("cable-upright-row", "Cable upright row", "weight_reps", "shoulders", [
    "arms",
  ]),

  // —— Core / midsection machines ——
  ex("ab-crunch-machine", "Ab crunch machine", "weight_reps", "core"),
  ex("rotary-torso-machine", "Rotary torso machine", "weight_reps", "core"),
  ex(
    "captains-chair",
    "Captain's chair knee raise",
    "bodyweight_reps",
    "core",
  ),
  ex("hanging-leg-raise", "Hanging leg raise", "bodyweight_reps", "core"),
  ex("lying-leg-raise", "Lying leg raise", "bodyweight_reps", "core"),
  ex("dead-bug", "Dead bug", "bodyweight_reps", "core"),
  ex("ab-wheel", "Ab wheel rollout", "bodyweight_reps", "core", ["shoulders"]),
  ex("side-plank", "Side plank", "duration", "core"),
  ex("hanging-knee-raise", "Hanging knee raise", "bodyweight_reps", "core"),

  // —— Functional / selectorized commons ——
  ex("smith-lunge", "Smith machine lunge", "weight_reps", "legs"),
  ex("smith-hip-thrust", "Smith machine hip thrust", "weight_reps", "legs"),
  ex("smith-calf-raise", "Smith machine calf raise", "weight_reps", "legs"),
  ex("smith-shrug", "Smith machine shrug", "weight_reps", "back", ["shoulders"]),
  ex("landmine-press", "Landmine press", "weight_reps", "shoulders", [
    "chest",
    "arms",
  ]),
  ex("landmine-row", "Landmine row", "weight_reps", "back", ["arms"]),
  ex("sled-push", "Sled push", "weight_reps", "legs", ["core", "shoulders"]),
  ex("farmer-carry", "Farmer carry", "weight_reps", "legs", ["core", "arms"]),

  // —— Cardio machines ——
  ex("treadmill", "Treadmill", "cardio", "cardio"),
  ex("elliptical", "Elliptical", "cardio", "cardio"),
  ex("stair-climber", "Stair climber", "cardio", "cardio"),
  ex("stationary-bike", "Stationary bike", "cardio", "cardio"),
  ex("row-erg", "Rowing machine", "cardio", "cardio"),
  ex("assault-bike", "Assault / air bike", "cardio", "cardio"),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

const byId = new Map(EXERCISE_CATALOG.map((e) => [e.id, e]));

export function getCatalogExerciseById(
  id: string,
): CatalogExercise | undefined {
  return byId.get(id);
}

function targetingMatchesQuery(
  exercise: CatalogExercise,
  q: string,
): boolean {
  const groups = [
    exercise.primary,
    ...(exercise.secondary ?? []),
  ].filter((g): g is MuscleGroup => Boolean(g));
  return groups.some(
    (g) => g === q || (q.length >= 3 && g.includes(q)),
  );
}

/** Filter catalog by name or muscle group (case-insensitive). Empty query returns all. */
export function filterCatalogExercises(query: string): CatalogExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      targetingMatchesQuery(item, q),
  );
}

/**
 * Keep primary matches first so a "chest" filter leads with chest work,
 * then compounds that only use chest as a helper.
 */
export function filterCatalogByMuscle(
  exercises: CatalogExercise[],
  group: MuscleGroup | null,
): CatalogExercise[] {
  if (!group) return exercises;
  const primary: CatalogExercise[] = [];
  const helper: CatalogExercise[] = [];
  for (const item of exercises) {
    if (item.primary === group) primary.push(item);
    else if (item.secondary?.includes(group)) helper.push(item);
  }
  return [...primary, ...helper];
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
    const found = byId.get(id);
    if (found) out.push(found);
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
