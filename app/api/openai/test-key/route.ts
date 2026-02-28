import { NextResponse } from "next/server";
import { z } from "zod";

import { testOpenAIKeyConnectivity } from "@/lib/openai/http";

const BodySchema = z.object({
  apiKey: z.string().min(1),
  provider: z.enum(["openai", "bailian", "custom"]).optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
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

  const result = await testOpenAIKeyConnectivity({
    apiKey: parsed.data.apiKey,
    provider: parsed.data.provider,
    baseUrl: parsed.data.baseUrl,
    model: parsed.data.model,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
