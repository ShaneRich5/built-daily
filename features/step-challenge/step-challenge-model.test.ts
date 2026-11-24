import { describe, expect, it } from "vitest";
import {
  challengeRange,
  repeatRange,
} from "@/features/step-challenge/step-challenge-model";
import {
  MONTH_START,
  cardView,
  challenge,
  daysHit,
  monthDaysHit,
  novemberFinished,
  novemberSoFar,
} from "@/features/step-challenge/story-fixtures";

const november = challenge(monthDaysHit, MONTH_START, "month");

describe("challengeRange", () => {
  it("is Sunday to Saturday for a week", () => {
    expect(challengeRange("week", "2026-11-24")).toEqual({
      startDate: "2026-11-22",
      endDate: "2026-11-28",
    });
  });

  it("is the whole calendar month for a month", () => {
    expect(challengeRange("month", "2026-11-24")).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    });
  });
});

describe("repeatRange", () => {
  it("repeats a running month as next month", () => {
    expect(repeatRange(november, "2026-11-26")).toEqual({
      startDate: "2026-12-01",
      endDate: "2026-12-31",
    });
  });

  it("repeats a month that already ended as the current month", () => {
    expect(repeatRange(november, "2026-12-02")).toEqual({
      startDate: "2026-12-01",
      endDate: "2026-12-31",
    });
  });

  it("still repeats a week as the next Sunday–Saturday", () => {
    expect(repeatRange(challenge(daysHit), "2026-11-27")).toEqual({
      startDate: "2026-11-29",
      endDate: "2026-12-05",
    });
  });
});

describe("monthly card view", () => {
  it("names the month in the heading and repeat button", () => {
    const running = cardView(november, novemberSoFar);
    expect(running.period).toBe("month");
    expect(running.heading).toBe("This month’s steps");
    expect(running.days).toHaveLength(30);
    expect(running.days[23]!.dayOfMonth).toBe(24);

    const done = cardView(november, novemberFinished, "2026-11-26");
    expect(done.state).toBe("done");
    expect(done.repeatLabel).toBe("Same again next month");

    const ended = cardView(november, novemberSoFar, "2026-12-02");
    expect(ended.heading).toBe("Last month’s steps");
    expect(ended.repeatLabel).toBe("Same again this month");
  });

  it("knows next month is already set", () => {
    const view = cardView(
      november,
      novemberFinished,
      "2026-11-26",
      challenge(monthDaysHit, "2026-12-01", "month"),
    );
    expect(view.nextSet).toBe(true);
    expect(view.repeatLabel).toBeNull();
  });
});
