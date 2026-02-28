import Link from "next/link";
import { notFound } from "next/navigation";

import { VoteButtonClient } from "@/components/VoteButtonClient";
import {
  getSubmissionById,
  getWeeklyChallengeById,
} from "@/lib/challenges/public";

export const dynamic = "force-dynamic";

export default async function SubmissionSharePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const submission = await getSubmissionById(id);
  if (!submission) notFound();

  const challenge = await getWeeklyChallengeById(submission.challengeId);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            作品分享页
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {challenge ? challenge.title : "周赛提交"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            作者：<span className="font-mono">{submission.userId.slice(0, 8)}…</span>
            <span className="mx-2 text-muted-foreground/60">·</span>
            提交时间：{new Date(submission.createdAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VoteButtonClient
            submissionId={submission.id}
            initialVotesCount={submission.votesCount}
          />
          {challenge ? (
            <Link
              href={`/challenges/${challenge.slug}`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted/30"
            >
              返回周赛
            </Link>
          ) : (
            <Link
              href="/challenges"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted/30"
            >
              周赛列表
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-3xl border border-border/60 bg-background p-6">
        <p className="text-sm font-medium">作品</p>
        <a
          href={submission.artifactUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          title={submission.artifactUrl}
        >
          [{submission.artifactType}] {submission.artifactUrl}
        </a>
        {submission.notes ? (
          <div className="mt-4">
            <p className="text-sm font-medium">说明</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {submission.notes}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-6">
        <p className="text-sm font-medium">Prompt Log</p>
        <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">
          {submission.promptLogMd || "（未填写）"}
        </pre>
      </section>
    </div>
  );
}
