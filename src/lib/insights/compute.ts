// Closet insights: cost per wear, what gets worn, what sleeps, and how the closet fits the palette.
// Pure; imports with .ts so plain Node can run the tests.

import { scorePalette, type ScoreColorProfile } from "../scorecard/rules.ts";
import { roleOf, ROLE_ORDER, type Role } from "../plan/sequence.ts";

export type InsightItem = {
  id: string;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  price: number | null;
  colors: Array<{ name: string; hex?: string }>;
  status: string | null;
  createdAt: string; // ISO
  verdict: "keep" | "cut" | "provisional" | null;
};
export type Wear = { itemId: string; wornOn: string }; // YYYY-MM-DD

export type ValueRow = { id: string; price: number; wears: number; cpw: number | null };
export type SleeperRow = { id: string; days: number | null }; // null: never worn
export type Insights = {
  active: number;
  wearsLast30: number;
  usedLast90: number; // distinct pieces worn in the last 90 days
  usedShare: number; // 0..1 of active pieces
  wears: Record<string, number>;
  lastWorn: Record<string, string>;
  bestValue: ValueRow[];
  worstValue: ValueRow[];
  mostWorn: Array<{ id: string; wears: number }>;
  sleepers: SleeperRow[];
  roles: Array<{ role: Role; count: number }>;
  balanceHint: string | null;
  palette: { in: number; near: number; off: number; unknown: number };
  topColors: Array<{ name: string; hex: string | null; count: number }>;
  verdicts: { works: number; almost: number; not: number; unchecked: number };
};

const DAY = 86400000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / DAY);

export function computeInsights(items: InsightItem[], wears: Wear[], today: string, palette: ScoreColorProfile): Insights {
  const active = items.filter((i) => i.status !== "gone");
  const ids = new Set(active.map((i) => i.id));
  const count: Record<string, number> = {};
  const last: Record<string, string> = {};
  let wearsLast30 = 0;
  const used90 = new Set<string>();
  for (const w of wears) {
    if (!ids.has(w.itemId)) continue;
    count[w.itemId] = (count[w.itemId] ?? 0) + 1;
    if (!last[w.itemId] || w.wornOn > last[w.itemId]) last[w.itemId] = w.wornOn;
    const ago = daysBetween(w.wornOn, today);
    if (ago >= 0 && ago < 30) wearsLast30++;
    if (ago >= 0 && ago < 90) used90.add(w.itemId);
  }

  const priced: ValueRow[] = active
    .filter((i) => i.price != null && i.price > 0)
    .map((i) => {
      const n = count[i.id] ?? 0;
      return { id: i.id, price: Number(i.price), wears: n, cpw: n ? Math.round((Number(i.price) / n) * 100) / 100 : null };
    });
  const bestValue = priced.filter((r) => r.cpw != null).sort((a, b) => a.cpw! - b.cpw!).slice(0, 5);
  // Worst value: the most money per wear still owed. Never-worn pieces count their full price.
  const worstValue = [...priced]
    .sort((a, b) => (b.cpw ?? b.price * 2) - (a.cpw ?? a.price * 2))
    .filter((r) => !bestValue.some((x) => x.id === r.id))
    .slice(0, 5);

  const mostWorn = active
    .filter((i) => count[i.id])
    .map((i) => ({ id: i.id, wears: count[i.id] }))
    .sort((a, b) => b.wears - a.wears)
    .slice(0, 5);

  const sleepers: SleeperRow[] = active
    .filter((i) => (i.status ?? "available") === "available" && i.verdict !== "cut")
    .filter((i) => daysBetween(i.createdAt, today) >= 30)
    .map((i) => ({ id: i.id, days: last[i.id] ? daysBetween(last[i.id], today) : null }))
    .filter((r) => r.days == null || r.days >= 60)
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
    .slice(0, 8);

  const roleCount = new Map<Role, number>();
  for (const i of active) {
    const r = roleOf(i);
    roleCount.set(r, (roleCount.get(r) ?? 0) + 1);
  }
  const roles = ROLE_ORDER.filter((r) => roleCount.get(r)).map((role) => ({ role, count: roleCount.get(role)! }));
  const tops = roleCount.get("top") ?? 0;
  const bottoms = roleCount.get("bottom") ?? 0;
  const shoes = roleCount.get("shoes") ?? 0;
  let balanceHint: string | null = null;
  if (tops >= 4 && bottoms > 0 && tops / bottoms >= 3) balanceHint = `${tops} tops share ${bottoms} bottom${bottoms === 1 ? "" : "s"}. Another bottom would multiply your outfits fastest.`;
  else if (bottoms >= 4 && tops > 0 && bottoms / tops >= 2) balanceHint = `${bottoms} bottoms but only ${tops} top${tops === 1 ? "" : "s"}. Tops are the cheapest way to more outfits.`;
  else if (tops + bottoms >= 6 && shoes <= 1) balanceHint = "One pair of shoes is carrying the whole closet. A second pair in a different dress level opens new looks.";

  const pal = { in: 0, near: 0, off: 0, unknown: 0 };
  const colorCount = new Map<string, { name: string; hex: string | null; count: number }>();
  for (const i of active) {
    const s = scorePalette({ ...i, material: null, construction: [], pattern: null, formality: null, warmth: null } as Parameters<typeof scorePalette>[0], palette).status;
    if (s === "good") pal.in++;
    else if (s === "ok") pal.near++;
    else if (s === "caution" || s === "fail") pal.off++;
    else pal.unknown++;
    const c = i.colors[0];
    if (c?.name) {
      const key = c.name.toLowerCase().trim();
      const cur = colorCount.get(key) ?? { name: key, hex: c.hex ?? null, count: 0 };
      cur.count++;
      if (!cur.hex && c.hex) cur.hex = c.hex;
      colorCount.set(key, cur);
    }
  }
  const topColors = [...colorCount.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  const verdicts = { works: 0, almost: 0, not: 0, unchecked: 0 };
  for (const i of active) {
    if (i.verdict === "keep") verdicts.works++;
    else if (i.verdict === "provisional") verdicts.almost++;
    else if (i.verdict === "cut") verdicts.not++;
    else verdicts.unchecked++;
  }

  return {
    active: active.length,
    wearsLast30,
    usedLast90: used90.size,
    usedShare: active.length ? used90.size / active.length : 0,
    wears: count,
    lastWorn: last,
    bestValue,
    worstValue,
    mostWorn,
    sleepers,
    roles,
    balanceHint,
    palette: pal,
    topColors,
    verdicts,
  };
}
