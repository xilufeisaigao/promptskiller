"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Drill } from "@/lib/content/drills";

function formatDrillCode(displayNo: number): string {
  return `PS-${String(displayNo).padStart(3, "0")}`;
}

export function DrillLibraryClient(props: { drills: Drill[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return props.drills;

    return props.drills.filter((drill) => {
      const code = formatDrillCode(drill.displayNo).toLowerCase();
      const title = drill.title.toLowerCase();
      const slug = drill.id.toLowerCase();
      const tags = (drill.tags ?? []).join(" ").toLowerCase();
      return (
        code.includes(q) ||
        title.includes(q) ||
        slug.includes(q) ||
        tags.includes(q)
      );
    });
  }, [props.drills, q]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">训练题库</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全部题目共 {props.drills.length} 道，可按题号、标题、slug、标签搜索。
          </p>
        </div>
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索：PS-001 / API / refactor / drill-..."
            className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
          没有匹配题目，换个关键词试试。
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((drill) => {
            const code = formatDrillCode(drill.displayNo);
            return (
              <article
                key={drill.id}
                className="rounded-3xl border border-border/60 bg-background p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]"
              >
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {code}
                </p>
                <h2 className="mt-1 line-clamp-2 text-base font-semibold tracking-tight">
                  {drill.title}
                </h2>
                <p className="mt-2 truncate text-xs text-muted-foreground">{drill.id}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">
                    难度 {drill.difficulty}/5
                  </span>
                  {(drill.tags ?? []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/drills/${drill.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background"
                  >
                    开始训练
                  </Link>
                  <Link
                    href={`/drills/today?id=${encodeURIComponent(drill.id)}`}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background px-4 text-sm font-medium text-foreground"
                  >
                    放到今日面板查看
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

