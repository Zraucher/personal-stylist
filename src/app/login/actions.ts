"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "not_invited" | "error";
  message?: string;
  email?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Enter a valid email address.", email };
  }

  // Gate: the email must be on the invite list before we send anything.
  // is_invited() is a security-definer function, so the anon key can call it
  // without being able to read the invite list.
  const supabase = await createClient();
  const { data: invited, error: inviteError } = await supabase.rpc("is_invited", {
    p_email: email,
  });

  if (inviteError) {
    return { status: "error", message: "Could not check the invite list.", email };
  }
  if (!invited) {
    return { status: "not_invited", email };
  }

  const siteUrl = await resolveSiteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/closet`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: "error", message: error.message, email };
  }

  return { status: "sent", email };
}

// The host that served the login page is where the magic link should land.
// Falls back to NEXT_PUBLIC_SITE_URL, then localhost. Supabase only honours
// redirect URLs on its allowlist, so a spoofed Host header cannot redirect anywhere else.
async function resolveSiteUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}