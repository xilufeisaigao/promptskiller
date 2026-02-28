import { NextResponse } from "next/server";
import { z } from "zod";

import { mockCoachFeedback } from "@/lib/coach/mock";
import type { CoachMode, CoachResult } from "@/lib/coach/types";
import { getDrillById } from "@/lib/content/drills-source";
import { createCoachFeedbackWithOpenAI } from "@/lib/openai/http";

const BodySchema = z.object({
  drillId: z.string().min(1),
  promptText: z.string().min(1).max(8000),
  attemptIndex: z.number().int().min(0).max(50).optional(),

  // Optional OpenAI config (user-provided key workflow).
  openaiProvider: z.enum(["openai", "bailian", "custom"]).optional(),
  openaiApiKey: z.string().optional(),
  openaiBaseUrl: z.string().optional(),
  openaiModel: z.string().optional(),
});

export async function POST(req: Request) {
  const bodyJson = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "参数错误" },
      { status: 400 },
    );
  }

  const {
    drillId,
    promptText,
    openaiProvider,
    openaiApiKey,
    openaiBaseUrl,
    openaiModel,
  } =
    parsed.data;

  const drill = await getDrillById(drillId);
  if (!drill) {
    return NextResponse.json(
      { ok: false, reason: "训练题不存在" },
      { status: 404 },
    );
  }

  const trimmedKey = (openaiApiKey || "").trim();
  const shouldUseOpenAI = Boolean(trimmedKey);

  let mode: CoachMode = "mock";
  try {
    if (shouldUseOpenAI) {
      mode = "openai";
      const feedback = await createCoachFeedbackWithOpenAI({
        apiKey: trimmedKey,
        provider: openaiProvider,
        baseUrl: openaiBaseUrl,
        model: openaiModel,
        drill,
        promptText,
      });

      const result: CoachResult = { mode, feedback };
      return NextResponse.json({ ok: true, result });
    }

    const feedback = mockCoachFeedback({ drill, promptText });
    const result: CoachResult = { mode: "mock", feedback };
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // In "real" mode, fail loudly so the user can fix their key/settings.
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, reason: "AI 教练调用失败", detail: message, mode },
      { status: 500 },
    );
  }
}
