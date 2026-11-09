"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initial);

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-12 bg-stone-50 text-stone-900">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Personal Stylist</h1>
        <p className="mt-1 text-sm text-stone-600">
          Invite only. Enter your email and we&apos;ll send a sign-in link.
        </p>

        {state.status === "sent" ? (
          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm text-stone-600">
              A sign-in link is on its way to <span className="font-medium">{state.email}</span>.
              Open it on this device.
            </p>
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
              {pending ? "Sending…" : "Send sign-in link"}
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
