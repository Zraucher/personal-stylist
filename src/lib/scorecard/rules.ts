// Rules layer of the scorecard: palette, fabric, silhouette.
// Pure functions, no imports, erasable TypeScript only, so they can be unit-tested with plain Node.
// The vibe layer (model) and the final verdict logic live next to this in the API route.

export type Status = "good" | "ok" | "caution" | "fail" | "unknown";
export type Criterion = { status: Status; reason: string; hard?: boolean };
export type Rules = { palette: Criterion; fabric: Criterion; silhouette: Criterion };

export type ItemColor = { name: string; hex?: string };
export type ScoreItem = {
  name: string | null;
  subcategory: string | null;
  colors: ItemColor[];
  pattern: string | null;
  material: string | null;
  construction: string[];
};
export type ScoreColorProfile = {
  best_colors: string[];
  avoid_colors: string[];
  confidence: string | null;
} | null;
export type FabricRule = { name: string; strength?: string; note?: string };
export type ScoreStyle = {
  dislikes: string[];
  fabrics_preferred: FabricRule[];
  fabrics_avoid: FabricRule[];
  silhouettes_preferred: string[];
  silhouettes_avoid: string[];
} | null;

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------

const LEXICON: Record<string, string> = {
  black: "#121212", onyx: "#151515", "midnight black": "#0b0b0f",
  white: "#f5f5f0", "off-white": "#f1ece0", cream: "#efe6d0", ivory: "#f3ecd9", "soft ivory": "#eee6d2", bone: "#e3dac9",
  navy: "#1f2a44", "deep navy": "#14213d", blue: "#3b6ea8", "light blue": "#a9c4e0", "sky blue": "#8fb8de",
  "mid blue": "#5b7fa6", indigo: "#2b3a5c", denim: "#4a6a8f",
  teal: "#2f7f84", "muted teal": "#4f8a8b", slate: "#5d6d7e",
  grey: "#8a8a8a", gray: "#8a8a8a", "heather grey": "#8a8a8a", charcoal: "#3c3f44",
  khaki: "#b9a680", tan: "#c2a57b", camel: "#b78f5a", taupe: "#8b7765", "warm taupe": "#9a8068", greige: "#b8ada0",
  sand: "#d2bd96", "warm sand": "#d9c3a0", beige: "#d8c3a5",
  brown: "#6b4a2b", chocolate: "#4a3224", cognac: "#9a5b2e",
  terracotta: "#c1694f", rust: "#a8512f", "muted rust": "#a85e3f", "burnt orange": "#c25b1e", orange: "#e07b1a",
  ochre: "#c58f1f", mustard: "#c9992b", gold: "#c9a227", "soft gold": "#d3b565", bronze: "#8c6a3c", copper: "#b4673d",
  peach: "#f1b79b", "dusty peach": "#e3b09c", blush: "#eebdb5", pink: "#e48fa8", "dusty rose": "#c99a9f", mauve: "#a8838f",
  red: "#b3262e", burgundy: "#6d1f2f", wine: "#5c2234", plum: "#5a2a52", "plum wine": "#5b2a45",
  lilac: "#b8a3d1", lavender: "#b9a8d8", purple: "#6a3d9a",
  olive: "#6b705c", sage: "#9caf88", "forest green": "#234d2f", "dark forest green": "#1f3d2b", green: "#3f7d4a",
  moss: "#7a8450", chartreuse: "#c7d62b", mint: "#b5dfc5", yellow: "#e5c93a", lemon: "#f0e35a",
};
const LEXICON_KEYS = Object.keys(LEXICON).sort((a, b) => b.length - a.length);

export function lexiconHex(name: string): string | null {
  const n = name.toLowerCase().replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return null;
  if (LEXICON[n]) return LEXICON[n];
  for (const key of LEXICON_KEYS) {
    if (n.includes(key)) return LEXICON[key];
  }
  return null;
}

export function resolveColor(c: ItemColor): string | null {
  if (c.hex && /^#[0-9a-fA-F]{6}$/.test(c.hex)) return c.hex.toLowerCase();
  return lexiconHex(c.name);
}

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function hexToLab(hex: string): [number, number, number] {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb(hex).map(lin);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a);
  const [l2, a2, b2] = hexToLab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s, l };
}

/** Does this hex fall under one avoid-list entry? Returns null when the entry is not testable. */
function avoidTest(entry: string, hex: string): boolean | null {
  const e = entry.toLowerCase();
  const { h, s, l } = hsl(hex);
  if (/stark white|pure white|optic white/.test(e)) {
    // HSL saturation is unstable near white, so judge by Lab lightness and chroma.
    const [L, A, B] = hexToLab(hex);
    return L >= 94 && Math.hypot(A, B) < 7;
  }
  if (/true black|jet black|pure black/.test(e)) return l <= 0.09;
  if (/icy/.test(e)) return l >= 0.6 && h >= 170 && h <= 280 && s >= 0.25;
  if (/saturated|bright|neon/.test(e)) return s >= 0.6 && l >= 0.25 && l <= 0.8;
  const named = lexiconHex(e);
  if (named) return deltaE(hex, named) < 16;
  return null;
}

export function scorePalette(item: ScoreItem, cp: ScoreColorProfile): Criterion {
  const hexes = item.colors.map((c) => ({ name: c.name, hex: resolveColor(c) })).filter((c): c is { name: string; hex: string } => !!c.hex);
  if (hexes.length === 0) {
    return { status: "unknown", reason: "No usable color yet. Add a photo or set the swatch." };
  }
  if (!cp || (cp.best_colors.length === 0 && cp.avoid_colors.length === 0)) {
    return { status: "ok", reason: "No palette on file to check against." };
  }

  const [primary, ...rest] = hexes;
  for (const entry of cp.avoid_colors) {
    if (avoidTest(entry, primary.hex) === true) {
      return { status: "fail", hard: true, reason: `${cap(primary.name)} is on your avoid list (${entry}).` };
    }
  }
  for (const c of rest) {
    for (const entry of cp.avoid_colors) {
      if (avoidTest(entry, c.hex) === true) {
        return { status: "caution", reason: `Accent color ${c.name} touches your avoid list (${entry}).` };
      }
    }
  }

  let nearest: { name: string; d: number } | null = null;
  for (const best of cp.best_colors) {
    const bh = lexiconHex(best);
    if (!bh) continue;
    const d = deltaE(primary.hex, bh);
    if (!nearest || d < nearest.d) nearest = { name: best, d };
  }
  if (!nearest) return { status: "ok", reason: "Best colors could not be matched to swatches." };
  if (nearest.d < 20) return { status: "good", reason: `${cap(primary.name)} sits inside your palette (near ${nearest.name}).` };
  if (nearest.d < 38) return { status: "ok", reason: `${cap(primary.name)} is close to your palette (nearest: ${nearest.name}).` };
  if (cp.confidence === "high") {
    return { status: "caution", reason: `${cap(primary.name)} is outside your best colors (nearest: ${nearest.name}).` };
  }
  return { status: "ok", reason: `${cap(primary.name)} is outside the stated palette, which is low confidence.` };
}

// ---------------------------------------------------------------------------
// Fabric
// ---------------------------------------------------------------------------

const FABRIC_MATCHERS: Array<[RegExp, (m: string) => boolean]> = [
  [/^itchy wool$/, (m) => /wool/.test(m) && !/(cashmere|merino|lambs|alpaca)/.test(m)],
  [/^stretch denim$/, (m) => /denim/.test(m) && /(stretch|spandex|elastane)/.test(m)],
  [/(heavy or stiff|stiff or heavy)/, (m) => /(heavy|stiff|canvas|tweed|duck)/.test(m)],
  [/^silky textures?$/, (m) => /(silk|satin|viscose|rayon|charmeuse|modal)/.test(m)],
  [/^stiff structured denim$/, (m) => /denim/.test(m) && !/(stretch|spandex|elastane)/.test(m)],
  [/^soft cotton$/, (m) => /cotton/.test(m) && !/(stiff|heavy|canvas)/.test(m)],
  [/^stretch$/, (m) => /(stretch|spandex|elastane)/.test(m)],
  [/^performance knit$/, (m) => /performance/.test(m)],
  [/^lightweight$/, (m) => /(lightweight|featherweight)/.test(m)],
  [/^non-iron cotton$/, (m) => /non-iron/.test(m)],
  [/^wrinkle-resistant$/, (m) => /(wrinkle|non-iron)/.test(m)],
];

function fabricHit(rule: FabricRule, text: string): boolean {
  const n = rule.name.toLowerCase().trim();
  for (const [re, fn] of FABRIC_MATCHERS) {
    if (re.test(n)) return fn(text);
  }
  if (text.includes(n)) return true;
  const tokens = n.split(/[^a-z]+/).filter((t) => t.length > 2);
  return tokens.length > 0 && tokens.every((t) => text.includes(t));
}

export function scoreFabric(item: ScoreItem, style: ScoreStyle): Criterion {
  const text = `${item.material ?? ""} ${item.name ?? ""}`.toLowerCase();
  if (!item.material && !item.name) return { status: "unknown", reason: "Material not recorded." };
  if (!style) return { status: "ok", reason: "No fabric preferences on file." };

  for (const r of style.fabrics_avoid) {
    if (fabricHit(r, text) && r.strength === "hard") {
      return { status: "fail", hard: true, reason: `${cap(r.name)} is a hard no for you.` };
    }
  }
  for (const r of style.fabrics_avoid) {
    if (fabricHit(r, text)) {
      return { status: "caution", reason: `${cap(r.name)}${r.note ? ` (${r.note})` : ""} is something you usually avoid.` };
    }
  }
  for (const r of style.fabrics_preferred) {
    if (fabricHit(r, text)) return { status: "good", reason: `${cap(r.name)} is on your preferred list.` };
  }
  if (!item.material) return { status: "unknown", reason: "Material not recorded." };
  return { status: "ok", reason: `${cap(item.material)} is neutral for you.` };
}

// ---------------------------------------------------------------------------
// Silhouette and construction
// ---------------------------------------------------------------------------

type Detector = { label: string; test: (i: ScoreItem, text: string) => boolean };
const has = (i: ScoreItem, tag: string) => i.construction.includes(tag);
const DETECTORS: Array<[RegExp, Detector]> = [
  [/ruffle/, { label: "ruffles", test: (i, t) => has(i, "ruffles") || /ruffl/.test(t) }],
  [/polka|dot/, { label: "polka dots", test: (_i, t) => /polka|\bdots?\b/.test(t) }],
  [/tier/, { label: "a tiered hem", test: (i, t) => has(i, "tiered hem") || /tiered/.test(t) }],
  [/ruch/, { label: "ruching", test: (_i, t) => /ruch/.test(t) }],
  [/smock/, { label: "smocking", test: (i, t) => has(i, "smocking") || /smock/.test(t) }],
  [/peplum/, { label: "a peplum", test: (i, t) => has(i, "peplum") || /peplum/.test(t) }],
  [/scallop/, { label: "a scalloped hem", test: (_i, t) => /scallop/.test(t) }],
  [/elastic|gathered waist/, { label: "an elastic or gathered waist", test: (i, t) => has(i, "elastic waist") || /(elastic|gathered waist)/.test(t) }],
];

function detectorFor(phrase: string): Detector | null {
  const p = phrase.toLowerCase();
  for (const [re, d] of DETECTORS) if (re.test(p)) return d;
  return null;
}

const PREFERRED_TAGS: Array<[RegExp, string[]]> = [
  [/high-waisted/, ["high-waisted"]],
  [/wide-leg/, ["wide-leg"]],
  [/defined-waist/, ["belted", "tie-waist", "high-waisted"]],
  [/cropped/, ["cropped"]],
  [/(loose|oversized|relaxed)/, ["relaxed", "drop shoulder"]],
  [/ribbed/, ["ribbed"]],
  [/polo/, ["polo collar"]],
  [/(slim|straight|tapered)/, ["slim", "tapered"]],
  [/hoodie/, ["hood"]],
];

function itemText(item: ScoreItem): string {
  return `${item.name ?? ""} ${item.subcategory ?? ""} ${item.pattern ?? ""} ${item.construction.join(" ")}`.toLowerCase();
}

export function scoreSilhouette(item: ScoreItem, style: ScoreStyle): Criterion {
  if (!style) return { status: "ok", reason: "No silhouette preferences on file." };
  const text = itemText(item);

  for (const phrase of [...style.dislikes, ...style.silhouettes_avoid]) {
    const d = detectorFor(phrase);
    if (d && d.test(item, text)) {
      return { status: "fail", hard: true, reason: `Has ${d.label}, which you dislike.` };
    }
  }
  for (const phrase of style.silhouettes_preferred) {
    const p = phrase.toLowerCase();
    const sub = (item.subcategory ?? "").toLowerCase();
    const tagHit = PREFERRED_TAGS.some(([re, tags]) => re.test(p) && tags.some((t) => has(item, t)));
    const subHit = sub.length > 2 && p.includes(sub);
    if (tagHit || subHit) return { status: "good", reason: `Matches a shape you prefer (${phrase}).` };
  }
  if (item.construction.length === 0) {
    return { status: "ok", reason: "No construction details recorded, so nothing flagged." };
  }
  return { status: "ok", reason: "Nothing flagged in the construction." };
}

/** Dislikes the rules cannot test; the vibe layer is told to judge these. */
export function untestableDislikes(style: ScoreStyle): string[] {
  if (!style) return [];
  return style.dislikes.filter((d) => !detectorFor(d));
}

export function scoreRules(item: ScoreItem, cp: ScoreColorProfile, style: ScoreStyle): Rules {
  return { palette: scorePalette(item, cp), fabric: scoreFabric(item, style), silhouette: scoreSilhouette(item, style) };
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export type VibeRating = "strong" | "ok" | "weak" | "fail";
export type Vibe = { rating: VibeRating; reason: string } | null;
export type Verdict = "keep" | "cut" | "provisional";

/**
 * Vibe outranks the rules. A hard rule break only stands when the vibe is not strong.
 * No image, no colors, or an unreadable photo means provisional: no verdict from text alone.
 */
export function decideVerdict(
  rules: Rules,
  vibe: Vibe,
  opts: { hasImage: boolean; photoUnclear?: boolean }
): { verdict: Verdict; headline: string } {
  if (!opts.hasImage) {
    return { verdict: "provisional", headline: "Provisional: no photo yet, and color names alone are not enough to judge." };
  }
  if (opts.photoUnclear || !vibe) {
    return { verdict: "provisional", headline: "Provisional: the photo is not clear enough to finalize. Retake it in daylight." };
  }
  if (rules.palette.status === "unknown") {
    return { verdict: "provisional", headline: "Provisional: no color recorded for this piece yet." };
  }
  if (vibe.rating === "fail") {
    return { verdict: "cut", headline: "Cut: it fails the vibe check, and the vibe check outranks the rules." };
  }
  const hard = (Object.entries(rules) as Array<[string, Criterion]>).filter(([, c]) => c.hard);
  if (hard.length > 0) {
    if (vibe.rating === "strong") {
      return { verdict: "keep", headline: `Keep, with a flag: it breaks a rule (${hard[0][0]}) but the vibe is strong enough to override.` };
    }
    return { verdict: "cut", headline: `Cut: it breaks a hard rule (${hard[0][0]}) and the vibe does not rescue it.` };
  }
  const cautions = Object.values(rules).filter((c) => c.status === "caution").length;
  if (vibe.rating === "weak" && cautions > 0) {
    return { verdict: "cut", headline: "Cut: the vibe is lukewarm and a rule is already flagging it." };
  }
  return { verdict: "keep", headline: cautions > 0 ? "Keep, with a note: a rule flagged something small." : "Keep: it passes the rules and the vibe." };
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
