// Brand verdict names (Second Look). The stored values stay keep / provisional / cut.
export type Verdict = "keep" | "provisional" | "cut";

export const VERDICT_LABEL: Record<Verdict, string> = {
  keep: "✓ works on you",
  provisional: "◐ almost",
  cut: "✕ not for you",
};

/** Short form for small badges on photo cards. */
export const VERDICT_SHORT: Record<Verdict, string> = {
  keep: "✓ works",
  provisional: "◐ almost",
  cut: "✕ not",
};

export const VERDICT_CLASS: Record<Verdict, string> = {
  keep: "bg-emerald-700 text-on-accent",
  provisional: "bg-amber-500 text-ink",
  cut: "bg-red-700 text-on-accent",
};

export const verdictLabel = (v: string | null | undefined, short = false): string =>
  v && v in VERDICT_LABEL ? (short ? VERDICT_SHORT : VERDICT_LABEL)[v as Verdict] : "";
export const verdictClass = (v: string | null | undefined): string => (v && v in VERDICT_CLASS ? VERDICT_CLASS[v as Verdict] : "");
