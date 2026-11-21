// Second opinion votes. Pure.

export type VoteVerdict = "works" | "almost" | "not";
export const VOTE_VERDICTS: VoteVerdict[] = ["works", "almost", "not"];

export type Tally = { works: number; almost: number; not: number; total: number; leading: VoteVerdict | null; summary: string };

export function tally(votes: Array<{ verdict: string }>): Tally {
  const t = { works: 0, almost: 0, not: 0 };
  for (const v of votes) if (v.verdict === "works" || v.verdict === "almost" || v.verdict === "not") t[v.verdict]++;
  const total = t.works + t.almost + t.not;
  if (!total) return { ...t, total, leading: null, summary: "No votes yet" };
  const ranked = VOTE_VERDICTS.map((k) => [k, t[k]] as const).sort((a, b) => b[1] - a[1]);
  const tie = ranked[0][1] === ranked[1][1];
  const leading = tie ? null : ranked[0][0];
  const word = { works: "works on you", almost: "almost", not: "not for you" };
  let summary: string;
  if (total === 1) summary = `1 vote: ${word[ranked[0][0]]}`;
  else if (leading && t[leading] === total) summary = `Everyone says ${word[leading]}`;
  else if (leading) summary = `Mostly ${word[leading]} (${t[leading]} of ${total})`;
  else summary = `Split decision (${total} votes)`;
  return { ...t, total, leading, summary };
}

/** First name for public pages: never the email. */
export function firstName(name: string | null | undefined): string {
  const n = (name ?? "").trim().split(/\s+/)[0];
  return n && !n.includes("@") ? n.slice(0, 30) : "your friend";
}
