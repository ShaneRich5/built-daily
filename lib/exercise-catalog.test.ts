import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  EXERCISE_CATALOG,
  filterCatalogExercises,
  getCatalogExerciseById,
  resolveCatalogExercises,
} from "@/lib/exercise-catalog";
import {
  muscleGroupForExercise,
  targetingForExercise,
} from "@/lib/exercise-muscle";
import { firestoreToWorkoutSessionDoc } from "@/lib/workout-session-mapper";

describe("merged hip machines", () => {
  it("lists each machine once", () => {
    const ids = EXERCISE_CATALOG.map((e) => e.id);
    expect(ids).toContain("hip-adduction-machine");
    expect(ids).toContain("hip-abduction-machine");
    expect(ids).not.toContain("adductor-machine");
    expect(ids).not.toContain("abductor-machine");
  });

  it("looks up the retired ids as the kept entries", () => {
    expect(getCatalogExerciseById("adductor-machine")?.id).toBe(
      "hip-adduction-machine",
    );
    expect(getCatalogExerciseById("abductor-machine")?.id).toBe(
      "hip-abduction-machine",
    );
    expect(
      resolveCatalogExercises(["adductor-machine"]).map((e) => e.id),
    ).toEqual(["hip-adduction-machine"]);
  });

  it("still finds the machine when searching the old name", () => {
    const ids = filterCatalogExercises("adductor").map((e) => e.id);
    expect(ids).toEqual(["hip-adduction-machine"]);
  });

  it("reads an old session line under the kept id and name", () => {
    const doc = firestoreToWorkoutSessionDoc({
      status: "completed",
      title: "Legs",
      startedAt: Timestamp.fromDate(new Date("2026-09-01T08:00:00")),
      endedAt: Timestamp.fromDate(new Date("2026-09-01T09:00:00")),
      lines: [
        {
          lineId: "l1",
          exerciseId: "adductor-machine",
          nameSnapshot: "Adductor machine",
          metric: "weight_reps",
          sets: [{ weight: 50, reps: 12 }],
        },
      ],
    });
    expect(doc?.lines[0]).toMatchObject({
      exerciseId: "hip-adduction-machine",
      nameSnapshot: "Hip adduction machine",
    });
  });
});

describe("warm-up exercises", () => {
  it("tags warm-ups with a category and no muscle group", () => {
    const warmups = EXERCISE_CATALOG.filter((e) => e.category === "warmup");
    expect(warmups.length).toBeGreaterThanOrEqual(8);
    for (const exercise of warmups) expect(exercise.primary).toBeUndefined();
    expect(warmups.map((e) => e.id)).toContain("dynamic-stretching");
  });

  it("is found by searching warm-up or mobility", () => {
    expect(filterCatalogExercises("warm-up").map((e) => e.id)).toContain(
      "foam-rolling",
    );
    expect(filterCatalogExercises("mobility").length).toBeGreaterThan(0);
  });

  it("keeps warm-ups out of muscle scores and out of muscle inference", () => {
    expect(muscleGroupForExercise("leg-swings", "Leg swings")).toBe("other");
    expect(
      targetingForExercise({ id: "leg-swings", name: "Leg swings" }),
    ).toEqual({});
  });
});
