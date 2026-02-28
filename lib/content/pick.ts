import type { Drill } from "./drills";

export function pickDrillForUtcDate(drills: Drill[], date: Date): Drill {
  return pickDrillsForUtcDate(drills, date, 1)[0]!;
}

export function pickDrillsForUtcDate(
  drills: Drill[],
  date: Date,
  count: number,
): Drill[] {
  if (drills.length === 0) {
    throw new Error("No drills available");
  }
  if (count <= 0) return [];

  const idx = Math.abs(
    date.getUTCFullYear() * 10000 +
      (date.getUTCMonth() + 1) * 100 +
      date.getUTCDate(),
  );

  const ordered = [...drills].sort((a, b) => {
    if (a.displayNo !== b.displayNo) return a.displayNo - b.displayNo;
    return a.id.localeCompare(b.id);
  });

  const target = Math.min(count, ordered.length);
  const start = idx % ordered.length;
  const picked: Drill[] = [];

  for (let i = 0; i < target; i += 1) {
    picked.push(ordered[(start + i) % ordered.length]!);
  }

  return picked;
}
