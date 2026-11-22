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
  cut: "✕ no",
};

export const VERDICT_CLASS: Record<Verdict, string> = {
  keep: "bg-emerald-700 text-on-accent",
  provisional: "bg-amber-500 text-ink",
  cut: "bg-red-700 text-on-accent",
};

/**
 * One way to mark a rule check everywhere (scorecard, outfit composition, haul review):
 * a glyph plus a word, never colour alone.
 */
export type CheckStatus = "good" | "ok" | "caution" | "fail" | "unknown";
export const CHECK_MARK: Record<CheckStatus, { glyph: string; word: string; className: string }> = {
  good: { glyph: "✓", word: "good", className: "text-emerald-700" },
  ok: { glyph: "○", word: "okay", className: "text-stone-500" },
  caution: { glyph: "◐", word: "watch", className: "text-amber-700" },
  fail: { glyph: "✕", word: "no", className: "text-red-700" },
  unknown: { glyph: "–", word: "not checked", className: "text-stone-500" },
};

/**
 * Headlines saved before the copy pass start with an old verdict word ("Strong:", "Keep:").
 * Strip it and capitalize what's left, so stored and new headlines read the same.
 */
export const cleanHeadline = (h: string | null | undefined): string => {
  const s = (h ?? "").replace(/^(strong|workable|rework|keep|cut|provisional):\s*/i, "");
  return s ? s[0].toUpperCase() + s.slice(1) : s;
};

export const verdictLabel = (v: string | null | undefined, short = false): string =>
  v && v in VERDICT_LABEL ? (short ? VERDICT_SHORT : VERDICT_LABEL)[v as Verdict] : "";
export const verdictClass = (v: string | null | undefined): string => (v && v in VERDICT_CLASS ? VERDICT_CLASS[v as Verdict] : "");
