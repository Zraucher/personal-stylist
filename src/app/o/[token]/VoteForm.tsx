"use client";

import { useEffect, useState, useTransition } from "react";
import { castVote } from "./actions";
import type { Tally } from "@/lib/opinions/tally";
import { Button, ButtonLink, Card, CheckTick, Field, Input, Notice, Textarea } from "@/components/ui";

type Verdict = "works" | "almost" | "not";

export default function VoteForm({ token, owner, closed, initialTally, defaultName }: { token: string; owner: string; closed: boolean; initialTally: Tally; defaultName: string | null }) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<Tally | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (defaultName) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("valette-voter-name");
    } catch {
      /* storage blocked */
    }
    if (saved) Promise.resolve(saved).then(setName);
  }, [defaultName]);

  const OPTIONS: Array<{ v: Verdict; label: string; on: string; off: string }> = [
    { v: "works", label: `✓ works on ${owner}`, on: "bg-emerald-700 text-on-accent ring-emerald-700", off: "bg-card text-emerald-800 ring-emerald-700 hover:bg-emerald-100" },
    { v: "almost", label: "◐ almost", on: "bg-amber-500 text-ink ring-amber-500", off: "bg-card text-stone-800 ring-amber-500 hover:bg-amber-50" },
    { v: "not", label: `✕ not for ${owner}`, on: "bg-red-700 text-on-accent ring-red-700", off: "bg-card text-red-700 ring-red-700 hover:bg-red-100" },
  ];

  const submit = () => {
    if (!verdict) return setError("Pick one.");
    start(async () => {
      setError(null);
      try {
        if (name.trim()) localStorage.setItem("valette-voter-name", name.trim());
      } catch {
        /* storage blocked */
      }
      const r = await castVote({ token, verdict, name: name.trim() || undefined, comment: comment.trim() || undefined });
      if (!r.ok) return setError(r.error);
      setResult(r.tally);
    });
  };

  if (closed) {
    return (
      <Card className="text-center">
        <p className="font-semibold">Voting has closed.</p>
        <p className="text-sm text-stone-600">{initialTally.summary}</p>
      </Card>
    );
  }

  if (result) {
    const bar = (n: number) => `${result.total ? (n / result.total) * 100 : 0}%`;
    return (
      <Card className="space-y-4" role="status" aria-live="polite">
        <p className="flex items-center gap-2.5 font-display text-2xl font-extrabold">
          <CheckTick size={26} className="text-emerald-700" />
          thanks, {owner} will see it.
        </p>
        <div className="flex h-3 overflow-hidden rounded-full bg-inset" aria-hidden="true">
          <span className="bg-emerald-700" style={{ width: bar(result.works) }} />
          <span className="bg-amber-500" style={{ width: bar(result.almost) }} />
          <span className="bg-red-700" style={{ width: bar(result.not) }} />
        </div>
        <p className="text-sm text-stone-600">{result.summary}</p>
        <Button type="button" variant="quiet" size="sm" onClick={() => setResult(null)} className="-ml-3.5">
          Change my vote
        </Button>
        <Card variant="warm">
          <p className="font-semibold">Want this for your own closet?</p>
          <p className="mt-1 text-sm text-stone-700">Valette checks outfits against your coloring and your closet, and tells you in seconds if they work.</p>
          <ButtonLink href="/" variant="primary" size="sm" className="mt-3">
            Get an invite
          </ButtonLink>
        </Card>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div role="group" aria-label={`Does this work on ${owner}?`} className="grid gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={verdict === o.v}
            onClick={() => setVerdict(o.v)}
            className={"min-h-12 rounded-full px-5 py-3 text-left text-base font-bold ring-2 ring-inset transition-[background-color,color,transform] duration-200 ease-soft active:scale-[0.99] " + (verdict === o.v ? o.on : o.off)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Field label="Why? (optional)">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 280))} rows={2} placeholder="Love the color, swap the shoes" />
      </Field>
      <Field label={`Your name, so ${owner} knows who said it`}>
        <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="First name" />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="button" variant="primary" block disabled={pending} aria-busy={pending || undefined} onClick={submit}>
        {pending ? "Sending…" : "Send my vote"}
      </Button>
    </Card>
  );
}
