"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist-actions";
import { CheckDisc } from "@/components/Wordmark";
import { Button, Field, Input } from "@/components/ui";

const initial: WaitlistState = { status: "idle" };

export default function WaitlistForm({ source = "home", dark = false }: { source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState(joinWaitlist, initial);

  if (state.status === "joined") {
    return (
      <p role="status" className={"flex items-center gap-2 rounded-control px-4 py-3 text-base font-semibold " + (dark ? "bg-stone-50/10 text-stone-50" : "bg-emerald-100 text-emerald-900")}>
        <span className="text-emerald-700">
          <CheckDisc size={20} />
        </span>
        You&apos;re on the list. We&apos;ll email your invite.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Field label="Email address" srOnly className="min-w-0 flex-1">
          <Input
            id={`waitlist-email-${source}`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="bg-card!"
          />
        </Field>
        <input type="hidden" name="source" value={source} />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Adding you…" : "Get an invite"}
        </Button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <p className={"text-xs " + (dark ? "text-stone-50/70" : "text-stone-500")}>Free during early access. One email when your invite is ready, nothing else.</p>
    </form>
  );
}
