import { inferProviderFromBaseUrl, isModelProvider, type ModelProvider } from "@/lib/openai/providers";

export type FeedbackModeSetting = "guided" | "final_only";

export type LocalSettings = {
  openaiProvider?: ModelProvider;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  defaultFeedbackMode?: FeedbackModeSetting;
  finalOnlyAllowMidReview?: boolean;
};

const STORAGE_KEY = "promptskiller.settings.v1";

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function loadLocalSettings(): LocalSettings {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  const parsed = safeParseJson(raw);
  if (!parsed || typeof parsed !== "object") return {};

  const obj = parsed as Record<string, unknown>;
  const baseUrl =
    typeof obj.openaiBaseUrl === "string" ? obj.openaiBaseUrl : undefined;
  const provider =
    typeof obj.openaiProvider === "string" && isModelProvider(obj.openaiProvider)
      ? obj.openaiProvider
      : inferProviderFromBaseUrl(baseUrl);
  const defaultFeedbackMode =
    obj.defaultFeedbackMode === "final_only" ? "final_only" : "guided";

  return {
    openaiProvider: provider,
    openaiApiKey: typeof obj.openaiApiKey === "string" ? obj.openaiApiKey : undefined,
    openaiBaseUrl: baseUrl,
    openaiModel: typeof obj.openaiModel === "string" ? obj.openaiModel : undefined,
    defaultFeedbackMode,
    finalOnlyAllowMidReview: obj.finalOnlyAllowMidReview === true,
  };
}

export function saveLocalSettings(next: LocalSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearLocalSettings(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
