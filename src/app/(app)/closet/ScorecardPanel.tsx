"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markBenchmark, recordAgreement } from "./scorecard-actions";

type Status = "good" | "ok" | "caution" | "fail" | "unknown";
type Criterion = { status: Status; reason: string };

export type ScorecardRow = {
  id: string;
  item_id: string;
  verdict: "keep" | "cut" | "provisional";
  headline: string | null;
  scores: Partial<Record<"palette" | "fabric" | "silhouette" | "vibe", Criterion>>;
  tailoring_needed: boolean;
  tailoring_note: string | null;
  created_at: string;
};

type Props = {
  itemId: string;
  hasImage: boolean;
  initial: ScorecardRow | null;
  initialAnswer: "agree" | "disagree" | null;
  autoRun?: boolean;
  /** When set, answering moves on to this page (the review queue). */
  nextHref?: string;
};

const ROWS: Array<["palette" | "fabric" | "silhouette" | "vibe", string]> = [
  ["palette", "Palette"],
  ["fabric", "Fabric"],
  ["silhouette", "Silhouette"],
  ["vibe", "Vibe"],
];

const DOT: Record<Status, string> = {
  good: "bg-emerald-600",
  ok: "bg-stone-400",
  caution: "bg-amber-500",
  fail: "bg-red-600",
  unknown: "bg-stone-300",
};

const VERDICT: Record<ScorecardRow["verdict"], { label: string; cls: string }> = {
  keep: { label: "✓ works on you", cls: "bg-emerald-700 text-white" },
  cut: { label: "✕ not for you", cls: "bg-red-700 text-white" },
  provisional: { label: "◐ almost", cls: "bg-amber-500 text-stone-900" },
};

const ERRORS: Record<string, string> = {
  scoring_unavailable: "Scoring is off until an Anthropic API key is added to the project.",
  rate_limited: "The reviewer is busy. Try again in a minute.",
  could_not_score: "Could not read this photo. Retake it and try again.",
  image_not_found: "The photo is missing. Re-upload it from the edit form.",
};

export default function ScorecardPanel({ itemId, hasImage, initial, initialAnswer, autoRun, nextHref }: Props) {
  const router = useRouter();
  const [card, setCard] = useState<ScorecardRow | null>(initial);
  const [answer, setAnswer] = useState<"agree" | "disagree" | null>(initialAnswer);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disagreeOpen, setDisagreeOpen] = useState(false);
  const [note, setNote] = useState("");
  const [benchOpen, setBenchOpen] = useState<"positive" | "negative" | null>(null);
  const [benchWhy, setBenchWhy] = useState("");
  const [benchSaved, setBenchSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    setAnswer(null);
    setDisagreeOpen(false);
    try {
      const res = await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const body = (await res.json().catch(() => ({}))) as { scorecard?: ScorecardRow; error?: string };
      if (res.ok && body.scorecard) setCard(body.scorecard);
      else setError(ERRORS[body.error ?? ""] ?? "The review failed. Try again.");
    } catch {
      setError("The review failed. Check your connection and try again.");
    }
    setRunning(false);
  };

  useEffect(() => {
    if (autoRun && !card && !started.current) {
      started.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answerNow = (agree: boolean, text?: string) => {
    if (!card) return;
    setError(null);
    startTransition(async () => {
      const r = await recordAgreement(card.id, itemId, agree, text);
      if (r.error) {
        setError(r.error);
        return;
      }
      setAnswer(agree ? "agree" : "disagree");
      setDisagreeOpen(false);
      if (nextHref) router.push(nextHref);
    });
  };

  const saveBenchmark = () => {
    if (!benchOpen) return;
    const polarity = benchOpen;
    startTransition(async () => {
      const r = await markBenchmark(itemId, polarity, benchWhy);
      if (r.error) {
        setError(r.error);
        return;
      }
      setBenchSaved(polarity === "positive" ? "Saved as a proven look." : "Saved as a known failure.");
      setBenchOpen(null);
      setBenchWhy("");
    });
  };

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-500">Scorecard</h2>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="text-sm text-stone-600 underline-offset-2 hover:underline disabled:opacity-60"
        >
          {running ? "Reviewing…" : card ? "Re-run" : "Review this piece"}
        </button>
      </div>

      {!card && !running && (
        <p className="mt-2 text-sm text-stone-600">
          {hasImage
            ? "Four checks against your palette, fabrics, shapes and vibe, then a keep or cut."
            : "No photo yet, so a verdict would only be provisional. Add a photo first for a real review."}
        </p>
      )}
      {running && <p className="mt-2 text-sm text-stone-500">Looking at the photo and your profile. Ten seconds or so.</p>}

      {card && !running && (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-3">
            <span className={"shrink-0 rounded-full px-3 py-1 text-sm font-medium " + VERDICT[card.verdict].cls}>
              {VERDICT[card.verdict].label}
            </span>
            <p className="text-sm text-stone-700">{card.headline}</p>
          </div>

          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-100">
            {ROWS.map(([key, label]) => {
              const c = card.scores[key];
              return (
                <li key={key} className="flex gap-3 px-3 py-2 text-sm">
                  <span className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " + DOT[c?.status ?? "unknown"]} />
                  <span className="w-20 shrink-0 text-stone-500">{label}</span>
                  <span className="text-stone-800">{c?.reason ?? "Not checked."}</span>
                </li>
              );
            })}
            {card.tailoring_needed && (
              <li className="flex gap-3 px-3 py-2 text-sm">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <span className="w-20 shrink-0 text-stone-500">Tailoring</span>
                <span className="text-stone-800">{card.tailoring_note ?? "Needs tailoring."}</span>
              </li>
            )}
          </ul>

          {card.verdict !== "provisional" && (
            <div>
              <p className="text-sm text-stone-500">
                {answer ? (answer === "agree" ? "You agreed with this verdict." : "You disagreed. That is logged.") : "Do you agree?"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => answerNow(true)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm " +
                    (answer === "agree" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500")
                  }
                >
                  Agree
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDisagreeOpen((v) => !v)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm " +
                    (answer === "disagree" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500")
                  }
                >
                  Disagree
                </button>
              </div>
              {disagreeOpen && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="What did it get wrong? (optional, but this is what teaches it)"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => answerNow(false, note)}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Log disagreement
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {hasImage && !nextHref && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <p className="text-sm text-stone-500">Teach it with this piece</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setBenchOpen("positive")} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:border-stone-500">
              Proven look
            </button>
            <button type="button" onClick={() => setBenchOpen("negative")} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:border-stone-500">
              Known failure
            </button>
          </div>
          {benchOpen && (
            <div className="mt-2 space-y-2">
              <textarea
                value={benchWhy}
                onChange={(e) => setBenchWhy(e.target.value)}
                rows={2}
                placeholder={benchOpen === "positive" ? "Why does this work for you?" : "Why did this fail? (for example: passed every rule but felt wrong)"}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={pending}
                onClick={saveBenchmark}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                Save
              </button>
            </div>
          )}
          {benchSaved && <p className="mt-2 text-sm text-emerald-700">{benchSaved}</p>}
        </div>
      )}
    </section>
  );
}
