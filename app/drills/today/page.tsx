import Link from "next/link";

import { DrillPracticeClient } from "@/components/DrillPracticeClient";
import {
  listDrillAssets,
  listDrills,
  listScheduledDrillsForUtcDate,
} from "@/lib/content/drills-source";
import { pickDrillsForUtcDate } from "@/lib/content/pick";

export const dynamic = "force-dynamic";

function drillCode(displayNo: number): string {
  return `PS-${String(displayNo).padStart(3, "0")}`;
}

export default async function TodayDrillPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const now = new Date();
  const drills = await listDrills();
  const scheduled = await listScheduledDrillsForUtcDate(now, 3);
  const fallback = pickDrillsForUtcDate(drills, now, 3);
  const merged = [...scheduled];
  for (const drill of fallback) {
    if (merged.some((x) => x.id === drill.id)) continue;
    merged.push(drill);
    if (merged.length >= 3) break;
  }
  const todayDrills = merged.slice(0, 3);
  const todayUtc = now.toISOString().slice(0, 10);
  const searchParams = await props.searchParams;
  const selected =
    todayDrills.find((x) => x.id === (searchParams.id || "").trim()) ??
    todayDrills[0]!;
  const assets = await listDrillAssets(selected.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">今日训练</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scheduled.length > 0
              ? `管理员已发布今日题单（UTC ${todayUtc}），你可以任选一题开始训练。`
              : `每日推荐 3 题（UTC ${todayUtc}），你可以任选一题开始训练。`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/drills/${selected.id}`}
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            打开当前题固定链接（{drillCode(selected.displayNo)}）
          </Link>
          <Link
            href="/drills"
            className="rounded-full border border-border/70 bg-background px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            打开题库
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {todayDrills.map((drill) => {
          const active = drill.id === selected.id;
          return (
            <Link
              key={drill.id}
              href={`/drills/today?id=${encodeURIComponent(drill.id)}`}
              className={[
                "rounded-2xl border p-4 transition-colors",
                active
                  ? "border-foreground bg-muted/30"
                  : "border-border/60 bg-background hover:bg-muted/20",
              ].join(" ")}
            >
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {drillCode(drill.displayNo)}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{drill.title}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                难度 {drill.difficulty}/5
              </p>
            </Link>
          );
        })}
      </div>

      <DrillPracticeClient drill={selected} assets={assets} />
    </div>
  );
}
