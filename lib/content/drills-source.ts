import { createSupabasePublicClient } from "@/lib/supabase/public";

import { DRILLS, getDrillById as getDrillByIdLocal, type Drill } from "./drills";

type DrillRow = {
  id: string;
  display_no: number | null;
  title: string;
  body_md: string;
  difficulty: number;
  tags: string[] | null;
};

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
    tags: row.tags ?? undefined,
  };
}

export async function listDrills(): Promise<Drill[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("drills")
      .select("id,display_no,title,body_md,difficulty,tags")
      .order("display_no", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return DRILLS;

    return (data as DrillRow[]).map((row, idx) => rowToDrill(row, idx + 1));
  } catch {
    return DRILLS;
  }
}

export async function getDrillById(id: string): Promise<Drill | undefined> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase
      .from("drills")
      .select("id,display_no,title,body_md,difficulty,tags")
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
