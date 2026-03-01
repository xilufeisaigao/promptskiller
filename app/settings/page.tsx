"use client";

import { useMemo, useState } from "react";

import { getProviderPreset, type ModelProvider } from "@/lib/openai/providers";
import { clearLocalSettings, loadLocalSettings, saveLocalSettings } from "@/lib/settings/local";

type TestOk = { ok: true };
type TestErr = { ok: false; reason: string; status?: number };

function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return "********";
  return `${k.slice(0, 3)}…${k.slice(-4)}`;
}

export default function SettingsPage() {
  const initial = useMemo(() => loadLocalSettings(), []);
  const [saved, setSaved] = useState(() => initial);

  const [provider, setProvider] = useState<ModelProvider>(
    saved.openaiProvider ?? "openai",
  );
  const initialPreset = getProviderPreset(saved.openaiProvider ?? "openai");
  const [apiKey, setApiKey] = useState(saved.openaiApiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(saved.openaiBaseUrl ?? initialPreset.baseUrl);
  const [model, setModel] = useState(saved.openaiModel ?? initialPreset.defaultModel);
  const [defaultFeedbackMode, setDefaultFeedbackMode] = useState<"guided" | "final_only">(
    saved.defaultFeedbackMode ?? "guided",
  );
  const [finalOnlyAllowMidReview, setFinalOnlyAllowMidReview] = useState(
    Boolean(saved.finalOnlyAllowMidReview),
  );

  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "testing" }
    | { kind: "ok" }
    | { kind: "error"; message: string }
  >(() => ((saved.openaiApiKey || "").trim() ? { kind: "ok" } : { kind: "idle" }));

  function onProviderChange(next: ModelProvider) {
    const prevPreset = getProviderPreset(provider);
    const nextPreset = getProviderPreset(next);

    setProvider(next);

    if (!baseUrl.trim() || baseUrl.trim() === prevPreset.baseUrl) {
      setBaseUrl(nextPreset.baseUrl);
    }
    if (!model.trim() || model.trim() === prevPreset.defaultModel) {
      setModel(nextPreset.defaultModel);
    }
  }

  async function onTestAndSave() {
    const key = apiKey.trim();
    if (!key) {
      // Keep training behavior settings even when model key is empty.
      saveLocalSettings({
        defaultFeedbackMode,
        finalOnlyAllowMidReview,
      });
      setSaved(loadLocalSettings());
      setStatus({ kind: "idle" });
      return;
    }

    setStatus({ kind: "testing" });
    try {
      const res = await fetch("/api/openai/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: key,
          provider,
          baseUrl: baseUrl.trim() || undefined,
          model: model.trim() || undefined,
        }),
      });

      const json = (await res.json().catch(() => null)) as TestOk | TestErr | null;
      if (!json) {
        setStatus({ kind: "error", message: "接口返回不是 JSON" });
        return;
      }

      if (!json.ok) {
        setStatus({ kind: "error", message: json.reason });
        return;
      }

      saveLocalSettings({
        openaiProvider: provider,
        openaiApiKey: key,
        openaiBaseUrl: baseUrl.trim() || undefined,
        openaiModel: model.trim() || getProviderPreset(provider).defaultModel,
        defaultFeedbackMode,
        finalOnlyAllowMidReview,
      });
      setSaved(loadLocalSettings());
      setStatus({ kind: "ok" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setStatus({ kind: "error", message });
    }
  }

  function onClear() {
    clearLocalSettings();
    setProvider("openai");
    setApiKey("");
    setBaseUrl(getProviderPreset("openai").baseUrl);
    setModel(getProviderPreset("openai").defaultModel);
    setDefaultFeedbackMode("guided");
    setFinalOnlyAllowMidReview(false);
    setSaved({});
    setStatus({ kind: "idle" });
  }

  const savedKeyMasked = saved.openaiApiKey ? maskKey(saved.openaiApiKey) : null;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">配置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          填写并测试通过后，可启用在线模型反馈；未填写时仍可继续本地训练。
        </p>
      </div>

      <section className="rounded-3xl border border-border/60 bg-background p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">服务商</label>
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as ModelProvider)}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
            >
              <option value="openai">OpenAI</option>
              <option value="bailian">阿里云百炼（兼容模式）</option>
              <option value="custom">自定义（OpenAI 兼容）</option>
            </select>
            <p className="text-xs text-muted-foreground">
              百炼推荐配置：`{getProviderPreset("bailian").baseUrl}` + 模型
              `{getProviderPreset("bailian").defaultModel}`。
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">API Key</label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "bailian" ? "sk-...（百炼 Key）" : "sk-... 或其它你使用的 Key"}
              type="password"
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
            />
            {savedKeyMasked ? (
              <p className="text-xs text-muted-foreground">
                已保存（本地）：{savedKeyMasked}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">未保存 Key。</p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Base URL（可选）</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={`默认 ${getProviderPreset(provider).baseUrl}`}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              你可以覆盖默认地址以接入网关/代理。不填则使用所选服务商默认地址。
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Model（可选）</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={`例如 ${getProviderPreset(provider).defaultModel}`}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              未填写时使用默认模型 `{getProviderPreset(provider).defaultModel}`。
            </p>
          </div>

          <div className="grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-medium">训练交互设置</p>
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">默认反馈模式</label>
              <select
                value={defaultFeedbackMode}
                onChange={(e) =>
                  setDefaultFeedbackMode(
                    e.target.value === "final_only" ? "final_only" : "guided",
                  )
                }
                className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              >
                <option value="guided">过程引导（每轮即时反馈）</option>
                <option value="final_only">终局评分（完成后统一反馈）</option>
              </select>
              <label className="inline-flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={finalOnlyAllowMidReview}
                  onChange={(e) => setFinalOnlyAllowMidReview(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border/70"
                />
                <span className="text-sm text-muted-foreground">
                  终局评分模式允许中途查看单轮
                  <span className="font-medium text-foreground">简版评分</span>
                  （仅分数，不展示改进建议）。
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={onTestAndSave}
              disabled={status.kind === "testing"}
              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm disabled:opacity-50"
              type="button"
            >
              {status.kind === "testing" ? "测试中..." : "测试并保存"}
            </button>
            <button
              onClick={onClear}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-background px-5 text-sm font-medium text-foreground shadow-sm"
              type="button"
            >
              清空配置
            </button>

            {status.kind === "ok" ? (
              <p className="text-sm text-foreground">连接正常，可使用真实模型。</p>
            ) : null}
            {status.kind === "error" ? (
              <p className="text-sm text-destructive">
                连接失败：{status.message}
              </p>
            ) : null}
            {status.kind === "idle" ? (
              <p className="text-sm text-muted-foreground">
                当前为本地训练模式。
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">
            <p className="font-medium text-foreground">安全提示</p>
            <p className="mt-1">
              这里的 Key 只保存在你的浏览器 LocalStorage 中，用于向本应用的后端
              API 发起请求时临时携带（方便你自己测试）。如果你不希望在浏览器存 Key，
              直接留空即可继续本地训练。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
