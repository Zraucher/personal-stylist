// Closet gaps: which single piece would unlock the most new outfits. Count the outfits the
// closet makes across a few typical days, add one hypothetical piece, count again.
// Pure; imports with .ts so plain Node can run the tests.

import { BASICS, type Presentation } from "../closet/basics.ts";
import { buildCandidates, type ClosetPiece, type DayConditions, type Occasion } from "../today/candidates.ts";
import { resolveColor, type ScoreColorProfile, type ScoreStyle } from "../scorecard/rules.ts";

export type Scenario = { occasion: Occasion; day: DayConditions; label: string };

export const SCENARIOS: Scenario[] = [
  { label: "a hot casual day", occasion: "casual", day: { feelsMin: 88, feelsMax: 100, season: "summer" } },
  { label: "a mild casual day", occasion: "casual", day: { feelsMin: 62, feelsMax: 74, season: "fall" } },
  { label: "the office", occasion: "office", day: { feelsMin: 60, feelsMax: 78, season: "fall", indoorCold: true } },
  { label: "dinner out", occasion: "dinner", day: { feelsMin: 60, feelsMax: 75, season: "spring" } },
  { label: "a cool morning", occasion: "casual", day: { feelsMin: 42, feelsMax: 60, season: "winter" } },
];

export type Gap = { piece: ClosetPiece; added: number; scenarios: string[] };
const CORE = new Set(["top", "bottom", "dress", "outerwear", "shoes"]);
const PER_ROLE = 5;

function countFor(closet: ClosetPiece[], s: Scenario, palette: ScoreColorProfile, style: ScoreStyle): number {
  return buildCandidates(closet, s.day, { occasion: s.occasion, today: "2000-01-01" }, palette, style, { countOnly: true, perRole: PER_ROLE }).candidates.length;
}

/** Already own something like this: same subcategory and a close enough color word. */
function owned(closet: ClosetPiece[], b: { subcategory: string; colorName: string | null }): boolean {
  return closet.some((p) => {
    if ((p.subcategory ?? "").toLowerCase() !== b.subcategory.toLowerCase()) return false;
    if (!b.colorName) return true;
    return p.colors.some((c) => c.name.toLowerCase().includes(b.colorName!.toLowerCase().split(" ").pop()!));
  });
}

/**
 * Hypothetical pieces: the presentation's basics (core clothing only), each in its own
 * color or, when it has none, in the person's first two resolvable palette colors.
 */
export function hypotheticals(closet: ClosetPiece[], presentation: Presentation | "both", palette: ScoreColorProfile): ClosetPiece[] {
  const lists = presentation === "both" ? [...BASICS.womens, ...BASICS.mens] : BASICS[presentation];
  const paletteColors = (palette?.best_colors ?? []).map((name) => ({ name, hex: resolveColor({ name }) })).filter((c): c is { name: string; hex: string } => !!c.hex).slice(0, 2);
  const out: ClosetPiece[] = [];
  for (const b of lists) {
    if (!CORE.has(b.category)) continue;
    const colorings = b.colors.length ? [b.colors] : paletteColors.length ? paletteColors.map((c) => [c]) : [[{ name: "neutral" }]];
    for (const colors of colorings) {
      const colorName = colors[0]?.name ?? null;
      if (owned(closet, { subcategory: b.subcategory, colorName: b.colors.length ? colorName : null })) continue;
      out.push({
        id: `gap-${b.id}-${colorName ?? "any"}`,
        name: b.colors.length ? b.name : `${colorName} ${b.name.toLowerCase()}`,
        category: b.category,
        subcategory: b.subcategory,
        colors,
        pattern: null,
        material: null,
        construction: b.construction ?? [],
        formality: b.formality,
        warmth: b.warmth,
        verdict: null,
        status: "available",
        seasons: b.seasons,
        affinity: 0,
        lastWorn: null,
      });
    }
  }
  return out;
}

/** "khaki chinos" -> "Khaki chinos". */
export function gapLabel(g: Gap): string {
  const n = (g.piece.name ?? g.piece.subcategory ?? "piece").trim();
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function findGaps(
  closet: ClosetPiece[],
  presentation: Presentation | "both",
  palette: ScoreColorProfile,
  style: ScoreStyle,
  opts: { top?: number; scenarios?: Scenario[]; candidates?: ClosetPiece[] } = {}
): { base: number; gaps: Gap[] } {
  const scenarios = opts.scenarios ?? SCENARIOS;
  const wearable = closet.filter((p) => !p.status || p.status === "available");
  const baseBy = scenarios.map((s) => countFor(wearable, s, palette, style));
  const base = baseBy.reduce((a, b) => a + b, 0);
  const pool = opts.candidates ?? hypotheticals(wearable, presentation, palette);
  const gaps: Gap[] = [];
  for (const piece of pool) {
    const withIt = [...wearable, { ...piece, affinity: 5 }]; // high affinity keeps it in the shortlist
    let added = 0;
    const where: string[] = [];
    scenarios.forEach((s, i) => {
      const d = countFor(withIt, s, palette, style) - baseBy[i];
      if (d > 0) {
        added += d;
        where.push(s.label);
      }
    });
    if (added > 0) gaps.push({ piece, added, scenarios: where });
  }
  gaps.sort((a, b) => b.added - a.added);
  // One suggestion per piece type: "black joggers" and "onyx joggers" are the same idea.
  const seenType = new Set<string>();
  const unique = gaps.filter((g) => {
    const k = (g.piece.subcategory ?? g.piece.name ?? "").toLowerCase();
    if (seenType.has(k)) return false;
    seenType.add(k);
    return true;
  });
  return { base, gaps: unique.slice(0, opts.top ?? 5) };
}
