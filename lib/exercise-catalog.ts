export type ExerciseMetric = "weight_reps" | "bodyweight_reps" | "duration";

export type CatalogExercise = {
  id: string;
  name: string;
  metric: ExerciseMetric;
};

/**
 * Short `id` values (no commas) so they are safe in URL lists.
 * Keep existing starter ids stable: squat, deadlift, bench, row, ohp, pullup, dip, lunge, rdl, plank.
 */
export const EXERCISE_CATALOG: CatalogExercise[] = ([
  // —— Free weight / bodyweight staples ——
  { id: "squat", name: "Barbell back squat", metric: "weight_reps" },
  { id: "front-squat", name: "Barbell front squat", metric: "weight_reps" },
  { id: "deadlift", name: "Conventional deadlift", metric: "weight_reps" },
  { id: "sumo-deadlift", name: "Sumo deadlift", metric: "weight_reps" },
  { id: "rdl", name: "Romanian deadlift", metric: "weight_reps" },
  { id: "bench", name: "Barbell bench press", metric: "weight_reps" },
  { id: "incline-bench", name: "Incline barbell bench press", metric: "weight_reps" },
  { id: "decline-bench", name: "Decline barbell bench press", metric: "weight_reps" },
  { id: "row", name: "Barbell row", metric: "weight_reps" },
  { id: "ohp", name: "Overhead press", metric: "weight_reps" },
  { id: "pullup", name: "Pull-up", metric: "bodyweight_reps" },
  { id: "chinup", name: "Chin-up", metric: "bodyweight_reps" },
  { id: "dip", name: "Dip", metric: "bodyweight_reps" },
  { id: "lunge", name: "Walking lunge", metric: "weight_reps" },
  { id: "db-lunge", name: "Dumbbell reverse lunge", metric: "weight_reps" },
  { id: "plank", name: "Plank", metric: "duration" },
  { id: "pushup", name: "Push-up", metric: "bodyweight_reps" },
  { id: "db-bench", name: "Dumbbell bench press", metric: "weight_reps" },
  { id: "db-incline-bench", name: "Dumbbell incline press", metric: "weight_reps" },
  { id: "db-shoulder-press", name: "Dumbbell shoulder press", metric: "weight_reps" },
  { id: "db-row", name: "Dumbbell row", metric: "weight_reps" },
  { id: "db-rdl", name: "Dumbbell Romanian deadlift", metric: "weight_reps" },
  { id: "goblet-squat", name: "Goblet squat", metric: "weight_reps" },
  { id: "hip-thrust", name: "Barbell hip thrust", metric: "weight_reps" },
  { id: "good-morning", name: "Good morning", metric: "weight_reps" },
  { id: "barbell-curl", name: "Barbell curl", metric: "weight_reps" },
  { id: "db-curl", name: "Dumbbell curl", metric: "weight_reps" },
  { id: "skull-crusher", name: "Skull crusher", metric: "weight_reps" },
  { id: "db-lateral-raise", name: "Dumbbell lateral raise", metric: "weight_reps" },
  { id: "db-fly", name: "Dumbbell fly", metric: "weight_reps" },
  { id: "bulgarian-split-squat", name: "Bulgarian split squat", metric: "weight_reps" },

  // —— Chest machines ——
  { id: "chest-press-machine", name: "Chest press machine", metric: "weight_reps" },
  { id: "incline-chest-press-machine", name: "Incline chest press machine", metric: "weight_reps" },
  { id: "decline-chest-press-machine", name: "Decline chest press machine", metric: "weight_reps" },
  { id: "pec-deck", name: "Pec deck", metric: "weight_reps" },
  { id: "chest-fly-machine", name: "Chest fly machine", metric: "weight_reps" },
  { id: "smith-bench", name: "Smith machine bench press", metric: "weight_reps" },
  { id: "smith-incline-bench", name: "Smith machine incline press", metric: "weight_reps" },
  { id: "assisted-dip-machine", name: "Assisted dip machine", metric: "weight_reps" },

  // —— Back machines ——
  { id: "lat-pulldown", name: "Lat pulldown", metric: "weight_reps" },
  { id: "close-grip-lat-pulldown", name: "Close-grip lat pulldown", metric: "weight_reps" },
  { id: "wide-grip-lat-pulldown", name: "Wide-grip lat pulldown", metric: "weight_reps" },
  { id: "seated-row-machine", name: "Seated row machine", metric: "weight_reps" },
  { id: "chest-supported-row-machine", name: "Chest-supported row machine", metric: "weight_reps" },
  { id: "t-bar-row-machine", name: "T-bar row machine", metric: "weight_reps" },
  { id: "assisted-pullup-machine", name: "Assisted pull-up machine", metric: "weight_reps" },
  { id: "back-extension-machine", name: "Back extension machine", metric: "weight_reps" },
  { id: "hyperextension", name: "Hyperextension (back raise)", metric: "weight_reps" },
  { id: "smith-row", name: "Smith machine row", metric: "weight_reps" },

  // —— Shoulder machines ——
  { id: "shoulder-press-machine", name: "Shoulder press machine", metric: "weight_reps" },
  { id: "lateral-raise-machine", name: "Lateral raise machine", metric: "weight_reps" },
  { id: "rear-delt-fly-machine", name: "Rear delt fly machine", metric: "weight_reps" },
  { id: "smith-ohp", name: "Smith machine overhead press", metric: "weight_reps" },
  { id: "shrug-machine", name: "Shrug machine", metric: "weight_reps" },

  // —— Leg machines ——
  { id: "leg-press", name: "Leg press", metric: "weight_reps" },
  { id: "horizontal-leg-press", name: "Horizontal leg press", metric: "weight_reps" },
  { id: "hack-squat-machine", name: "Hack squat machine", metric: "weight_reps" },
  { id: "v-squat-machine", name: "V-squat machine", metric: "weight_reps" },
  { id: "smith-squat", name: "Smith machine squat", metric: "weight_reps" },
  { id: "leg-extension", name: "Leg extension", metric: "weight_reps" },
  { id: "lying-leg-curl", name: "Lying leg curl", metric: "weight_reps" },
  { id: "seated-leg-curl", name: "Seated leg curl", metric: "weight_reps" },
  { id: "standing-leg-curl", name: "Standing leg curl", metric: "weight_reps" },
  { id: "hip-abduction-machine", name: "Hip abduction machine", metric: "weight_reps" },
  { id: "hip-adduction-machine", name: "Hip adduction machine", metric: "weight_reps" },
  { id: "glute-kickback-machine", name: "Glute kickback machine", metric: "weight_reps" },
  { id: "hip-thrust-machine", name: "Hip thrust machine", metric: "weight_reps" },
  { id: "calf-raise-machine", name: "Standing calf raise machine", metric: "weight_reps" },
  { id: "seated-calf-raise", name: "Seated calf raise machine", metric: "weight_reps" },
  { id: "leg-press-calf-raise", name: "Leg press calf raise", metric: "weight_reps" },
  { id: "adductor-machine", name: "Adductor machine", metric: "weight_reps" },
  { id: "abductor-machine", name: "Abductor machine", metric: "weight_reps" },
  { id: "multi-hip-machine", name: "Multi-hip machine", metric: "weight_reps" },
  { id: "pendulum-squat", name: "Pendulum squat", metric: "weight_reps" },
  { id: "belt-squat", name: "Belt squat machine", metric: "weight_reps" },

  // —— Arm machines ——
  { id: "preacher-curl-machine", name: "Preacher curl machine", metric: "weight_reps" },
  { id: "bicep-curl-machine", name: "Biceps curl machine", metric: "weight_reps" },
  { id: "triceps-extension-machine", name: "Triceps extension machine", metric: "weight_reps" },
  { id: "triceps-pushdown-machine", name: "Triceps pushdown (machine stack)", metric: "weight_reps" },
  { id: "arm-curl-machine", name: "Arm curl machine", metric: "weight_reps" },
  { id: "dip-machine", name: "Triceps dip machine", metric: "weight_reps" },

  // —— Cable station ——
  { id: "cable-fly", name: "Cable chest fly", metric: "weight_reps" },
  { id: "cable-crossover", name: "Cable crossover", metric: "weight_reps" },
  { id: "cable-lat-pulldown", name: "Cable lat pulldown", metric: "weight_reps" },
  { id: "cable-seated-row", name: "Cable seated row", metric: "weight_reps" },
  { id: "cable-face-pull", name: "Cable face pull", metric: "weight_reps" },
  { id: "cable-lateral-raise", name: "Cable lateral raise", metric: "weight_reps" },
  { id: "cable-rear-delt-fly", name: "Cable rear delt fly", metric: "weight_reps" },
  { id: "cable-tricep-pushdown", name: "Cable triceps pushdown", metric: "weight_reps" },
  { id: "cable-overhead-extension", name: "Cable overhead triceps extension", metric: "weight_reps" },
  { id: "cable-bicep-curl", name: "Cable biceps curl", metric: "weight_reps" },
  { id: "cable-hammer-curl", name: "Cable hammer curl", metric: "weight_reps" },
  { id: "cable-crunch", name: "Cable crunch", metric: "weight_reps" },
  { id: "cable-woodchop", name: "Cable woodchop", metric: "weight_reps" },
  { id: "cable-pull-through", name: "Cable pull-through", metric: "weight_reps" },
  { id: "cable-kickback", name: "Cable glute kickback", metric: "weight_reps" },
  { id: "cable-shrug", name: "Cable shrug", metric: "weight_reps" },
  { id: "straight-arm-pulldown", name: "Straight-arm pulldown", metric: "weight_reps" },
  { id: "cable-upright-row", name: "Cable upright row", metric: "weight_reps" },

  // —— Core / midsection machines ——
  { id: "ab-crunch-machine", name: "Ab crunch machine", metric: "weight_reps" },
  { id: "rotary-torso-machine", name: "Rotary torso machine", metric: "weight_reps" },
  { id: "captains-chair", name: "Captain's chair knee raise", metric: "bodyweight_reps" },
  { id: "hanging-leg-raise", name: "Hanging leg raise", metric: "bodyweight_reps" },
  { id: "ab-wheel", name: "Ab wheel rollout", metric: "bodyweight_reps" },
  { id: "side-plank", name: "Side plank", metric: "duration" },
  { id: "hanging-knee-raise", name: "Hanging knee raise", metric: "bodyweight_reps" },

  // —— Functional / selectorized commons ——
  { id: "smith-lunge", name: "Smith machine lunge", metric: "weight_reps" },
  { id: "smith-hip-thrust", name: "Smith machine hip thrust", metric: "weight_reps" },
  { id: "smith-calf-raise", name: "Smith machine calf raise", metric: "weight_reps" },
  { id: "smith-shrug", name: "Smith machine shrug", metric: "weight_reps" },
  { id: "landmine-press", name: "Landmine press", metric: "weight_reps" },
  { id: "landmine-row", name: "Landmine row", metric: "weight_reps" },
  { id: "sled-push", name: "Sled push", metric: "weight_reps" },
  { id: "farmer-carry", name: "Farmer carry", metric: "weight_reps" },

  // —— Cardio machines (time-based) ——
  { id: "treadmill", name: "Treadmill", metric: "duration" },
  { id: "elliptical", name: "Elliptical", metric: "duration" },
  { id: "stair-climber", name: "Stair climber", metric: "duration" },
  { id: "stationary-bike", name: "Stationary bike", metric: "duration" },
  { id: "row-erg", name: "Rowing machine", metric: "duration" },
  { id: "assault-bike", name: "Assault / air bike", metric: "duration" },
] as CatalogExercise[]).sort((a, b) => a.name.localeCompare(b.name, "en"));

const byId = new Map(EXERCISE_CATALOG.map((e) => [e.id, e]));

export function getCatalogExerciseById(
  id: string,
): CatalogExercise | undefined {
  return byId.get(id);
}

/** Filter catalog by name (case-insensitive). Empty query returns all. */
export function filterCatalogExercises(query: string): CatalogExercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_CATALOG;
  return EXERCISE_CATALOG.filter(
    (ex) =>
      ex.name.toLowerCase().includes(q) || ex.id.toLowerCase().includes(q),
  );
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
