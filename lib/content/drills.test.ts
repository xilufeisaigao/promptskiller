import { describe, expect, it } from "vitest";

import { getDrillForUtcDate } from "./drills";

describe("drills selection", () => {
  it("selects a deterministic drill for a given UTC date", () => {
    const d = new Date("2026-02-27T00:00:00.000Z");
    const drill = getDrillForUtcDate(d);
    expect(drill.id).toBe("drill-refactor-with-constraints");
  });
});

