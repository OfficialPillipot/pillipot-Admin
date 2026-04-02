/** Local calendar YYYY-MM-DD (for filters aligned with admin expectations). */
export function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function presetToday(): { from: string; to: string } {
  const t = new Date();
  const s = localYMD(t);
  return { from: s, to: s };
}

/** Monday → today (local). */
export function presetThisWeek(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return { from: localYMD(monday), to: localYMD(now) };
}

export function presetThisMonth(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: localYMD(first), to: localYMD(now) };
}

export function presetLastMonth(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: localYMD(first), to: localYMD(last) };
}
