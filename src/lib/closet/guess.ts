// Pure: a closet category from a store's product name, for when the photo can't be tagged. Plain Node can test it.
import { SUBCATEGORIES, type Category } from "./taxonomy.ts";

// Store words the subcategory list doesn't use. Checked after the list itself.
const EXTRA: Array<[RegExp, Category, string | null]> = [
  [/\b(?:sneaker|trainer|runner)s?\b/, "shoes", "sneakers"],
  [/\b(?:boot|bootie)s?\b/, "shoes", "boots"],
  [/\b(?:loafer|mule|pump|oxford|derby|clog|shoe)s?\b/, "shoes", null],
  [/\b(?:pant|slack|jean|short)s?\b|\bdenim\b(?! jacket)/, "bottom", null],
  [/\b(?:parka|anorak|windbreaker|overcoat|peacoat|shacket)s?\b/, "outerwear", null],
  [/\b(?:dress|gown)\b/, "dress", null],
  [/\b(?:shirt|top|tee|t-shirt|knit|pullover|crewneck|jumper)s?\b/, "top", null],
  [/\b(?:bag|purse|handbag)s?\b/, "bag", null],
  [/\b(?:earring|necklace|bracelet|ring|pendant)s?\b/, "jewelry", null],
];

// Longest terms first, so "denim jacket" wins over "jacket" and "dress shirt" over "dress".
const TERMS = (Object.entries(SUBCATEGORIES) as Array<[Category, string[]]>)
  .flatMap(([category, subs]) => subs.map((sub) => ({ category, sub })))
  .sort((a, b) => b.sub.length - a.sub.length);

const word = (s: string) => new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}s?\\b`);

/** Best guess, or null when nothing in the name says what it is. */
export function guessCategory(name: string | null | undefined): { category: Category; subcategory: string | null } | null {
  const n = (name ?? "").toLowerCase();
  if (!n) return null;
  const hit = TERMS.find((t) => word(t.sub).test(n));
  if (hit) return { category: hit.category, subcategory: hit.sub };
  const extra = EXTRA.find(([re]) => re.test(n));
  return extra ? { category: extra[1], subcategory: extra[2] } : null;
}
