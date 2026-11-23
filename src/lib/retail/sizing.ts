// Pure: what customer reviews say about sizing. Plain Node can test it.

export type Sizing = "size_up" | "size_down" | "true_to_size" | "mixed" | "unknown";

const SMALL = /\bruns? (?:a (?:bit|little|tad) |very |really )?(?:small|tight|narrow|short)\b|\bsiz(?:e|ed|ing) up\b|\b(?:order|ordered|go|went|get|got|buy|bought) (?:a |one |1 |a full |half a )?size (?:up|larger|bigger)\b|\bfits? (?:a (?:bit|little) )?small\b|\btoo (?:small|tight|snug)\b|\bsmaller than expected\b/gi;
const LARGE = /\bruns? (?:a (?:bit|little|tad) |very |really )?(?:large|big|wide|long|loose)\b|\bsiz(?:e|ed|ing) down\b|\b(?:order|ordered|go|went|get|got|buy|bought) (?:a |one |1 |a full |half a )?size (?:down|smaller)\b|\bfits? (?:a (?:bit|little) )?(?:large|big)\b|\btoo (?:big|large|loose|baggy)\b|\b(?:larger|bigger) than expected\b/gi;
const TRUE = /\btrue to size\b|\btts\b|\bfits? (?:perfectly|as expected|great|like a glove)\b|\bperfect fit\b|\bmy (?:usual|normal|regular) size\b/gi;

const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

/** Tally sizing remarks across reviews. A call needs at least two remarks and 60% agreement. */
export function sizingSignal(texts: string[]): { sizing: Sizing; small: number; large: number; trueToSize: number } {
  let small = 0;
  let large = 0;
  let trueToSize = 0;
  for (const t of texts) {
    small += count(t, SMALL);
    large += count(t, LARGE);
    trueToSize += count(t, TRUE);
  }
  const total = small + large + trueToSize;
  const pick = (n: number) => n >= 2 && n / total >= 0.6;
  const sizing: Sizing = total < 2 ? "unknown" : pick(small) ? "size_up" : pick(large) ? "size_down" : pick(trueToSize) ? "true_to_size" : "mixed";
  return { sizing, small, large, trueToSize };
}

export const SIZING_LABEL: Record<Sizing, string | null> = {
  size_up: "Size up",
  size_down: "Size down",
  true_to_size: "True to size",
  mixed: "Sizing is mixed",
  unknown: null,
};
