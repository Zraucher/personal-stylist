"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { passkeyErrorMessage } from "@/lib/auth-rules";
import { Button, Notice } from "@/components/ui";

/** "Sign in with a passkey". Hidden when the browser has no WebAuthn. */
export default function PasskeySignIn() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "PublicKeyCredential" in window;
    Promise.resolve().then(() => setSupported(ok));
  }, []);

  if (!supported) return null;

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPasskey();
    if (error) {
      setError(passkeyErrorMessage(error, "sign in"));
      setBusy(false);
      return;
    }
    // The proxy sees the new session cookie and sends authenticator users to /login/verify first.
    router.replace("/today");
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-3">
      <Button type="button" variant="secondary" block onClick={signIn} disabled={busy} aria-busy={busy || undefined}>
        {busy ? "Waiting for your passkey…" : "Sign in with a passkey"}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
