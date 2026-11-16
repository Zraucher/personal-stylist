"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist-actions";
import { CheckDisc } from "@/components/Wordmark";

const initial: WaitlistState = { status: "idle" };

export default function WaitlistForm({ source = "home", dark = false }: { source?: string; dark?: boolean }) {
  const [state, action, pending] = useActionState(joinWaitlist, initial);

  if (state.status === "joined") {
    return (
      <p className={"flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold " + (dark ? "bg-stone-50/10 text-white" : "bg-emerald-100 text-emerald-900")}>
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
        <label className="min-w-0 flex-1">
          <span className="sr-only">Email address</span>
          <input
            id={`waitlist-email-${source}`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-700"
          />
        </label>
        <input type="hidden" name="source" value={source} />
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button type="submit" disabled={pending} className="rounded-full bg-emerald-700 px-6 py-3 font-bold text-white disabled:opacity-60">
          {pending ? "Adding you…" : "Get an invite"}
        </button>
      </div>
      {state.status === "error" && <p className="text-sm text-red-700">{state.message}</p>}
      <p className={"text-xs " + (dark ? "text-stone-50/70" : "text-stone-500")}>Free during early access. One email when your invite is ready, nothing else.</p>
    </form>
  );
}
