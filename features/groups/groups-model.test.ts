import { describe, expect, it } from "vitest";
import {
  buildGroupWeek,
  buildTodayRows,
  sharedSetsLabel,
  sharedWorkoutMeta,
  sharedWorkoutsByWeek,
} from "@/features/groups/groups-model";
import {
  crew,
  ME,
  mayaWorkouts,
  TODAY,
} from "@/features/groups/story-fixtures";
import type { SharedSet } from "@/lib/shared-workouts";

describe("buildTodayRows", () => {
  const rows = buildTodayRows(crew, buildGroupWeek(crew, TODAY, ME), TODAY);

  it("lists who trained first, then who has something planned, never me", () => {
    expect(rows.map((r) => [r.name, r.status, r.detail])).toEqual([
      ["Maya", "trained", "Push day"],
      ["Priya", "trained", "Run"],
      ["Dev", "planned", "Full body planned"],
    ]);
  });

  it("leaves out people with nothing today", () => {
    expect(rows.map((r) => r.name)).not.toContain("Jordan");
    expect(rows.map((r) => r.name)).not.toContain("Alex");
  });

  it("carries whether each person shares their workouts", () => {
    expect(rows.find((r) => r.name === "Maya")!.sharesWorkouts).toBe(true);
    expect(rows.find((r) => r.name === "Priya")!.sharesWorkouts).toBe(false);
  });
});

describe("sharedWorkoutsByWeek", () => {
  it("splits into this week and last week", () => {
    const [thisWeek, lastWeek] = sharedWorkoutsByWeek(mayaWorkouts, TODAY);
    expect(thisWeek!.workouts.map((w) => w.title)).toEqual(["Push day", "Run"]);
    expect(lastWeek!.workouts.map((w) => w.title)).toEqual(["Leg day"]);
  });
});

function s(weight: number | null, reps: number): SharedSet {
  return {
    weight,
    reps,
    durationSec: null,
    timedSetSec: null,
    paceMph: null,
    inclinePercent: null,
    resistanceLevel: null,
    distanceMiles: null,
  };
}

describe("sharedSetsLabel", () => {
  it("collapses identical sets", () => {
    expect(sharedSetsLabel([s(95, 8), s(95, 8), s(95, 8)])).toBe(
      "3 sets of 95 lb × 8",
    );
  });

  it("lists sets that differ", () => {
    expect(sharedSetsLabel([s(95, 8), s(100, 6)])).toBe(
      "95 lb × 8, 100 lb × 6",
    );
  });
});

describe("sharedWorkoutMeta", () => {
  it("summarises duration, distance and exercise count", () => {
    expect(sharedWorkoutMeta(mayaWorkouts[0]!)).toBe("48 min · 3 exercises");
    expect(sharedWorkoutMeta(mayaWorkouts[1]!)).toBe("25 min · 2.4 mi");
  });
});
