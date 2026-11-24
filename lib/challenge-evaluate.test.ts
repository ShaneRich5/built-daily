import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeChallengeRule,
  evaluateChallenge,
  evaluateDaysHit,
  evaluateStreak,
  evaluateTotal,
} from "@/lib/challenge-evaluate";

/** Sun Nov 22 – Sat Nov 28, 2026. */
const week = { metric: "steps" as const, startDate: "2026-11-22", endDate: "2026-11-28" };

/** Values for the week from Sunday, e.g. `days(8200, 7500)` fills Sun and Mon. */
function days(...values: Array<number | null>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  values.forEach((v, i) => {
    out[`2026-11-${22 + i}`] = v;
  });
  return out;
}

describe("evaluateDaysHit", () => {
  const input = { ...week, rule: { kind: "days_hit" as const, dailyTarget: 7000, daysNeeded: 5 } };

  it("counts days at or above the target", () => {
    const r = evaluateDaysHit(input, days(8214, 7000, 3100), "2026-11-24");
    assert.equal(r.current, 2);
    assert.equal(r.goal, 5);
    assert.equal(r.done, false);
    assert.equal(r.progress, 2 / 5);
    assert.deepEqual(
      r.days.map((d) => d.hit),
      [true, true, false, false, false, false, false],
    );
  });

  it("says how many days are left to spare", () => {
    // Today (Tue) not hit yet: Tue–Sat are 5 open days, 3 needed.
    const r = evaluateDaysHit(input, days(8214, 7480, 3100), "2026-11-24");
    assert.equal(r.tone, "on");
    assert.equal(r.status, "Needs 3 of the 5 days left, 2 to spare.");
  });

  it("is tight when every open day is needed", () => {
    const r = evaluateDaysHit(input, days(8000, 2000, 1000), "2026-11-25");
    // Wed–Sat open (4), 4 needed.
    assert.equal(r.tone, "tight");
    assert.equal(r.status, "Needs 4 of the 4 days left. No spare days.");
  });

  it("is out of reach, calmly, when too few days are left", () => {
    const r = evaluateDaysHit(input, days(0, 0, 0, 0, 0), "2026-11-27");
    assert.equal(r.tone, "off");
    assert.match(r.status, /A new week starts Sunday\.$/);
  });

  it("is done once enough days are in, and ignores future values", () => {
    const r = evaluateDaysHit(input, days(9000, 9000, 9000, 9000, 9000, 1, 99999), "2026-11-26");
    assert.equal(r.done, true);
    assert.equal(r.tone, "done");
    assert.equal(r.progress, 1);
    assert.equal(r.days[6]?.value, null);
  });

  it("reports an ended week that fell short without a failure word", () => {
    const r = evaluateDaysHit(input, days(9000, 9000, 9000), "2026-11-30");
    assert.equal(r.ended, true);
    assert.equal(r.done, false);
    assert.equal(r.status, "3 of 5 days this time. A new week is a fresh start.");
  });
});

describe("evaluateTotal", () => {
  const input = { ...week, rule: { kind: "total" as const, target: 50000 } };

  it("sums the days so far", () => {
    const r = evaluateTotal(input, days(10000, 8000, 2000), "2026-11-24");
    assert.equal(r.current, 20000);
    assert.equal(r.goal, 50000);
    assert.equal(r.progress, 0.4);
    assert.equal(r.done, false);
  });

  it("gives a per-day pace for the days left, rounded up to 100", () => {
    // 30,000 left over Tue–Sat (5 days) = 6,000 a day.
    const r = evaluateTotal(input, days(10000, 8000, 2000), "2026-11-24");
    assert.equal(r.status, "About 6,000 a day for the 5 days left.");
    assert.equal(r.tone, "on");
  });

  it("marks a day as hit when it carries its fair share of the target", () => {
    // Fair share of 50,000 over 7 days is ~7,100.
    const r = evaluateTotal(input, days(7200, 7000), "2026-11-23");
    assert.deepEqual(r.days.slice(0, 2).map((d) => d.hit), [true, false]);
  });

  it("is done at the target", () => {
    const r = evaluateTotal(input, days(20000, 20000, 10000), "2026-11-24");
    assert.equal(r.done, true);
    assert.equal(r.status, "Target reached. Anything more is a bonus.");
  });
});

describe("evaluateStreak", () => {
  const input = { ...week, rule: { kind: "streak" as const, dailyTarget: 6000, length: 7 } };

  it("counts the current run, and today not being hit yet doesn't break it", () => {
    const r = evaluateStreak(input, days(6500, 7000, 1200), "2026-11-24");
    assert.equal(r.current, 2);
    assert.equal(r.status, "2-day run. Every day from here keeps it going.");
  });

  it("restarts the run after a missed day", () => {
    const r = evaluateStreak({ ...input, rule: { ...input.rule, length: 3 } }, days(6500, 100, 7000), "2026-11-24");
    assert.equal(r.current, 1);
  });

  it("is out of reach when a full run can no longer fit", () => {
    const r = evaluateStreak(input, days(6500, 100), "2026-11-24");
    assert.equal(r.tone, "off");
    assert.match(r.status, /can't fit/);
  });

  it("is done once any run reaches the length", () => {
    const r = evaluateStreak(
      { ...input, rule: { ...input.rule, length: 3 } },
      days(6000, 6000, 6000, 100),
      "2026-11-26",
    );
    assert.equal(r.done, true);
    assert.equal(r.current, 3);
    assert.equal(r.progress, 1);
  });
});

describe("evaluateChallenge", () => {
  it("dispatches on the rule kind", () => {
    const r = evaluateChallenge(
      { ...week, rule: { kind: "total", target: 10000 } },
      days(12000),
      "2026-11-22",
    );
    assert.equal(r.done, true);
  });

  it("describes each preset in plain words", () => {
    assert.equal(
      describeChallengeRule({ kind: "days_hit", dailyTarget: 7000, daysNeeded: 5 }),
      "7,000 steps on 5 of 7 days",
    );
    assert.equal(describeChallengeRule({ kind: "total", target: 50000 }), "50,000 steps this week");
    assert.equal(
      describeChallengeRule({ kind: "streak", dailyTarget: 6000, length: 7 }),
      "6,000 a day, 7 days running",
    );
  });
});
