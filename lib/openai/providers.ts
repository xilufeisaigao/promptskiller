export type ModelProvider = "openai" | "bailian" | "custom";

type ProviderPreset = {
  label: string;
  baseUrl: string;
  defaultModel: string;
};

const PROVIDER_PRESETS: Record<ModelProvider, ProviderPreset> = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  bailian: {
    label: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
  },
  custom: {
    label: "自定义（OpenAI 兼容）",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
};

export function getProviderPreset(provider?: string): ProviderPreset {
  if (provider === "bailian") return PROVIDER_PRESETS.bailian;
  if (provider === "custom") return PROVIDER_PRESETS.custom;
  return PROVIDER_PRESETS.openai;
}

export function isModelProvider(value: string): value is ModelProvider {
  return value === "openai" || value === "bailian" || value === "custom";
}

export function inferProviderFromBaseUrl(baseUrl?: string): ModelProvider {
  const raw = (baseUrl || "").trim().toLowerCase();
  if (!raw) return "openai";
  if (raw.includes("dashscope.aliyuncs.com")) return "bailian";
  if (raw.includes("api.openai.com")) return "openai";
  return "custom";
}

