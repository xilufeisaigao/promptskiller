"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import type { CoachResult } from "@/lib/coach/types";
import type { Drill } from "@/lib/content/drills";
import {
  addAttempt,
  clearAttempts,
  listAttempts,
} from "@/lib/attempts/local";
import { coerceCoachFeedback } from "@/lib/coach/normalize";
import { loadLocalSettings } from "@/lib/settings/local";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

import { CoachFeedbackView } from "./CoachFeedbackView";

type CoachApiOk = { ok: true; result: CoachResult };
type CoachApiErr = { ok: false; reason: string; detail?: string; mode?: string };

type AttemptVM = {
  id: string;
  drillId: string;
  promptText: string;
  coach: CoachResult;
  createdAt: string;
  source: "local" | "cloud";
};

const SPLIT_RATIO_KEY = "promptskiller.drills.split.ratio.v1";
const SPLIT_RATIO_MIN = 28;
const SPLIT_RATIO_MAX = 72;
const RIGHT_SPLIT_RATIO_KEY = "promptskiller.drills.right.split.ratio.v1";
const RIGHT_SPLIT_RATIO_MIN = 35;
const RIGHT_SPLIT_RATIO_MAX = 82;

function clampSplitRatio(value: number): number {
  return Math.max(SPLIT_RATIO_MIN, Math.min(SPLIT_RATIO_MAX, value));
}

function clampRightSplitRatio(value: number): number {
  return Math.max(RIGHT_SPLIT_RATIO_MIN, Math.min(RIGHT_SPLIT_RATIO_MAX, value));
}

export function DrillPracticeClient(props: { drill: Drill }) {
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptVM[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(42);
  const [rightSplitRatio, setRightSplitRatio] = useState(68);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const rightSplitContainerRef = useRef<HTMLDivElement | null>(null);
  const horizontalDraggingRef = useRef(false);
  const verticalDraggingRef = useRef(false);

  const settings = useMemo(() => loadLocalSettings(), []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      // Cloud mode (authed)
      if (userId) {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("drill_attempts")
          .select("id, drill_id, prompt_text, coach_mode, coach_feedback, score_total, created_at")
          .eq("drill_id", props.drill.id)
          .order("created_at", { ascending: false });

        if (!active) return;

        if (error) {
          setErrorMsg(error.message);
          setAttempts([]);
          setSelectedAttemptId(null);
          return;
        }

        const mapped: AttemptVM[] = (data ?? []).map((row) => ({
          id: String(row.id),
          drillId: String(row.drill_id),
          promptText: String(row.prompt_text),
          coach: {
            mode: row.coach_mode === "openai" ? "openai" : "mock",
            feedback: coerceCoachFeedback(row.coach_feedback, row.score_total),
          },
          createdAt: String(row.created_at),
          source: "cloud",
        }));

        setAttempts(mapped);
        setSelectedAttemptId(mapped[0]?.id ?? null);
        return;
      }

      // Local mode (anon)
      const nextLocal = listAttempts(props.drill.id).map((a) => ({
        id: a.id,
        drillId: a.drillId,
        promptText: a.promptText,
        coach: {
          mode: a.coach.mode,
          feedback: coerceCoachFeedback(
            a.coach.feedback,
            a.coach.feedback?.score_total,
          ),
        },
        createdAt: a.createdAt,
        source: "local" as const,
      }));

      setAttempts(nextLocal);
      setSelectedAttemptId(nextLocal[0]?.id ?? null);
    }

    load();
    return () => {
      active = false;
    };
  }, [props.drill.id, userId]);

  useEffect(() => {
    if (!submitting) {
      setTypingStatus("");
      return;
    }

    const messages = [
      "教练正在阅读你的提示词...",
      "正在提炼你写得好的地方...",
      "正在生成更清晰的优化建议...",
    ];

    let messageIdx = 0;
    let charIdx = 0;

    const timer = setInterval(() => {
      const message = messages[messageIdx] ?? "";
      charIdx += 1;
      setTypingStatus(message.slice(0, charIdx));

      if (charIdx >= message.length) {
        messageIdx = (messageIdx + 1) % messages.length;
        charIdx = 0;
      }
    }, 35);

    return () => clearInterval(timer);
  }, [submitting]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(SPLIT_RATIO_KEY);
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n)) {
      setSplitRatio(clampSplitRatio(n));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(RIGHT_SPLIT_RATIO_KEY);
    if (!raw) return;
    const n = Number(raw);
    if (Number.isFinite(n)) {
      setRightSplitRatio(clampRightSplitRatio(n));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SPLIT_RATIO_KEY, String(splitRatio));
  }, [splitRatio]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RIGHT_SPLIT_RATIO_KEY, String(rightSplitRatio));
  }, [rightSplitRatio]);

  function setRatioByClientX(clientX: number) {
    const container = splitContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setSplitRatio(clampSplitRatio(ratio));
  }

  function setRightRatioByClientY(clientY: number) {
    const container = rightSplitContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.height <= 0) return;

    const ratio = ((clientY - rect.top) / rect.height) * 100;
    setRightSplitRatio(clampRightSplitRatio(ratio));
  }

  function onStartHorizontalDrag(clientX: number) {
    horizontalDraggingRef.current = true;
    setRatioByClientX(clientX);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  function onStartVerticalDrag(clientY: number) {
    verticalDraggingRef.current = true;
    setRightRatioByClientY(clientY);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const horizontal = horizontalDraggingRef.current;
      const vertical = verticalDraggingRef.current;
      if (!horizontal && !vertical) return;

      if (horizontal) setRatioByClientX(e.clientX);
      if (vertical) setRightRatioByClientY(e.clientY);

      e.preventDefault();
    }

    function stopDragging() {
      if (!horizontalDraggingRef.current && !verticalDraggingRef.current) return;
      horizontalDraggingRef.current = false;
      verticalDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", stopDragging);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, []);

  const selectedAttempt = attempts.find((a) => a.id === selectedAttemptId) ?? null;
  const drillCode = `PS-${String(props.drill.displayNo).padStart(3, "0")}`;
  const splitStyle = {
    "--left-pane": `${splitRatio}%`,
    "--right-top-pane": `${rightSplitRatio}%`,
  } as CSSProperties;

  const feedbackPanel =
    attempts.length === 0 && submitting ? (
      <div className="rounded-3xl border border-border/60 bg-background p-6">
        <p className="text-sm font-medium">教练反馈生成中</p>
        <p className="mt-2 min-h-6 text-sm text-muted-foreground">
          {typingStatus}
          <span className="animate-pulse">|</span>
        </p>
      </div>
    ) : attempts.length === 0 ? (
      <div className="rounded-3xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
        还没有提交记录。写一个 prompt，提交后就会看到教练反馈和历史版本对比。
      </div>
    ) : (
      <div className="min-w-0 rounded-3xl border border-border/60 bg-background p-6">
        <CoachFeedbackView
          key={selectedAttempt?.id ?? attempts[0]?.id}
          coach={selectedAttempt?.coach ?? attempts[0]!.coach}
        />
      </div>
    );

  const historyPanel = (
    <div className="min-w-0 rounded-3xl border border-border/60 bg-background p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">历史提交</p>
        <p className="text-xs text-muted-foreground">{attempts.length} 条</p>
      </div>

      {attempts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">暂无。</p>
      ) : (
        <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 xl:max-h-none">
          {attempts.map((a) => {
            const selected = a.id === selectedAttemptId;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAttemptId(a.id)}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-foreground bg-muted/40"
                    : "border-border/60 bg-background hover:bg-muted/30",
                ].join(" ")}
                type="button"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.promptText}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background tabular-nums">
                  {a.coach.feedback.score_total}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  async function onSubmit() {
    const text = promptText.trim();
    if (!text) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillId: props.drill.id,
          promptText: text,
          attemptIndex: attempts.length,
          openaiProvider: settings.openaiProvider,
          openaiApiKey: settings.openaiApiKey,
          openaiBaseUrl: settings.openaiBaseUrl,
          openaiModel: settings.openaiModel,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | CoachApiOk
        | CoachApiErr
        | null;

      if (!json) {
        setErrorMsg("接口返回不是 JSON");
        return;
      }

      if (!json.ok) {
        setErrorMsg([json.reason, json.detail].filter(Boolean).join("："));
        return;
      }

      const safeFeedback = coerceCoachFeedback(
        json.result.feedback,
        json.result.feedback?.score_total,
      );
      const safeResult: CoachResult = {
        mode: json.result.mode,
        feedback: safeFeedback,
      };

      if (userId) {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("drill_attempts")
          .insert({
            user_id: userId,
            drill_id: props.drill.id,
            prompt_text: text,
            coach_mode: safeResult.mode,
            coach_feedback: safeResult.feedback,
            score_total: safeResult.feedback.score_total,
          })
          .select("id")
          .single();

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        // Reload attempts to reflect server timestamp order.
        const { data: rows, error: qErr } = await supabase
          .from("drill_attempts")
          .select("id, drill_id, prompt_text, coach_mode, coach_feedback, score_total, created_at")
          .eq("drill_id", props.drill.id)
          .order("created_at", { ascending: false });

        if (qErr) {
          setErrorMsg(qErr.message);
          return;
        }

        const mapped: AttemptVM[] = (rows ?? []).map((row) => ({
          id: String(row.id),
          drillId: String(row.drill_id),
          promptText: String(row.prompt_text),
          coach: {
            mode: row.coach_mode === "openai" ? "openai" : "mock",
            feedback: coerceCoachFeedback(row.coach_feedback, row.score_total),
          },
          createdAt: String(row.created_at),
          source: "cloud",
        }));

        setAttempts(mapped);
        setSelectedAttemptId(data?.id ? String(data.id) : mapped[0]?.id ?? null);
        return;
      }

      const newAttempt = addAttempt({
        drillId: props.drill.id,
        promptText: text,
        coach: safeResult,
      });
      const next = listAttempts(props.drill.id).map((a) => ({
        id: a.id,
        drillId: a.drillId,
        promptText: a.promptText,
        coach: {
          mode: a.coach.mode,
          feedback: coerceCoachFeedback(
            a.coach.feedback,
            a.coach.feedback?.score_total,
          ),
        },
        createdAt: a.createdAt,
        source: "local" as const,
      }));

      setAttempts(next);
      setSelectedAttemptId(newAttempt.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  }

  function onClearHistory() {
    if (userId) {
      const supabase = getSupabaseBrowserClient();
      supabase
        .from("drill_attempts")
        .delete()
        .eq("drill_id", props.drill.id)
        .then(({ error }) => {
          if (error) {
            setErrorMsg(error.message);
            return;
          }
          setAttempts([]);
          setSelectedAttemptId(null);
        });
      return;
    }

    clearAttempts(props.drill.id);
    setAttempts([]);
    setSelectedAttemptId(null);
  }

  return (
    <div
      ref={splitContainerRef}
      className="grid gap-6 xl:gap-0 xl:[grid-template-columns:minmax(0,var(--left-pane))_10px_minmax(0,1fr)]"
      style={splitStyle}
    >
      <section className="min-w-0 rounded-3xl border border-border/60 bg-background p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] xl:h-[calc(100dvh-10rem)] xl:overflow-y-auto xl:rounded-r-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              每日训练 · {drillCode}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {props.drill.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground/80">{props.drill.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">
              难度 {props.drill.difficulty}/5
            </span>
          </div>
        </div>

        <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm leading-7">
          {props.drill.bodyMd}
        </div>

        <div className="mt-6 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">你的提示词</p>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                记录：
                <span className="ml-1 font-medium text-foreground">
                  {userId ? "云端" : "本地"}
                </span>
              </span>
              <span className="text-muted-foreground/60">·</span>
              <Link href="/settings" className="underline underline-offset-4">
                去配置
              </Link>
              {!userId ? (
                <>
                  <span className="text-muted-foreground/60">·</span>
                  <Link href="/auth" className="underline underline-offset-4">
                    登录后可云端保存
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="写下你会发给 AI 的提示词。建议包含：背景、目标、约束、输出格式、验收标准、边界情况..."
            className="min-h-44 w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSubmit}
              disabled={submitting || !promptText.trim()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm disabled:opacity-50"
            >
              {submitting ? "提交中..." : "提交给教练"}
            </button>

            <button
              onClick={onClearHistory}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-background px-5 text-sm font-medium text-foreground shadow-sm"
              type="button"
            >
              清空本题历史
            </button>

            {errorMsg ? (
              <p className="text-sm text-destructive">{errorMsg}</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="relative hidden items-stretch justify-center xl:flex">
        <button
          type="button"
          aria-label="调整左右面板宽度"
          title="拖拽调整左右面板宽度"
          onPointerDown={(e) => onStartHorizontalDrag(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              setSplitRatio((v) => clampSplitRatio(v - 2));
            } else if (e.key === "ArrowRight") {
              setSplitRatio((v) => clampSplitRatio(v + 2));
            }
          }}
          className="group relative w-2 cursor-col-resize rounded-full bg-transparent"
        >
          <span className="absolute inset-y-3 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-border/90 transition-colors group-hover:bg-foreground/40 group-active:bg-foreground/50" />
        </button>
      </div>

      <section className="min-w-0 xl:pl-3">
        <div className="grid gap-4 xl:hidden">
          {feedbackPanel}
          {historyPanel}
        </div>

        <div
          ref={rightSplitContainerRef}
          className="hidden min-w-0 xl:grid xl:h-[calc(100dvh-10rem)] xl:[grid-template-rows:minmax(220px,var(--right-top-pane))_10px_minmax(220px,1fr)]"
        >
          <div className="min-h-0 overflow-y-auto pr-1">{feedbackPanel}</div>

          <div className="relative flex items-center justify-center px-1">
            <button
              type="button"
              aria-label="调整右侧上下区域高度"
              title="拖拽调整反馈区和历史区高度"
              onPointerDown={(e) => onStartVerticalDrag(e.clientY)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  setRightSplitRatio((v) => clampRightSplitRatio(v - 2));
                } else if (e.key === "ArrowDown") {
                  setRightSplitRatio((v) => clampRightSplitRatio(v + 2));
                }
              }}
              className="group relative h-2 w-full cursor-row-resize rounded-full bg-transparent"
            >
              <span className="absolute top-1/2 left-3 right-3 h-[3px] -translate-y-1/2 rounded-full bg-border/90 transition-colors group-hover:bg-foreground/40 group-active:bg-foreground/50" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">{historyPanel}</div>
        </div>
      </section>
    </div>
  );
}
