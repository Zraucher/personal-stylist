"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { passkeyErrorMessage, passwordProblem, PASSWORD_MIN } from "@/lib/auth-rules";
import { Button, Card, ConfirmButton, Field, Input, Notice, SectionTitle } from "@/components/ui";

const supabase = () => createClient();
const codeOf = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\D/g, "");

/** Profile → "Sign-in & security": password, authenticator app, passkeys. All browser-side with the user's session. */
export default function SecurityCard() {
  return (
    <Card className="space-y-5">
      <SectionTitle>Sign-in &amp; security</SectionTitle>
      <PasswordPart />
      <hr className="border-line-strong" />
      <AuthenticatorPart />
      <hr className="border-line-strong" />
      <PasskeysPart />
    </Card>
  );
}

const subTitle = "font-display text-lg font-bold leading-snug";

function PasswordPart() {
  const [open, setOpen] = useState(false);
  const [needNonce, setNeedNonce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const password = String(f.get("password") ?? "");
    const problem = passwordProblem(password, String(f.get("confirm") ?? ""));
    if (problem) return setError(problem);
    const nonce = needNonce ? codeOf(f.get("nonce")) : undefined;
    if (needNonce && !nonce) return setError("Enter the code we just emailed you.");

    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.updateUser(nonce ? { password, nonce } : { password });
    setBusy(false);
    if (!error) {
      setSaved(true);
      setOpen(false);
      setNeedNonce(false);
      return;
    }
    // "Secure password change" on: Supabase wants a fresh emailed code (the nonce) first.
    if (error.code === "reauthentication_needed" || error.code === "reauth_nonce_missing") {
      const { error: sendError } = await supabase().auth.reauthenticate();
      if (sendError) return setError("We couldn't email you a code. Wait a minute and try again.");
      setNeedNonce(true);
      return setError(null);
    }
    if (error.code === "reauthentication_not_valid") return setError("That email code is wrong or expired. Save again to get a new one.");
    if (error.code === "weak_password") return setError("Pick a longer or less common password.");
    if (error.code === "same_password") return setError("That's already your password.");
    setError("We couldn't save your password. Try again in a minute.");
  }

  return (
    <section className="space-y-3" aria-labelledby="pw-title">
      <h3 id="pw-title" className={subTitle}>Password</h3>
      <p className="text-sm text-stone-600">Sign in with your email and a password, or keep using emailed codes. Either works.</p>
      {saved && (
        <p role="status" className="text-sm font-medium text-stone-700">
          <span aria-hidden="true">✓</span> Password saved. You can now sign in with it.
        </p>
      )}
      {open ? (
        <form onSubmit={save} className="space-y-3">
          <Field label="New password" hint={`At least ${PASSWORD_MIN} characters.`}>
            <Input type="password" name="password" required minLength={PASSWORD_MIN} maxLength={72} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" name="confirm" required minLength={PASSWORD_MIN} maxLength={72} autoComplete="new-password" />
          </Field>
          {needNonce && (
            <div role="status" className="space-y-3">
              <p className="text-sm text-stone-600">To keep your account safe, we emailed you a code. Enter it to save.</p>
              <Field label="Code from your email">
                <Input name="nonce" required inputMode="numeric" autoComplete="one-time-code" maxLength={8} />
              </Field>
            </div>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="secondary" disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Saving…" : "Save password"}
            </Button>
            <Button type="button" variant="quiet" onClick={() => (setOpen(false), setNeedNonce(false), setError(null))}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => (setOpen(true), setSaved(false))}>
          Set or change password
        </Button>
      )}
    </section>
  );
}

type Enrolling = { id: string; qr: string; secret: string };

function AuthenticatorPart() {
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined); // undefined = loading
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase().auth.mfa.listFactors();
    if (error) return setError("We couldn't load your two-step settings. Refresh to try again.");
    setFactorId(data.totp[0]?.id ?? null);
  }
  useEffect(() => {
    Promise.resolve().then(load);
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    setNote(null);
    const auth = supabase().auth;
    // Clear half-finished setups first; they would block a new one with the same name.
    const { data: list } = await auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.factor_type === "totp" && f.status === "unverified") await auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
    setBusy(false);
    if (error || !data) return setError(error?.code === "mfa_totp_enroll_not_enabled" ? "Authenticator apps aren't turned on yet." : "We couldn't start setup. Try again in a minute.");
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function cancelSetup() {
    if (enrolling) await supabase().auth.mfa.unenroll({ factorId: enrolling.id });
    setEnrolling(null);
    setError(null);
  }

  async function activate(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!enrolling) return;
    const code = codeOf(new FormData(ev.currentTarget).get("code"));
    if (code.length !== 6) return setError("Enter the 6-digit code from your app.");
    setBusy(true);
    const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId: enrolling.id, code });
    setBusy(false);
    if (error) return setError("That code didn't work. Check the time on your phone and try the newest code.");
    setEnrolling(null);
    setError(null);
    setNote("✓ Two-step sign-in is on. We'll ask for a code from your app each time you sign in.");
    setFactorId(enrolling.id);
  }

  async function remove(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!factorId) return;
    const code = codeOf(new FormData(ev.currentTarget).get("code"));
    if (code.length !== 6) return setError("Enter the 6-digit code from your app.");
    setBusy(true);
    const auth = supabase().auth;
    const { error: verifyError } = await auth.mfa.challengeAndVerify({ factorId, code });
    const { error } = verifyError ? { error: verifyError } : await auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (verifyError) return setError("That code didn't work. Try the newest code from your app.");
    if (error) return setError("We couldn't turn it off. Try again in a minute.");
    setRemoving(false);
    setError(null);
    setNote("✓ Two-step sign-in is off.");
    setFactorId(null);
  }

  return (
    <section className="space-y-3" aria-labelledby="mfa-title">
      <h3 id="mfa-title" className={subTitle}>Authenticator app</h3>
      <p className="text-sm text-stone-600">
        {factorId ? "On. After you sign in, we ask for a 6-digit code from your app." : "Add a second step: after signing in, enter a code from an app like Google Authenticator or 1Password."}
      </p>
      {note && <p role="status" className="text-sm font-medium text-stone-700">{note}</p>}

      {enrolling ? (
        <form onSubmit={activate} className="space-y-3">
          <p className="text-sm text-stone-600">Scan this with your authenticator app, then enter the code it shows.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR as an SVG data URL */}
          <img src={enrolling.qr} alt="QR code to add valette to your authenticator app" width={176} height={176} className="rounded-thumb bg-white p-2 ring-1 ring-line" />
          <p className="text-sm text-stone-600">
            Can&apos;t scan? Enter this key instead:{" "}
            <code className="select-all break-all rounded bg-inset px-1.5 py-0.5 font-mono text-[13px] text-stone-900">{enrolling.secret}</code>
          </p>
          <Field label="Code from your app">
            <Input name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="secondary" disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Checking…" : "Turn on"}
            </Button>
            <Button type="button" variant="quiet" onClick={cancelSetup}>
              Cancel
            </Button>
          </div>
        </form>
      ) : removing ? (
        <form onSubmit={remove} className="space-y-3">
          <Field label="Code from your app, to confirm">
            <Input name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="danger" disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Turning off…" : "Turn off two-step sign-in"}
            </Button>
            <Button type="button" variant="quiet" onClick={() => (setRemoving(false), setError(null))}>
              Keep it on
            </Button>
          </div>
        </form>
      ) : factorId === undefined ? null : (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          {factorId ? (
            <Button type="button" variant="danger" size="sm" onClick={() => (setRemoving(true), setNote(null))}>
              Turn off
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" onClick={start} disabled={busy} aria-busy={busy || undefined}>
              {busy ? "Starting…" : "Set up authenticator app"}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function PasskeysPart() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<PasskeyListItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase().auth.passkey.list();
    if (error) {
      setKeys([]);
      return setError(passkeyErrorMessage(error, "add").startsWith("Passkeys aren't") ? passkeyErrorMessage(error, "add") : "We couldn't load your passkeys. Refresh to try again.");
    }
    setKeys(data);
  }
  useEffect(() => {
    const ok = "PublicKeyCredential" in window;
    Promise.resolve().then(() => {
      setSupported(ok);
      if (ok) load();
    });
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    setNote(null);
    const { error } = await supabase().auth.registerPasskey();
    setBusy(false);
    if (error) return setError(passkeyErrorMessage(error, "add"));
    setNote("✓ Passkey added. Next time, choose Sign in with a passkey.");
    load();
  }

  async function remove(id: string) {
    setError(null);
    setNote(null);
    const { error } = await supabase().auth.passkey.delete({ passkeyId: id });
    if (error) return setError("We couldn't remove that passkey. Try again in a minute.");
    setNote("✓ Passkey removed.");
    load();
  }

  return (
    <section className="space-y-3" aria-labelledby="pk-title">
      <h3 id="pk-title" className={subTitle}>Passkeys</h3>
      {supported === false ? (
        <p className="text-sm text-stone-600">This browser can&apos;t use passkeys. Try Safari, Chrome or Edge on a recent phone or computer.</p>
      ) : (
        <>
          <p className="text-sm text-stone-600">Sign in with your face, fingerprint or device PIN instead of a code. If two-step sign-in is on, we still ask for your app code.</p>
          {note && <p role="status" className="text-sm font-medium text-stone-700">{note}</p>}
          {error && <Notice tone="error">{error}</Notice>}
          {keys && keys.length > 0 && (
            <ul className="divide-y divide-line-strong rounded-control ring-1 ring-line">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{k.friendly_name || "Passkey"}</p>
                    <p className="text-xs text-stone-500 tabular-nums">
                      Added {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <ConfirmButton
                    title="Remove this passkey?"
                    body="You won't be able to sign in with it any more. You can still use your email code or password."
                    confirmLabel="Remove"
                    onConfirm={() => remove(k.id)}
                    className="tap"
                  >
                    Remove
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={add} disabled={busy || supported === null} aria-busy={busy || undefined}>
            {busy ? "Waiting for your device…" : "Add a passkey"}
          </Button>
        </>
      )}
    </section>
  );
}
