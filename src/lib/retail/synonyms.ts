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

/** A few distinct search color words drawn from a palette (or an explicit color list). */
export function searchColors(colors: string[], max = 3): string[] {
  const out: string[] = [];
  for (const c of colors) {
    for (const s of synonymsFor(c)) {
      if (!out.includes(s)) out.push(s);
      if (out.length >= max) return out;
    }
  }
  return out;
}
