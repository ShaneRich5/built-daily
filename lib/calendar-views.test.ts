import { describe, expect, it } from "vitest";
import { endOfWeekDateKey, startOfWeekDateKey } from "@/lib/calendar-views";

describe("startOfWeekDateKey", () => {
  it("returns the same day for a Sunday", () => {
    expect(startOfWeekDateKey("2026-09-13")).toBe("2026-09-13");
  });

  it("walks Monday back to the Sunday that starts its week", () => {
    expect(startOfWeekDateKey("2026-09-14")).toBe("2026-09-13");
  });

  it("walks Saturday back to the Sunday that starts its week", () => {
    expect(startOfWeekDateKey("2026-09-19")).toBe("2026-09-13");
  });

  it("starts a new week on the next Sunday", () => {
    expect(startOfWeekDateKey("2026-09-20")).toBe("2026-09-20");
  });

  it("crosses a year boundary", () => {
    expect(startOfWeekDateKey("2026-01-01")).toBe("2025-12-28");
  });

  it("returns the input unchanged when the key is malformed", () => {
    expect(startOfWeekDateKey("not-a-date")).toBe("not-a-date");
  });
});

describe("endOfWeekDateKey", () => {
  it("ends the week on the Saturday", () => {
    expect(endOfWeekDateKey("2026-09-16")).toBe("2026-09-19");
  });
});
