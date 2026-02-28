"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type SubmissionForm = {
  id?: string;
  artifactUrl: string;
  artifactType: string;
  promptLogMd: string;
  notes: string;
};

export function ChallengeSubmissionClient(props: {
  challengeId: string;
  challengeSlug: string;
  challengeEndAt: string;
  challengeStartAt: string;
}) {
  const router = useRouter();
  const isActive = useMemo(() => {
    const now = Date.now();
    const start = new Date(props.challengeStartAt).getTime();
    const end = new Date(props.challengeEndAt).getTime();
    return now >= start && now <= end;
  }, [props.challengeEndAt, props.challengeStartAt]);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<SubmissionForm>({
    artifactUrl: "",
    artifactType: "url",
    promptLogMd: "",
    notes: "",
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function load() {
      setLoading(true);
      setErr(null);
      setMsg(null);

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!active) return;

      setUserId(user?.id ?? null);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: existing, error } = await supabase
        .from("challenge_submissions")
        .select(
          "id, artifact_url, artifact_type, prompt_log_md, notes, updated_at",
        )
        .eq("challenge_id", props.challengeId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      if (existing) {
        setForm({
          id: String(existing.id),
          artifactUrl: String(existing.artifact_url ?? ""),
          artifactType: String(existing.artifact_type ?? "url"),
          promptLogMd: String(existing.prompt_log_md ?? ""),
          notes: String(existing.notes ?? ""),
        });
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [props.challengeId]);

  async function onSave() {
    setErr(null);
    setMsg(null);

    if (!userId) {
      router.push(`/auth?redirectTo=${encodeURIComponent(`/challenges/${props.challengeSlug}`)}`);
      return;
    }
    if (!isActive) {
      setErr("挑战已结束，无法提交或修改。");
      return;
    }

    const url = form.artifactUrl.trim();
    if (!url) {
      setErr("请填写作品链接（artifact_url）。");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("challenge_submissions")
        .upsert(
          {
            challenge_id: props.challengeId,
            user_id: userId,
            artifact_url: url,
            artifact_type: form.artifactType.trim() || "url",
            prompt_log_md: form.promptLogMd,
            notes: form.notes.trim() ? form.notes.trim() : null,
          },
          { onConflict: "challenge_id,user_id" },
        )
        .select("id")
        .single();

      if (error) throw error;

      setForm((f) => ({ ...f, id: String(data.id) }));
      setMsg("已保存。");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-background p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">提交我的作品</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isActive
              ? "每人每周 1 份提交（可在截止前修改）。"
              : "本周挑战已结束：仅可查看提交与投票结果。"}
          </p>
        </div>
        {form.id ? (
          <Link
            href={`/submissions/${form.id}`}
            className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            打开我的分享页
          </Link>
        ) : null}
      </div>

      {!loading && !userId ? (
        <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
          你还没登录。登录后才能提交与投票。
          <div className="mt-3">
            <Link
              href={`/auth?redirectTo=${encodeURIComponent(`/challenges/${props.challengeSlug}`)}`}
              className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-sm"
            >
              去登录
            </Link>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
      ) : null}

      {userId ? (
        <div className="mt-5 grid gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium">作品链接（artifact_url）</label>
            <input
              value={form.artifactUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, artifactUrl: e.target.value }))
              }
              placeholder="https://..."
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
              disabled={!isActive}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">作品类型（artifact_type）</label>
            <select
              value={form.artifactType}
              onChange={(e) =>
                setForm((f) => ({ ...f, artifactType: e.target.value }))
              }
              className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              disabled={!isActive}
            >
              <option value="url">URL</option>
              <option value="repo">Repo</option>
              <option value="image">Image</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Prompt Log（Markdown）</label>
            <textarea
              value={form.promptLogMd}
              onChange={(e) =>
                setForm((f) => ({ ...f, promptLogMd: e.target.value }))
              }
              placeholder={"建议 3-10 条，按时间顺序记录关键提示词：\n\n1) ...\n2) ...\n3) ..."}
              className="min-h-40 w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
              disabled={!isActive}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">说明（可选）</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="你学到的东西 / 复现步骤 / 踩坑点..."
              className="min-h-28 w-full resize-y rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
              disabled={!isActive}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={busy || !isActive}
              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm disabled:opacity-50"
            >
              {busy ? "保存中..." : "保存提交"}
            </button>
            {msg ? <span className="text-sm text-foreground">{msg}</span> : null}
            {err ? (
              <span className="text-sm text-destructive">{err}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

