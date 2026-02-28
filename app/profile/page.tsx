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

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({ kind: "loading" });

  const [attemptsCount, setAttemptsCount] = useState<number | null>(null);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const totalVotes = useMemo(
    () => submissions.reduce((sum, s) => sum + (s.votes_count || 0), 0),
    [submissions],
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
        .select("id", { count: "exact", head: true });
      if (active && !e1) setAttemptsCount(c1 ?? 0);

      // Recent attempts for avg/streak
      const { data: recent, error: e2 } = await supabase
        .from("drill_attempts")
        .select("score_total, created_at")
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

