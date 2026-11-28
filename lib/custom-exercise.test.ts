import { describe, expect, it } from "vitest";
import {
  filterPastCustom,
  pastCustomExercises,
  resolveCustomExercise,
} from "@/lib/custom-exercise";
import {
  catalogExerciseFromCustomName,
  type CatalogExercise,
} from "@/lib/exercise-catalog";

const stretch: CatalogExercise = {
  id: "custom-1",
  name: "Dynamic stretch",
  metric: "duration",
};

describe("catalogExerciseFromCustomName", () => {
  it("uses the chosen metric and defaults to reps + weight", () => {
    expect(catalogExerciseFromCustomName("Goblet squat")?.metric).toBe(
      "weight_reps",
    );
    expect(catalogExerciseFromCustomName("Stretch", "duration")?.metric).toBe(
      "duration",
    );
  });

  it("returns null for a blank name", () => {
    expect(catalogExerciseFromCustomName("   ")).toBeNull();
  });
});

describe("pastCustomExercises", () => {
  it("keeps only custom exercises, one per name", () => {
    const list: CatalogExercise[] = [
      stretch,
      { id: "squat", name: "Barbell back squat", metric: "weight_reps" },
      { id: "custom-2", name: " dynamic STRETCH ", metric: "bodyweight_reps" },
    ];
    expect(pastCustomExercises(list)).toEqual([stretch]);
  });
});

describe("filterPastCustom", () => {
  it("matches by name, ignoring case", () => {
    expect(filterPastCustom("STRETCH", [stretch])).toEqual([stretch]);
    expect(filterPastCustom("curl", [stretch])).toEqual([]);
  });
});

describe("resolveCustomExercise", () => {
  it("reuses a past custom exercise's id and metric", () => {
    const match = resolveCustomExercise("  dynamic stretch ", "weight_reps", [
      stretch,
    ]);
    expect(match?.source).toBe("past");
    expect(match?.exercise).toEqual(stretch);
  });

  it("prefers the built-in when the name matches one exactly", () => {
    const match = resolveCustomExercise("barbell back squat", "duration", []);
    expect(match?.source).toBe("catalog");
    expect(match?.exercise.id).toBe("squat");
  });

  it("makes a new exercise with the chosen metric otherwise", () => {
    const match = resolveCustomExercise(
      "Zercher carry bar hold",
      "weight_reps",
      [stretch],
    );
    expect(match?.source).toBe("new");
    expect(match?.exercise.id.startsWith("custom-")).toBe(true);
    expect(match?.exercise.metric).toBe("weight_reps");
  });

  it("returns null for a blank name", () => {
    expect(resolveCustomExercise(" ", "duration", [])).toBeNull();
  });
});
