import Link from "next/link";

import { listWeeklyChallenges } from "@/lib/challenges/public";

export const dynamic = "force-dynamic";

function formatDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const fmt = (d: Date) =>
    d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

  return `${fmt(start)} - ${fmt(end)}`;
}

export default async function ChallengesPage() {
  const challenges = await listWeeklyChallenges();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">周赛</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          每周一个统一选题，提交作品 + Prompt Log，投票与复盘。
        </p>
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
          暂无周赛内容。
        </div>
      ) : (
        <div className="grid gap-3">
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={`/challenges/${c.slug}`}
              className="group rounded-3xl border border-border/60 bg-background p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    {formatDateRange(c.startAt, c.endAt)}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
                    {c.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {c.bodyMd}
                  </p>
                </div>
                <div className="shrink-0 rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                  打开详情
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
