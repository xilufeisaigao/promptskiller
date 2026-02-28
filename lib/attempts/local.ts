import type { CoachResult } from "@/lib/coach/types";

export type DrillAttempt = {
  id: string;
  drillId: string;
  promptText: string;
  coach: CoachResult;
  createdAt: string; // ISO
};

const STORAGE_KEY = "promptskiller.attempts.v1";

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type StoredState = Record<string, DrillAttempt[]>;

function loadState(): StoredState {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  const parsed = safeParseJson(raw);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as StoredState;
}

function saveState(state: StoredState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listAttempts(drillId: string): DrillAttempt[] {
  const state = loadState();
  const attempts = Array.isArray(state[drillId]) ? state[drillId]! : [];
  // newest first
  return [...attempts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addAttempt(input: {
  drillId: string;
  promptText: string;
  coach: CoachResult;
}): DrillAttempt {
  const state = loadState();
  const attempt: DrillAttempt = {
    id: crypto.randomUUID(),
    drillId: input.drillId,
    promptText: input.promptText,
    coach: input.coach,
    createdAt: new Date().toISOString(),
  };

  const next = Array.isArray(state[input.drillId]) ? state[input.drillId]! : [];
  state[input.drillId] = [...next, attempt];
  saveState(state);
  return attempt;
}

export function clearAttempts(drillId?: string): void {
  if (typeof window === "undefined") return;
  if (!drillId) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const state = loadState();
  delete state[drillId];
  saveState(state);
}

