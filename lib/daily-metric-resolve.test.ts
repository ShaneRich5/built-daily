import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  resolveDailyMetric,
  withSourceValue,
} from "@/lib/daily-metric-resolve";

const at = new Date("2026-11-24T12:00:00Z");

describe("resolveDailyMetric", () => {
  it("is empty when no source has a number", () => {
    assert.deepEqual(resolveDailyMetric({}), {
      value: null,
      resolvedFrom: null,
    });
  });

  it("uses a manual edit over any synced value, even a higher one", () => {
    const r = resolveDailyMetric({
      manual: { value: 6000 },
      apple_health: { value: 8214 },
      shortcut: { value: 7730 },
    });
    assert.deepEqual(r, { value: 6000, resolvedFrom: "manual" });
  });

  it("uses the highest synced value without a manual edit", () => {
    const r = resolveDailyMetric({
      apple_health: { value: 8214 },
      shortcut: { value: 7730 },
      mcp: { value: 9000 },
    });
    assert.deepEqual(r, { value: 9000, resolvedFrom: "mcp" });
  });

  it("never sums sources", () => {
    const r = resolveDailyMetric({
      apple_health: { value: 5000 },
      health_connect: { value: 5000 },
    });
    assert.equal(r.value, 5000);
  });

  it("breaks ties by source order, so the result is stable", () => {
    const r = resolveDailyMetric({
      shortcut: { value: 7000 },
      apple_health: { value: 7000 },
    });
    assert.equal(r.resolvedFrom, "apple_health");
  });

  it("keeps a manual zero (a day the user says had no steps)", () => {
    const r = resolveDailyMetric({
      manual: { value: 0 },
      apple_health: { value: 300 },
    });
    assert.deepEqual(r, { value: 0, resolvedFrom: "manual" });
  });
});

describe("withSourceValue", () => {
  it("adds a source and re-resolves, keeping the others", () => {
    const synced = withSourceValue(null, "apple_health", 8214, at);
    const edited = withSourceValue(synced, "manual", 9000, at);
    assert.equal(edited.value, 9000);
    assert.equal(edited.resolvedFrom, "manual");
    assert.equal(edited.sources.apple_health?.value, 8214);
  });

  it("falls back to the sync when the manual edit is removed", () => {
    const edited = withSourceValue(
      withSourceValue(null, "apple_health", 8214, at),
      "manual",
      9000,
      at,
    );
    const cleared = withSourceValue(edited, "manual", null, at);
    assert.deepEqual(
      { value: cleared.value, resolvedFrom: cleared.resolvedFrom },
      { value: 8214, resolvedFrom: "apple_health" },
    );
    assert.equal(cleared.sources.manual, undefined);
  });

  it("does not change the entry it was given", () => {
    const before = withSourceValue(null, "shortcut", 4000, at);
    withSourceValue(before, "shortcut", 5000, at);
    assert.equal(before.sources.shortcut?.value, 4000);
  });
});
