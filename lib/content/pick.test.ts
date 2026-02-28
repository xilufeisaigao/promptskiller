import { describe, expect, it } from "vitest";

import { DRILLS } from "./drills";
import { pickDrillsForUtcDate } from "./pick";

describe("pickDrillsForUtcDate", () => {
  it("returns deterministic 3 drills for a UTC date", () => {
    const d = new Date("2026-03-01T00:00:00.000Z");
    const first = pickDrillsForUtcDate(DRILLS, d, 3).map((x) => x.id);
    const second = pickDrillsForUtcDate(DRILLS, d, 3).map((x) => x.id);

    expect(first).toEqual(second);
    expect(first.length).toBe(3);
  });

  it("does not return duplicates when count <= drill size", () => {
    const d = new Date("2026-03-01T00:00:00.000Z");
    const picked = pickDrillsForUtcDate(DRILLS, d, 3).map((x) => x.id);
    expect(new Set(picked).size).toBe(3);
  });
});

