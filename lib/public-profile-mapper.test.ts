import { describe, expect, it } from "vitest";
import { effectiveWorkoutsThisWeek } from "@/lib/public-profile-mapper";

describe("effectiveWorkoutsThisWeek", () => {
  it("returns zero when the profile has never logged a workout", () => {
    expect(
      effectiveWorkoutsThisWeek(
        { workoutsThisWeek: 3, lastWorkoutDateKey: null },
        "2026-09-16",
      ),
    ).toBe(0);
  });

  it("keeps the count when the last workout is in the viewer's week", () => {
    expect(
      effectiveWorkoutsThisWeek(
        { workoutsThisWeek: 3, lastWorkoutDateKey: "2026-09-13" },
        "2026-09-16",
      ),
    ).toBe(3);
  });

  it("resets the count once the week has rolled over", () => {
    expect(
      effectiveWorkoutsThisWeek(
        { workoutsThisWeek: 3, lastWorkoutDateKey: "2026-09-12" },
        "2026-09-16",
      ),
    ).toBe(0);
  });

  it("treats a Sunday workout as part of the week it opens", () => {
    expect(
      effectiveWorkoutsThisWeek(
        { workoutsThisWeek: 1, lastWorkoutDateKey: "2026-09-13" },
        "2026-09-19",
      ),
    ).toBe(1);
  });
});
