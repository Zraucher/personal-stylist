"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestMagicLink, signInWithPassword, verifyCode, type LoginState } from "./actions";
import Wordmark from "@/components/Wordmark";
import WaitlistForm from "@/components/landing/WaitlistForm";
import { Button, Card, Chip, Field, Input, Notice } from "@/components/ui";

const initial: LoginState = { status: "idle" };

export default function LoginPage() {
  // Changing the key remounts the flow, which is how "Use a different email" resets both steps.
  const [attempt, setAttempt] = useState(0);
  return <LoginFlow key={attempt} onRestart={() => setAttempt((n) => n + 1)} />;
}

function LoginFlow({ onRestart }: { onRestart: () => void }) {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyCode, initial);
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initial);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-4 py-12 text-stone-900">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="valette home" className="inline-block rounded-full">
          <Wordmark size={40} />
        </Link>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em]">sign in</h1>
        <p className="mt-2 text-[15px] text-stone-600">Invite only for now. Enter your email and we&apos;ll send a sign-in code.</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip tone="works">
            <span aria-hidden="true">✓</span> works on you
          </Chip>
          <Chip tone="almost">
            <span aria-hidden="true">◐</span> almost
          </Chip>
          <Chip tone="not">
            <span aria-hidden="true">✕</span> not for you
          </Chip>
        </div>

        {state.status === "sent" ? (
          <Card className="mt-8 space-y-4">
            <div role="status">
              <p className="font-display text-lg font-bold leading-snug">Check your email</p>
              <p className="mt-1 text-sm text-stone-600">
                We sent a sign-in code to <span className="font-medium">{state.email}</span>. Type it here.
              </p>
            </div>
            <form action={codeAction} className="space-y-3">
              <input type="hidden" name="email" value={state.email ?? ""} />
              <Field label="Sign-in code" srOnly>
                <Input
                  name="code"
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="6-digit code"
                  className="text-center font-display text-2xl! tabular-nums tracking-[0.3em]"
                />
              </Field>
              <Button type="submit" variant="primary" block disabled={codePending} aria-busy={codePending || undefined}>
                {codePending ? "Checking…" : "Sign in with code"}
              </Button>
              {codeState.message && <Notice tone="error">{codeState.message}</Notice>}
            </form>
            <Button type="button" variant="quiet" size="sm" onClick={onRestart} className="-ml-3.5">
              Use a different email
            </Button>
          </Card>
        ) : state.status === "not_invited" ? (
          <div className="mt-8 space-y-4">
            <Notice tone="warn">
              <span className="font-medium">{state.email}</span> isn&apos;t on the invite list yet. Join the list and we&apos;ll email your invite.
            </Notice>
            <WaitlistForm source="login" defaultEmail={state.email} />
            <Button type="button" variant="quiet" size="sm" onClick={onRestart} className="-ml-3.5">
              Use a different email
            </Button>
          </div>
        ) : (
          <form action={formAction} className="mt-8 space-y-3">
            <Field label="Email" srOnly>
              <Input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                defaultValue={state.email ?? ""}
                placeholder="you@example.com"
              />
            </Field>
            <Button type="submit" variant="primary" block disabled={pending} aria-busy={pending || undefined}>
              {pending ? "Sending…" : "Send sign-in code"}
            </Button>
            {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
          </form>
        )}

        {state.status === "idle" || state.status === "error" ? (
          // For app store reviewers only; the action refuses every other email.
          <details className="mt-6 text-sm" open={pwState.status === "error"}>
            <summary className="cursor-pointer text-stone-600">Sign in with password</summary>
            <form action={pwAction} className="mt-3 space-y-3">
              <Field label="Email" srOnly>
                <Input type="email" name="email" required autoComplete="username" defaultValue={pwState.email ?? ""} placeholder="Email" />
              </Field>
              <Field label="Password" srOnly>
                <Input type="password" name="password" required autoComplete="current-password" placeholder="Password" />
              </Field>
              <Button type="submit" variant="secondary" block disabled={pwPending} aria-busy={pwPending || undefined}>
                {pwPending ? "Signing in…" : "Sign in with password"}
              </Button>
              {pwState.status === "error" && <Notice tone="error">{pwState.message}</Notice>}
            </form>
          </details>
        ) : null}
      </div>
    </main>
  );
}
