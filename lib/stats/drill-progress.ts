const STORAGE_KEY = "promptskiller.progress.drills.v1";

type ProgressState = {
  practicedDrillIds: string[];
};

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function loadStateRaw(): ProgressState {
  if (typeof window === "undefined") return { practicedDrillIds: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { practicedDrillIds: [] };
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return { practicedDrillIds: [] };
  const ids = Array.isArray((parsed as { practicedDrillIds?: unknown }).practicedDrillIds)
    ? (parsed as { practicedDrillIds: unknown[] }).practicedDrillIds
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean)
    : [];
  return { practicedDrillIds: Array.from(new Set(ids)) };
}

function saveState(state: ProgressState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listPracticedDrillIds(): string[] {
  return loadStateRaw().practicedDrillIds;
}

export function markDrillPracticed(drillId: string): void {
  const id = drillId.trim();
  if (!id) return;
  const state = loadStateRaw();
  if (state.practicedDrillIds.includes(id)) return;
  state.practicedDrillIds = [...state.practicedDrillIds, id];
  saveState(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("promptskiller:progress-changed"));
  }
}

export function clearPracticedDrills(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("promptskiller:progress-changed"));
}
