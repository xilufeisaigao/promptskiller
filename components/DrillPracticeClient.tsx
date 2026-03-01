"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { addAttempt, clearAttempts, listAttempts } from "@/lib/attempts/local";
import {
  coerceBuildSimRoundOutput,
} from "@/lib/coach/build-sim";
import { coerceCoachFeedback } from "@/lib/coach/normalize";
import type { BuildSimRoundOutput, CoachMode, CoachResult } from "@/lib/coach/types";
import type { Drill, DrillAsset } from "@/lib/content/drills";
import { loadLocalSettings } from "@/lib/settings/local";
import { markDrillPracticed } from "@/lib/stats/drill-progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

import { CoachFeedbackView } from "./CoachFeedbackView";

type CoachApiOk = { ok: true; result: CoachResult };
type CoachApiErr = { ok: false; reason: string; detail?: string };
type FeedbackMode = "guided" | "final_only";
type SessionStatus = "in_progress" | "completed";
type AssetTab = "prompt" | "file" | "log";

type FinalReport = {
  round_count: number;
  avg_score: number;
  best_score: number;
  last_score: number;
  strength_summary: string[];
  next_focus: string[];
};

type SessionVM = {
  id: string;
  feedbackMode: FeedbackMode;
  status: SessionStatus;
  finalReport: FinalReport | null;
};

type AttemptVM = {
  id: string;
  drillId: string;
  promptText: string;
  coach: CoachResult;
  createdAt: string;
  source: "local" | "cloud";
  visible: boolean;
  sessionId: string | null;
  roundNo: number | null;
  feedbackMode: FeedbackMode;
  sessionStatus: SessionStatus | null;
  finalReport: FinalReport | null;
  roundOutput: BuildSimRoundOutput | null;
};

type SessionRow = {
  id: string;
  feedback_mode: string;
  status: string;
  final_report_json: unknown;
};

type RoundRow = {
  id: string;
  session_id: string;
  round_no: number;
  user_prompt_text: string;
  model_output_json: unknown;
  round_eval_json: unknown;
  eval_visible_to_user: boolean;
  created_at: string;
};

const DRILL_TYPE_LABEL: Record<Drill["drillType"], string> = {
  prompt_case: "普通题",
  code_case_multi: "多文件题",
  build_sim_case: "模拟构建题",
  template_case: "教学样板题",
};

function formatDrillCode(n: number): string {
  return `PS-${String(n).padStart(3, "0")}`;
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  return input as Record<string, unknown>;
}

function parseMode(value: unknown): FeedbackMode {
  return value === "final_only" ? "final_only" : "guided";
}

function parseStatus(value: unknown): SessionStatus {
  return value === "completed" ? "completed" : "in_progress";
}

function parseCoachMode(value: unknown): CoachMode {
  return value === "openai" ? "openai" : "mock";
}

function listFromUnknown(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, max);
}

function parseFinalReport(value: unknown): FinalReport | null {
  const row = asRecord(value);
  if (!row) return null;
  const roundCount = Number(row.round_count);
  if (!Number.isFinite(roundCount) || roundCount <= 0) return null;
  return {
    round_count: Math.round(roundCount),
    avg_score: Number(row.avg_score) || 0,
    best_score: Math.round(Number(row.best_score) || 0),
    last_score: Math.round(Number(row.last_score) || 0),
    strength_summary: listFromUnknown(row.strength_summary),
    next_focus: listFromUnknown(row.next_focus),
  };
}

function topSummary(items: string[], fallback: string): string[] {
  if (items.length === 0) return [fallback];
  const counter = new Map<string, number>();
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    counter.set(key, (counter.get(key) ?? 0) + 1);
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([x]) => x);
}

function buildFinalReport(rows: AttemptVM[]): FinalReport {
  const scores = rows.map((row) => row.coach.feedback.score_total);
  const round_count = scores.length;
  const avg_score =
    round_count > 0
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / round_count) * 10) / 10
      : 0;
  const best_score = round_count > 0 ? Math.max(...scores) : 0;
  const last_score = rows[0]?.coach.feedback.score_total ?? 0;

  return {
    round_count,
    avg_score,
    best_score,
    last_score,
    strength_summary: topSummary(
      rows.flatMap((row) => row.coach.feedback.suggested_questions_to_answer),
      "继续保持结构化提问与可验证输出。",
    ),
    next_focus: topSummary(
      rows.flatMap((row) => row.coach.feedback.missing_items),
      "补齐约束、验收标准与边界测试。",
    ),
  };
}

function parseRoundOutput(modelOutput: unknown): BuildSimRoundOutput | null {
  const record = asRecord(modelOutput);
  if (!record) return coerceBuildSimRoundOutput(modelOutput);
  return coerceBuildSimRoundOutput(record.round_output ?? modelOutput);
}

export function DrillPracticeClient(props: { drill: Drill; assets?: DrillAsset[] }) {
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptVM[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>("guided");
  const [midReviewVisibleRoundIds, setMidReviewVisibleRoundIds] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionVM[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [assetTab, setAssetTab] = useState<AssetTab>("prompt");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const settings = useMemo(() => loadLocalSettings(), []);
  const configuredDefaultFeedbackMode: FeedbackMode =
    settings.defaultFeedbackMode === "final_only" ? "final_only" : "guided";
  const allowMidReviewInFinalOnly = Boolean(settings.finalOnlyAllowMidReview);
  const assets = useMemo(() => props.assets ?? [], [props.assets]);
  const code = formatDrillCode(props.drill.displayNo);

  const fileAssets = useMemo(
    () => assets.filter((a) => a.assetKind === "file").sort((a, b) => a.orderNo - b.orderNo),
    [assets],
  );
  const logAssets = useMemo(
    () => assets.filter((a) => a.assetKind === "log").sort((a, b) => a.orderNo - b.orderNo),
    [assets],
  );
  const specAssets = useMemo(
    () => assets.filter((a) => a.assetKind === "spec").sort((a, b) => a.orderNo - b.orderNo),
    [assets],
  );

  const selectedAttempt = attempts.find((a) => a.id === selectedAttemptId) ?? null;
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const activeSessionRoundCount = useMemo(() => {
    if (!activeSessionId) return 0;
    return attempts.filter(
      (a) => a.source === "cloud" && a.sessionId === activeSessionId && a.sessionStatus === "in_progress",
    ).length;
  }, [attempts, activeSessionId]);

  const modeLocked = Boolean(
    userId && activeSession && activeSession.status === "in_progress" && activeSessionRoundCount > 0,
  );

  const canCompleteFinal = Boolean(
    userId &&
      activeSession &&
      activeSession.status === "in_progress" &&
      activeSession.feedbackMode === "final_only" &&
      activeSessionRoundCount > 0,
  );

  useEffect(() => {
    setSelectedFileId((prev) =>
      prev && fileAssets.some((a) => a.id === prev) ? prev : fileAssets[0]?.id ?? null,
    );
  }, [fileAssets]);

  useEffect(() => {
    setSelectedLogId((prev) =>
      prev && logAssets.some((a) => a.id === prev) ? prev : logAssets[0]?.id ?? null,
    );
  }, [logAssets]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const loadCloudData = useCallback(
    async (uid: string, preferredId?: string | null) => {
      const supabase = getSupabaseBrowserClient();

      const { data: sessionData, error: sessionErr } = await supabase
        .from("drill_sessions")
        .select("id,feedback_mode,status,final_report_json")
        .eq("user_id", uid)
        .eq("drill_id", props.drill.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (sessionErr) throw sessionErr;

      const parsedSessions = ((sessionData ?? []) as SessionRow[]).map((row) => ({
        id: row.id,
        feedbackMode: parseMode(row.feedback_mode),
        status: parseStatus(row.status),
        finalReport: parseFinalReport(row.final_report_json),
      } satisfies SessionVM));

      setSessions(parsedSessions);
      const inProgress = parsedSessions.find((row) => row.status === "in_progress") ?? null;
      setActiveSessionId(inProgress?.id ?? null);
      if (inProgress) setFeedbackMode(inProgress.feedbackMode);
      else setFeedbackMode(configuredDefaultFeedbackMode);

      if (parsedSessions.length === 0) {
        setAttempts([]);
        setSelectedAttemptId(null);
        return;
      }

      const sessionIds = parsedSessions.map((row) => row.id);
      const { data: roundData, error: roundErr } = await supabase
        .from("drill_session_rounds")
        .select("id,session_id,round_no,user_prompt_text,model_output_json,round_eval_json,eval_visible_to_user,created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (roundErr) throw roundErr;

      const sessionMap = new Map(parsedSessions.map((row) => [row.id, row]));
      const nextAttempts: AttemptVM[] = [];
      for (const row of (roundData ?? []) as RoundRow[]) {
        const session = sessionMap.get(row.session_id);
        if (!session) continue;
        const output = parseRoundOutput(row.model_output_json);
        const modelRecord = asRecord(row.model_output_json);
        nextAttempts.push({
          id: row.id,
          drillId: props.drill.id,
          promptText: row.user_prompt_text,
          coach: {
            mode: parseCoachMode(modelRecord?.coach_mode),
            feedback: coerceCoachFeedback(row.round_eval_json),
            round_output: output,
          },
          createdAt: row.created_at,
          source: "cloud",
          visible: Boolean(row.eval_visible_to_user),
          sessionId: row.session_id,
          roundNo: Number.isFinite(Number(row.round_no)) ? Number(row.round_no) : null,
          feedbackMode: session.feedbackMode,
          sessionStatus: session.status,
          finalReport: session.finalReport,
          roundOutput: output,
        });
      }

      setAttempts(nextAttempts);
      setSelectedAttemptId((prev) => {
        const candidate = preferredId ?? prev;
        if (candidate && nextAttempts.some((x) => x.id === candidate)) return candidate;
        return nextAttempts[0]?.id ?? null;
      });
    },
    [props.drill.id, configuredDefaultFeedbackMode],
  );

  useEffect(() => {
    let active = true;

    async function run() {
      if (userId) {
        try {
          await loadCloudData(userId);
          if (active) setErrorMsg(null);
        } catch (e) {
          if (!active) return;
          setErrorMsg(e instanceof Error ? e.message : "加载失败");
          setAttempts([]);
          setSelectedAttemptId(null);
        }
        return;
      }

      const localAttempts = listAttempts(props.drill.id).map((a) => {
        const output = coerceBuildSimRoundOutput(a.coach.round_output ?? null);
        return {
          id: a.id,
          drillId: a.drillId,
          promptText: a.promptText,
          coach: {
            mode: a.coach.mode,
            feedback: coerceCoachFeedback(a.coach.feedback, a.coach.feedback?.score_total),
            round_output: output,
          },
          createdAt: a.createdAt,
          source: "local" as const,
          visible: true,
          sessionId: null,
          roundNo: null,
          feedbackMode: "guided" as const,
          sessionStatus: null,
          finalReport: null,
          roundOutput: output,
        } satisfies AttemptVM;
      });

      if (!active) return;
      setSessions([]);
      setActiveSessionId(null);
      setFeedbackMode("guided");
      setAttempts(localAttempts);
      setSelectedAttemptId(localAttempts[0]?.id ?? null);
    }

    void run();
    return () => {
      active = false;
    };
  }, [props.drill.id, userId, loadCloudData]);

  useEffect(() => {
    setMidReviewVisibleRoundIds([]);
  }, [props.drill.id, userId, activeSessionId]);

  useEffect(() => {
    if (!submitting) {
      setTypingStatus("");
      return;
    }

    const messages = [
      "教练正在阅读你的提示词...",
      "正在评估当前轮次表现...",
      "正在整理下一轮建议...",
    ];

    let msgIdx = 0;
    let charIdx = 0;
    const timer = setInterval(() => {
      const msg = messages[msgIdx] ?? "";
      charIdx += 1;
      setTypingStatus(msg.slice(0, charIdx));
      if (charIdx >= msg.length) {
        msgIdx = (msgIdx + 1) % messages.length;
        charIdx = 0;
      }
    }, 35);

    return () => clearInterval(timer);
  }, [submitting]);

  async function ensureSession(uid: string): Promise<SessionVM> {
    if (activeSession && activeSession.status === "in_progress" && activeSession.feedbackMode === feedbackMode) {
      return activeSession;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("drill_sessions")
      .insert({
        user_id: uid,
        drill_id: props.drill.id,
        feedback_mode: feedbackMode,
        status: "in_progress",
      })
      .select("id,feedback_mode,status,final_report_json")
      .single();

    if (error) throw error;

    const row = data as SessionRow;
    const session: SessionVM = {
      id: row.id,
      feedbackMode: parseMode(row.feedback_mode),
      status: parseStatus(row.status),
      finalReport: parseFinalReport(row.final_report_json),
    };
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }

  async function submitCloudRound(uid: string, text: string, result: CoachResult) {
    const supabase = getSupabaseBrowserClient();
    const session = await ensureSession(uid);

    const { count, error: countErr } = await supabase
      .from("drill_session_rounds")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id);
    if (countErr) throw countErr;

    const output = coerceBuildSimRoundOutput(result.round_output ?? null);
    const safeFeedback = coerceCoachFeedback(result.feedback, result.feedback?.score_total);

    const workspaceState =
      props.drill.drillType === "build_sim_case"
        ? {
            drill_id: props.drill.id,
            snapshot_at: new Date().toISOString(),
            prompt_excerpt: text.slice(0, 240),
            files: assets.slice(0, 30).map((asset) => ({
              path: asset.path,
              kind: asset.assetKind,
              size: asset.contentText.length,
            })),
          }
        : null;

    const { data: insertedRound, error: roundErr } = await supabase
      .from("drill_session_rounds")
      .insert({
        session_id: session.id,
        round_no: (count ?? 0) + 1,
        user_prompt_text: text,
        model_output_json: {
          coach_mode: result.mode,
          round_output: output,
          generated_at: new Date().toISOString(),
        },
        round_eval_json: safeFeedback,
        eval_visible_to_user: feedbackMode === "guided",
        workspace_state_json: workspaceState,
        changed_files_json: output?.changed_files ?? null,
      })
      .select("id")
      .single();

    if (roundErr) throw roundErr;

    const { error: attemptErr } = await supabase.from("drill_attempts").insert({
      user_id: uid,
      drill_id: props.drill.id,
      prompt_text: text,
      coach_mode: result.mode,
      coach_feedback: safeFeedback,
      score_total: safeFeedback.score_total,
    });

    if (attemptErr) {
      setErrorMsg(`轮次已保存，但统计写入失败：${attemptErr.message}`);
    }

    await loadCloudData(uid, String((insertedRound as { id?: string } | null)?.id ?? null));
  }

  async function onSubmit() {
    const text = promptText.trim();
    if (!text) return;

    setSubmitting(true);
    setErrorMsg(null);
    setInfoMsg(null);

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

      const json = (await res.json().catch(() => null)) as CoachApiOk | CoachApiErr | null;
      if (!json) {
        setErrorMsg("接口返回不是 JSON");
        return;
      }
      if (!json.ok) {
        setErrorMsg([json.reason, json.detail].filter(Boolean).join("："));
        return;
      }

      const result: CoachResult = {
        mode: json.result.mode,
        feedback: coerceCoachFeedback(json.result.feedback, json.result.feedback?.score_total),
        round_output: coerceBuildSimRoundOutput(json.result.round_output ?? null),
      };

      if (userId) {
        await submitCloudRound(userId, text, result);
        markDrillPracticed(props.drill.id);
        if (feedbackMode === "final_only") {
          setInfoMsg(
            allowMidReviewInFinalOnly
              ? "本轮评估已记录。你可查看简版评分，完整改进建议将在会话完成后统一展示。"
              : "本轮评估已记录，终局评分模式会在完成会话后统一展示。",
          );
        }
      } else {
        const saved = addAttempt({ drillId: props.drill.id, promptText: text, coach: result });
        markDrillPracticed(props.drill.id);
        const next = listAttempts(props.drill.id).map((a) => {
          const output = coerceBuildSimRoundOutput(a.coach.round_output ?? null);
          return {
            id: a.id,
            drillId: a.drillId,
            promptText: a.promptText,
            coach: {
              mode: a.coach.mode,
              feedback: coerceCoachFeedback(a.coach.feedback, a.coach.feedback?.score_total),
              round_output: output,
            },
            createdAt: a.createdAt,
            source: "local" as const,
            visible: true,
            sessionId: null,
            roundNo: null,
            feedbackMode: "guided" as const,
            sessionStatus: null,
            finalReport: null,
            roundOutput: output,
          } satisfies AttemptVM;
        });
        setAttempts(next);
        setSelectedAttemptId(saved.id);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCompleteFinalSession() {
    if (!userId || !activeSession || activeSession.feedbackMode !== "final_only") return;

    const sessionAttempts = attempts.filter((a) => a.source === "cloud" && a.sessionId === activeSession.id);
    if (sessionAttempts.length === 0) {
      setErrorMsg("当前会话暂无轮次。请先提交至少一轮。");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const report = buildFinalReport(sessionAttempts);
    const supabase = getSupabaseBrowserClient();

    try {
      const { error: roundsErr } = await supabase
        .from("drill_session_rounds")
        .update({ eval_visible_to_user: true })
        .eq("session_id", activeSession.id);
      if (roundsErr) throw roundsErr;

      const { error: sessionErr } = await supabase
        .from("drill_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString(), final_report_json: report })
        .eq("id", activeSession.id)
        .eq("user_id", userId);
      if (sessionErr) throw sessionErr;

      setInfoMsg("终局评分已生成，全部轮次评分已解锁。");
      await loadCloudData(userId);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "终局评分失败");
    } finally {
      setSubmitting(false);
    }
  }

  function onClearHistory() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (userId) {
      const supabase = getSupabaseBrowserClient();
      Promise.all([
        supabase.from("drill_attempts").delete().eq("drill_id", props.drill.id),
        supabase.from("drill_sessions").delete().eq("drill_id", props.drill.id).eq("user_id", userId),
        supabase.from("drill_user_progress").delete().eq("drill_id", props.drill.id).eq("user_id", userId),
      ]).then(([a, s]) => {
        if (a.error) return setErrorMsg(a.error.message);
        if (s.error) return setErrorMsg(s.error.message);
        setAttempts([]);
        setSessions([]);
        setActiveSessionId(null);
        setSelectedAttemptId(null);
        setFeedbackMode(configuredDefaultFeedbackMode);
        setMidReviewVisibleRoundIds([]);
      });
      return;
    }

    clearAttempts(props.drill.id);
    setAttempts([]);
    setSelectedAttemptId(null);
    setMidReviewVisibleRoundIds([]);
  }

  const evalHidden = Boolean(
    selectedAttempt && selectedAttempt.source === "cloud" && !selectedAttempt.visible,
  );
  const canRevealMidReview = Boolean(
    selectedAttempt &&
      selectedAttempt.source === "cloud" &&
      selectedAttempt.feedbackMode === "final_only" &&
      selectedAttempt.sessionStatus === "in_progress" &&
      !selectedAttempt.visible &&
      allowMidReviewInFinalOnly,
  );
  const midReviewVisible = Boolean(
    selectedAttempt &&
      canRevealMidReview &&
      midReviewVisibleRoundIds.includes(selectedAttempt.id),
  );
  const selectedFile = fileAssets.find((a) => a.id === selectedFileId) ?? fileAssets[0] ?? null;
  const selectedLog = logAssets.find((a) => a.id === selectedLogId) ?? logAssets[0] ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="grid gap-4">
        <div className="rounded-3xl border border-border/60 bg-[linear-gradient(130deg,oklch(0.992_0.012_88),oklch(0.982_0.014_230))] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                Daily Drill · {code}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{props.drill.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{props.drill.id}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-muted-foreground">
                难度 {props.drill.difficulty}/5
              </span>
              <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-muted-foreground">
                {DRILL_TYPE_LABEL[props.drill.drillType]}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              ["prompt", "题面"],
              ["file", `文件(${fileAssets.length})`],
              ["log", `日志(${logAssets.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAssetTab(key)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  assetTab === key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {assetTab === "prompt" ? (
            <div className="grid gap-3">
              <div className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm leading-7">
                {props.drill.bodyMd}
              </div>
              {specAssets.map((asset) => (
                <details key={asset.id} className="rounded-2xl border border-border/60 bg-background p-3">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">规格附件 · {asset.path}</summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-6">
                    {asset.contentText}
                  </pre>
                </details>
              ))}
            </div>
          ) : assetTab === "file" ? (
            fileAssets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">当前题目没有文件附件。</div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {fileAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedFileId(asset.id)}
                      className={[
                        "rounded-2xl border px-3 py-2 text-left text-xs transition-colors",
                        selectedFile?.id === asset.id
                          ? "border-foreground bg-muted/30 text-foreground"
                          : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      <p className="truncate font-medium">{asset.path}</p>
                      <p className="mt-1 text-[11px]">排序 {asset.orderNo}</p>
                    </button>
                  ))}
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-6">
                  {selectedFile?.contentText ?? ""}
                </pre>
              </div>
            )
          ) : logAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">当前题目没有日志附件。</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                {logAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedLogId(asset.id)}
                    className={[
                      "rounded-2xl border px-3 py-2 text-left text-xs transition-colors",
                      selectedLog?.id === asset.id
                        ? "border-foreground bg-muted/30 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <p className="truncate font-medium">{asset.path}</p>
                    <p className="mt-1 text-[11px]">排序 {asset.orderNo}</p>
                  </button>
                ))}
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-6">
                {selectedLog?.contentText ?? ""}
              </pre>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">你的提示词</p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                记录：
                <span className="ml-1 font-medium text-foreground">{userId ? "云端会话" : "本地"}</span>
              </span>
              <span className="text-muted-foreground/60">·</span>
              <Link href="/settings" className="underline underline-offset-4">去配置</Link>
              {!userId ? (
                <>
                  <span className="text-muted-foreground/60">·</span>
                  <Link href="/auth" className="underline underline-offset-4">登录后启用反馈模式</Link>
                </>
              ) : null}
            </div>
          </div>

          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="写下你会发给 AI 的提示词。建议包含：背景、目标、约束、输出格式、验收标准、边界情况..."
            className="mt-3 min-h-44 w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void onSubmit()}
              disabled={submitting || !promptText.trim()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm disabled:opacity-50"
            >
              {submitting ? "提交中..." : "提交本轮"}
            </button>

            <button
              onClick={onClearHistory}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-background px-5 text-sm font-medium text-foreground shadow-sm"
              type="button"
            >
              清空本题历史
            </button>
          </div>

          {errorMsg ? <p className="mt-2 text-sm text-destructive">{errorMsg}</p> : null}
          {infoMsg ? <p className="mt-2 text-sm text-muted-foreground">{infoMsg}</p> : null}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">反馈模式</p>
              <p className="mt-1 text-xs text-muted-foreground">
                过程引导会每轮即时评分；终局评分会先隐藏完整评估，完成后统一展示。
              </p>
            </div>
            <div className="flex rounded-full border border-border/70 bg-muted/20 p-1">
              {([
                ["guided", "过程引导"],
                ["final_only", "终局评分"],
              ] as const).map(([mode, label]) => {
                const active = feedbackMode === mode;
                const disabled = !userId || (modeLocked && !active);
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) setFeedbackMode(mode);
                    }}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {!userId ? <p className="mt-2 text-xs text-muted-foreground">登录后可启用会话级反馈模式与终局复盘。</p> : null}
          {modeLocked ? <p className="mt-2 text-xs text-muted-foreground">当前会话进行中，模式暂时锁定。</p> : null}
          {allowMidReviewInFinalOnly ? (
            <p className="mt-2 text-xs text-muted-foreground">
              已开启终局模式中途查看：仅可查看单轮分数，不展示改进建议。
            </p>
          ) : null}
          {canCompleteFinal ? (
            <button
              type="button"
              onClick={() => void onCompleteFinalSession()}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background px-4 text-xs font-medium"
            >
              完成本次会话并生成终局评分
            </button>
          ) : null}
        </div>

        {attempts.length === 0 && submitting ? (
          <div className="rounded-3xl border border-border/60 bg-background p-6">
            <p className="text-sm font-medium">教练反馈生成中</p>
            <p className="mt-2 min-h-6 text-sm text-muted-foreground">{typingStatus}<span className="animate-pulse">|</span></p>
          </div>
        ) : attempts.length === 0 ? (
          <div className="rounded-3xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
            还没有提交记录。写一个 prompt，提交后就会看到轮次评估和历史版本对比。
          </div>
        ) : evalHidden && !midReviewVisible ? (
          <div className="rounded-3xl border border-border/60 bg-background p-6">
            <p className="text-sm font-medium">终局评分模式中</p>
            <p className="mt-2 text-sm text-muted-foreground">
              本轮完整评估已记录，完成会话后统一展示评分与复盘报告。
            </p>
            {canRevealMidReview && selectedAttempt ? (
              <button
                type="button"
                onClick={() =>
                  setMidReviewVisibleRoundIds((prev) =>
                    prev.includes(selectedAttempt.id)
                      ? prev
                      : [...prev, selectedAttempt.id],
                  )
                }
                className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background px-4 text-xs font-medium"
              >
                查看本轮简版评分
              </button>
            ) : null}
          </div>
        ) : midReviewVisible && selectedAttempt ? (
          <div className="rounded-3xl border border-border/60 bg-background p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">本轮简版评分</p>
              <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
                终局模式中途查看
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              当前仅展示分数，不展示改进建议。完整复盘会在会话完成后统一解锁。
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                总分 {selectedAttempt.coach.feedback.score_total}/120
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                上下文 {selectedAttempt.coach.feedback.scores.context}/20
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                约束 {selectedAttempt.coach.feedback.scores.constraints}/20
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                输出格式 {selectedAttempt.coach.feedback.scores.output_format}/20
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                验收标准 {selectedAttempt.coach.feedback.scores.acceptance_criteria}/20
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                测试/边界 {selectedAttempt.coach.feedback.scores.tests_and_edge_cases}/20
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                流程控制 {selectedAttempt.coach.feedback.scores.process_control}/20
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 bg-background p-6">
            <CoachFeedbackView coach={selectedAttempt?.coach ?? attempts[0]!.coach} />
          </div>
        )}

        {selectedAttempt?.roundOutput ? (
          <div className="rounded-3xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">本轮模拟产物</p>
              <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">build_sim</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedAttempt.roundOutput.summary}</p>
            <div className="mt-3 grid gap-2">
              {selectedAttempt.roundOutput.changed_files.map((file, idx) => (
                <div key={`${file.path}-${idx}`} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{file.path}</span><span>{file.change_type}</span></div>
                  <p className="mt-1 text-muted-foreground">{file.rationale}</p>
                </div>
              ))}
            </div>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-3 text-[11px] leading-5">{selectedAttempt.roundOutput.patch_preview}</pre>
          </div>
        ) : null}

        {selectedAttempt?.finalReport ? (
          <div className="rounded-3xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">终局评分报告</p><span className="text-xs text-muted-foreground">轮次 {selectedAttempt.finalReport.round_count}</span></div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">平均分 {selectedAttempt.finalReport.avg_score}</div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">最高分 {selectedAttempt.finalReport.best_score}</div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">最后分 {selectedAttempt.finalReport.last_score}</div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <div className="flex items-center justify-between"><p className="text-sm font-semibold">历史提交</p><p className="text-xs text-muted-foreground">{attempts.length} 条</p></div>
          {attempts.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">暂无。</p> : (
            <div className="mt-3 grid max-h-[36rem] gap-2 overflow-y-auto pr-1">
              {attempts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAttemptId(a.id)}
                  className={[
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                    a.id === selectedAttemptId ? "border-foreground bg-muted/40" : "border-border/60 bg-background hover:bg-muted/30",
                  ].join(" ")}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.promptText}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{new Date(a.createdAt).toLocaleString("zh-CN")}{a.roundNo ? ` · R${a.roundNo}` : ""}</p>
                    {a.source === "cloud" ? <p className="mt-1 text-[11px] text-muted-foreground">{a.feedbackMode === "guided" ? "过程引导" : "终局评分"}{a.sessionStatus === "completed" ? " · 已完成" : " · 进行中"}</p> : null}
                  </div>
                  <div className={[
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                    a.visible ? "bg-foreground text-background" : "border border-border/70 bg-background text-muted-foreground",
                  ].join(" ")}>
                    {a.visible ? a.coach.feedback.score_total : "待揭晓"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
