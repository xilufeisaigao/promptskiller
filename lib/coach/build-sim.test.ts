import { describe, expect, it } from "vitest";

import { buildMockBuildSimRoundOutput, coerceBuildSimRoundOutput } from "./build-sim";

describe("build-sim helpers", () => {
  it("generates deterministic structured output", () => {
    const first = buildMockBuildSimRoundOutput({
      drillTitle: "Demo",
      promptText: "请先产出目录，再产出 patch",
      roundNo: 2,
      feedback: {
        score_total: 72,
        scores: {
          context: 16,
          constraints: 14,
          output_format: 15,
          acceptance_criteria: 13,
          tests_and_edge_cases: 14,
          process_control: 15,
        },
        missing_items: ["补充验收标准"],
        ambiguities: ["优化一下"],
        suggested_questions_to_answer: ["如何回滚"],
        rewrite_example: null,
      },
    });

    const second = buildMockBuildSimRoundOutput({
      drillTitle: "Demo",
      promptText: "请先产出目录，再产出 patch",
      roundNo: 2,
      feedback: {
        score_total: 72,
        scores: {
          context: 16,
          constraints: 14,
          output_format: 15,
          acceptance_criteria: 13,
          tests_and_edge_cases: 14,
          process_control: 15,
        },
        missing_items: ["补充验收标准"],
        ambiguities: ["优化一下"],
        suggested_questions_to_answer: ["如何回滚"],
        rewrite_example: null,
      },
    });

    expect(first).toEqual(second);
    expect(first.changed_files.length).toBeGreaterThan(0);
    expect(first.patch_preview).toContain("diff --git");
  });

  it("coerces legacy camelCase payload", () => {
    const out = coerceBuildSimRoundOutput({
      summary: "summary text ok",
      changedFiles: [{ path: "src/a.ts", changeType: "update", rationale: "reason" }],
      patchPreview: "diff --git a b",
      risk_notes: ["risk"],
    });

    expect(out).not.toBeNull();
    expect(out?.changed_files[0]?.change_type).toBe("update");
  });
});
