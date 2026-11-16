"use client";

import { useActionState } from "react";
import { requestMagicLink, verifyCode, type LoginState } from "./actions";
import Wordmark from "@/components/Wordmark";

const initial: LoginState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyCode, initial);

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12 bg-stone-50 text-stone-900">
      <div className="w-full max-w-sm">
        <h1 className="sr-only">valette</h1>
        <Wordmark size={40} />
        <p className="mt-3 font-display text-xl font-bold text-stone-900">Check it on you before you wear it.</p>
        <p className="mt-2 text-sm text-stone-600">
          Invite only for now. Enter your email and we&apos;ll send a sign-in code.
        </p>

        {state.status === "sent" ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm text-stone-600">
              We sent a sign-in code to <span className="font-medium">{state.email}</span>.
              Type it here. Stay on this page until you have it.
            </p>
            <form action={codeAction} className="mt-4 space-y-3">
              <input type="hidden" name="email" value={state.email ?? ""} />
              <input
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="Code"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-center text-lg tracking-widest outline-none focus:border-stone-900"
              />
              <button
                type="submit"
                disabled={codePending}
                className="w-full rounded-lg bg-stone-900 px-3 py-2.5 text-base font-medium text-white disabled:opacity-60"
              >
                {codePending ? "Checking…" : "Sign in with code"}
              </button>
              {codeState.message && <p className="text-sm text-red-700">{codeState.message}</p>}
            </form>
          </div>
        ) : (
          <form action={formAction} className="mt-8 space-y-3">
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                inputMode="email"
                defaultValue={state.email ?? ""}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-stone-900"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-stone-900 px-3 py-2.5 text-base font-medium text-white disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send sign-in code"}
            </button>

            {state.status === "not_invited" && (
              <p className="text-sm text-amber-700">
                That email isn&apos;t on the invite list yet. Ask Zack to add it.
              </p>
            )}
            {state.status === "error" && (
              <p className="text-sm text-red-700">{state.message}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
