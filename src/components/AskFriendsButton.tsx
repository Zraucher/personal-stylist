"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { askForOpinion } from "@/app/(app)/opinions/actions";

type Target = { kind: "outfit"; outfitId: string } | { kind: "find"; candidateId: string };

/**
 * "Ask a friend": makes a vote link and opens the phone's share sheet (or copies the link).
 * Friends vote without an account.
 */
export default function AskFriendsButton({ target, compact = false }: { target: Target; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ id: string; url: string; copied: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const share = () =>
    start(async () => {
      setError(null);
      const r = await askForOpinion({ ...target, question: question.trim() || undefined });
      if (!r.ok) return setError(r.error);
      const text = question.trim() ? `${question.trim()} Tell me honestly:` : "Does this work on me? Tell me honestly:";
      let copied = false;
      try {
        if (navigator.share) await navigator.share({ title: r.title, text, url: r.url });
        else {
          await navigator.clipboard.writeText(r.url);
          copied = true;
        }
      } catch (e) {
        // A dismissed share sheet is fine; fall back to copying so the link isn't lost.
        if ((e as Error)?.name !== "AbortError") {
          try {
            await navigator.clipboard.writeText(r.url);
            copied = true;
          } catch {
            /* the link is still shown below */
          }
        }
      }
      setDone({ id: r.id, url: r.url, copied });
    });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={"rounded-full border-[1.5px] border-stone-900 font-semibold hover:bg-stone-900 hover:text-stone-50 " + (compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm")}>
        Ask a friend
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl bg-blush/60 p-3 text-sm">
      {done ? (
        <div className="space-y-1.5">
          <p className="font-semibold">{done.copied ? "Link copied. Paste it in a text." : "Sent. Votes show up as friends answer."}</p>
          <input readOnly value={done.url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs" aria-label="Share link" />
          <Link href={`/opinions/${done.id}`} className="inline-block font-semibold underline">See votes</Link>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="text-stone-700">Anything to ask? (optional)</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
              placeholder="Rooftop dinner Friday. Too much?"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
            />
          </label>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pending} onClick={share} className="rounded-full bg-emerald-700 px-4 py-1.5 font-semibold text-white disabled:opacity-60">
              {pending ? "Making link…" : "Share for votes"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-stone-600">Cancel</button>
          </div>
          <p className="text-xs text-stone-600">Anyone with the link can see these pieces and vote. No account needed.</p>
        </>
      )}
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
}
