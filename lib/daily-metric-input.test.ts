import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseDailyMetricInput } from "@/lib/daily-metric-input";

const today = "2026-11-24";
const ok = {
  date: "2026-11-23",
  metric: "steps",
  value: 8214,
  source: "apple_health",
};

function error(raw: unknown): string | null {
  const r = parseDailyMetricInput(raw, today);
  return r.ok ? null : r.error;
}

describe("parseDailyMetricInput", () => {
  it("accepts a synced daily total and rounds whole-number metrics", () => {
    const r = parseDailyMetricInput({ ...ok, value: 8214.6 }, today);
    assert.deepEqual(r, { ok: true, input: { ...ok, value: 8215 } });
  });

  it("allows tomorrow (the sender may be ahead of the server) but not later", () => {
    assert.equal(error({ ...ok, date: "2026-11-25" }), null);
    assert.match(error({ ...ok, date: "2026-11-26" }) ?? "", /future/);
  });

  it("rejects dates that aren't real calendar days", () => {
    assert.match(error({ ...ok, date: "2026-02-30" }) ?? "", /YYYY-MM-DD/);
    assert.match(error({ ...ok, date: "11/23/2026" }) ?? "", /YYYY-MM-DD/);
  });

  it("rejects unknown metrics and out-of-bounds values", () => {
    assert.match(error({ ...ok, metric: "calories" }) ?? "", /metric/);
    assert.match(error({ ...ok, value: -1 }) ?? "", /value/);
    assert.match(error({ ...ok, value: 100001 }) ?? "", /value/);
    assert.match(error({ ...ok, value: "8214" }) ?? "", /value/);
  });

  it("never accepts manual or unknown sources", () => {
    assert.match(error({ ...ok, source: "manual" }) ?? "", /reserved/);
    assert.match(error({ ...ok, source: "fitbit" }) ?? "", /source/);
  });
});
