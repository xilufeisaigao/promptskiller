"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Drill, DrillAsset, DrillTemplateRound } from "@/lib/content/drills";

type AssetTab = "prompt" | "file" | "log";

const DRILL_TYPE_LABEL: Record<Drill["drillType"], string> = {
  prompt_case: "普通题",
  code_case_multi: "多文件题",
  build_sim_case: "模拟构建题",
  template_case: "教学样板题",
};

function formatDrillCode(n: number): string {
  return `PS-${String(n).padStart(3, "0")}`;
}

function roundTitle(round: DrillTemplateRound, index: number): string {
  const label = round.versionLabel.trim();
  if (label) return label;
  return `第 ${round.roundNo || index + 1} 版`;
}

export function TemplateDrillBoardClient(props: {
  drill: Drill;
  assets?: DrillAsset[];
  rounds?: DrillTemplateRound[];
}) {
  const assets = useMemo(() => props.assets ?? [], [props.assets]);
  const rounds = useMemo(
    () =>
      [...(props.rounds ?? [])].sort((a, b) =>
        a.roundNo === b.roundNo ? a.id.localeCompare(b.id) : a.roundNo - b.roundNo,
      ),
    [props.rounds],
  );

  const [assetTab, setAssetTab] = useState<AssetTab>("prompt");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

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

  const selectedFile =
    fileAssets.find((a) => a.id === selectedFileId) ?? fileAssets[0] ?? null;
  const selectedLog =
    logAssets.find((a) => a.id === selectedLogId) ?? logAssets[0] ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="grid gap-4">
        <div className="rounded-3xl border border-border/60 bg-[linear-gradient(130deg,oklch(0.992_0.012_88),oklch(0.982_0.014_230))] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                Template Drill · {formatDrillCode(props.drill.displayNo)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{props.drill.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{props.drill.id}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-muted-foreground">
                难度 {props.drill.difficulty}/5
              </span>
              <span className="rounded-full border border-foreground/40 bg-background/90 px-3 py-1 text-foreground">
                {DRILL_TYPE_LABEL[props.drill.drillType]}
              </span>
              <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-muted-foreground">
                只读看板
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
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    规格附件 · {asset.path}
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-6">
                    {asset.contentText}
                  </pre>
                </details>
              ))}
            </div>
          ) : assetTab === "file" ? (
            fileAssets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                当前题目没有文件附件。
              </div>
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
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
              当前题目没有日志附件。
            </div>
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
      </section>

      <section className="grid gap-4">
        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold">教学样板看板</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            本题用于教学演示，固定展示 2-3 轮提示词迭代样板。该页面不支持提交，也不会产生评分记录。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href="/drills"
              className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              返回题库
            </Link>
            <Link
              href="/drills/today"
              className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              查看今日题
            </Link>
          </div>
        </div>

        {rounds.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-background p-6 text-sm text-muted-foreground">
            当前样板题暂未配置轮次内容。请在 `drill_template_rounds` 中插入 2-3 条示例轮次。
          </div>
        ) : (
          <div className="grid gap-3">
            {rounds.map((round, idx) => (
              <article key={round.id} className="rounded-3xl border border-border/60 bg-background p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight">{roundTitle(round, idx)}</p>
                  <span className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
                    Round {round.roundNo}
                  </span>
                </div>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-6">
                  {round.promptText}
                </pre>
                <div className="mt-3 rounded-2xl border border-border/60 bg-background p-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">讲解重点</p>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {round.teachingNotesMd?.trim() || "本轮暂无额外讲解说明。"}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
