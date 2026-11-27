"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type VerifyState = { message?: string };

// Second step after any first-factor sign-in (code, password or passkey) when an authenticator app is on.
export async function verifyAuthenticator(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { message: "Enter the 6-digit code from your authenticator app." };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (listError || !factor) return { message: "We couldn't check your code just now. Try again in a minute." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { message: "That code didn't work. Check your authenticator app and try again." };
  redirect("/today");
}
