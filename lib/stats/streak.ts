function toUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addUtcDays(d: Date, deltaDays: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + deltaDays);
  return next;
}

export function computeUtcStreak(attemptCreatedAtList: string[], now = new Date()): number {
  if (attemptCreatedAtList.length === 0) return 0;

  const uniqueDays = new Set<string>();
  for (const iso of attemptCreatedAtList) {
    const dt = new Date(iso);
    if (!Number.isFinite(dt.getTime())) continue;
    uniqueDays.add(toUtcYmd(dt));
  }

  // Count consecutive days backwards from "today" (UTC).
  let streak = 0;
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  while (uniqueDays.has(toUtcYmd(cursor))) {
    streak += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return streak;
}

