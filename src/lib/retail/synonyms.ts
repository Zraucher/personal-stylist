// Color synonyms for search. Retailers name colors loosely, so a search for "rust"
// also tries "terracotta" and "ochre". Families are keyed by a word that appears
// in the person's palette entry.

const FAMILIES: Array<[RegExp, string[]]> = [
  [/rust|terracotta|ochre|copper|burnt/, ["rust", "terracotta", "ochre", "cognac"]],
  [/olive|sage|moss|army|khaki green/, ["olive", "sage", "moss", "army green"]],
  [/camel|tan|sand|taupe|greige|beige/, ["camel", "tan", "sand", "taupe"]],
  [/brown|chocolate|cognac|espresso|saddle/, ["brown", "cognac", "saddle", "chocolate"]],
  [/navy|midnight|indigo|eclipse/, ["navy", "midnight", "indigo"]],
  [/black|onyx|jet/, ["black", "onyx"]],
  [/white|ivory|cream|bone|ecru/, ["white", "ivory", "cream", "ecru"]],
  [/grey|gray|charcoal|slate|heather/, ["charcoal", "grey", "slate", "heather grey"]],
  [/teal|petrol|spruce/, ["teal", "petrol", "spruce"]],
  [/blue|chambray|denim/, ["blue", "chambray", "denim blue"]],
  [/gold|mustard|honey/, ["gold", "mustard", "honey"]],
  [/burgundy|wine|plum|oxblood/, ["burgundy", "wine", "oxblood", "plum"]],
  [/peach|apricot|coral/, ["peach", "apricot", "soft coral"]],
  [/green|forest|emerald/, ["forest green", "hunter green"]],
];

/** Synonyms for one palette entry, the entry itself first. */
export function synonymsFor(color: string): string[] {
  const c = color.toLowerCase();
  const fam = FAMILIES.find(([re]) => re.test(c));
  const clean = c.replace(/\(.*?\)/g, "").trim();
  return [...new Set([clean, ...(fam ? fam[1] : [])])];
}

/** The color family, judged by the last word first: "midnight black" is black, not navy. */
function familyOf(color: string): number {
  const clean = color.toLowerCase().replace(/\(.*?\)/g, "").trim();
  const last = clean.split(/\s+/).pop() ?? "";
  const byLast = FAMILIES.findIndex(([re]) => re.test(last));
  return byLast >= 0 ? byLast : FAMILIES.findIndex(([re]) => re.test(clean));
}

/**
 * A few distinct search color words drawn from a palette (or an explicit color list): one per
 * color family first ("black" and "onyx" are one search), then synonyms if there is room.
 */
export function searchColors(colors: string[], max = 3): string[] {
  const out: string[] = [];
  const families = new Set<number>();
  for (const c of colors) {
    const fam = familyOf(c);
    if (fam >= 0 && families.has(fam)) continue;
    if (fam >= 0) families.add(fam);
    const word = synonymsFor(c)[0];
    if (word && !out.includes(word)) out.push(word);
    if (out.length >= max) return out;
  }
  for (const c of colors) {
    for (const s of synonymsFor(c)) {
      if (out.length >= max) return out;
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}
