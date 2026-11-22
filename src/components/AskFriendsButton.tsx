"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { askForOpinion } from "@/app/(app)/opinions/actions";
import { Button, Field, Input } from "@/components/ui";

type Target = { kind: "outfit"; outfitId: string } | { kind: "find"; candidateId: string };

/**
 * "Ask a friend": makes a vote link and opens the phone's share sheet (or copies the link).
 * Friends vote without an account. Opens as an inset well inside the host card (never a nested card).
 */
export default function AskFriendsButton({ target, compact = false }: { target: Target; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ id: string; url: string; copied: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const questionRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Focus follows the panel: into the question when it opens, back to the button when it closes.
  const returnFocus = useRef(false);

  useEffect(() => {
    if (open) questionRef.current?.focus();
    else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const close = () => {
    returnFocus.current = true;
    setOpen(false);
    setDone(null);
    setQuestion("");
    setError(null);
  };

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
      <Button ref={triggerRef} type="button" variant="secondary" size={compact ? "sm" : "md"} onClick={() => setOpen(true)}>
        Ask a friend
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2.5 rounded-control bg-inset p-3 text-sm text-stone-700">
      {done ? (
        <div className="space-y-2">
          <p role="status" aria-live="polite" className="font-semibold text-stone-900">
            {done.copied ? "Link copied. Paste it in a text." : "Shared. Votes show up as friends answer."}
          </p>
          <Input readOnly value={done.url} onFocus={(e) => e.currentTarget.select()} aria-label="Share link" />
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/opinions/${done.id}`} className="tap inline-flex items-center font-semibold text-stone-900 underline underline-offset-2">
              See votes
            </Link>
            <Button type="button" variant="quiet" size="sm" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Field label="Anything to ask? (optional)">
            <Input ref={questionRef} value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 200))} placeholder="Rooftop dinner Friday. Too much?" />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={pending} aria-busy={pending} onClick={share}>
              {pending ? "Making link…" : "Share for votes"}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={close}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-stone-600">Anyone with the link can see these pieces and vote. No account needed.</p>
        </>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
