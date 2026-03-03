"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState =
  | { kind: "loading" }
  | { kind: "anon" }
  | { kind: "forbidden"; userId: string; email: string | null }
  | { kind: "ready"; userId: string; email: string | null };
type DrillType = "prompt_case" | "code_case_multi" | "build_sim_case" | "template_case";
type AssetKind = "file" | "log" | "spec" | "image";
type DrillMode = "coach" | "exam";
type CapabilityDomain = "coding" | "docs" | "tools" | "life";
type ExamTrack = "debug" | "feature" | "from_zero";
type Drill = {
  id: string;
  display_no: number | null;
  title: string;
  body_md: string;
  difficulty: number;
  drill_type: DrillType;
  mode_visibility: DrillMode[] | null;
  capability_domain: CapabilityDomain | null;
  exam_track: ExamTrack | null;
  exam_time_limit_sec: number | null;
  exam_submission_limit: number | null;
  tags: string[] | null;
  published_at: string | null;
};
type DrillAsset = {
  id: string;
  drill_id: string;
  asset_kind: AssetKind;
  path: string;
  content_text: string;
  order_no: number;
  created_at: string;
};
type Attempt = {
  id: string;
  user_id: string;
  score_total: number;
  coach_mode: string;
  created_at: string;
  prompt_text: string;
};
type Schedule = {
  date: string;
  slot: number;
  drill_id: string;
  drill: { id: string; title: string; display_no: number | null }[] | { id: string; title: string; display_no: number | null } | null;
};

const fmtCode = (n: number | null) => (!n ? "PS-???" : `PS-${String(n).padStart(3, "0")}`);
const toDate = (d: Date) => d.toISOString().slice(0, 10);
const tags = (s: string) => {
  const x = s.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  return x.length ? Array.from(new Set(x)) : null;
};
const toPositiveIntOrNull = (input: string) => {
  const value = Math.round(Number(input));
  return Number.isFinite(value) && value > 0 ? value : null;
};
const normalizeCapabilityDomain = (value: unknown): CapabilityDomain => {
  if (value === "docs" || value === "tools" || value === "life") return value;
  return "coding";
};
const normalizeExamTrack = (value: unknown): ExamTrack | "" => {
  if (value === "debug" || value === "feature" || value === "from_zero") return value;
  return "";
};
const defaultExamTrackByType = (drillType: DrillType): ExamTrack => {
  if (drillType === "code_case_multi") return "debug";
  if (drillType === "build_sim_case") return "from_zero";
  return "feature";
};
const normalizeModes = (value: unknown): DrillMode[] => {
  if (!Array.isArray(value)) return ["coach"];
  const out = new Set<DrillMode>();
  for (const x of value) {
    if (x === "coach" || x === "exam") out.add(x);
  }
  if (out.size === 0) out.add("coach");
  return [...out];
};
const toModeVisibility = (coachVisible: boolean, examVisible: boolean): DrillMode[] => {
  const out: DrillMode[] = [];
  if (coachVisible) out.push("coach");
  if (examVisible) out.push("exam");
  if (out.length === 0) out.push("coach");
  return out;
};
const pickDrill = (d: Schedule["drill"]) => (Array.isArray(d) ? d[0] ?? null : d);
const toLocal = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const typeLabel: Record<DrillType, string> = {
  prompt_case: "普通题",
  code_case_multi: "多文件题",
  build_sim_case: "模拟构建题",
  template_case: "教学样板题",
};
const modeLabelText = (value: unknown) => {
  const modes = normalizeModes(value);
  if (modes.includes("coach") && modes.includes("exam")) return "coach+exam";
  return modes.includes("exam") ? "exam" : "coach";
};

export default function AdminPage() {
  const [state, setState] = useState<AuthState>({ kind: "loading" });
  const [drills, setDrills] = useState<Drill[]>([]);
  const [scheduleDate, setScheduleDate] = useState(() => toDate(new Date()));
  const [scheduleSlot, setScheduleSlot] = useState<1 | 2 | 3>(1);
  const [scheduleDrillId, setScheduleDrillId] = useState("");
  const [scheduleRows, setScheduleRows] = useState<Schedule[]>([]);
  const [bulkDate, setBulkDate] = useState(() => toDate(new Date()));
  const [bulkDays, setBulkDays] = useState(7);
  const [bulkDrill, setBulkDrill] = useState("");
  const [selectedDrillId, setSelectedDrillId] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [createForm, setCreateForm] = useState({
    id: "",
    title: "",
    difficulty: 2 as 1 | 2 | 3 | 4 | 5,
    drillType: "prompt_case" as DrillType,
    coachVisible: true,
    examVisible: false,
    capabilityDomain: "coding" as CapabilityDomain,
    examTrack: "" as ExamTrack | "",
    examTimeLimitSec: "",
    examSubmissionLimit: "",
    tags: "",
    body: "",
    publishNow: true,
  });
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({
    title: "",
    difficulty: 2 as 1 | 2 | 3 | 4 | 5,
    drillType: "prompt_case" as DrillType,
    coachVisible: true,
    examVisible: false,
    capabilityDomain: "coding" as CapabilityDomain,
    examTrack: "" as ExamTrack | "",
    examTimeLimitSec: "",
    examSubmissionLimit: "",
    tags: "",
    body: "",
    publishedAt: "",
  });
  const [assetDrillId, setAssetDrillId] = useState("");
  const [assets, setAssets] = useState<DrillAsset[]>([]);
  const [assetForm, setAssetForm] = useState({
    id: "",
    kind: "file" as AssetKind,
    path: "",
    content: "",
    orderNo: 10,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  const stats = useMemo(() => {
    const scores = attempts.map((a) => a.score_total).filter((x) => Number.isFinite(x));
    if (!scores.length) return { count: 0, avg: "-", max: "-", min: "-" };
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    return { count: scores.length, avg, max: Math.max(...scores), min: Math.min(...scores) };
  }, [attempts]);

  async function loadDrills(preferred?: string) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("drills").select("id,display_no,title,body_md,difficulty,drill_type,mode_visibility,capability_domain,exam_track,exam_time_limit_sec,exam_submission_limit,tags,published_at").order("display_no", { ascending: true }).order("id", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as Drill[];
    setDrills(rows);
    const fallback = preferred || rows[0]?.id || "";
    setScheduleDrillId((v) => (v && rows.some((x) => x.id === v) ? v : fallback));
    setBulkDrill((v) => (v && rows.some((x) => x.id === v) ? v : fallback));
    setSelectedDrillId((v) => (v && rows.some((x) => x.id === v) ? v : fallback));
    setEditId((v) => (v && rows.some((x) => x.id === v) ? v : fallback));
    setAssetDrillId((v) => (v && rows.some((x) => x.id === v) ? v : fallback));
  }

  async function loadSchedule(date: string) {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("drill_schedule").select("date,slot,drill_id,drill:drills(id,title,display_no)").eq("date", date).order("slot", { ascending: true });
    if (error) throw error;
    setScheduleRows((data ?? []) as Schedule[]);
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;
    async function sync(session: { user: { id: string; email?: string | null } } | null) {
      if (!active) return;
      if (!session) return setState({ kind: "anon" });
      const { data, error } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      const ok = !error && Boolean((data as { is_admin?: boolean } | null)?.is_admin);
      setState(ok ? { kind: "ready", userId: session.user.id, email: session.user.email ?? null } : { kind: "forbidden", userId: session.user.id, email: session.user.email ?? null });
    }
    supabase.auth.getSession().then(({ data }) => void sync(data.session ? { user: { id: data.session.user.id, email: data.session.user.email } } : null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => void sync(s ? { user: { id: s.user.id, email: s.user.email } } : null));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (state.kind === "ready") void loadDrills().catch((e) => setMsg({ err: e.message })); }, [state.kind]);
  useEffect(() => { if (state.kind === "ready" && scheduleDate) void loadSchedule(scheduleDate).catch((e) => setMsg({ err: e.message })); }, [state.kind, scheduleDate]);
  useEffect(() => {
    if (state.kind !== "ready" || !selectedDrillId) return;
    const supabase = getSupabaseBrowserClient();
    supabase.from("drill_attempts").select("id,user_id,score_total,coach_mode,created_at,prompt_text").eq("drill_id", selectedDrillId).order("created_at", { ascending: false }).limit(300).then(({ data, error }) => {
      if (error) return setMsg({ err: error.message });
      setAttempts((data ?? []) as Attempt[]);
    });
  }, [state.kind, selectedDrillId]);
  useEffect(() => {
    if (state.kind !== "ready" || !editId) return;
    const supabase = getSupabaseBrowserClient();
    supabase.from("drills").select("title,body_md,difficulty,drill_type,mode_visibility,capability_domain,exam_track,exam_time_limit_sec,exam_submission_limit,tags,published_at").eq("id", editId).maybeSingle().then(({ data, error }) => {
      if (error) return setMsg({ err: error.message });
      if (!data) return;
      const modes = normalizeModes(data.mode_visibility);
      const examVisible = modes.includes("exam");
      setEditForm({
        title: String(data.title ?? ""),
        body: String(data.body_md ?? ""),
        difficulty: Math.min(5, Math.max(1, Math.round(Number(data.difficulty) || 1))) as 1 | 2 | 3 | 4 | 5,
        drillType:
          data.drill_type === "code_case_multi" ||
          data.drill_type === "build_sim_case" ||
          data.drill_type === "template_case"
            ? data.drill_type
            : "prompt_case",
        coachVisible: modes.includes("coach"),
        examVisible,
        capabilityDomain: normalizeCapabilityDomain(data.capability_domain),
        examTrack: examVisible ? normalizeExamTrack(data.exam_track) : "",
        examTimeLimitSec:
          Number.isFinite(Number(data.exam_time_limit_sec)) && Number(data.exam_time_limit_sec) > 0
            ? String(Math.round(Number(data.exam_time_limit_sec)))
            : "",
        examSubmissionLimit:
          Number.isFinite(Number(data.exam_submission_limit)) && Number(data.exam_submission_limit) > 0
            ? String(Math.round(Number(data.exam_submission_limit)))
            : "",
        tags: ((data.tags as string[] | null) ?? []).join(", "),
        publishedAt: toLocal(data.published_at as string | null),
      });
    });
  }, [state.kind, editId]);
  useEffect(() => {
    if (state.kind !== "ready" || !assetDrillId) return;
    const supabase = getSupabaseBrowserClient();
    supabase.from("drill_assets").select("id,drill_id,asset_kind,path,content_text,order_no,created_at").eq("drill_id", assetDrillId).order("asset_kind", { ascending: true }).order("order_no", { ascending: true }).order("path", { ascending: true }).then(({ data, error }) => {
      if (error) return setMsg({ err: error.message });
      setAssets((data ?? []) as DrillAsset[]);
    });
  }, [state.kind, assetDrillId]);

  async function run(task: () => Promise<void>) {
    setBusy(true); setMsg({});
    try { await task(); } catch (e) { setMsg({ err: e instanceof Error ? e.message : "操作失败" }); }
    finally { setBusy(false); }
  }

  async function createDrill() {
    const id = createForm.id.trim().toLowerCase();
    if (!id || !createForm.title.trim() || !createForm.body.trim()) {
      throw new Error("新增题目时，ID/标题/题面都不能为空。");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new Error("题目 ID 只允许小写字母、数字与连字符。");
    }
    const modeVisibility = toModeVisibility(createForm.coachVisible, createForm.examVisible);
    const examVisible = modeVisibility.includes("exam");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("drills").insert({
      id,
      title: createForm.title.trim(),
      body_md: createForm.body.trim(),
      difficulty: Number(createForm.difficulty),
      drill_type: createForm.drillType,
      mode_visibility: modeVisibility,
      capability_domain: createForm.capabilityDomain,
      exam_track: examVisible
        ? (createForm.examTrack || defaultExamTrackByType(createForm.drillType))
        : null,
      exam_time_limit_sec: examVisible ? toPositiveIntOrNull(createForm.examTimeLimitSec) : null,
      exam_submission_limit: examVisible ? toPositiveIntOrNull(createForm.examSubmissionLimit) : null,
      tags: tags(createForm.tags),
      published_at: createForm.publishNow ? new Date().toISOString() : null,
    });
    if (error) throw error;
    await loadDrills(id);
    setCreateForm({
      id: "",
      title: "",
      difficulty: 2,
      drillType: "prompt_case",
      coachVisible: true,
      examVisible: false,
      capabilityDomain: "coding",
      examTrack: "",
      examTimeLimitSec: "",
      examSubmissionLimit: "",
      tags: "",
      body: "",
      publishNow: true,
    });
    setMsg({ ok: `题目 ${id} 已创建` });
  }

  async function saveEdit() {
    if (!editId) throw new Error("请选择要编辑的题目。");
    if (!editForm.title.trim() || !editForm.body.trim()) {
      throw new Error("编辑题目时，标题和题面不能为空。");
    }
    const modeVisibility = toModeVisibility(editForm.coachVisible, editForm.examVisible);
    const examVisible = modeVisibility.includes("exam");
    const supabase = getSupabaseBrowserClient();
    const published = editForm.publishedAt.trim() ? new Date(editForm.publishedAt).toISOString() : null;
    const { error } = await supabase.from("drills").update({
      title: editForm.title.trim(),
      body_md: editForm.body.trim(),
      difficulty: Number(editForm.difficulty),
      drill_type: editForm.drillType,
      mode_visibility: modeVisibility,
      capability_domain: editForm.capabilityDomain,
      exam_track: examVisible
        ? (editForm.examTrack || defaultExamTrackByType(editForm.drillType))
        : null,
      exam_time_limit_sec: examVisible ? toPositiveIntOrNull(editForm.examTimeLimitSec) : null,
      exam_submission_limit: examVisible ? toPositiveIntOrNull(editForm.examSubmissionLimit) : null,
      tags: tags(editForm.tags),
      published_at: published,
    }).eq("id", editId);
    if (error) throw error;
    await loadDrills(editId);
    setMsg({ ok: `题目 ${editId} 已更新` });
  }

  async function setPublished(published: boolean) {
    if (!editId) throw new Error("请选择要修改发布状态的题目。");
    const value = published ? new Date().toISOString() : null;
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("drills").update({ published_at: value }).eq("id", editId);
    if (error) throw error;
    setEditForm((v) => ({ ...v, publishedAt: published ? toLocal(value) : "" }));
    await loadDrills(editId);
    setMsg({ ok: published ? `题目 ${editId} 已发布` : `题目 ${editId} 已下线` });
  }

  async function saveSchedule() {
    if (!scheduleDate || !scheduleDrillId) throw new Error("请选择排期日期与题目。");
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("drill_schedule").upsert(
      { date: scheduleDate, slot: Number(scheduleSlot), drill_id: scheduleDrillId },
      { onConflict: "date,slot" },
    );
    if (error) throw error;
    await loadSchedule(scheduleDate);
    setMsg({ ok: `已发布 ${scheduleDate} 第 ${scheduleSlot} 题` });
  }

  async function bulkSchedule() {
    if (!bulkDate || !bulkDrill || drills.length === 0) throw new Error("请先选择批量排期参数。");
    const days = Math.max(1, Math.min(30, Math.round(Number(bulkDays) || 1)));
    const start = Math.max(0, drills.findIndex((d) => d.id === bulkDrill));
    const rows: Array<{ date: string; slot: number; drill_id: string }> = [];
    for (let day = 0; day < days; day += 1) {
      const d = new Date(`${bulkDate}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + day);
      const date = d.toISOString().slice(0, 10);
      for (let slot = 1; slot <= 3; slot += 1) {
        rows.push({ date, slot, drill_id: drills[(start + day * 3 + slot - 1) % drills.length]!.id });
      }
    }
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("drill_schedule").upsert(rows, { onConflict: "date,slot" });
    if (error) throw error;
    await loadSchedule(scheduleDate);
    setMsg({ ok: `已批量排期 ${days} 天（${rows.length} 条）` });
  }

  async function removeSchedule(row: Schedule) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("drill_schedule").delete().eq("date", row.date).eq("slot", row.slot);
    if (error) throw error;
    setScheduleRows((prev) => prev.filter((x) => !(x.date === row.date && x.slot === row.slot)));
    setMsg({ ok: `已删除 ${row.date} 第 ${row.slot} 题` });
  }

  function resetAssetForm() {
    setAssetForm({ id: "", kind: "file", path: "", content: "", orderNo: 10 });
  }

  async function saveAsset() {
    if (!assetDrillId) throw new Error("请先选择要管理附件的题目。");
    if (!assetForm.path.trim() || !assetForm.content.trim()) throw new Error("附件路径和内容不能为空。");
    const supabase = getSupabaseBrowserClient();
    if (assetForm.id) {
      const { error } = await supabase.from("drill_assets").update({
        asset_kind: assetForm.kind,
        path: assetForm.path.trim(),
        content_text: assetForm.content,
        order_no: Math.max(1, Math.round(Number(assetForm.orderNo) || 1)),
      }).eq("id", assetForm.id);
      if (error) throw error;
      setMsg({ ok: "附件已更新" });
    } else {
      const { error } = await supabase.from("drill_assets").insert({
        drill_id: assetDrillId,
        asset_kind: assetForm.kind,
        path: assetForm.path.trim(),
        content_text: assetForm.content,
        order_no: Math.max(1, Math.round(Number(assetForm.orderNo) || 1)),
      });
      if (error) throw error;
      setMsg({ ok: "附件已创建" });
    }
    const { data, error } = await supabase.from("drill_assets").select("id,drill_id,asset_kind,path,content_text,order_no,created_at").eq("drill_id", assetDrillId).order("asset_kind", { ascending: true }).order("order_no", { ascending: true }).order("path", { ascending: true });
    if (error) throw error;
    setAssets((data ?? []) as DrillAsset[]);
    resetAssetForm();
  }

  async function deleteAsset(id: string) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("drill_assets").delete().eq("id", id);
    if (error) throw error;
    setAssets((prev) => prev.filter((x) => x.id !== id));
    if (assetForm.id === id) resetAssetForm();
    setMsg({ ok: "附件已删除" });
  }

  if (state.kind === "loading") return <p className="text-sm text-muted-foreground">加载后台权限中...</p>;
  if (state.kind === "anon") return <div className="rounded-3xl border border-border/60 bg-background p-6"><h1 className="text-2xl font-semibold tracking-tight">管理后台</h1><p className="mt-2 text-sm text-muted-foreground">请先登录管理员账号后再访问后台。</p><Link href="/auth?redirectTo=%2Fadmin" className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background">去登录</Link></div>;
  if (state.kind === "forbidden") return <div className="rounded-3xl border border-border/60 bg-background p-6"><h1 className="text-2xl font-semibold tracking-tight">管理后台</h1><p className="mt-2 text-sm text-muted-foreground">当前账号无管理员权限：{state.email ?? state.userId}</p></div>;

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-border/60 bg-[linear-gradient(120deg,oklch(0.993_0.007_90),oklch(0.98_0.012_230))] p-6">
        <h1 className="text-2xl font-semibold tracking-tight">管理后台</h1>
        <p className="mt-1 text-sm text-muted-foreground">新增、编辑、下线题目，并支持批量排期与提交统计。</p>
      </section>

      {msg.err ? <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{msg.err}</div> : null}
      {msg.ok ? <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm">{msg.ok}</div> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold">发布每日题</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <select value={String(scheduleSlot)} onChange={(e) => setScheduleSlot(Number(e.target.value) as 1 | 2 | 3)} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm">
              <option value="1">第1题</option><option value="2">第2题</option><option value="3">第3题</option>
            </select>
            <select value={scheduleDrillId} onChange={(e) => setScheduleDrillId(e.target.value)} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm md:col-span-3">
              {drills.map((d) => <option key={d.id} value={d.id}>{fmtCode(d.display_no)} · {d.title} · {typeLabel[d.drill_type]} · {modeLabelText(d.mode_visibility)}</option>)}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void run(saveSchedule)} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">发布</button>
          </div>
          <div className="mt-3 grid gap-2">
            {scheduleRows.map((row) => {
              const d = pickDrill(row.drill);
              return (
                <div key={`${row.date}-${row.slot}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  <span>第{row.slot}题 · {d ? `${fmtCode(d.display_no)} ${d.title}` : row.drill_id}</span>
                  <button type="button" onClick={() => void run(() => removeSchedule(row))} className="rounded-full border border-border/70 px-3 py-1 text-xs">删除</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold">批量排期</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <input type="number" min={1} max={30} value={bulkDays} onChange={(e) => setBulkDays(Number(e.target.value))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <select value={bulkDrill} onChange={(e) => setBulkDrill(e.target.value)} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm md:col-span-2">
              {drills.map((d) => <option key={d.id} value={d.id}>{fmtCode(d.display_no)} · {d.title} · {typeLabel[d.drill_type]} · {modeLabelText(d.mode_visibility)}</option>)}
            </select>
          </div>
          <button type="button" disabled={busy} onClick={() => void run(bulkSchedule)} className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">生成并覆盖</button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold">新增题目</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={createForm.id} onChange={(e) => setCreateForm((v) => ({ ...v, id: e.target.value }))} placeholder="drill-id" className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <input value={createForm.title} onChange={(e) => setCreateForm((v) => ({ ...v, title: e.target.value }))} placeholder="题目标题" className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <select value={String(createForm.difficulty)} onChange={(e) => setCreateForm((v) => ({ ...v, difficulty: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm">
              <option value="1">难度1</option><option value="2">难度2</option><option value="3">难度3</option><option value="4">难度4</option><option value="5">难度5</option>
            </select>
            <select
              value={createForm.drillType}
              onChange={(e) =>
                setCreateForm((v) => {
                  const drillType = e.target.value as DrillType;
                  return {
                    ...v,
                    drillType,
                    examTrack: v.examVisible ? (v.examTrack || defaultExamTrackByType(drillType)) : v.examTrack,
                  };
                })
              }
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm"
            >
              <option value="prompt_case">普通题（prompt_case）</option>
              <option value="code_case_multi">多文件题（code_case_multi）</option>
              <option value="build_sim_case">模拟构建题（build_sim_case）</option>
              <option value="template_case">教学样板题（template_case）</option>
            </select>
            <input value={createForm.tags} onChange={(e) => setCreateForm((v) => ({ ...v, tags: e.target.value }))} placeholder="标签逗号分隔" className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <select value={createForm.capabilityDomain} onChange={(e) => setCreateForm((v) => ({ ...v, capabilityDomain: e.target.value as CapabilityDomain }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm">
              <option value="coding">领域：coding</option>
              <option value="docs">领域：docs</option>
              <option value="tools">领域：tools</option>
              <option value="life">领域：life</option>
            </select>
            <select
              value={createForm.examTrack}
              onChange={(e) => setCreateForm((v) => ({ ...v, examTrack: e.target.value as ExamTrack | "" }))}
              disabled={!createForm.examVisible}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="">考试赛道（默认按题型推断）</option>
              <option value="debug">debug</option>
              <option value="feature">feature</option>
              <option value="from_zero">from_zero</option>
            </select>
            <input
              type="number"
              min={1}
              value={createForm.examTimeLimitSec}
              onChange={(e) => setCreateForm((v) => ({ ...v, examTimeLimitSec: e.target.value }))}
              placeholder="考试限时（秒，可选）"
              disabled={!createForm.examVisible}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm disabled:opacity-60"
            />
            <input
              type="number"
              min={1}
              value={createForm.examSubmissionLimit}
              onChange={(e) => setCreateForm((v) => ({ ...v, examSubmissionLimit: e.target.value }))}
              placeholder="考试提交次数上限（可选）"
              disabled={!createForm.examVisible}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm disabled:opacity-60"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.coachVisible}
                onChange={(e) => setCreateForm((v) => ({ ...v, coachVisible: e.target.checked }))}
              />
              Coach 可见
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.examVisible}
                onChange={(e) =>
                  setCreateForm((v) => ({
                    ...v,
                    examVisible: e.target.checked,
                    examTrack: e.target.checked ? (v.examTrack || defaultExamTrackByType(v.drillType)) : "",
                  }))
                }
              />
              Exam 可见
            </label>
          </div>
          <textarea value={createForm.body} onChange={(e) => setCreateForm((v) => ({ ...v, body: e.target.value }))} placeholder="题面正文 Markdown" className="mt-2 min-h-36 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm" />
          <label className="mt-2 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createForm.publishNow} onChange={(e) => setCreateForm((v) => ({ ...v, publishNow: e.target.checked }))} /> 立即发布</label>
          <div><button type="button" disabled={busy} onClick={() => void run(createDrill)} className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">创建题目</button></div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold">编辑/下线题目</p>
          <select value={editId} onChange={(e) => setEditId(e.target.value)} className="mt-3 h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm">
            {drills.map((d) => <option key={d.id} value={d.id}>{fmtCode(d.display_no)} · {d.title} · {typeLabel[d.drill_type]} · {modeLabelText(d.mode_visibility)}</option>)}
          </select>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input value={editForm.title} onChange={(e) => setEditForm((v) => ({ ...v, title: e.target.value }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <input value={editForm.tags} onChange={(e) => setEditForm((v) => ({ ...v, tags: e.target.value }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <select value={String(editForm.difficulty)} onChange={(e) => setEditForm((v) => ({ ...v, difficulty: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm">
              <option value="1">难度1</option><option value="2">难度2</option><option value="3">难度3</option><option value="4">难度4</option><option value="5">难度5</option>
            </select>
            <select
              value={editForm.drillType}
              onChange={(e) =>
                setEditForm((v) => {
                  const drillType = e.target.value as DrillType;
                  return {
                    ...v,
                    drillType,
                    examTrack: v.examVisible ? (v.examTrack || defaultExamTrackByType(drillType)) : v.examTrack,
                  };
                })
              }
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm"
            >
              <option value="prompt_case">普通题（prompt_case）</option>
              <option value="code_case_multi">多文件题（code_case_multi）</option>
              <option value="build_sim_case">模拟构建题（build_sim_case）</option>
              <option value="template_case">教学样板题（template_case）</option>
            </select>
            <input type="datetime-local" value={editForm.publishedAt} onChange={(e) => setEditForm((v) => ({ ...v, publishedAt: e.target.value }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <select value={editForm.capabilityDomain} onChange={(e) => setEditForm((v) => ({ ...v, capabilityDomain: e.target.value as CapabilityDomain }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm">
              <option value="coding">领域：coding</option>
              <option value="docs">领域：docs</option>
              <option value="tools">领域：tools</option>
              <option value="life">领域：life</option>
            </select>
            <select
              value={editForm.examTrack}
              onChange={(e) => setEditForm((v) => ({ ...v, examTrack: e.target.value as ExamTrack | "" }))}
              disabled={!editForm.examVisible}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm disabled:opacity-60"
            >
              <option value="">考试赛道（默认按题型推断）</option>
              <option value="debug">debug</option>
              <option value="feature">feature</option>
              <option value="from_zero">from_zero</option>
            </select>
            <input
              type="number"
              min={1}
              value={editForm.examTimeLimitSec}
              onChange={(e) => setEditForm((v) => ({ ...v, examTimeLimitSec: e.target.value }))}
              placeholder="考试限时（秒，可选）"
              disabled={!editForm.examVisible}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm disabled:opacity-60"
            />
            <input
              type="number"
              min={1}
              value={editForm.examSubmissionLimit}
              onChange={(e) => setEditForm((v) => ({ ...v, examSubmissionLimit: e.target.value }))}
              placeholder="考试提交次数上限（可选）"
              disabled={!editForm.examVisible}
              className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm disabled:opacity-60"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={editForm.coachVisible}
                onChange={(e) => setEditForm((v) => ({ ...v, coachVisible: e.target.checked }))}
              />
              Coach 可见
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={editForm.examVisible}
                onChange={(e) =>
                  setEditForm((v) => ({
                    ...v,
                    examVisible: e.target.checked,
                    examTrack: e.target.checked ? (v.examTrack || defaultExamTrackByType(v.drillType)) : "",
                  }))
                }
              />
              Exam 可见
            </label>
          </div>
          <textarea value={editForm.body} onChange={(e) => setEditForm((v) => ({ ...v, body: e.target.value }))} className="mt-2 min-h-36 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void run(saveEdit)} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">保存</button>
            <button type="button" disabled={busy} onClick={() => void run(() => setPublished(true))} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm">发布</button>
            <button type="button" disabled={busy} onClick={() => void run(() => setPublished(false))} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm">下线</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">题目附件管理</p>
            <select value={assetDrillId} onChange={(e) => setAssetDrillId(e.target.value)} className="h-10 w-full max-w-md rounded-xl border border-border/70 bg-background px-3 text-sm">
              {drills.map((d) => <option key={d.id} value={d.id}>{fmtCode(d.display_no)} · {d.title} · {typeLabel[d.drill_type]} · {modeLabelText(d.mode_visibility)}</option>)}
            </select>
          </div>
          <div className="mt-3 grid gap-2">
            {assets.length === 0 ? <p className="text-sm text-muted-foreground">当前题目还没有附件。</p> : assets.map((asset) => (
              <div key={asset.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-muted-foreground">{asset.asset_kind} · #{asset.order_no}</p>
                    <p className="truncate">{asset.path}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setAssetForm({ id: asset.id, kind: asset.asset_kind, path: asset.path, content: asset.content_text, orderNo: asset.order_no })} className="rounded-full border border-border/70 px-3 py-1 text-xs">编辑</button>
                    <button type="button" onClick={() => void run(() => deleteAsset(asset.id))} className="rounded-full border border-border/70 px-3 py-1 text-xs">删除</button>
                  </div>
                </div>
                <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-2 py-1 text-[11px]">{asset.content_text}</pre>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold">{assetForm.id ? "编辑附件" : "新增附件"}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <select value={assetForm.kind} onChange={(e) => setAssetForm((v) => ({ ...v, kind: e.target.value as AssetKind }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm">
              <option value="file">文件（file）</option>
              <option value="log">日志（log）</option>
              <option value="spec">规格（spec）</option>
              <option value="image">图片（image）</option>
            </select>
            <input type="number" min={1} value={assetForm.orderNo} onChange={(e) => setAssetForm((v) => ({ ...v, orderNo: Number(e.target.value) }))} className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm" />
            <input value={assetForm.path} onChange={(e) => setAssetForm((v) => ({ ...v, path: e.target.value }))} placeholder="附件路径，如 src/app.ts" className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm md:col-span-2" />
          </div>
          <textarea value={assetForm.content} onChange={(e) => setAssetForm((v) => ({ ...v, content: e.target.value }))} placeholder="附件内容" className="mt-2 min-h-40 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void run(saveAsset)} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50">{assetForm.id ? "保存附件" : "创建附件"}</button>
            {assetForm.id ? <button type="button" onClick={resetAssetForm} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm">取消编辑</button> : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-semibold">题目提交统计</p>
          <select value={selectedDrillId} onChange={(e) => setSelectedDrillId(e.target.value)} className="h-10 w-full max-w-md rounded-xl border border-border/70 bg-background px-3 text-sm">
            {drills.map((d) => <option key={d.id} value={d.id}>{fmtCode(d.display_no)} · {d.title} · {typeLabel[d.drill_type]} · {modeLabelText(d.mode_visibility)}</option>)}
          </select>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4 text-sm">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">样本 {stats.count}</div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">均分 {stats.avg}</div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">最高 {stats.max}</div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">最低 {stats.min}</div>
        </div>
        <div className="mt-3 grid gap-2">
          {attempts.slice(0, 40).map((a) => (
            <div key={a.id} className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">用户 {a.user_id.slice(0, 8)}… · {new Date(a.created_at).toLocaleString("zh-CN")}</span>
                <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">{a.score_total}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-muted-foreground">{a.prompt_text}</p>
            </div>
          ))}
          {attempts.length === 0 ? <p className="text-sm text-muted-foreground">暂无提交记录。</p> : null}
        </div>
      </section>
    </div>
  );
}
