import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { firestoreToChallengeDoc } from "@/lib/challenge-mapper";

const created = Timestamp.fromDate(new Date("2026-11-01T08:00:00"));

function raw(fields: Record<string, unknown>): Record<string, unknown> {
  return {
    metric: "steps",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    groupId: null,
    completedAt: null,
    createdAt: created,
    updatedAt: created,
    ...fields,
  };
}

describe("firestoreToChallengeDoc", () => {
  it("reads a doc with no period as weekly (written before monthly existed)", () => {
    const doc = firestoreToChallengeDoc(
      raw({
        startDate: "2026-11-22",
        endDate: "2026-11-28",
        rule: { kind: "days_hit", dailyTarget: 7000, daysNeeded: 5 },
      }),
    );
    expect(doc?.period).toBe("week");
  });

  it("reads a monthly challenge with month-sized targets", () => {
    const doc = firestoreToChallengeDoc(
      raw({
        period: "month",
        rule: { kind: "days_hit", dailyTarget: 7000, daysNeeded: 20 },
      }),
    );
    expect(doc?.period).toBe("month");
    expect(doc?.rule).toEqual({
      kind: "days_hit",
      dailyTarget: 7000,
      daysNeeded: 20,
    });
  });

  it("rejects month-sized targets on a weekly challenge", () => {
    expect(
      firestoreToChallengeDoc(
        raw({
          period: "week",
          rule: { kind: "days_hit", dailyTarget: 7000, daysNeeded: 20 },
        }),
      ),
    ).toBeNull();
  });

  it("rejects an unknown period", () => {
    expect(
      firestoreToChallengeDoc(
        raw({
          period: "year",
          rule: { kind: "total", target: 50000 },
        }),
      ),
    ).toBeNull();
  });
});
