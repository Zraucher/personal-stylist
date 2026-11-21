"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { castVote } from "./actions";
import type { Tally } from "@/lib/opinions/tally";

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
    { v: "works", label: `✓ works on ${owner}`, on: "bg-emerald-700 text-white border-emerald-700", off: "border-emerald-700 text-emerald-800" },
    { v: "almost", label: "◐ almost", on: "bg-amber-500 text-stone-900 border-amber-500", off: "border-amber-500 text-stone-800" },
    { v: "not", label: `✕ not for ${owner}`, on: "bg-red-700 text-white border-red-700", off: "border-red-700 text-red-800" },
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
      <div className="rounded-2xl bg-white p-4 text-center">
        <p className="font-semibold">Voting has closed.</p>
        <p className="text-sm text-stone-500">{initialTally.summary}</p>
      </div>
    );
  }

  if (result) {
    const bar = (n: number) => `${result.total ? (n / result.total) * 100 : 0}%`;
    return (
      <div className="space-y-4 rounded-2xl bg-white p-5">
        <p className="font-display text-2xl font-extrabold">thanks, {owner} will see it.</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
          <span className="bg-emerald-700" style={{ width: bar(result.works) }} />
          <span className="bg-amber-500" style={{ width: bar(result.almost) }} />
          <span className="bg-red-700" style={{ width: bar(result.not) }} />
        </div>
        <p className="text-sm text-stone-600">{result.summary}</p>
        <button type="button" onClick={() => setResult(null)} className="text-sm font-semibold underline">Change my vote</button>
        <div className="rounded-xl bg-blush p-4">
          <p className="font-semibold">Want this for your own closet?</p>
          <p className="mt-1 text-sm text-stone-700">Valette checks outfits against your coloring and your closet, and tells you in seconds if they work.</p>
          <Link href="/" className="mt-3 inline-block rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50">Get an invite</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5">
      <div className="grid gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={verdict === o.v}
            onClick={() => setVerdict(o.v)}
            className={"rounded-full border-2 px-5 py-3 text-left text-base font-bold transition-colors " + (verdict === o.v ? o.on : o.off)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label className="block text-sm">
        <span className="text-stone-600">Why? (optional)</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 280))} rows={2} placeholder="Love the color, swap the shoes" className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-base" />
      </label>
      <label className="block text-sm">
        <span className="text-stone-600">Your name, so {owner} knows who said it</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="First name" className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-base" />
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="button" disabled={pending} onClick={submit} className="w-full rounded-full bg-stone-900 py-3 font-bold text-stone-50 disabled:opacity-60">
        {pending ? "Sending…" : "Send my vote"}
      </button>
    </div>
  );
}
