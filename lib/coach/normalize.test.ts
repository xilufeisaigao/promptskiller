import { describe, expect, it } from "vitest";

import { CoachFeedbackSchema } from "./schema";
import { coerceCoachFeedback, normalizeCoachFeedbackPayload } from "./normalize";

describe("normalizeCoachFeedbackPayload", () => {
  it("passes through canonical schema payload", () => {
    const payload = {
      score_total: 83,
      scores: {
        context: 17,
        constraints: 16,
        output_format: 17,
        acceptance_criteria: 16,
        tests_and_edge_cases: 17,
        process_control: 17,
      },
      missing_items: ["补充边界条件"],
      ambiguities: ["输入范围不清晰"],
      suggested_questions_to_answer: ["是否需要固定输出结构？"],
      rewrite_example: "示例改写",
    };

    const normalized = normalizeCoachFeedbackPayload(payload);
    expect(() => CoachFeedbackSchema.parse(normalized)).not.toThrow();
  });

  it("maps legacy keys from compatible models", () => {
    const payload = {
      score: 78,
      dimensions: {
        context: 16,
        constraints: 15,
        outputFormat: 16,
        acceptanceCriteria: 15,
        tests: 16,
        processControl: 16,
      },
      feedback: ["缺少验收标准", "边界情况描述不足"],
      suggestion: ["先列清输入输出", "补充失败场景"],
      ambiguities: ["未声明异常处理策略"],
    };

    const normalized = normalizeCoachFeedbackPayload(payload);
    const parsed = CoachFeedbackSchema.parse(normalized);

    expect(parsed.score_total).toBe(78);
    expect(parsed.missing_items.length).toBe(2);
    expect(parsed.suggested_questions_to_answer.length).toBe(2);
  });

  it("parses loose string values", () => {
    const payload = {
      score: "85/100",
      dimensions: {
        context: "18/20",
        constraints: "17",
        format: "16",
        acceptance: "17",
        edge_cases: "17",
        process_control: "17",
      },
      feedback: "- 缺少上下文\n- 输出格式未严格声明",
      suggestion: "请先补充环境信息；请明确验收标准",
    };

    const normalized = normalizeCoachFeedbackPayload(payload);
    const parsed = CoachFeedbackSchema.parse(normalized);

    expect(parsed.score_total).toBe(85);
    expect(parsed.missing_items.length).toBe(2);
    expect(parsed.suggested_questions_to_answer.length).toBe(2);
  });

  it("distributes total score when dimensions are missing", () => {
    const payload = {
      score_total: 42,
      dimensions: {},
      feedback: ["可补充约束信息"],
    };

    const normalized = normalizeCoachFeedbackPayload(payload);
    const parsed = CoachFeedbackSchema.parse(normalized);
    const sum =
      parsed.scores.context +
      parsed.scores.constraints +
      parsed.scores.output_format +
      parsed.scores.acceptance_criteria +
      parsed.scores.tests_and_edge_cases +
      parsed.scores.process_control;

    expect(parsed.score_total).toBe(42);
    expect(sum).toBe(42);
  });

  it("supports chinese dimension keys with nested score object", () => {
    const payload = {
      score_total: 76,
      dimensions: {
        上下文: { 分数: 15 },
        约束: { score: 14 },
        输出格式: { value: 16 },
        验收标准: { rating: 15 },
        测试: { 分数: 16 },
        流程控制: { 分数: 16 },
      },
      feedback: ["可以补充失败场景"],
      suggestion: ["可先定义输入输出契约"],
    };

    const parsed = CoachFeedbackSchema.parse(
      normalizeCoachFeedbackPayload(payload),
    );

    expect(parsed.scores.context).toBe(15);
    expect(parsed.scores.tests_and_edge_cases).toBe(16);
    expect(parsed.scores.process_control).toBe(16);
  });

  it("coerces legacy malformed feedback with fallback score", () => {
    const malformed = {
      score_total: 42,
      scores: {},
      feedback: ["缺少约束说明"],
    };

    const parsed = coerceCoachFeedback(malformed, 42);
    const sum =
      parsed.scores.context +
      parsed.scores.constraints +
      parsed.scores.output_format +
      parsed.scores.acceptance_criteria +
      parsed.scores.tests_and_edge_cases +
      parsed.scores.process_control;

    expect(parsed.score_total).toBe(42);
    expect(sum).toBe(42);
  });
});
