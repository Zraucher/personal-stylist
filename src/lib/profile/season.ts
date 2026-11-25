// Color season from skin, hair and eyes: the 12-season method, as a quick quiz instead of a draping session.
// Pure, no imports, erasable TypeScript only, so plain Node can test it. Every color name is in the scorecard lexicon.

export type Skin = "fair" | "light" | "medium" | "tan" | "deep";
export type Undertone = "cool" | "warm" | "neutral" | "unsure";
export type Hair = "platinum" | "ash-blonde" | "golden-blonde" | "strawberry" | "red" | "light-brown" | "medium-brown" | "dark-brown" | "black" | "grey";
export type Eyes = "blue" | "grey" | "green" | "hazel" | "light-brown" | "dark-brown";
export type Features = { skin: Skin; undertone: Undertone; hair: Hair; eyes: Eyes };

export const SKINS: Array<{ id: Skin; label: string }> = [
  { id: "fair", label: "Fair, burns easily" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "tan", label: "Tan or olive" },
  { id: "deep", label: "Deep" },
];
export const UNDERTONES: Array<{ id: Undertone; label: string }> = [
  { id: "unsure", label: "Not sure" },
  { id: "cool", label: "Cool: veins look blue, silver suits me" },
  { id: "warm", label: "Warm: veins look green, gold suits me" },
  { id: "neutral", label: "Neutral: a bit of both" },
];
export const HAIRS: Array<{ id: Hair; label: string }> = [
  { id: "platinum", label: "Platinum or white blonde" },
  { id: "ash-blonde", label: "Ash blonde" },
  { id: "golden-blonde", label: "Golden blonde" },
  { id: "strawberry", label: "Strawberry blonde" },
  { id: "red", label: "Red or auburn" },
  { id: "light-brown", label: "Light brown" },
  { id: "medium-brown", label: "Medium brown" },
  { id: "dark-brown", label: "Dark brown" },
  { id: "black", label: "Black" },
  { id: "grey", label: "Grey or silver" },
];
export const EYES: Array<{ id: Eyes; label: string }> = [
  { id: "blue", label: "Blue" },
  { id: "grey", label: "Grey" },
  { id: "green", label: "Green" },
  { id: "hazel", label: "Hazel" },
  { id: "light-brown", label: "Light brown or amber" },
  { id: "dark-brown", label: "Dark brown or black" },
];

const SKIN_DEPTH: Record<Skin, number> = { fair: 0, light: 1, medium: 2, tan: 3, deep: 4 };
const HAIR_DEPTH: Record<Hair, number> = { platinum: 0, "ash-blonde": 1, "golden-blonde": 1, strawberry: 1, grey: 1, red: 2, "light-brown": 2, "medium-brown": 3, "dark-brown": 4, black: 5 };
const HAIR_TEMP: Record<Hair, number> = { platinum: -1, "ash-blonde": -1, grey: -1, black: -1, "golden-blonde": 1, strawberry: 1, red: 1, "light-brown": 0, "medium-brown": 0, "dark-brown": 0 };
const EYE_TEMP: Record<Eyes, number> = { blue: -1, grey: -1, green: 1, hazel: 1, "light-brown": 1, "dark-brown": 0 };

export type Season = { label: string; undertone: string; depth: string; contrast: string; best: string[]; avoid: string[] };

const PALETTES: Record<string, { best: string[]; avoid: string[] }> = {
  "Light Spring": { best: ["peach", "blush", "mint", "sky blue", "soft gold", "ivory", "warm sand", "lemon"], avoid: ["black", "charcoal", "burgundy", "plum"] },
  "Warm Spring": { best: ["peach", "orange", "soft gold", "camel", "warm sand", "green", "teal", "ivory"], avoid: ["black", "grey", "lavender", "burgundy"] },
  "Bright Spring": { best: ["orange", "red", "teal", "green", "yellow", "sky blue", "pink", "ivory"], avoid: ["dusty rose", "mauve", "taupe", "greige"] },
  "Light Summer": { best: ["light blue", "lavender", "blush", "mint", "dusty rose", "sky blue", "heather grey", "white"], avoid: ["black", "orange", "mustard", "rust"] },
  "Cool Summer": { best: ["blue", "mid blue", "slate", "dusty rose", "lavender", "navy", "mauve", "heather grey"], avoid: ["orange", "camel", "mustard", "rust"] },
  "Soft Summer": { best: ["mauve", "dusty rose", "slate", "sage", "heather grey", "muted teal", "greige", "lavender"], avoid: ["black", "orange", "chartreuse", "lemon"] },
  "Soft Autumn": { best: ["sage", "olive", "warm taupe", "camel", "dusty peach", "muted teal", "muted rust", "soft ivory"], avoid: ["black", "white", "purple", "chartreuse"] },
  "Warm Autumn": { best: ["rust", "terracotta", "mustard", "olive", "camel", "cognac", "moss", "cream"], avoid: ["black", "lavender", "pink", "light blue"] },
  "Deep Autumn": { best: ["chocolate", "rust", "burnt orange", "forest green", "olive", "ochre", "burgundy", "cream"], avoid: ["blush", "lavender", "light blue", "mint"] },
  "Deep Winter": { best: ["black", "white", "navy", "burgundy", "forest green", "plum", "red", "charcoal"], avoid: ["camel", "mustard", "peach", "beige"] },
  "Cool Winter": { best: ["navy", "white", "black", "blue", "purple", "pink", "charcoal", "teal"], avoid: ["orange", "camel", "mustard", "rust"] },
  "Bright Winter": { best: ["black", "white", "red", "purple", "pink", "blue", "teal", "lemon"], avoid: ["dusty rose", "mauve", "camel", "taupe"] },
};
export const SEASON_NAMES = Object.keys(PALETTES);

export function colorSeason(f: Features): Season {
  // Warm, cool or neutral: what they said; if unsure, what hair and eyes lean to. Neutral goes to the soft seasons.
  const lean = HAIR_TEMP[f.hair] + EYE_TEMP[f.eyes];
  const temp = f.undertone !== "unsure" ? f.undertone : lean > 0 ? "warm" : lean < 0 ? "cool" : "neutral";
  const value = SKIN_DEPTH[f.skin] + HAIR_DEPTH[f.hair]; // 0..9
  const depth = value <= 3 ? "light" : value >= 7 ? "deep" : "medium";
  // Contrast: how far hair sits from skin; light eyes against dark hair add a step.
  const gap = Math.abs(HAIR_DEPTH[f.hair] - SKIN_DEPTH[f.skin]) + (HAIR_DEPTH[f.hair] >= 4 && EYE_TEMP[f.eyes] <= 0 && f.eyes !== "dark-brown" ? 1 : 0);
  const contrast = gap >= 4 ? "high" : gap <= 1 ? "low" : "medium";

  let label: string;
  if (temp === "neutral") label = contrast === "high" ? (depth === "light" ? "Bright Spring" : "Bright Winter") : depth === "deep" ? (lean >= 0 ? "Deep Autumn" : "Deep Winter") : lean >= 0 ? "Soft Autumn" : "Soft Summer";
  else if (temp === "warm") {
    if (depth === "deep") label = "Deep Autumn";
    else if (contrast === "high") label = "Bright Spring";
    else if (depth === "light") label = "Light Spring";
    // Red hair is itself a strong warm color, so it reads warm rather than soft.
    else if (contrast === "low") label = f.hair === "red" ? "Warm Autumn" : "Soft Autumn";
    else label = HAIR_TEMP[f.hair] > 0 && f.hair !== "red" ? "Warm Spring" : "Warm Autumn";
  } else {
    if (depth === "deep") label = "Deep Winter";
    else if (contrast === "high") label = "Bright Winter";
    else if (depth === "light") label = "Light Summer";
    else if (contrast === "low") label = "Soft Summer";
    else label = HAIR_DEPTH[f.hair] >= 4 ? "Cool Winter" : "Cool Summer";
  }
  const p = PALETTES[label];
  return { label, undertone: temp, depth, contrast, best: [...p.best], avoid: [...p.avoid] };
}
