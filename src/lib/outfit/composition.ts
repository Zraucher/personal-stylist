// Composition check for an outfit: completeness, counterbalance, contrast, palette harmony,
// the wearer's own rules, and formality/warmth coherence.
// Pure functions. Imports only the scorecard rules (with the .ts extension so plain Node can run the tests).

import { scorePalette, scoreFabric, scoreSilhouette, resolveColor, hexToLab } from "./../scorecard/rules.ts";
import type { ScoreItem, ScoreColorProfile, ScoreStyle, Status } from "./../scorecard/rules.ts";

export type OutfitItem = ScoreItem & {
  id: string;
  category: string | null;
  formality: number | null;
  warmth: number | null;
  /** Latest scorecard verdict for this piece, if one exists. */
  verdict?: "keep" | "cut" | "provisional" | null;
};

export type Check = { id: string; label: string; status: Status; reason: string; fix?: string };
export type Overall = "strong" | "workable" | "rework" | "incomplete";
export type Composition = { overall: Overall; headline: string; checks: Check[] };

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const CLOTHING = new Set(["top", "bottom", "dress", "outerwear"]);
const NEAR_FACE = new Set(["top", "dress", "outerwear", "jewelry", "accessory"]);

const STRUCT_SUBS = new Set(["blazer", "suit", "dress shirt", "button-up shirt", "trench", "dress shoes", "tie", "shirt dress", "briefcase"]);
const STRUCT_TAGS = ["collar", "button-front", "pleats", "belted"];

const SOFT_SUBS = new Set([
  "tee", "tank", "cami", "henley", "sweater", "cardigan", "hoodie", "sweatshirt", "joggers", "leggings", "sneakers",
  "slides", "sandals", "flats", "shorts", "bomber", "quarter-zip", "overshirt", "chore coat", "denim jacket",
]);
const SOFT_TAGS = ["relaxed", "drop shoulder", "wide-leg", "ribbed", "cable knit", "stretch", "drawstring", "elastic waist", "hood"];
const SOFT_MATERIAL = /knit|jersey|cashmere|silk|viscose|fleece|terry|cotton blend/i;

const FITTED_TAGS = ["slim", "tapered"];
const RELAXED_TAGS = ["relaxed", "wide-leg", "drop shoulder"];

const NEUTRAL_NAMES = /black|onyx|white|ivory|cream|bone|grey|gray|charcoal|navy|indigo|denim|khaki|tan|camel|taupe|greige|sand|beige|brown|chocolate|cognac/;

const RANK: Record<Status, number> = { good: 0, ok: 1, unknown: 1, caution: 2, fail: 3 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const label = (i: OutfitItem) => i.name ?? i.subcategory ?? "a piece";
const sub = (i: OutfitItem) => (i.subcategory ?? "").toLowerCase();
const hasTag = (i: OutfitItem, t: string) => i.construction.map((c) => c.toLowerCase()).includes(t);
const worst = (statuses: Status[]): Status => statuses.reduce<Status>((w, s) => (RANK[s] > RANK[w] ? s : w), "good");
const joinNames = (xs: OutfitItem[]) => xs.map(label).join(", ");

/** How buttoned-up a piece is. Subcategory counts once; each structured detail counts, capped at two. */
export function structurePoints(i: OutfitItem): number {
  const tags = Math.min(2, STRUCT_TAGS.filter((t) => hasTag(i, t)).length);
  return (STRUCT_SUBS.has(sub(i)) ? 1 : 0) + tags;
}

/** How loose, soft or undone a piece is. */
export function softPoints(i: OutfitItem): number {
  const tags = Math.min(2, SOFT_TAGS.filter((t) => hasTag(i, t)).length);
  const material = i.material && SOFT_MATERIAL.test(i.material) ? 1 : 0;
  return (SOFT_SUBS.has(sub(i)) ? 1 : 0) + tags + material;
}

const isPatterned = (i: OutfitItem) => !!i.pattern && !/^(solid|none|plain)$/i.test(i.pattern.trim());

function chroma(hex: string): number {
  const [, a, b] = hexToLab(hex);
  return Math.hypot(a, b);
}
function hue(hex: string): number {
  const [, a, b] = hexToLab(hex);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

function isNeutral(name: string, hex: string | null): boolean {
  if (NEUTRAL_NAMES.test(name.toLowerCase())) return true;
  return hex ? chroma(hex) < 14 : false;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkCompleteness(items: OutfitItem[]): Check {
  const cats = items.map((i) => i.category);
  const hasDress = cats.includes("dress");
  const hasPair = cats.includes("top") && cats.includes("bottom");
  const bottoms = cats.filter((c) => c === "bottom").length;
  if (!hasDress && !hasPair) {
    const missing = cats.includes("top") ? "a bottom" : cats.includes("bottom") ? "a top" : "a top and bottom (or a dress)";
    return { id: "complete", label: "Complete", status: "fail", reason: `Needs ${missing} before it can be checked.`, fix: `Add ${missing}.` };
  }
  if (bottoms > 1) {
    return { id: "complete", label: "Complete", status: "fail", reason: "Two bottoms in one outfit.", fix: "Keep one bottom." };
  }
  if (!cats.includes("shoes")) {
    return { id: "complete", label: "Complete", status: "caution", reason: "No shoes yet.", fix: "Add shoes; they change the whole read." };
  }
  return { id: "complete", label: "Complete", status: "good", reason: hasDress ? "Dress and shoes." : "Top, bottom and shoes." };
}

function checkCounterbalance(items: OutfitItem[]): Check {
  const points = items.reduce((n, i) => n + structurePoints(i), 0);
  const structured = items.filter((i) => structurePoints(i) > 0);
  const soft = items.filter((i) => CLOTHING.has(i.category ?? "") && softPoints(i) > 0);
  const base = { id: "counterbalance", label: "Counterbalance" };

  if (points < 2) return { ...base, status: "ok", reason: "Nothing stiff here, so nothing to counterbalance." };
  if (soft.length === 0) {
    const fix = "Swap one piece for something loose or undone: open the collar, add a knit, or go relaxed on the bottom.";
    if (points >= 4) {
      return { ...base, status: "fail", reason: `Buttoned-up from top to toe (${joinNames(structured)}) with nothing loose or undone to counterbalance it. It reads stiff.`, fix };
    }
    return { ...base, status: "caution", reason: `${joinNames(structured)} is structured and nothing softens it.`, fix };
  }
  return { ...base, status: "good", reason: `${joinNames(structured)} is balanced by ${joinNames(soft)}.` };
}

function checkContrast(items: OutfitItem[]): Check {
  const base = { id: "contrast", label: "Contrast" };
  const notes: string[] = [];
  const fixes: string[] = [];
  const found: Status[] = [];

  const main = items.filter((i) => i.category === "top" || i.category === "bottom");
  const top = main.find((i) => i.category === "top");
  const bottom = main.find((i) => i.category === "bottom");
  if (top && bottom) {
    const fit = (i: OutfitItem): "fitted" | "relaxed" | "unknown" => {
      const f = FITTED_TAGS.some((t) => hasTag(i, t));
      const r = RELAXED_TAGS.some((t) => hasTag(i, t));
      return f && !r ? "fitted" : r && !f ? "relaxed" : "unknown";
    };
    const a = fit(top);
    const b = fit(bottom);
    if (a === "fitted" && b === "fitted") {
      found.push("caution");
      notes.push(`${label(top)} and ${label(bottom)} are both fitted, so the outfit reads as a column.`);
      fixes.push("Pair fitted with relaxed: loosen one of them.");
    } else if (a === "relaxed" && b === "relaxed" && (hasTag(bottom, "high-waisted") || hasTag(top, "cropped") || hasTag(bottom, "belted"))) {
      found.push("good");
      notes.push("Both relaxed, but the defined waist keeps the shape.");
    } else if (a === "relaxed" && b === "relaxed") {
      found.push("caution");
      notes.push(`${label(top)} and ${label(bottom)} are both relaxed, so the shape gets lost.`);
      fixes.push("Pair relaxed with fitted: define the waist or take one in.");
    } else if ((a === "fitted" && b === "relaxed") || (a === "relaxed" && b === "fitted")) {
      found.push("good");
      notes.push("Fitted against relaxed gives it shape.");
    }
  }

  const patterned = items.filter((i) => CLOTHING.has(i.category ?? "") && isPatterned(i));
  if (patterned.length >= 3) {
    found.push("fail");
    notes.push(`Three patterns (${joinNames(patterned)}) compete.`);
    fixes.push("Keep one pattern and make the rest solid.");
  } else if (patterned.length === 2) {
    found.push("caution");
    notes.push(`Two patterns (${joinNames(patterned)}) compete.`);
    fixes.push("Pair patterned with solid: make one of them plain.");
  } else if (patterned.length === 1) {
    found.push("good");
    notes.push(`${label(patterned[0])} is the only pattern, which works.`);
  }

  if (found.length === 0) return { ...base, status: "ok", reason: "No fit or pattern pairing to judge yet." };
  const status = worst(found);
  return { ...base, status, reason: notes.join(" "), fix: fixes.length ? fixes.join(" ") : undefined };
}

function checkPalette(items: OutfitItem[], cp: ScoreColorProfile): Check {
  const base = { id: "palette", label: "Palette harmony" };
  const findings: Status[] = [];
  const notes: string[] = [];
  const fixes: string[] = [];

  for (const i of items) {
    const r = scorePalette(i, cp);
    if (r.status === "fail" || r.status === "caution") {
      const nearFace = NEAR_FACE.has(i.category ?? "");
      // Far from the face a clash is a flag, not a failure.
      const status: Status = nearFace ? r.status : "caution";
      findings.push(status);
      notes.push(`${label(i)}: ${r.reason}`);
      fixes.push(nearFace ? `Swap ${label(i)} for something in your palette.` : `${label(i)} is far from your face, so it matters less.`);
    }
  }

  // Accent colors: neutrals are free, but three competing hues are not.
  const accents = new Set<number>();
  let unresolved = 0;
  for (const i of items) {
    for (const c of i.colors) {
      const hex = resolveColor(c);
      if (!hex) {
        unresolved++;
        continue;
      }
      if (!isNeutral(c.name, hex)) accents.add(Math.floor(hue(hex) / 40));
    }
  }
  if (accents.size >= 3) {
    findings.push("caution");
    notes.push(`${accents.size} different accent colors compete.`);
    fixes.push("Anchor it in neutrals and keep one or two accents.");
  }

  if (findings.length === 0) {
    const tail = unresolved > 0 ? ` (${unresolved} color${unresolved === 1 ? "" : "s"} could not be read)` : "";
    return { ...base, status: items.every((i) => scorePalette(i, cp).status === "unknown") ? "unknown" : "good", reason: `Colors sit together and inside your palette${tail}.` };
  }
  return { ...base, status: worst(findings), reason: notes.join(" "), fix: fixes.join(" ") };
}

function checkPersonal(items: OutfitItem[], style: ScoreStyle): Check {
  const base = { id: "personal", label: "Your rules" };
  const hits: Array<{ item: OutfitItem; status: Status; reason: string }> = [];
  for (const i of items) {
    for (const r of [scoreSilhouette(i, style), scoreFabric(i, style)]) {
      if (r.status === "fail" || r.status === "caution") hits.push({ item: i, status: r.status, reason: r.reason });
    }
  }
  if (hits.length === 0) return { ...base, status: "good", reason: "Nothing here breaks your fabric or shape rules." };
  return {
    ...base,
    status: worst(hits.map((h) => h.status)),
    reason: hits.map((h) => `${label(h.item)}: ${h.reason}`).join(" "),
    fix: `Swap ${Array.from(new Set(hits.map((h) => label(h.item)))).join(" and ")}.`,
  };
}

function checkLevel(items: OutfitItem[]): Check {
  const base = { id: "level", label: "Formality and warmth" };
  const core = items.filter((i) => ["top", "bottom", "dress", "outerwear", "shoes"].includes(i.category ?? ""));
  const notes: string[] = [];
  const fixes: string[] = [];
  let status: Status = "good";

  const formal = core.filter((i) => i.formality != null);
  if (formal.length >= 2) {
    const hi = formal.reduce((a, b) => (b.formality! > a.formality! ? b : a));
    const lo = formal.reduce((a, b) => (b.formality! < a.formality! ? b : a));
    if (hi.formality! - lo.formality! >= 2) {
      status = "caution";
      notes.push(`${label(hi)} is dressed up while ${label(lo)} is dressed down.`);
      fixes.push("Move the two closer in formality.");
    }
  }
  const base_layers = core.filter((i) => i.category !== "outerwear" && i.warmth != null);
  if (base_layers.length >= 2) {
    const hi = base_layers.reduce((a, b) => (b.warmth! > a.warmth! ? b : a));
    const lo = base_layers.reduce((a, b) => (b.warmth! < a.warmth! ? b : a));
    if (hi.warmth! - lo.warmth! >= 3) {
      status = "caution";
      notes.push(`${label(hi)} is for cold weather and ${label(lo)} is for heat.`);
      fixes.push("Pick pieces for the same kind of day.");
    }
  }
  if (notes.length === 0) {
    return { ...base, status: formal.length < 2 && base_layers.length < 2 ? "unknown" : "good", reason: formal.length < 2 && base_layers.length < 2 ? "Not enough formality or warmth tags to judge." : "Pieces suit the same occasion and weather." };
  }
  return { ...base, status, reason: notes.join(" "), fix: fixes.join(" ") };
}

function checkVerdicts(items: OutfitItem[]): Check | null {
  const cut = items.filter((i) => i.verdict === "cut");
  if (cut.length === 0) return null;
  return {
    id: "verdicts",
    label: "Scorecards",
    status: "caution",
    reason: `${joinNames(cut)} ${cut.length === 1 ? "was" : "were"} marked cut in review.`,
    fix: "Wear something you scored keep.",
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function checkOutfit(items: OutfitItem[], cp: ScoreColorProfile, style: ScoreStyle): Composition {
  const complete = checkCompleteness(items);
  if (complete.status === "fail") {
    return { overall: "incomplete", headline: complete.reason, checks: [complete] };
  }

  const checks: Check[] = [
    complete,
    checkCounterbalance(items),
    checkContrast(items),
    checkPalette(items, cp),
    checkPersonal(items, style),
    checkLevel(items),
  ];
  const verdicts = checkVerdicts(items);
  if (verdicts) checks.push(verdicts);

  const failing = checks.filter((c) => c.status === "fail");
  const cautions = checks.filter((c) => c.status === "caution");

  if (failing.length > 0) {
    return { overall: "rework", headline: `Rework: ${failing[0].label.toLowerCase()}. ${failing[0].reason}`, checks };
  }
  if (cautions.length > 0) {
    return { overall: "workable", headline: `Workable: ${cautions[0].label.toLowerCase()}. ${cautions[0].reason}`, checks };
  }
  return { overall: "strong", headline: "Strong: balanced, in palette and nothing breaks your rules.", checks };
}
