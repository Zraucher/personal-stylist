"use client";

import { useActionState, useEffect, useRef } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist-actions";
import { CheckDisc } from "@/components/Wordmark";
import { Button, Field, fieldClass } from "@/components/ui";

const initial: WaitlistState = { status: "idle" };

// The kit input sits on the inset surface; on Blush and Linen panels the waitlist field needs the card surface.
const surfaceField = fieldClass.replace("bg-inset", "bg-card");

export default function WaitlistForm({ source = "home", defaultEmail }: { source?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(joinWaitlist, initial);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const joined = state.status === "joined";
  const errorId = `waitlist-error-${source}`;

  useEffect(() => {
    if (joined) doneRef.current?.focus();
  }, [joined]);

  // Friends who arrive from a vote page ("/?ref=vote") are attributed to it.
  const submit = (form: FormData) => {
    if (new URLSearchParams(window.location.search).get("ref") === "vote") form.set("source", `${source}-vote`);
    action(form);
  };

  return (
    <div>
      {/* Always mounted so screen readers announce the result; focus moves to it because the form goes away. */}
      <div role="status">
        {joined && (
          <p ref={doneRef} tabIndex={-1} className="flex items-center gap-2 rounded-control bg-emerald-100 px-4 py-3 text-base font-semibold text-emerald-900">
            <span className="text-emerald-700">
              <CheckDisc size={20} />
            </span>
            You&apos;re on the list. We&apos;ll email your invite.
          </p>
        )}
      </div>
      {!joined && (
        <form action={submit} className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Field label="Email address" srOnly className="min-w-0 flex-1">
              <input
                id={`waitlist-email-${source}`}
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                defaultValue={defaultEmail}
                placeholder="you@example.com"
                aria-invalid={state.status === "error" || undefined}
                aria-describedby={state.status === "error" ? errorId : undefined}
                className={surfaceField}
              />
            </Field>
            <input type="hidden" name="source" value={source} />
            <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
              {pending ? "Adding you…" : "Get an invite"}
            </Button>
          </div>
          {state.status === "error" && (
            <p id={errorId} role="alert" className="text-sm text-red-700">
              {state.message}
            </p>
          )}
          <p className="text-xs text-stone-600">Free during early access. One email when your invite is ready, nothing else.</p>
        </form>
      )}
    </div>
  );
}
