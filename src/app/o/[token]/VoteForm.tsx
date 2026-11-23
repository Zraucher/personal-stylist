"use client";

import { useEffect, useState, useTransition } from "react";
import { castVote } from "./actions";
import type { Tally } from "@/lib/opinions/tally";
import { Button, ButtonLink, Card, CheckTick, EmptyState, Field, Input, Notice, Textarea, VoteBar } from "@/components/ui";

type Verdict = "works" | "almost" | "not";

const NAME_KEY = "valette-voter-name";

function saveName(name: string) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name);
  } catch {
    /* storage blocked */
  }
}

/**
 * One-tap voting: a verdict tap casts the vote right away. The note (comment + name) is an optional
 * follow-up that re-sends the same verdict; castVote upserts per browser, so it updates the vote.
 */
export default function VoteForm({ token, owner, closed, initialTally, defaultName }: { token: string; owner: string | null; closed: boolean; initialTally: Tally; defaultName: string | null }) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<Tally | null>(null);
  const [noteSent, setNoteSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [notePending, startNote] = useTransition();

  useEffect(() => {
    if (defaultName) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(NAME_KEY);
    } catch {
      /* storage blocked */
    }
    if (saved) Promise.resolve(saved).then(setName);
  }, [defaultName]);

  // With no first name on file, speak about "they" instead of printing a placeholder as a name.
  const who = owner ?? "them";
  const OPTIONS: Array<{ v: Verdict; glyph: string; word: string; tint: string }> = [
    { v: "works", glyph: "✓", word: `works on ${who}`, tint: "text-emerald-700" },
    { v: "almost", glyph: "◐", word: "almost", tint: "text-amber-700" },
    { v: "not", glyph: "✕", word: `not for ${who}`, tint: "text-red-700" },
  ];

  // aria-disabled (not disabled) while sending, so the tapped button keeps keyboard focus.
  const vote = (v: Verdict) => {
    const previous = verdict;
    setVerdict(v);
    setNoteSent(false);
    start(async () => {
      setError(null);
      const r = await castVote({ token, verdict: v, name: name.trim() || undefined, comment: comment.trim() || undefined });
      if (!r.ok) {
        setVerdict(previous);
        return setError(r.error);
      }
      setResult(r.tally);
    });
  };

  const sendNote = () => {
    if (!verdict) return;
    startNote(async () => {
      setError(null);
      saveName(name.trim());
      const r = await castVote({ token, verdict, name: name.trim() || undefined, comment: comment.trim() || undefined });
      if (!r.ok) return setError(r.error);
      setResult(r.tally);
      setNoteSent(true);
    });
  };

  if (closed) {
    return (
      <EmptyState
        compact
        title="voting's closed"
        body={
          <>
            <span className="font-semibold">voting&apos;s closed.</span> {initialTally.summary}.
          </>
        }
      />
    );
  }

  return (
    <>
      <Card className="space-y-4">
        <div role="group" aria-label={`Does this work on ${who}?`} aria-busy={pending || undefined} className="grid gap-2">
          {OPTIONS.map((o) => {
            const selected = verdict === o.v;
            return (
              <button
                key={o.v}
                type="button"
                aria-pressed={selected}
                aria-disabled={pending || undefined}
                onClick={() => !pending && vote(o.v)}
                className={
                  "min-h-12 rounded-full px-5 py-3 text-left text-base font-bold ring-inset transition-[background-color,color,transform] duration-200 ease-soft active:scale-[0.99] aria-disabled:cursor-wait " +
                  (selected ? "bg-stone-200 text-stone-900 ring-2 ring-stone-900" : "bg-card text-stone-900 ring-[1.5px] ring-stone-400 hover:bg-stone-900/[0.06]")
                }
              >
                <span aria-hidden="true" className={selected ? "" : o.tint}>
                  {o.glyph}
                </span>{" "}
                {o.word}
              </button>
            );
          })}
        </div>
        {!result && <p className="text-sm text-stone-600">One tap sends your vote. No account needed.</p>}

        {/* Always mounted so the result is announced when it arrives. */}
        <div role="status" aria-live="polite" className="space-y-3">
          {pending && <p className="text-sm text-stone-600">Sending…</p>}
          {result && !pending && (
            <>
              <p className="flex items-center gap-2.5 font-display text-2xl font-extrabold">
                {/* Only rendered right after this person votes, so the tick draws. */}
                <CheckTick size={26} animate className="text-emerald-700" />
                {owner ? `thanks, ${owner} will see it.` : "thanks, they'll see it."}
              </p>
              <VoteBar works={result.works} almost={result.almost} not={result.not} />
              <p className="text-sm text-stone-600">{result.summary}. Tap another answer to change your vote.</p>
            </>
          )}
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {result && (
          <form
            className="space-y-3 border-t border-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              sendNote();
            }}
          >
            <p className="font-semibold">Add a note (optional)</p>
            <Field label="Why?">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 280))} rows={2} placeholder="Love the color, swap the shoes" />
            </Field>
            <Field label={owner ? `Your name, so ${owner} knows who said it` : "Your name, so they know who said it"}>
              <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} autoComplete="given-name" placeholder="First name" />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="secondary" disabled={notePending || (!comment.trim() && !name.trim())} aria-busy={notePending || undefined}>
                {notePending ? "Sending…" : "Send note"}
              </Button>
              <span role="status" className="text-sm font-semibold text-stone-700">
                {noteSent && !notePending && (
                  <>
                    <span aria-hidden="true">✓</span> Note sent
                  </>
                )}
              </span>
            </div>
          </form>
        )}
      </Card>

      {result && (
        <Card variant="warm">
          <p className="font-semibold">Want this for your own closet?</p>
          <p className="mt-1 text-sm text-stone-700">Valette checks outfits against your coloring and your closet, and tells you in seconds if they work.</p>
          <ButtonLink href="/?ref=vote" variant="primary" size="sm" className="mt-3">
            Get an invite
          </ButtonLink>
        </Card>
      )}
    </>
  );
}
