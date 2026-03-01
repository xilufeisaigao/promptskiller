export type CoachFeedback = {
  // 0-120
  score_total: number;
  scores: {
    // 0-20 each
    context: number;
    constraints: number;
    output_format: number;
    acceptance_criteria: number;
    tests_and_edge_cases: number;
    process_control: number;
  };
  missing_items: string[];
  ambiguities: string[];
  suggested_questions_to_answer: string[];
  rewrite_example?: string | null;
};

export type BuildSimRoundOutput = {
  summary: string;
  changed_files: Array<{
    path: string;
    change_type: "create" | "update" | "delete";
    rationale: string;
  }>;
  patch_preview: string;
  risk_notes: string[];
};

export type CoachMode = "mock" | "openai";

export type CoachResult = {
  mode: CoachMode;
  feedback: CoachFeedback;
  round_output?: BuildSimRoundOutput | null;
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
    score_total: { type: "integer", minimum: 0, maximum: 120 },
    scores: {
      type: "object",
      additionalProperties: false,
      required: [
        "context",
        "constraints",
        "output_format",
        "acceptance_criteria",
        "tests_and_edge_cases",
        "process_control",
      ],
      properties: {
        context: { type: "integer", minimum: 0, maximum: 20 },
        constraints: { type: "integer", minimum: 0, maximum: 20 },
        output_format: { type: "integer", minimum: 0, maximum: 20 },
        acceptance_criteria: { type: "integer", minimum: 0, maximum: 20 },
        tests_and_edge_cases: { type: "integer", minimum: 0, maximum: 20 },
        process_control: { type: "integer", minimum: 0, maximum: 20 },
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

export const buildSimRoundOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "changed_files", "patch_preview", "risk_notes"],
  properties: {
    summary: { type: "string", minLength: 8, maxLength: 800 },
    changed_files: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "change_type", "rationale"],
        properties: {
          path: { type: "string", minLength: 1, maxLength: 240 },
          change_type: { type: "string", enum: ["create", "update", "delete"] },
          rationale: { type: "string", minLength: 1, maxLength: 300 },
        },
      },
    },
    patch_preview: { type: "string", minLength: 1, maxLength: 8000 },
    risk_notes: {
      type: "array",
      maxItems: 12,
      items: { type: "string", minLength: 1, maxLength: 280 },
    },
  },
} as const;
