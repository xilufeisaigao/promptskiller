import { describe, expect, it } from "vitest";

import { computeUtcStreak } from "./streak";

describe("computeUtcStreak", () => {
  it("returns 0 for empty list", () => {
    expect(computeUtcStreak([])).toBe(0);
  });

  it("counts consecutive UTC days", () => {
    const now = new Date("2026-02-27T12:00:00.000Z");
    const attempts = [
      "2026-02-27T00:01:00.000Z",
      "2026-02-27T23:59:00.000Z",
      "2026-02-26T10:00:00.000Z",
      "2026-02-25T10:00:00.000Z",
    ];

    expect(computeUtcStreak(attempts, now)).toBe(3);
  });

  it("breaks when today is missing", () => {
    const now = new Date("2026-02-27T12:00:00.000Z");
    const attempts = ["2026-02-26T10:00:00.000Z", "2026-02-25T10:00:00.000Z"];
    expect(computeUtcStreak(attempts, now)).toBe(0);
  });
});

