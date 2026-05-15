/**
 * Default exercise lists for library starters (URL `p` + `e` params).
 * Keep exercise ids in sync with {@link EXERCISE_CATALOG}.
 */
export const STARTER_TEMPLATE_DEFINITIONS = [
  {
    id: "starter-full-body",
    name: "Full body",
    exerciseIds: ["squat", "bench", "row", "deadlift", "ohp", "plank"],
  },
  {
    id: "starter-upper",
    name: "Upper body",
    exerciseIds: ["bench", "row", "ohp", "pullup", "dip"],
  },
  {
    id: "starter-lower",
    name: "Lower body",
    exerciseIds: ["squat", "deadlift", "rdl", "lunge", "plank"],
  },
  {
    id: "starter-push",
    name: "Push",
    exerciseIds: ["bench", "ohp", "dip", "squat", "lunge", "plank"],
  },
  {
    id: "starter-pull",
    name: "Pull",
    exerciseIds: ["pullup", "row", "deadlift", "rdl", "bench", "plank"],
  },
] as const;
