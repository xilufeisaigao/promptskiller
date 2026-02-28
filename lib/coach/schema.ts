import { z } from "zod";

export const CoachFeedbackSchema = z
  .object({
    score_total: z.number().int().min(0).max(100),
    scores: z
      .object({
        context: z.number().int().min(0).max(20),
        constraints: z.number().int().min(0).max(20),
        output_format: z.number().int().min(0).max(20),
        acceptance_criteria: z.number().int().min(0).max(20),
        tests_and_edge_cases: z.number().int().min(0).max(20),
      })
      .strict(),
    missing_items: z.array(z.string()).max(50),
    ambiguities: z.array(z.string()).max(50),
    suggested_questions_to_answer: z.array(z.string()).max(50),
    rewrite_example: z.string().nullable().optional(),
  })
  .strict();

export type CoachFeedbackParsed = z.infer<typeof CoachFeedbackSchema>;

