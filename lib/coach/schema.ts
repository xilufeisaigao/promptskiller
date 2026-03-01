import { z } from "zod";

export const CoachFeedbackSchema = z
  .object({
    score_total: z.number().int().min(0).max(120),
    scores: z
      .object({
        context: z.number().int().min(0).max(20),
        constraints: z.number().int().min(0).max(20),
        output_format: z.number().int().min(0).max(20),
        acceptance_criteria: z.number().int().min(0).max(20),
        tests_and_edge_cases: z.number().int().min(0).max(20),
        process_control: z.number().int().min(0).max(20),
      })
      .strict(),
    missing_items: z.array(z.string()).max(50),
    ambiguities: z.array(z.string()).max(50),
    suggested_questions_to_answer: z.array(z.string()).max(50),
    rewrite_example: z.string().nullable().optional(),
  })
  .strict();

export type CoachFeedbackParsed = z.infer<typeof CoachFeedbackSchema>;

export const BuildSimRoundOutputSchema = z
  .object({
    summary: z.string().min(8).max(800),
    changed_files: z
      .array(
        z
          .object({
            path: z.string().min(1).max(240),
            change_type: z.enum(["create", "update", "delete"]),
            rationale: z.string().min(1).max(300),
          })
          .strict(),
      )
      .max(12),
    patch_preview: z.string().min(1).max(8000),
    risk_notes: z.array(z.string().min(1).max(280)).max(12),
  })
  .strict();

export type BuildSimRoundOutputParsed = z.infer<typeof BuildSimRoundOutputSchema>;
