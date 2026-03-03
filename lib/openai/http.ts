import {
  buildSimRoundOutputJsonSchema,
  coachFeedbackJsonSchema,
} from "@/lib/coach/types";
import type { Drill } from "@/lib/content/drills";

import { normalizeCoachFeedbackPayload } from "../coach/normalize";
import { BuildSimRoundOutputSchema, CoachFeedbackSchema } from "../coach/schema";
import type { BuildSimRoundOutput, CoachFeedback } from "../coach/types";
import { extractChatCompletionsOutputText, extractOpenAIOutputText } from "./extract";
import { getProviderPreset } from "./providers";

function normalizeBaseUrl(baseUrl: string): string {
  const raw = baseUrl.trim();
  if (!raw) return getProviderPreset("openai").baseUrl;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

type OpenAIHttpError = Error & {
  status?: number;
  details?: unknown;
};

async function openaiFetchJson(input: {
  apiKey: string;
  baseUrl: string;
  path: string;
  method: "GET" | "POST";
  body?: unknown;
}): Promise<unknown> {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const url = `${baseUrl}${input.path.startsWith("/") ? "" : "/"}${input.path}`;

  const res = await fetch(url, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const text = await res.text();
  const json = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const err: OpenAIHttpError = new Error(
      `OpenAI HTTP ${res.status} for ${input.method} ${input.path}`,
    );
    err.status = res.status;
    err.details = json ?? text;
    throw err;
  }

  return json;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseLikelyJsonFromText(text: string): unknown {
  const normalized = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const direct = safeJsonParse(normalized);
  if (direct) return direct;

  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return safeJsonParse(normalized.slice(start, end + 1));
  }

  return null;
}

function isEndpointUnsupported(err: OpenAIHttpError): boolean {
  if (err.status === 404 || err.status === 405) return true;
  if (err.status !== 400 && err.status !== 422) return false;

  const detailsText = JSON.stringify(err.details ?? "").toLowerCase();
  return (
    detailsText.includes("/responses") ||
    detailsText.includes("responses api") ||
    detailsText.includes("unsupported") ||
    detailsText.includes("not support")
  );
}

function isResponseFormatUnsupported(err: OpenAIHttpError): boolean {
  if (err.status !== 400 && err.status !== 422) return false;
  const detailsText = JSON.stringify(err.details ?? "").toLowerCase();
  return detailsText.includes("response_format") || detailsText.includes("json_object");
}

async function postChatCompletions(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system?: string;
  user: string;
}): Promise<unknown> {
  const messages = [
    ...(input.system ? [{ role: "system", content: input.system }] : []),
    { role: "user", content: input.user },
  ];

  const commonBody = {
    model: input.model,
    messages,
    temperature: 0,
  };

  try {
    return await openaiFetchJson({
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      path: "/chat/completions",
      method: "POST",
      body: {
        ...commonBody,
        response_format: { type: "json_object" },
      },
    });
  } catch (e) {
    const err = e as OpenAIHttpError;
    if (!isResponseFormatUnsupported(err)) throw err;

    return openaiFetchJson({
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      path: "/chat/completions",
      method: "POST",
      body: commonBody,
    });
  }
}

async function postResponsesPing(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
}) {
  await openaiFetchJson({
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    path: "/responses",
    method: "POST",
    body: {
      model: input.model,
      input: "ping",
      text: {
        format: {
          type: "json_schema",
          name: "promptskiller_ping",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["ok"],
            properties: { ok: { type: "boolean" } },
          },
        },
      },
    },
  });
}

async function postChatPing(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
}) {
  await postChatCompletions({
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    model: input.model,
    user: '只返回一个 JSON：{"ok":true}',
  });
}

function normalizeProviderConfig(input: {
  provider?: string;
  baseUrl?: string;
  model?: string;
}) {
  const preset = getProviderPreset(input.provider);
  const baseUrl = normalizeBaseUrl(input.baseUrl || preset.baseUrl);
  const model = (input.model || "").trim() || preset.defaultModel;
  return { baseUrl, model };
}

function reasonFromStatus(status?: number): string | null {
  if (status === 401) return "API key 无效（401）";
  if (status === 403) return "权限不足（403）";
  if (status === 429) return "请求过多或额度不足（429）";
  if (status === 404) return "接口或模型不可用（404）";
  return null;
}

type SessionMode = "coach" | "exam";

function isExamSession(sessionMode?: SessionMode): boolean {
  return sessionMode === "exam";
}

export function buildCoachFeedbackUserInput(input: {
  drill: Drill;
  promptText: string;
  sessionMode?: SessionMode;
}): string {
  const lines: string[] = [];
  if (isExamSession(input.sessionMode)) {
    lines.push(
      "【考试模式上下文策略】",
      "仅使用用户本轮显式输入的信息，不要自行补充题干、附件代码或日志内容。",
      "",
    );
  } else {
    lines.push(
      "【训练题】",
      `标题：${input.drill.title}`,
      "正文：",
      input.drill.bodyMd,
      "",
    );
  }

  lines.push(
    "【用户提示词】",
    input.promptText,
    "",
    "请按 schema 输出反馈 JSON。",
    "如果你无法严格按 schema，请至少返回单个 JSON 对象，不要包裹 Markdown 代码块。",
  );
  return lines.join("\n");
}

export function buildBuildSimRoundUserInput(input: {
  drill: Drill;
  promptText: string;
  sessionMode?: SessionMode;
}): string {
  const lines: string[] = [];
  if (isExamSession(input.sessionMode)) {
    lines.push(
      "【考试模式上下文策略】",
      "只根据用户本轮显式输入生成结果，不要补充题干、附件或隐藏要求。",
      "",
    );
  } else {
    lines.push(
      "【训练题】",
      `标题：${input.drill.title}`,
      `类型：${input.drill.drillType}`,
      "正文：",
      input.drill.bodyMd,
      "",
    );
  }

  lines.push(
    "【用户本轮提示词】",
    input.promptText,
    "",
    "请输出本轮模拟构建结果 JSON。",
  );

  return lines.join("\n");
}

export async function testOpenAIKeyConnectivity(input: {
  apiKey: string;
  provider?: string;
  baseUrl?: string;
  model?: string;
}): Promise<{ ok: true } | { ok: false; reason: string; status?: number }> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) return { ok: false, reason: "API key 为空" };

  const { baseUrl, model } = normalizeProviderConfig(input);

  try {
    try {
      await postResponsesPing({ apiKey, baseUrl, model });
    } catch (e) {
      const err = e as OpenAIHttpError;
      if (!isEndpointUnsupported(err)) throw err;
      await postChatPing({ apiKey, baseUrl, model });
    }

    return { ok: true };
  } catch (e) {
    const err = e as OpenAIHttpError;
    const status = err.status;

    const reason = reasonFromStatus(status);
    if (reason) return { ok: false, status, reason };

    return {
      ok: false,
      status,
      reason: "无法连通模型服务（网络/代理/域名/模型名/服务异常）",
    };
  }
}

export async function createCoachFeedbackWithOpenAI(input: {
  apiKey: string;
  provider?: string;
  baseUrl?: string;
  model?: string;
  drill: Drill;
  promptText: string;
  sessionMode?: SessionMode;
}): Promise<CoachFeedback> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("Missing OpenAI API key");

  const { baseUrl, model } = normalizeProviderConfig(input);

  const system = [
    "你是 PromptSkiller 的 AI 教练。你的任务不是替用户完成任务，而是帮助用户把提示词写得更清晰、可执行。",
    "",
    "规则：",
    "- 用中文输出。",
    "- 只输出符合 schema 的 JSON（不要输出多余文字）。",
    "- 字段名必须是：score_total, scores, missing_items, ambiguities, suggested_questions_to_answer, rewrite_example。",
    "- 语气要鼓励式、建设性，先肯定可取之处，再指出可改进项，避免苛责语气。",
    "- 缺失项和问题建议请用“可补充/可澄清”表达，帮助用户逐步改进。",
    "- 给出可执行、具体、可验证的建议，避免空话。",
    "- 分数含义：每个维度 0-20，维度包含 context/constraints/output_format/acceptance_criteria/tests_and_edge_cases/process_control，总分 0-120。",
  ].join("\n");

  const user = buildCoachFeedbackUserInput({
    drill: input.drill,
    promptText: input.promptText,
    sessionMode: input.sessionMode,
  });

  let outputText = "";

  try {
    const resJson = await openaiFetchJson({
      apiKey,
      baseUrl,
      path: "/responses",
      method: "POST",
      body: {
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "promptskiller_coach_feedback",
            strict: true,
            schema: coachFeedbackJsonSchema,
          },
        },
      },
    });

    outputText = extractOpenAIOutputText(resJson);
  } catch (e) {
    const err = e as OpenAIHttpError;
    if (!isEndpointUnsupported(err)) throw err;

    const chatJson = await postChatCompletions({
      apiKey,
      baseUrl,
      model,
      system,
      user,
    });

    outputText = extractChatCompletionsOutputText(chatJson);
  }

  let parsed = parseLikelyJsonFromText(outputText);

  if (!parsed) {
    const chatJson = await postChatCompletions({
      apiKey,
      baseUrl,
      model,
      system,
      user,
    });
    const chatText = extractChatCompletionsOutputText(chatJson);
    parsed = parseLikelyJsonFromText(chatText);
  }

  const normalized = normalizeCoachFeedbackPayload(parsed);
  const validated = CoachFeedbackSchema.parse(normalized);
  return validated;
}

export async function createBuildSimRoundOutputWithOpenAI(input: {
  apiKey: string;
  provider?: string;
  baseUrl?: string;
  model?: string;
  drill: Drill;
  promptText: string;
  sessionMode?: SessionMode;
}): Promise<BuildSimRoundOutput> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("Missing OpenAI API key");

  const { baseUrl, model } = normalizeProviderConfig(input);

  const system = [
    "你是 PromptSkiller 的模拟执行引擎。",
    "任务：根据用户提示词，返回本轮“模拟构建产物”，用于训练过程评估。",
    "仅输出 JSON，不要额外解释。",
    "必须严格遵守 schema 字段：summary, changed_files, patch_preview, risk_notes。",
    "changed_files 每项必须包含 path, change_type(create/update/delete), rationale。",
    "patch_preview 使用 unified diff 风格片段，控制在最小可读范围。",
    "risk_notes 输出可验证风险，不要空泛措辞。",
  ].join("\n");

  const user = buildBuildSimRoundUserInput({
    drill: input.drill,
    promptText: input.promptText,
    sessionMode: input.sessionMode,
  });

  let outputText = "";

  try {
    const resJson = await openaiFetchJson({
      apiKey,
      baseUrl,
      path: "/responses",
      method: "POST",
      body: {
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "promptskiller_build_sim_round_output",
            strict: true,
            schema: buildSimRoundOutputJsonSchema,
          },
        },
      },
    });

    outputText = extractOpenAIOutputText(resJson);
  } catch (e) {
    const err = e as OpenAIHttpError;
    if (!isEndpointUnsupported(err)) throw err;

    const chatJson = await postChatCompletions({
      apiKey,
      baseUrl,
      model,
      system,
      user,
    });
    outputText = extractChatCompletionsOutputText(chatJson);
  }

  let parsed = parseLikelyJsonFromText(outputText);

  if (!parsed) {
    const chatJson = await postChatCompletions({
      apiKey,
      baseUrl,
      model,
      system,
      user,
    });
    const chatText = extractChatCompletionsOutputText(chatJson);
    parsed = parseLikelyJsonFromText(chatText);
  }

  const validated = BuildSimRoundOutputSchema.parse(parsed);
  return validated;
}
