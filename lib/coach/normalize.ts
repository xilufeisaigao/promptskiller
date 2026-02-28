import type { CoachFeedback } from "./types";
import { CoachFeedbackSchema } from "./schema";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const nested = asRecord(value);
  if (nested) {
    const nestedKeys = ["score", "value", "rating", "分数", "得分"];
    for (const key of nestedKeys) {
      const n = toFiniteNumber(nested[key]);
      if (n !== null) return n;
    }
  }
  if (typeof value !== "string") return null;

  const m = value.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function pickNumber(source: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const n = toFiniteNumber(source[key]);
    if (n !== null) return n;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter(Boolean)
      .slice(0, 50);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|[;；]+/)
      .map((item) => item.trim().replace(/^[-*•]\s*/, ""))
      .filter(Boolean)
      .slice(0, 50);
  }

  const record = asRecord(value);
  if (!record) return [];

  return Object.values(record)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 50);
}

function normalizeScores(raw: UnknownRecord): CoachFeedback["scores"] {
  const context = pickNumber(raw, [
    "context",
    "background",
    "scene",
    "problem_understanding",
    "上下文",
    "背景",
  ]);
  const constraints = pickNumber(raw, [
    "constraints",
    "constraint",
    "requirements",
    "rules",
    "约束",
    "限制",
    "要求",
  ]);
  const outputFormat = pickNumber(raw, [
    "output_format",
    "outputFormat",
    "format",
    "output",
    "structure",
    "输出格式",
    "格式",
  ]);
  const acceptance = pickNumber(raw, [
    "acceptance_criteria",
    "acceptanceCriteria",
    "acceptance",
    "criteria",
    "success_criteria",
    "验收标准",
    "成功标准",
  ]);
  const tests = pickNumber(raw, [
    "tests_and_edge_cases",
    "testsAndEdgeCases",
    "tests",
    "test_cases",
    "edge_cases",
    "测试",
    "边界",
    "边界情况",
    "测试/边界",
  ]);

  return {
    context: clampInt(context ?? 0, 0, 20),
    constraints: clampInt(constraints ?? 0, 0, 20),
    output_format: clampInt(outputFormat ?? 0, 0, 20),
    acceptance_criteria: clampInt(acceptance ?? 0, 0, 20),
    tests_and_edge_cases: clampInt(tests ?? 0, 0, 20),
  };
}

function distributeScoreTotal(total: number): CoachFeedback["scores"] {
  const clamped = clampInt(total, 0, 100);
  const base = Math.floor(clamped / 5);
  const extra = clamped % 5;
  const slots = [base, base, base, base, base].map((v, i) =>
    clampInt(v + (i < extra ? 1 : 0), 0, 20),
  );

  return {
    context: slots[0]!,
    constraints: slots[1]!,
    output_format: slots[2]!,
    acceptance_criteria: slots[3]!,
    tests_and_edge_cases: slots[4]!,
  };
}

export function normalizeCoachFeedbackPayload(input: unknown): unknown {
  const root = asRecord(input);
  if (!root) return input;

  const rawScores = asRecord(root.scores) ?? asRecord(root.dimensions) ?? {};
  const scores = normalizeScores(rawScores);

  const scoreTotalRaw =
    pickNumber(root, ["score_total", "scoreTotal", "score"]) ??
    pickNumber(rawScores, ["score_total", "scoreTotal", "score", "total"]);
  const scoreFromDims =
    scores.context +
    scores.constraints +
    scores.output_format +
    scores.acceptance_criteria +
    scores.tests_and_edge_cases;

  const score_total = clampInt(scoreTotalRaw ?? scoreFromDims, 0, 100);
  const allDimsZero =
    scores.context === 0 &&
    scores.constraints === 0 &&
    scores.output_format === 0 &&
    scores.acceptance_criteria === 0 &&
    scores.tests_and_edge_cases === 0;
  const normalizedScores =
    allDimsZero && score_total > 0 ? distributeScoreTotal(score_total) : scores;

  const missing_items = toStringArray(
    root.missing_items ?? root.missingItems ?? root.feedback ?? root.issues,
  );
  const ambiguities = toStringArray(
    root.ambiguities ?? root.ambiguity ?? root.unclear,
  );
  const suggested_questions_to_answer = toStringArray(
    root.suggested_questions_to_answer ??
      root.suggestedQuestionsToAnswer ??
      root.suggestion ??
      root.suggestions ??
      root.questions,
  );

  const rewriteRaw =
    root.rewrite_example ??
    root.rewriteExample ??
    root.rewrite ??
    root.example ??
    null;
  const rewrite_example =
    typeof rewriteRaw === "string" ? rewriteRaw.trim() || null : null;

  return {
    score_total,
    scores: normalizedScores,
    missing_items,
    ambiguities,
    suggested_questions_to_answer,
    rewrite_example,
  } satisfies CoachFeedback;
}

export function coerceCoachFeedback(
  input: unknown,
  fallbackScoreTotal?: unknown,
): CoachFeedback {
  const normalized = normalizeCoachFeedbackPayload(input);
  const parsed = CoachFeedbackSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;

  const normalizedRecord = asRecord(normalized) ?? {};
  const fallbackScore = toFiniteNumber(fallbackScoreTotal);
  const rawScore =
    pickNumber(normalizedRecord, ["score_total", "scoreTotal", "score"]) ??
    fallbackScore ??
    0;
  const score_total = clampInt(rawScore, 0, 100);
  const scores =
    score_total > 0
      ? distributeScoreTotal(score_total)
      : {
          context: 0,
          constraints: 0,
          output_format: 0,
          acceptance_criteria: 0,
          tests_and_edge_cases: 0,
        };

  return {
    score_total,
    scores,
    missing_items: toStringArray(normalizedRecord.missing_items),
    ambiguities: toStringArray(normalizedRecord.ambiguities),
    suggested_questions_to_answer: toStringArray(
      normalizedRecord.suggested_questions_to_answer,
    ),
    rewrite_example:
      typeof normalizedRecord.rewrite_example === "string"
        ? normalizedRecord.rewrite_example
        : null,
  };
}
