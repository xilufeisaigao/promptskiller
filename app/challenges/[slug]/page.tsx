import Link from "next/link";
import { notFound } from "next/navigation";

import { ChallengeStatusBadgeClient } from "@/components/ChallengeStatusBadgeClient";
import { ChallengeSubmissionClient } from "@/components/ChallengeSubmissionClient";
import { VoteButtonClient } from "@/components/VoteButtonClient";
import {
  getWeeklyChallengeBySlug,
  listSubmissionsForChallenge,
} from "@/lib/challenges/public";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ChallengeDetailPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const challenge = await getWeeklyChallengeBySlug(slug);
  if (!challenge) notFound();

  const submissions = await listSubmissionsForChallenge(challenge.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              周赛
            </p>
            <ChallengeStatusBadgeClient
              startAt={challenge.startAt}
              endAt={challenge.endAt}
            />
          </div>
          <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight">
            {challenge.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDateTime(challenge.startAt)} - {formatDateTime(challenge.endAt)}
          </p>
        </div>
        <Link
          href="/challenges"
          className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          返回列表
        </Link>
      </div>

      <div className="rounded-3xl border border-border/60 bg-background p-6">
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
          {challenge.bodyMd}
        </p>
      </div>

      <ChallengeSubmissionClient
        challengeId={challenge.id}
        challengeSlug={challenge.slug}
        challengeStartAt={challenge.startAt}
        challengeEndAt={challenge.endAt}
      />

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">所有提交</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {submissions.length} 份
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-3xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
            暂无提交。你可以成为第一个提交的人。
          </div>
        ) : (
          <div className="grid gap-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="rounded-3xl border border-border/60 bg-background p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground tabular-nums">
                      提交时间：{new Date(s.createdAt).toLocaleString("zh-CN")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      作者：<span className="font-mono">{s.userId.slice(0, 8)}…</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VoteButtonClient
                      submissionId={s.id}
                      initialVotesCount={s.votesCount}
                    />
                    <Link
                      href={`/submissions/${s.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted/30"
                    >
                      打开分享页
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                    <p className="text-sm font-medium">作品</p>
                    <a
                      href={s.artifactUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block truncate text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      title={s.artifactUrl}
                    >
                      [{s.artifactType}] {s.artifactUrl}
                    </a>
                    {s.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                        {s.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                    <p className="text-sm font-medium">Prompt Log</p>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background p-3 text-xs leading-5 text-muted-foreground">
                      {s.promptLogMd || "（未填写）"}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
