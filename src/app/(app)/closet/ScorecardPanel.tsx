"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markBenchmark, recordAgreement } from "./scorecard-actions";
import { Button, Card, Chip, ChipButton, ChipGroup, CheckTick, Field, Notice, SectionTitle, Textarea, type ChipTone } from "@/components/ui";

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

const STATUS_WORD: Record<Status, string> = {
  good: "good",
  ok: "okay",
  caution: "caution",
  fail: "fails",
  unknown: "not checked",
};

const VERDICT: Record<ScorecardRow["verdict"], { label: string; tone: ChipTone }> = {
  keep: { label: "✓ works on you", tone: "works" },
  cut: { label: "✕ not for you", tone: "not" },
  provisional: { label: "◐ almost", tone: "almost" },
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
  // True once a verdict lands from a run in this visit, so the check tick draws once.
  const [justScored, setJustScored] = useState(false);
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
      if (res.ok && body.scorecard) {
        setCard(body.scorecard);
        setJustScored(true);
      }
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
    <Card as="section" aria-label="Scorecard" className="space-y-3">
      <SectionTitle
        action={
          <Button type="button" variant={card ? "quiet" : "secondary"} size="sm" onClick={run} disabled={running} aria-busy={running || undefined}>
            {running ? "Reviewing…" : card ? "Re-run" : "Review this piece"}
          </Button>
        }
      >
        Scorecard
      </SectionTitle>

      {!card && !running && (
        <p className="text-sm text-stone-600">
          {hasImage
            ? "Four checks against your palette, fabrics, shapes and vibe, then a keep or cut."
            : "No photo yet, so a verdict would only be provisional. Add a photo first for a real review."}
        </p>
      )}
      {running && (
        <p role="status" aria-live="polite" className="text-sm text-stone-500">
          Looking at the photo and your profile. Ten seconds or so.
        </p>
      )}

      {card && !running && (
        <div className="space-y-3">
          <div role="status" aria-live="polite" className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <Chip tone={VERDICT[card.verdict].tone} size="md" className="shrink-0">
              {justScored && card.verdict === "keep" ? (
                <>
                  <CheckTick className="text-emerald-900" />
                  works on you
                </>
              ) : (
                VERDICT[card.verdict].label
              )}
            </Chip>
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-stone-700">{card.headline}</p>
          </div>

          <ul className="divide-y divide-line">
            {ROWS.map(([key, label]) => {
              const c = card.scores[key];
              const st = c?.status ?? "unknown";
              return (
                <li key={key} className="flex gap-3 py-2.5 text-sm">
                  <span aria-hidden="true" className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full " + DOT[st]} />
                  <span className="w-20 shrink-0 text-stone-500">
                    {label}
                    <span className="sr-only">: {STATUS_WORD[st]}.</span>
                  </span>
                  <span className="text-stone-800">{c?.reason ?? "Not checked."}</span>
                </li>
              );
            })}
            {card.tailoring_needed && (
              <li className="flex gap-3 py-2.5 text-sm">
                <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <span className="w-20 shrink-0 text-stone-500">Tailoring</span>
                <span className="text-stone-800">{card.tailoring_note ?? "Needs tailoring."}</span>
              </li>
            )}
          </ul>

          {card.verdict !== "provisional" && (
            <div className="space-y-2 border-t border-line pt-3">
              <p role="status" aria-live="polite" className="text-sm text-stone-500">
                {answer ? (answer === "agree" ? "You agreed with this verdict." : "You disagreed. That is logged.") : "Do you agree?"}
              </p>
              <ChipGroup label="Do you agree with this verdict?">
                <ChipButton selected={answer === "agree"} disabled={pending} onClick={() => answerNow(true)}>
                  Agree
                </ChipButton>
                <ChipButton selected={answer === "disagree"} disabled={pending} aria-expanded={disagreeOpen} onClick={() => setDisagreeOpen((v) => !v)}>
                  Disagree
                </ChipButton>
              </ChipGroup>
              {disagreeOpen && (
                <div className="space-y-2">
                  <Field label="What did it get wrong?" hint="Optional, but this is what teaches it.">
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What did it get wrong? (optional, but this is what teaches it)" />
                  </Field>
                  <Button type="button" size="sm" disabled={pending} onClick={() => answerNow(false, note)}>
                    Log disagreement
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {hasImage && !nextHref && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm text-stone-500">Teach it with this piece</p>
          <ChipGroup label="Teach it with this piece">
            <ChipButton selected={benchOpen === "positive"} onClick={() => setBenchOpen("positive")}>
              Proven look
            </ChipButton>
            <ChipButton selected={benchOpen === "negative"} onClick={() => setBenchOpen("negative")}>
              Known failure
            </ChipButton>
          </ChipGroup>
          {benchOpen && (
            <div className="space-y-2">
              <Field label={benchOpen === "positive" ? "Why does this work for you?" : "Why did this fail?"}>
                <Textarea
                  value={benchWhy}
                  onChange={(e) => setBenchWhy(e.target.value)}
                  rows={2}
                  placeholder={benchOpen === "positive" ? "Why does this work for you?" : "Why did this fail? (for example: passed every rule but felt wrong)"}
                />
              </Field>
              <Button type="button" size="sm" disabled={pending} onClick={saveBenchmark}>
                Save
              </Button>
            </div>
          )}
          {benchSaved && (
            <p role="status" aria-live="polite" className="text-sm text-stone-700">
              <span aria-hidden="true">✓ </span>
              {benchSaved}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
