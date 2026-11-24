import { describe, expect, it } from "vitest";
import { startOfWeekDateKey } from "@/lib/calendar-views";
import { workoutsInWeek } from "@/lib/progress-insights";
import type { WorkoutActivityByDay } from "@/lib/workout-activity";

describe("workoutsInWeek", () => {
  const activity: WorkoutActivityByDay = new Map([
    ["2026-09-12", 1], // Sat — previous week
    ["2026-09-13", 1], // Sun — first day of the week under test
    ["2026-09-16", 2], // Wed
    ["2026-09-19", 1], // Sat — last day of the week under test
    ["2026-09-20", 1], // Sun — next week
  ]);

  it("counts the seven days starting at the given Sunday", () => {
    expect(workoutsInWeek(activity, "2026-09-13")).toBe(4);
  });

  it("excludes days outside the window", () => {
    expect(workoutsInWeek(activity, "2026-09-20")).toBe(1);
  });

  it("returns zero for a week with no activity", () => {
    expect(workoutsInWeek(activity, "2026-10-04")).toBe(0);
  });

  /**
   * Regression: weeks used to start on Monday, so a Sunday workout was
   * counted in the week that had just ended rather than the current one.
   */
  it("counts a Sunday workout toward the week it opens", () => {
    const sundayOnly: WorkoutActivityByDay = new Map([["2026-09-13", 1]]);
    expect(workoutsInWeek(sundayOnly, startOfWeekDateKey("2026-09-13"))).toBe(
      1,
    );
    expect(workoutsInWeek(sundayOnly, startOfWeekDateKey("2026-09-16"))).toBe(
      1,
    );
  });
});
