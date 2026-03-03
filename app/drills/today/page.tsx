import Link from "next/link";

import { DrillPracticeClient } from "@/components/DrillPracticeClient";
import { TemplateDrillBoardClient } from "@/components/TemplateDrillBoardClient";
import {
  listDrillAssets,
  listDrills,
  listScheduledDrillsForUtcDate,
  listDrillTemplateRounds,
} from "@/lib/content/drills-source";
import { pickDrillsForUtcDate } from "@/lib/content/pick";

export const dynamic = "force-dynamic";

function drillCode(displayNo: number): string {
  return `PS-${String(displayNo).padStart(3, "0")}`;
}

export default async function TodayDrillPage(props: {
  searchParams: Promise<{ id?: string; mode?: string }>;
}) {
  const searchParams = await props.searchParams;
  const mode = searchParams.mode === "exam" ? "exam" : "coach";
  const now = new Date();
  const drills = (await listDrills()).filter((drill) =>
    drill.modeVisibility.includes(mode),
  );
  const scheduled = (await listScheduledDrillsForUtcDate(now, 3)).filter((drill) =>
    drill.modeVisibility.includes(mode),
  );
  const fallback = drills.length > 0 ? pickDrillsForUtcDate(drills, now, 3) : [];
  const merged = [...scheduled];
  for (const drill of fallback) {
    if (merged.some((x) => x.id === drill.id)) continue;
    merged.push(drill);
    if (merged.length >= 3) break;
  }
  const todayDrills = merged.slice(0, 3);
  const todayUtc = now.toISOString().slice(0, 10);
  if (todayDrills.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background p-6">
        <h1 className="text-2xl font-semibold tracking-tight">今日训练</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          当前{mode === "exam" ? "考试模式" : "教练模式"}暂无可用题目，请稍后再试或切换模式。
        </p>
      </div>
    );
  }
  const selected = todayDrills.find((x) => x.id === (searchParams.id || "").trim()) ?? todayDrills[0]!;
  const assets = await listDrillAssets(selected.id);
  const templateRounds =
    selected.drillType === "template_case"
      ? await listDrillTemplateRounds(selected.id)
      : [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">今日训练</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            当前为{mode === "exam" ? "考试模式" : "教练模式"}。
            {scheduled.length > 0
              ? `管理员已发布今日题单（UTC ${todayUtc}），你可以任选一题开始训练。`
              : `每日推荐 3 题（UTC ${todayUtc}），你可以任选一题开始训练。`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/drills/today?mode=coach`}
            className={[
              "rounded-full border border-border/70 bg-background px-3 py-1 text-[11px]",
              mode === "coach" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            教练模式
          </Link>
          <Link
            href={`/drills/today?mode=exam`}
            className={[
              "rounded-full border border-border/70 bg-background px-3 py-1 text-[11px]",
              mode === "exam" ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            考试模式
          </Link>
          <Link
            href={`/drills/${selected.id}?mode=${mode}`}
            className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            打开当前题固定链接（{drillCode(selected.displayNo)}）
          </Link>
          <Link
            href={`/drills?mode=${mode}`}
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
              href={`/drills/today?mode=${mode}&id=${encodeURIComponent(drill.id)}`}
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

      {selected.drillType === "template_case" ? (
        <TemplateDrillBoardClient
          drill={selected}
          assets={assets}
          rounds={templateRounds}
        />
      ) : (
        <DrillPracticeClient drill={selected} assets={assets} sessionMode={mode} />
      )}
    </div>
  );
}
