import { describe, expect, it } from "vitest";

import { getDrillById } from "@/lib/content/drills";

import { mockCoachFeedback } from "./mock";

describe("mockCoachFeedback", () => {
  it("returns stable structured feedback", () => {
    const drill = getDrillById("drill-debug-minimal-repro");
    expect(drill).toBeTruthy();

    const feedback = mockCoachFeedback({
      drill: drill!,
      promptText:
        "背景：表单提交后偶尔卡死。目标：请先问我澄清问题，再给排查步骤。\n约束：不要让我贴密钥。\n输出格式：用 Markdown。\n验收：给出 checklist。\n测试：列出边界情况。",
    });

    expect(feedback.score_total).toBeGreaterThan(60);
    expect(feedback.scores.context).toBeGreaterThan(10);
    expect(feedback.missing_items).toEqual(expect.any(Array));
    expect(feedback.ambiguities).toEqual(expect.any(Array));
    expect(feedback.suggested_questions_to_answer).toEqual(expect.any(Array));
    expect(typeof feedback.rewrite_example === "string").toBe(true);
  });

  it("flags ambiguous phrases", () => {
    const drill = getDrillById("drill-acceptance-criteria");
    const feedback = mockCoachFeedback({
      drill: drill!,
      promptText: "帮我看看这个需求，尽量做得更好、更优雅。",
    });

    expect(feedback.ambiguities.join("\n")).toContain("尽量");
    expect(feedback.score_total).toBeLessThan(60);
  });
});

