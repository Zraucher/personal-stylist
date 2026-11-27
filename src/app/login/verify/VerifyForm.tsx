"use client";

import { useActionState } from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { Button, Field, Input, Notice } from "@/components/ui";
import { verifyAuthenticator, type VerifyState } from "./actions";

const initial: VerifyState = {};

export default function VerifyForm() {
  const [state, action, pending] = useActionState(verifyAuthenticator, initial);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-4 py-12 text-stone-900">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="valette home" className="inline-block rounded-full">
          <Wordmark size={40} />
        </Link>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em]">one more step</h1>
        <p className="mt-2 text-[15px] text-stone-600">Open your authenticator app and enter the 6-digit code for valette.</p>
        <form action={action} className="mt-8 space-y-3">
          <Field label="Authenticator code" srOnly>
            <Input
              name="code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              className="text-center font-display text-2xl! tabular-nums tracking-[0.3em]"
            />
          </Field>
          <Button type="submit" variant="primary" block disabled={pending} aria-busy={pending || undefined}>
            {pending ? "Checking…" : "Verify"}
          </Button>
          {state.message && <Notice tone="error">{state.message}</Notice>}
        </form>
        <form action="/auth/signout" method="post" className="mt-6">
          <Button type="submit" variant="quiet" size="sm" className="-ml-3.5">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
