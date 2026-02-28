import type { Drill } from "@/lib/content/drills";

import type { CoachFeedback } from "./types";

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function findAmbiguousPhrases(text: string): string[] {
  const phrases = [
    "尽量",
    "最好",
    "大概",
    "可能",
    "差不多",
    "随便",
    "优化一下",
    "帮我看看",
    "简单点",
    "快速",
    "高性能",
    "优雅",
    "更好",
    "合理",
    "看情况",
  ];

  const hits = phrases.filter((p) => text.includes(p));
  // De-dup + keep stable order.
  return Array.from(new Set(hits));
}

export function mockCoachFeedback(input: {
  drill: Drill;
  promptText: string;
}): CoachFeedback {
  const prompt = input.promptText.trim();
  const promptLower = prompt.toLowerCase();

  // Heuristics: simple + deterministic.
  const hasContext =
    prompt.length >= 120 ||
    includesAny(prompt, ["背景", "现状", "上下文", "目标", "场景"]) ||
    includesAny(promptLower, ["context", "background", "goal"]);

  const hasConstraints =
    includesAny(prompt, ["约束", "限制", "不允许", "必须", "禁止"]) ||
    includesAny(promptLower, ["constraint", "must", "must not", "only"]);

  const hasOutputFormat =
    includesAny(prompt, ["输出", "格式", "请用", "返回", "以…形式"]) ||
    includesAny(promptLower, ["output", "format", "json", "markdown", "table"]);

  const hasAcceptance =
    includesAny(prompt, ["验收", "标准", "满足", "通过", "Definition of Done"]) ||
    includesAny(promptLower, ["acceptance", "definition of done", "criteria"]);

  const hasTests =
    includesAny(prompt, ["测试", "用例", "边界", "验证", "检查清单"]) ||
    includesAny(promptLower, ["test", "edge case", "verify", "checklist"]);

  const scores = {
    context: hasContext ? 18 : prompt.length >= 60 ? 10 : 4,
    constraints: hasConstraints ? 18 : 6,
    output_format: hasOutputFormat ? 18 : 6,
    acceptance_criteria: hasAcceptance ? 18 : 4,
    tests_and_edge_cases: hasTests ? 18 : 4,
  };

  // Slightly penalize super short prompts.
  if (prompt.length < 40) {
    scores.context = 2;
    scores.output_format = Math.min(scores.output_format, 4);
  }

  const score_total = clampInt(
    scores.context +
      scores.constraints +
      scores.output_format +
      scores.acceptance_criteria +
      scores.tests_and_edge_cases,
    0,
    100,
  );

  const missing_items: string[] = [];
  if (scores.context < 15) missing_items.push("补充背景/上下文（当前状态、输入输出、环境）");
  if (scores.constraints < 15) missing_items.push("补充硬约束（允许/禁止/必须，范围与边界）");
  if (scores.output_format < 15) missing_items.push("指定输出格式（例如 Markdown 小标题、表格、JSON schema）");
  if (scores.acceptance_criteria < 15) missing_items.push("写清验收标准（什么算完成/正确，如何判断）");
  if (scores.tests_and_edge_cases < 15) missing_items.push("要求列出边界情况与验证步骤（测试/检查清单）");

  const ambiguities = findAmbiguousPhrases(prompt).map(
    (p) => `出现模糊词「${p}」：建议改为可量化/可验证的描述`,
  );

  const suggested_questions_to_answer: string[] = [];
  if (scores.context < 15) {
    suggested_questions_to_answer.push("你的输入是什么？有没有示例数据？");
    suggested_questions_to_answer.push("期望结果与实际结果分别是什么？");
  }
  if (scores.constraints < 15) {
    suggested_questions_to_answer.push("有什么明确限制？（语言/框架/性能/安全/时间）");
    suggested_questions_to_answer.push("哪些方案一定不要？为什么？");
  }
  if (scores.output_format < 15) {
    suggested_questions_to_answer.push("你希望 AI 输出成什么格式？（步骤/表格/代码/JSON）");
  }
  if (scores.acceptance_criteria < 15) {
    suggested_questions_to_answer.push("怎么验收？有没有必须通过的用例或指标？");
  }
  if (scores.tests_and_edge_cases < 15) {
    suggested_questions_to_answer.push("需要覆盖哪些边界情况？如何验证不回归？");
  }

  const rewrite_example = [
    "你是一名严谨的 AI 教练，请先提出澄清问题，再给出方案。",
    "",
    "背景：",
    `- 训练题：${input.drill.title}`,
    "- 我正在尝试写一个高质量提示词。",
    "",
    "我的目标：",
    "- 让你给出一个排查/解决路径（先问清楚再行动）",
    "- 输出一份可执行的 checklist",
    "",
    "约束：",
    "- 不要让我粘贴任何密钥/隐私/公司机密",
    "- 如果信息不足，请列出你需要我补充的内容",
    "",
    "输出格式：",
    "- 第一部分：你要问我的澄清问题（编号列表）",
    "- 第二部分：你的行动计划（分阶段）",
    "- 第三部分：验收标准与验证步骤",
  ].join("\n");

  return {
    score_total,
    scores,
    missing_items,
    ambiguities,
    suggested_questions_to_answer,
    rewrite_example,
  };
}

