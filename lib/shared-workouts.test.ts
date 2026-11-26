import { describe, expect, it } from "vitest";
import {
  buildSharedWorkouts,
  firestoreToSharedWorkoutsDoc,
  sharedWorkoutsDocToFirestore,
  SHARED_WORKOUT_LIMITS,
  type SharedWorkoutSessionInput,
} from "@/lib/shared-workouts";

// Tue Nov 10 2026: this week is Sun Nov 8 – Sat Nov 14, last week starts Sun Nov 1.
const TODAY = "2026-11-10";

function set(extra: Record<string, unknown> = {}) {
  return {
    weight: 95,
    reps: 8,
    durationSec: null,
    timedSetSec: null,
    paceMph: null,
    inclinePercent: null,
    resistanceLevel: null,
    distanceMiles: null,
    note: null,
    ...extra,
  };
}

function session(
  overrides: Partial<SharedWorkoutSessionInput> = {},
): SharedWorkoutSessionInput {
  return {
    id: "s1",
    status: "completed",
    title: "Push day",
    workoutDate: TODAY,
    startedAt: new Date("2026-11-10T07:00:00"),
    endedAt: new Date("2026-11-10T07:48:00"),
    activeDurationSec: 48 * 60,
    lines: [
      {
        lineId: "l1",
        exerciseId: "bench",
        nameSnapshot: "Bench press",
        metric: "weight_reps",
        sets: [set(), set()],
      },
    ],
    ...overrides,
  };
}

describe("buildSharedWorkouts", () => {
  it("shares exercises and logged sets with the workout's name and duration", () => {
    const [w] = buildSharedWorkouts([session()], [], TODAY);
    expect(w).toMatchObject({
      id: "s1",
      kind: "workout",
      dateKey: TODAY,
      title: "Push day",
      durationMin: 48,
    });
    expect(w!.exercises).toEqual([
      {
        name: "Bench press",
        metric: "weight_reps",
        sets: [
          expect.objectContaining({ weight: 95, reps: 8 }),
          expect.objectContaining({ weight: 95, reps: 8 }),
        ],
      },
    ]);
  });

  it("never copies notes, set notes or the done flag", () => {
    const [w] = buildSharedWorkouts(
      [
        session({
          lines: [
            {
              nameSnapshot: "Bench press",
              metric: "weight_reps",
              sets: [set({ note: "felt heavy", done: true })],
              notes: "shoulder twinge",
            },
          ],
        }),
      ],
      [],
      TODAY,
    );
    const json = JSON.stringify(w);
    expect(json).not.toContain("felt heavy");
    expect(json).not.toContain("shoulder twinge");
    expect(Object.keys(w!.exercises[0]!.sets[0]!)).not.toContain("note");
    expect(Object.keys(w!.exercises[0]!.sets[0]!)).not.toContain("done");
  });

  it("skips sets left unchecked and exercises with nothing logged", () => {
    const [w] = buildSharedWorkouts(
      [
        session({
          lines: [
            {
              nameSnapshot: "Bench press",
              metric: "weight_reps",
              sets: [set({ done: true }), set({ done: false, weight: 200 })],
            },
            {
              nameSnapshot: "Dips",
              metric: "bodyweight_reps",
              sets: [set({ weight: null, reps: null })],
            },
          ],
        }),
      ],
      [],
      TODAY,
    );
    expect(w!.exercises).toHaveLength(1);
    expect(w!.exercises[0]!.sets).toHaveLength(1);
    expect(w!.exercises[0]!.sets[0]!.weight).toBe(95);
  });

  it("keeps this week and last week only, newest first, activities included", () => {
    const out = buildSharedWorkouts(
      [
        session({ id: "this-week", workoutDate: "2026-11-09" }),
        session({ id: "last-week", workoutDate: "2026-11-01" }),
        session({ id: "too-old", workoutDate: "2026-10-31" }),
        session({ id: "draft", status: "in_progress" }),
      ],
      [
        {
          id: "run",
          activityDate: TODAY,
          label: "Run",
          durationMin: 25,
          distanceMiles: 2.4,
          at: new Date("2026-11-10T08:00:00"),
        },
      ],
      TODAY,
    );
    expect(out.map((w) => w.id)).toEqual([
      "activity-run",
      "this-week",
      "last-week",
    ]);
    expect(out[0]).toMatchObject({
      kind: "activity",
      title: "Run",
      durationMin: 25,
      distanceMiles: 2.4,
      exercises: [],
    });
  });

  it("caps the number of workouts", () => {
    const many = Array.from({ length: 40 }, (_, i) => session({ id: `s${i}` }));
    expect(buildSharedWorkouts(many, [], TODAY)).toHaveLength(
      SHARED_WORKOUT_LIMITS.workouts,
    );
  });

  it("tolerates malformed stored lines", () => {
    const [w] = buildSharedWorkouts(
      [session({ lines: [null, "x", { nameSnapshot: "Row", sets: "no" }] })],
      [],
      TODAY,
    );
    expect(w!.exercises).toEqual([]);
  });
});

describe("shared workouts doc round trip", () => {
  it("reads back what it writes", () => {
    const workouts = buildSharedWorkouts([session()], [], TODAY);
    const stored = sharedWorkoutsDocToFirestore({
      uid: "u1",
      workouts,
      updatedAtMs: 1,
    });
    expect(firestoreToSharedWorkoutsDoc(stored)).toEqual({
      uid: "u1",
      workouts,
      updatedAtMs: 1,
    });
  });

  it("drops rows without an id or day", () => {
    const doc = firestoreToSharedWorkoutsDoc({
      uid: "u1",
      workouts: [{ title: "No id", dateKey: TODAY }, { id: "x" }],
    });
    expect(doc!.workouts).toEqual([]);
  });
});
