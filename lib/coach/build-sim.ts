import type { BuildSimRoundOutput, CoachFeedback } from "./types";
import { BuildSimRoundOutputSchema } from "./schema";

function simpleHash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], seed: number, count: number): T[] {
  if (arr.length === 0 || count <= 0) return [];
  const out: T[] = [];
  const used = new Set<number>();

  for (let i = 0; i < arr.length && out.length < count; i += 1) {
    const idx = (seed + i * 7) % arr.length;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(arr[idx]!);
  }

  return out;
}

function firstLine(text: string, max = 90): string {
  const line = text.trim().split(/\r?\n/, 1)[0] ?? "";
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}...`;
}

export function buildMockBuildSimRoundOutput(input: {
  drillTitle?: string | null;
  promptText: string;
  roundNo: number;
  feedback: CoachFeedback;
}): BuildSimRoundOutput {
  const drillTitle = input.drillTitle?.trim() || "当前任务";
  const seed = simpleHash(`${drillTitle}\n${input.promptText}\n${input.roundNo}`);

  const candidates = [
    "apps/web/src/modules/alerts/page.tsx",
    "apps/web/src/modules/alerts/components/AlertTable.tsx",
    "apps/web/src/modules/alerts/hooks/useAlertFilters.ts",
    "apps/web/src/modules/alerts/api.ts",
    "packages/shared/src/alerts/types.ts",
    "packages/shared/src/alerts/validators.ts",
    "packages/shared/src/logging/audit.ts",
  ] as const;

  const selected = pick(candidates, seed, 3);
  const missingTop = input.feedback.missing_items.slice(0, 2);
  const riskTop = input.feedback.ambiguities.slice(0, 2);

  const changed_files = selected.map((path, idx) => ({
    path,
    change_type: (idx === 0 ? "update" : idx === 1 ? "create" : "update") as
      | "create"
      | "update"
      | "delete",
    rationale:
      missingTop[idx] ??
      "补齐结构化输出约束，确保该轮改动可审查、可回滚。",
  }));

  const summary = [
    `第 ${input.roundNo} 轮模拟构建：围绕「${drillTitle}」生成了最小可执行改动方案。`,
    `本轮提示词重点：${firstLine(input.promptText)}。`,
    "输出强调增量改动与可回滚发布，不引入新基础设施。",
  ].join(" ");

  const patch_preview = [
    "diff --git a/apps/web/src/modules/alerts/page.tsx b/apps/web/src/modules/alerts/page.tsx",
    "@@",
    "+ export default function AlertsPage() {",
    "+   // render list + level filter + read/unread switch",
    "+   return <AlertCenterPanel />;",
    "+ }",
    "",
    "diff --git a/packages/shared/src/alerts/types.ts b/packages/shared/src/alerts/types.ts",
    "@@",
    "+ export type AlertFilter = { level?: AlertLevel; read?: boolean };",
  ].join("\n");

  const risk_notes = [
    ...riskTop,
    "需要确认 read/unread 状态与后端字段命名一致，避免接口契约漂移。",
    "筛选逻辑新增后要补回归用例，避免 critical 级告警被误过滤。",
  ].slice(0, 4);

  return {
    summary,
    changed_files,
    patch_preview,
    risk_notes,
  };
}

export function coerceBuildSimRoundOutput(
  input: unknown,
): BuildSimRoundOutput | null {
  const parsed = BuildSimRoundOutputSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  const patchPreviewRaw =
    typeof obj.patch_preview === "string"
      ? obj.patch_preview
      : typeof obj.patchPreview === "string"
        ? obj.patchPreview
        : "";

  if (!summary || !patchPreviewRaw.trim()) return null;

  const risk_notes = Array.isArray(obj.risk_notes)
    ? obj.risk_notes
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const changed_files_raw = Array.isArray(obj.changed_files)
    ? obj.changed_files
    : Array.isArray(obj.changedFiles)
      ? obj.changedFiles
      : [];

  const changed_files = changed_files_raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const path = typeof row.path === "string" ? row.path.trim() : "";
      const change_type_raw =
        typeof row.change_type === "string"
          ? row.change_type
          : typeof row.changeType === "string"
            ? row.changeType
            : "";
      const change_type =
        change_type_raw === "create" ||
        change_type_raw === "update" ||
        change_type_raw === "delete"
          ? change_type_raw
          : "update";
      const rationale =
        typeof row.rationale === "string" && row.rationale.trim()
          ? row.rationale.trim()
          : "补齐本轮需求，保持可回滚。";
      if (!path) return null;
      return { path, change_type, rationale };
    })
    .filter((row): row is BuildSimRoundOutput["changed_files"][number] =>
      Boolean(row),
    )
    .slice(0, 12);

  const fallback: BuildSimRoundOutput = {
    summary,
    changed_files,
    patch_preview: patchPreviewRaw,
    risk_notes,
  };

  const validated = BuildSimRoundOutputSchema.safeParse(fallback);
  if (validated.success) return validated.data;
  return null;
}
