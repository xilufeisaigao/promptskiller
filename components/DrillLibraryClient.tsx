"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Drill, DrillModule } from "@/lib/content/drills";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { listPracticedDrillIds } from "@/lib/stats/drill-progress";

const NEW_DAYS = 14;

type SortMode =
  | "display_no"
  | "published_desc"
  | "published_asc"
  | "difficulty_desc"
  | "difficulty_asc";

type LibraryView = "library" | "modules";
type ProgressRow = { drill_id: string; attempt_count: number };

function formatDrillCode(displayNo: number): string {
  return `PS-${String(displayNo).padStart(3, "0")}`;
}

function parseTimeMs(value?: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function typeLabel(type: Drill["drillType"]): string {
  if (type === "code_case_multi") return "多文件题";
  if (type === "build_sim_case") return "模拟构建题";
  if (type === "template_case") return "教学样板题";
  return "普通题";
}

function levelLabel(level: DrillModule["level"]): string {
  if (level === "advanced") return "ADVANCED";
  if (level === "intermediate") return "INTERMEDIATE";
  return "STARTER";
}

function isRecentDrill(drill: Drill, recentSinceMs: number): boolean {
  const publishedMs = parseTimeMs(drill.publishedAt);
  if (!publishedMs) return false;
  return publishedMs >= recentSinceMs;
}

async function fetchCloudProgress(input: {
  userId: string;
}): Promise<Record<string, number> | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("drill_user_progress")
    .select("drill_id,attempt_count")
    .eq("user_id", input.userId)
    .limit(4000);

  if (error) return null;

  const next: Record<string, number> = {};
  for (const row of (data ?? []) as ProgressRow[]) {
    const count = Number(row.attempt_count);
    if (!row.drill_id || !Number.isFinite(count)) continue;
    next[row.drill_id] = Math.max(0, Math.round(count));
  }
  return next;
}

export function DrillLibraryClient(props: {
  drills: Drill[];
  modules: DrillModule[];
  recentSinceIso: string;
  initialView?: LibraryView;
  initialModuleSlug?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("display_no");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlyRecent, setOnlyRecent] = useState(false);
  const [view, setView] = useState<LibraryView>(props.initialView ?? "library");
  const [selectedModuleSlug, setSelectedModuleSlug] = useState(
    props.initialModuleSlug ?? "",
  );
  const [practicedIds, setPracticedIds] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : listPracticedDrillIds(),
  );
  const [cloudProgress, setCloudProgress] = useState<Record<string, number> | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const recentSinceMs = useMemo(
    () => parseTimeMs(props.recentSinceIso),
    [props.recentSinceIso],
  );

  useEffect(() => {
    function sync() {
      setPracticedIds(listPracticedDrillIds());
    }
    window.addEventListener("storage", sync);
    window.addEventListener("promptskiller:progress-changed", sync as EventListener);
    sync();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("promptskiller:progress-changed", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function loadForSession(session: { user: { id: string } } | null) {
      if (!active) return;
      if (!session) {
        setCloudUserId(null);
        setCloudProgress(null);
        return;
      }
      setCloudUserId(session.user.id);
      const next = await fetchCloudProgress({ userId: session.user.id });
      if (!active) return;
      setCloudProgress(next);
    }

    supabase.auth
      .getSession()
      .then(({ data }) =>
        void loadForSession(data.session ? { user: { id: data.session.user.id } } : null),
      );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      void loadForSession(session ? { user: { id: session.user.id } } : null),
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!cloudUserId) return;
    const userId = cloudUserId;
    let active = true;

    async function refreshCloud() {
      const next = await fetchCloudProgress({ userId });
      if (!active) return;
      if (next) setCloudProgress(next);
    }

    function onProgressChanged() {
      void refreshCloud();
    }

    window.addEventListener("promptskiller:progress-changed", onProgressChanged as EventListener);
    return () => {
      active = false;
      window.removeEventListener("promptskiller:progress-changed", onProgressChanged as EventListener);
    };
  }, [cloudUserId]);

  const progressByDrill = useMemo(() => {
    if (cloudProgress) return cloudProgress;
    const next: Record<string, number> = {};
    for (const id of practicedIds) next[id] = 1;
    return next;
  }, [cloudProgress, practicedIds]);

  const practicedSet = useMemo(
    () => new Set(Object.keys(progressByDrill).filter((id) => (progressByDrill[id] ?? 0) > 0)),
    [progressByDrill],
  );

  const modulesBySlug = useMemo(
    () => new Map(props.modules.map((module) => [module.slug, module])),
    [props.modules],
  );

  const effectiveModuleSlug =
    selectedModuleSlug && modulesBySlug.has(selectedModuleSlug)
      ? selectedModuleSlug
      : "";

  const selectedModule = effectiveModuleSlug
    ? modulesBySlug.get(effectiveModuleSlug) ?? null
    : null;

  const moduleProgress = useMemo(() => {
    const out = new Map<string, { total: number; practiced: number }>();
    for (const moduleItem of props.modules) {
      const total = moduleItem.drillIds.length;
      const practiced = moduleItem.drillIds.filter((id) => practicedSet.has(id)).length;
      out.set(moduleItem.id, { total, practiced });
    }
    return out;
  }, [props.modules, practicedSet]);

  const drillById = useMemo(
    () => new Map(props.drills.map((drill) => [drill.id, drill])),
    [props.drills],
  );

  const moduleDrillIdSet = useMemo(() => {
    if (!selectedModule) return null;
    return new Set(selectedModule.drillIds);
  }, [selectedModule]);

  const drillToModuleMap = useMemo(() => {
    const out = new Map<string, string>();
    for (const moduleItem of props.modules) {
      for (const drillId of moduleItem.drillIds) {
        if (!out.has(drillId)) out.set(drillId, moduleItem.title);
      }
    }
    return out;
  }, [props.modules]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const drill of props.drills) {
      for (const tag of drill.tags ?? []) {
        set.add(tag.trim().toLowerCase());
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [props.drills]);

  const filtered = useMemo(() => {
    const withQuery = props.drills.filter((drill) => {
      if (moduleDrillIdSet && !moduleDrillIdSet.has(drill.id)) {
        return false;
      }

      const code = formatDrillCode(drill.displayNo).toLowerCase();
      const title = drill.title.toLowerCase();
      const slug = drill.id.toLowerCase();
      const tags = (drill.tags ?? []).join(" ").toLowerCase();
      const queryMatched =
        !q ||
        code.includes(q) ||
        title.includes(q) ||
        slug.includes(q) ||
        tags.includes(q);

      if (!queryMatched) return false;

      if (selectedTags.length > 0) {
        const tagSet = new Set((drill.tags ?? []).map((x) => x.toLowerCase()));
        const containsAll = selectedTags.every((tag) => tagSet.has(tag));
        if (!containsAll) return false;
      }

      if (onlyRecent && !isRecentDrill(drill, recentSinceMs)) {
        return false;
      }

      return true;
    });

    const sorted = [...withQuery];
    sorted.sort((a, b) => {
      if (sortMode === "display_no") {
        if (a.displayNo !== b.displayNo) return a.displayNo - b.displayNo;
        return a.id.localeCompare(b.id);
      }

      if (sortMode === "published_desc") {
        const delta = parseTimeMs(b.publishedAt) - parseTimeMs(a.publishedAt);
        if (delta !== 0) return delta;
        return a.displayNo - b.displayNo;
      }

      if (sortMode === "published_asc") {
        const delta = parseTimeMs(a.publishedAt) - parseTimeMs(b.publishedAt);
        if (delta !== 0) return delta;
        return a.displayNo - b.displayNo;
      }

      if (sortMode === "difficulty_desc") {
        if (a.difficulty !== b.difficulty) return b.difficulty - a.difficulty;
        return a.displayNo - b.displayNo;
      }

      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return a.displayNo - b.displayNo;
    });

    return sorted;
  }, [
    props.drills,
    q,
    selectedTags,
    onlyRecent,
    recentSinceMs,
    sortMode,
    moduleDrillIdSet,
  ]);

  const recentCount = useMemo(
    () => props.drills.filter((drill) => isRecentDrill(drill, recentSinceMs)).length,
    [props.drills, recentSinceMs],
  );

  const selectedModuleDrills = useMemo(() => {
    if (!selectedModule) return [] as Drill[];
    return selectedModule.drillIds
      .map((id) => drillById.get(id))
      .filter((drill): drill is Drill => Boolean(drill));
  }, [selectedModule, drillById]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    );
  }

  function clearFilters() {
    setQuery("");
    setSelectedTags([]);
    setSortMode("display_no");
    setOnlyRecent(false);
    setSelectedModuleSlug("");
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-[linear-gradient(130deg,oklch(0.992_0.01_88),oklch(0.98_0.012_230))] p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.04),0_25px_70px_-55px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.5fr)]">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Drill Library
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              训练题库
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              支持题库筛选与模块学习路径两种视图。先筛选，再训练，形成可持续迭代节奏。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-muted-foreground">
                总题数 {props.drills.length}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-muted-foreground">
                新题（{NEW_DAYS} 天内）{recentCount}
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-muted-foreground">
                模块 {props.modules.length}
              </span>
            </div>
          </div>

          <aside className="rounded-2xl border border-border/70 bg-background/85 p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Learning Paths
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight">模块学习入口</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              已上线最小模块体系：可查看题目顺序与进度，并从模块直接进入训练。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setView("modules")}
                className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                打开模块视图
              </button>
              <Link
                href={selectedModule ? `/drills?view=library&module=${selectedModule.slug}` : "/drills"}
                className="inline-flex rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                切回题库视图
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setView("library")}
              className={[
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                view === "library"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              题库视图
            </button>
            <button
              type="button"
              onClick={() => setView("modules")}
              className={[
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                view === "modules"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              模块视图
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>当前模块：{selectedModule?.title ?? "全部题目"}</span>
            {selectedModule ? (
              <button
                type="button"
                onClick={() => setSelectedModuleSlug("")}
                className="rounded-full border border-border/70 px-3 py-1 hover:text-foreground"
              >
                清除模块过滤
              </button>
            ) : null}
          </div>
        </div>

        {view === "modules" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {props.modules.map((module) => {
              const active = module.slug === selectedModuleSlug;
              const progress = moduleProgress.get(module.id) ?? {
                total: module.drillIds.length,
                practiced: 0,
              };
              const pct =
                progress.total > 0
                  ? Math.round((progress.practiced / progress.total) * 100)
                  : 0;

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelectedModuleSlug(module.slug)}
                  className={[
                    "rounded-3xl border p-5 text-left transition-colors",
                    active
                      ? "border-foreground bg-muted/30"
                      : "border-border/60 bg-background hover:bg-muted/20",
                  ].join(" ")}
                >
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    {levelLabel(module.level)}
                  </p>
                  <h3 className="mt-1 text-base font-semibold tracking-tight">{module.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {module.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{module.estimatedMinutes ? `${module.estimatedMinutes} 分钟` : "时长待定"}</span>
                    <span>{progress.practiced}/{progress.total} 已练</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {view === "modules" && selectedModule ? (
          <div className="mt-4 rounded-3xl border border-border/60 bg-muted/20 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {levelLabel(selectedModule.level)} PATH
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{selectedModule.title}</h3>
              </div>
              <Link
                href={`/drills?module=${selectedModule.slug}`}
                className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                在题库中按此模块筛选
              </Link>
            </div>

            <div className="mt-4 grid gap-2">
              {selectedModuleDrills.map((drill, idx) => {
                const practiced = practicedSet.has(drill.id);
                const attemptCount = progressByDrill[drill.id] ?? 0;
                return (
                  <div
                    key={drill.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">第 {idx + 1} 题 · {formatDrillCode(drill.displayNo)}</p>
                      <p className="truncate text-sm font-medium">{drill.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {practiced ? `已练 ${attemptCount} 次` : "未练"}
                      </span>
                      <Link
                        href={`/drills/${drill.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-full bg-foreground px-3 text-xs font-medium text-background"
                      >
                        开始
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索：PS-001 / API / refactor / drill-..."
            className="h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="h-11 rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          >
            <option value="display_no">按题号（默认）</option>
            <option value="published_desc">按发布时间（新到旧）</option>
            <option value="published_asc">按发布时间（旧到新）</option>
            <option value="difficulty_desc">按难度（高到低）</option>
            <option value="difficulty_asc">按难度（低到高）</option>
          </select>
          <label className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background px-3 text-sm">
            <input
              type="checkbox"
              checked={onlyRecent}
              onChange={(e) => setOnlyRecent(e.target.checked)}
              className="size-4 rounded border-border/70"
            />
            仅看新题
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无标签。</p>
            ) : (
              allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={[
                      "rounded-full border px-3 py-1 text-[11px] transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {tag}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>结果 {filtered.length}</span>
            {(q ||
              selectedTags.length > 0 ||
              onlyRecent ||
              sortMode !== "display_no" ||
              selectedModuleSlug) ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-border/70 bg-background px-3 py-1 hover:text-foreground"
              >
                清空筛选
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-background p-6 text-sm text-muted-foreground">
          没有匹配题目，尝试减少标签条件或关闭“仅看新题”。
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((drill) => {
            const code = formatDrillCode(drill.displayNo);
            const recent = isRecentDrill(drill, recentSinceMs);
            const practiced = practicedSet.has(drill.id);
            const attemptCount = progressByDrill[drill.id] ?? 0;
            const moduleTitle = drillToModuleMap.get(drill.id) ?? null;
            return (
              <article
                key={drill.id}
                className="rounded-3xl border border-border/60 bg-background p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    {code}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {practiced ? (
                      <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-medium tracking-wide">
                        DONE {attemptCount}
                      </span>
                    ) : null}
                    {recent ? (
                      <span className="rounded-full border border-foreground/30 bg-muted/50 px-2 py-0.5 text-[10px] font-medium tracking-wide">
                        NEW
                      </span>
                    ) : null}
                  </div>
                </div>

                <h2 className="mt-1 line-clamp-2 text-base font-semibold tracking-tight">
                  {drill.title}
                </h2>
                <p className="mt-2 truncate text-xs text-muted-foreground">{drill.id}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] text-muted-foreground">
                    难度 {drill.difficulty}/5
                  </span>
                  <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                    {typeLabel(drill.drillType)}
                  </span>
                  {moduleTitle ? (
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                      {moduleTitle}
                    </span>
                  ) : null}
                  {(drill.tags ?? []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  发布：
                  {drill.publishedAt
                    ? new Date(drill.publishedAt).toLocaleDateString("zh-CN")
                    : "未发布时间"}
                </p>

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
                    放到今日面板
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
