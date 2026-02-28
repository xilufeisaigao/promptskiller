export type CoachFeedback = {
  // 0-100
  score_total: number;
  scores: {
    // 0-20 each
    context: number;
    constraints: number;
    output_format: number;
    acceptance_criteria: number;
    tests_and_edge_cases: number;
  };
  missing_items: string[];
  ambiguities: string[];
  suggested_questions_to_answer: string[];
  rewrite_example?: string | null;
};

export type CoachMode = "mock" | "openai";

export type CoachResult = {
  mode: CoachMode;
  feedback: CoachFeedback;
};

// JSON Schema for OpenAI Responses API structured outputs.
// Keep it strict + stable; UI will rely on these keys.
export const coachFeedbackJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score_total",
    "scores",
    "missing_items",
    "ambiguities",
    "suggested_questions_to_answer",
  ],
  properties: {
    score_total: { type: "integer", minimum: 0, maximum: 100 },
    scores: {
      type: "object",
      additionalProperties: false,
      required: [
        "context",
        "constraints",
        "output_format",
        "acceptance_criteria",
        "tests_and_edge_cases",
      ],
      properties: {
        context: { type: "integer", minimum: 0, maximum: 20 },
        constraints: { type: "integer", minimum: 0, maximum: 20 },
        output_format: { type: "integer", minimum: 0, maximum: 20 },
        acceptance_criteria: { type: "integer", minimum: 0, maximum: 20 },
        tests_and_edge_cases: { type: "integer", minimum: 0, maximum: 20 },
      },
    },
    missing_items: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
    ambiguities: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
    suggested_questions_to_answer: {
      type: "array",
      items: { type: "string" },
      maxItems: 10,
    },
    rewrite_example: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  },
} as const;

