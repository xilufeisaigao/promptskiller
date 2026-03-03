import { describe, expect, it } from "vitest";

import { getDrillById } from "@/lib/content/drills";

import {
  buildBuildSimRoundUserInput,
  buildCoachFeedbackUserInput,
} from "./http";

describe("openai user-input builders", () => {
  it("includes drill context for coach feedback in coach mode", () => {
    const drill = getDrillById("drill-debug-minimal-repro");
    expect(drill).toBeTruthy();

    const text = buildCoachFeedbackUserInput({
      drill: drill!,
      promptText: "请帮我先问澄清问题。",
      sessionMode: "coach",
    });

    expect(text).toContain(`标题：${drill!.title}`);
    expect(text).toContain(drill!.bodyMd);
    expect(text).toContain("【用户提示词】");
  });

  it("does not include drill context for coach feedback in exam mode", () => {
    const drill = getDrillById("drill-debug-minimal-repro");
    expect(drill).toBeTruthy();

    const text = buildCoachFeedbackUserInput({
      drill: drill!,
      promptText: "只根据我给你的日志分析。",
      sessionMode: "exam",
    });

    expect(text).not.toContain(`标题：${drill!.title}`);
    expect(text).not.toContain(drill!.bodyMd);
    expect(text).toContain("考试模式上下文策略");
    expect(text).toContain("只根据我给你的日志分析。");
  });

  it("does not include drill context for build sim in exam mode", () => {
    const drill = getDrillById("drill-debug-minimal-repro");
    expect(drill).toBeTruthy();

    const text = buildBuildSimRoundUserInput({
      drill: drill!,
      promptText: "根据这个报错修复代码并输出 diff。",
      sessionMode: "exam",
    });

    expect(text).not.toContain(`标题：${drill!.title}`);
    expect(text).not.toContain(drill!.bodyMd);
    expect(text).not.toContain(`类型：${drill!.drillType}`);
    expect(text).toContain("【用户本轮提示词】");
  });
});
