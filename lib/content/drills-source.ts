import { createSupabasePublicClient } from "@/lib/supabase/public";

import {
  DRILLS,
  DRILL_MODULES,
  getDrillById as getDrillByIdLocal,
  type Drill,
  type DrillCapabilityDomain,
  type DrillExamTrack,
  type DrillMode,
  type DrillAsset,
  type DrillAssetKind,
  type DrillTemplateRound,
  type DrillModule,
  type DrillModuleLevel,
} from "./drills";

type DrillRow = {
  id: string;
  display_no: number | null;
  title: string;
  body_md: string;
  difficulty: number;
  drill_type: string | null;
  mode_visibility: string[] | null;
  capability_domain: string | null;
  exam_track: string | null;
  exam_time_limit_sec: number | null;
  exam_submission_limit: number | null;
  tags: string[] | null;
  published_at: string | null;
};

type DrillScheduleRow = {
  slot: number;
  drill: DrillRow | DrillRow[] | null;
};

type DrillAssetRow = {
  id: string;
  drill_id: string;
  asset_kind: string;
  path: string;
  content_text: string;
  order_no: number;
};

type DrillTemplateRoundRow = {
  id: string;
  drill_id: string;
  round_no: number;
  version_label: string;
  prompt_text: string;
  teaching_notes_md: string | null;
};

type DrillModuleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: string;
  estimated_minutes: number | null;
  cover_style: string | null;
  published_at: string | null;
};

type DrillModuleItemRow = {
  module_id: string;
  drill_id: string;
  position: number;
};

function normalizeDrillType(
  value: string | null | undefined,
): Drill["drillType"] {
  if (value === "code_case_multi" || value === "build_sim_case" || value === "template_case") {
    return value;
  }
  return "prompt_case";
}

function normalizeModeVisibility(value: string[] | null | undefined): DrillMode[] {
  if (!Array.isArray(value) || value.length === 0) return ["coach"];
  const out = new Set<DrillMode>();
  for (const raw of value) {
    if (raw === "coach" || raw === "exam") out.add(raw);
  }
  return out.size > 0 ? [...out] : ["coach"];
}

function normalizeCapabilityDomain(
  value: string | null | undefined,
): DrillCapabilityDomain {
  if (value === "docs" || value === "tools" || value === "life") return value;
  return "coding";
}

function normalizeExamTrack(
  value: string | null | undefined,
): DrillExamTrack | null {
  if (value === "debug" || value === "feature" || value === "from_zero") return value;
  return null;
}

function normalizeOptionalPositiveInt(value: number | null | undefined): number | null {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw);
}

function normalizeAssetKind(
  value: string | null | undefined,
): DrillAssetKind | null {
  if (value === "file" || value === "log" || value === "spec" || value === "image") return value;
  return null;
}

function normalizeModuleLevel(
  value: string | null | undefined,
): DrillModuleLevel {
  if (value === "intermediate" || value === "advanced") return value;
  return "starter";
}

function rowToDrill(row: DrillRow, fallbackDisplayNo: number): Drill {
  const difficultyRaw = Number(row.difficulty);
  const difficulty = (Number.isFinite(difficultyRaw)
    ? Math.min(5, Math.max(1, Math.round(difficultyRaw)))
    : 1) as 1 | 2 | 3 | 4 | 5;
  const displayNoRaw = Number(row.display_no);
  const displayNo = Number.isFinite(displayNoRaw) && displayNoRaw > 0
    ? Math.round(displayNoRaw)
    : fallbackDisplayNo;

  return {
    id: row.id,
    displayNo,
    title: row.title,
    bodyMd: row.body_md,
    difficulty,
    drillType: normalizeDrillType(row.drill_type),
    modeVisibility: normalizeModeVisibility(row.mode_visibility),
    capabilityDomain: normalizeCapabilityDomain(row.capability_domain),
    examTrack: normalizeExamTrack(row.exam_track),
    examTimeLimitSec: normalizeOptionalPositiveInt(row.exam_time_limit_sec),
    examSubmissionLimit: normalizeOptionalPositiveInt(row.exam_submission_limit),
    tags: row.tags ?? undefined,
    publishedAt: row.published_at,
  };
}

function rowToDrillAsset(row: DrillAssetRow): DrillAsset | null {
  const assetKind = normalizeAssetKind(row.asset_kind);
  if (!assetKind) return null;

  const orderNoRaw = Number(row.order_no);
  const orderNo =
    Number.isFinite(orderNoRaw) && orderNoRaw > 0 ? Math.round(orderNoRaw) : 1;

  return {
    id: row.id,
    drillId: row.drill_id,
    assetKind,
    path: row.path,
    contentText: row.content_text,
    orderNo,
  };
}

function normalizeScheduleDrill(drill: DrillRow | DrillRow[] | null): DrillRow | null {
  if (!drill) return null;
  if (Array.isArray(drill)) return drill[0] ?? null;
  return drill;
}

export async function listDrills(): Promise<Drill[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("drills")
      .select("id,display_no,title,body_md,difficulty,drill_type,mode_visibility,capability_domain,exam_track,exam_time_limit_sec,exam_submission_limit,tags,published_at")
      .order("display_no", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return DRILLS;

    return (data as DrillRow[]).map((row, idx) => rowToDrill(row, idx + 1));
  } catch {
    return DRILLS;
  }
}

export async function listScheduledDrillsForUtcDate(
  date: Date,
  count = 3,
): Promise<Drill[]> {
  if (count <= 0) return [];

  try {
    const supabase = createSupabasePublicClient();
    const dateUtc = date.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("drill_schedule")
      .select("slot,drill:drills(id,display_no,title,body_md,difficulty,drill_type,mode_visibility,capability_domain,exam_track,exam_time_limit_sec,exam_submission_limit,tags,published_at)")
      .eq("date", dateUtc)
      .order("slot", { ascending: true })
      .limit(count);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const seen = new Set<string>();
    const out: Drill[] = [];

    for (const row of data as DrillScheduleRow[]) {
      const drillRow = normalizeScheduleDrill(row.drill);
      if (!drillRow) continue;
      if (seen.has(drillRow.id)) continue;
      seen.add(drillRow.id);
      out.push(rowToDrill(drillRow, out.length + 1));
      if (out.length >= count) break;
    }

    return out;
  } catch {
    return [];
  }
}

export async function getDrillById(id: string): Promise<Drill | undefined> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("drills")
      .select("id,display_no,title,body_md,difficulty,drill_type,mode_visibility,capability_domain,exam_track,exam_time_limit_sec,exam_submission_limit,tags,published_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return getDrillByIdLocal(id);

    const local = getDrillByIdLocal(id);
    return rowToDrill(data as DrillRow, local?.displayNo ?? 1);
  } catch {
    return getDrillByIdLocal(id);
  }
}

export async function listDrillAssets(drillId: string): Promise<DrillAsset[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("drill_assets")
      .select("id,drill_id,asset_kind,path,content_text,order_no")
      .eq("drill_id", drillId)
      .order("asset_kind", { ascending: true })
      .order("order_no", { ascending: true })
      .order("path", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return (data as DrillAssetRow[])
      .map(rowToDrillAsset)
      .filter((row): row is DrillAsset => Boolean(row));
  } catch {
    return [];
  }
}

export async function listDrillModules(): Promise<DrillModule[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data: modulesData, error: modulesErr } = await supabase
      .from("drill_modules")
      .select(
        "id,slug,title,description,level,estimated_minutes,cover_style,published_at",
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (modulesErr) throw modulesErr;

    if (!modulesData || modulesData.length === 0) return DRILL_MODULES;

    const { data: itemsData, error: itemsErr } = await supabase
      .from("drill_module_items")
      .select("module_id,drill_id,position")
      .order("module_id", { ascending: true })
      .order("position", { ascending: true });
    if (itemsErr) throw itemsErr;

    const itemsByModule = new Map<string, DrillModuleItemRow[]>();
    for (const row of (itemsData ?? []) as DrillModuleItemRow[]) {
      const list = itemsByModule.get(row.module_id) ?? [];
      list.push(row);
      itemsByModule.set(row.module_id, list);
    }

    const out: DrillModule[] = [];
    for (const row of modulesData as DrillModuleRow[]) {
      const moduleItems = itemsByModule.get(row.id) ?? [];
      const drillIds = moduleItems
        .sort((a, b) => a.position - b.position)
        .map((item) => item.drill_id);
      out.push({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        level: normalizeModuleLevel(row.level),
        estimatedMinutes:
          typeof row.estimated_minutes === "number"
            ? row.estimated_minutes
            : null,
        coverStyle: row.cover_style,
        publishedAt: row.published_at,
        drillIds,
      });
    }

    return out;
  } catch {
    return DRILL_MODULES;
  }
}

export async function listDrillTemplateRounds(
  drillId: string,
): Promise<DrillTemplateRound[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("drill_template_rounds")
      .select("id,drill_id,round_no,version_label,prompt_text,teaching_notes_md")
      .eq("drill_id", drillId)
      .order("round_no", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return (data as DrillTemplateRoundRow[]).map((row) => ({
      id: row.id,
      drillId: row.drill_id,
      roundNo: Number.isFinite(Number(row.round_no))
        ? Math.max(1, Math.round(Number(row.round_no)))
        : 1,
      versionLabel: row.version_label,
      promptText: row.prompt_text,
      teachingNotesMd: row.teaching_notes_md,
    }));
  } catch {
    return [];
  }
}
