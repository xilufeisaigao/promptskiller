"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { computeUtcStreak } from "@/lib/stats/streak";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ProfileState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "ready"; userId: string; email: string | null };

type AttemptRow = { score_total: number; created_at: string };
type SubmissionRow = { id: string; votes_count: number; created_at: string };
type AttemptHistoryDrill = {
  id: string;
  title: string;
  display_no: number | null;
  drill_type: string | null;
};
type AttemptHistoryRow = {
  id: string;
  drill_id: string;
  prompt_text: string;
  score_total: number;
  coach_mode: string | null;
  session_mode: string | null;
  created_at: string;
  drill: AttemptHistoryDrill | AttemptHistoryDrill[] | null;
};
type AttemptHistoryItem = {
  id: string;
  drillId: string;
  drillTitle: string;
  drillDisplayNo: number | null;
  drillType: string | null;
  promptText: string;
  scoreTotal: number;
  coachMode: string | null;
  sessionMode: "coach" | "exam";
  createdAt: string;
};

function toHistoryMode(raw: string | null): "coach" | "exam" {
  return raw === "exam" ? "exam" : "coach";
}

function toPromptPreview(text: string, max = 200): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}...`;
}

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({ kind: "loading" });

  const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [historyAttempts, setHistoryAttempts] = useState<AttemptHistoryItem[]>([]);
  const [historyMode, setHistoryMode] = useState<"all" | "coach" | "exam">("all");
  const [historyKeyword, setHistoryKeyword] = useState("");

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const totalVotes = useMemo(
    () => submissions.reduce((sum, s) => sum + (s.votes_count || 0), 0),
    [submissions],
  );
  const filteredHistory = useMemo(() => {
    const keyword = historyKeyword.trim().toLowerCase();
    return historyAttempts.filter((item) => {
      if (historyMode !== "all" && item.sessionMode !== historyMode) return false;
      if (!keyword) return true;
      return (
        item.drillTitle.toLowerCase().includes(keyword) ||
        item.drillId.toLowerCase().includes(keyword) ||
        item.promptText.toLowerCase().includes(keyword)
      );
    });
  }, [historyAttempts, historyKeyword, historyMode]);
  const historyCounts = useMemo(
    () => ({
      all: historyAttempts.length,
      coach: historyAttempts.filter((item) => item.sessionMode === "coach").length,
      exam: historyAttempts.filter((item) => item.sessionMode === "exam").length,
    }),
    [historyAttempts],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!active) return;

      if (!user) {
        setState({ kind: "anon" });
        return;
      }

      setState({ kind: "ready", userId: user.id, email: user.email ?? null });

      // Attempts count (exact)
      const { count: c1, error: e1 } = await supabase
        .from("drill_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (active && !e1) setAttemptsCount(c1 ?? 0);

      // Recent attempts for avg/streak
      const { data: recent, error: e2 } = await supabase
        .from("drill_attempts")
        .select("score_total, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!active) return;
      if (!e2 && recent) {
        const rows = recent as AttemptRow[];
        const scores = rows.map((r) => Number(r.score_total)).filter((x) => Number.isFinite(x));
        const avg =
          scores.length === 0
            ? null
            : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;

        setAvgScore(avg);
        setStreak(computeUtcStreak(rows.map((r) => r.created_at)));
      }

      // Drill attempt history
      const { data: historyRows, error: e4 } = await supabase
        .from("drill_attempts")
        .select(
          "id,drill_id,prompt_text,score_total,coach_mode,session_mode,created_at,drill:drills(id,title,display_no,drill_type)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(120);

      if (!active) return;
      if (!e4 && historyRows) {
        const parsed = (historyRows as AttemptHistoryRow[]).map((row) => {
          const drillObj = Array.isArray(row.drill) ? (row.drill[0] ?? null) : row.drill;
          return {
            id: row.id,
            drillId: row.drill_id,
            drillTitle: drillObj?.title ?? row.drill_id,
            drillDisplayNo:
              Number.isFinite(Number(drillObj?.display_no)) ? Number(drillObj?.display_no) : null,
            drillType: drillObj?.drill_type ?? null,
            promptText: toPromptPreview(row.prompt_text),
            scoreTotal: Number.isFinite(Number(row.score_total)) ? Math.round(Number(row.score_total)) : 0,
            coachMode: row.coach_mode,
            sessionMode: toHistoryMode(row.session_mode),
            createdAt: row.created_at,
          } satisfies AttemptHistoryItem;
        });
        setHistoryAttempts(parsed);
      }

      // My submissions
      const { data: subs, error: e3 } = await supabase
        .from("challenge_submissions")
        .select("id, votes_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!active) return;
      if (!e3 && subs) setSubmissions(subs as SubmissionRow[]);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user ?? null;
      if (!user) setState({ kind: "anon" });
      else setState({ kind: "ready", userId: user.id, email: user.email ?? null });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state.kind === "loading") {
    return <p className="text-sm text-muted-foreground">加载中...</p>;
  }

  if (state.kind === "anon") {
    return (
      <div className="rounded-3xl border border-border/60 bg-background p-6">
        <h1 className="text-2xl font-semibold tracking-tight">个人主页</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          登录后可以把训练记录写入数据库，跨设备查看进度，并参与周赛投票。
        </p>
        <div className="mt-4">
          <Link
            href="/auth?redirectTo=%2Fprofile"
            className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">个人主页</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.email ? state.email : "已登录"}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/60 bg-background p-6">
          <p className="text-xs text-muted-foreground">训练次数</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {attemptsCount === null ? "…" : attemptsCount}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            统计自 `drill_attempts`
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-background p-6">
          <p className="text-xs text-muted-foreground">近 200 次平均分</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {avgScore === null ? "…" : avgScore}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            后续可以做成全量聚合
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-background p-6">
          <p className="text-xs text-muted-foreground">连续天数（UTC）</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {streak === null ? "…" : streak}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            规则：当天有至少 1 次提交即算完成
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">我的训练历史</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              共 {historyCounts.all} 条记录，支持按模式筛选和关键词搜索。
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background p-1 text-xs">
            <button
              type="button"
              onClick={() => setHistoryMode("all")}
              className={`rounded-full px-3 py-1 transition-colors ${
                historyMode === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              全部 {historyCounts.all}
            </button>
            <button
              type="button"
              onClick={() => setHistoryMode("coach")}
              className={`rounded-full px-3 py-1 transition-colors ${
                historyMode === "coach"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              教练 {historyCounts.coach}
            </button>
            <button
              type="button"
              onClick={() => setHistoryMode("exam")}
              className={`rounded-full px-3 py-1 transition-colors ${
                historyMode === "exam"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              考试 {historyCounts.exam}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label className="sr-only" htmlFor="profile-history-search">
            搜索训练历史
          </label>
          <input
            id="profile-history-search"
            value={historyKeyword}
            onChange={(e) => setHistoryKeyword(e.target.value)}
            placeholder="搜索题目名 / 题目ID / 提示词内容"
            className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-0 transition-shadow focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)]"
          />
        </div>

        {filteredHistory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">暂无符合条件的训练记录。</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-border/60 bg-background px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.drillDisplayNo ? `#${item.drillDisplayNo} · ` : ""}
                      {item.drillTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("zh-CN")} · {item.drillType ?? "unknown"} ·{" "}
                      {item.coachMode ?? "mock"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        item.sessionMode === "exam"
                          ? "bg-foreground text-background"
                          : "border border-border/70 bg-background text-muted-foreground"
                      }`}
                    >
                      {item.sessionMode === "exam" ? "考试" : "教练"}
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                      {item.scoreTotal}/120
                    </span>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.promptText}</p>

                <div className="mt-3">
                  <Link
                    href={`/drills/${item.drillId}?mode=${item.sessionMode}`}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-border/70 bg-background px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    打开原题继续训练
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">我的周赛提交</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {submissions.length} 份 · 总获赞 {totalVotes}
            </p>
          </div>
          <Link
            href="/challenges"
            className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            去周赛
          </Link>
        </div>

        {submissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">暂无提交。</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {submissions.map((s) => (
              <Link
                key={s.id}
                href={`/submissions/${s.id}`}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">提交 {s.id.slice(0, 8)}…</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background tabular-nums">
                  {s.votes_count ?? 0}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
