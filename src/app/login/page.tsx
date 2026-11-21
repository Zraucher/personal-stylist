"use client";

import { useActionState } from "react";
import { requestMagicLink, verifyCode, type LoginState } from "./actions";
import Wordmark from "@/components/Wordmark";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

const initial: LoginState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyCode, initial);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-4 py-12 text-stone-900">
      <div className="w-full max-w-sm">
        <h1 className="sr-only">valette</h1>
        <Wordmark size={40} />
        <p className="mt-3 font-display text-xl font-bold text-stone-900">Check it on you before you wear it.</p>
        <p className="mt-2 text-sm text-stone-600">
          Invite only for now. Enter your email and we&apos;ll send a sign-in code.
        </p>

        {state.status === "sent" ? (
          <Card className="mt-8 space-y-4">
            <div role="status">
              <p className="font-display text-lg font-bold leading-snug">Check your email</p>
              <p className="mt-1 text-sm text-stone-600">
                We sent a sign-in code to <span className="font-medium">{state.email}</span>.
                Type it here. Stay on this page until you have it.
              </p>
            </div>
            <form action={codeAction} className="space-y-3">
              <input type="hidden" name="email" value={state.email ?? ""} />
              <Field label="Sign-in code" srOnly>
                <Input
                  name="code"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="Code"
                  className="text-center text-lg tracking-widest"
                />
              </Field>
              <Button type="submit" variant="primary" block disabled={codePending} aria-busy={codePending || undefined}>
                {codePending ? "Checking…" : "Sign in with code"}
              </Button>
              {codeState.message && <Notice tone="error">{codeState.message}</Notice>}
            </form>
          </Card>
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

            {state.status === "not_invited" && (
              <Notice tone="warn">
                That email isn&apos;t on the invite list yet. Ask Zack to add it.
              </Notice>
            )}
            {state.status === "error" && <Notice tone="error">{state.message}</Notice>}
          </form>
        )}
      </div>
    </main>
  );
}
