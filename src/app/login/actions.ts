"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
    return { status: "error", message: "We couldn't check your invite just now. Try again in a minute.", email };
  }
  if (!invited) {
    return { status: "not_invited", email };
  }

  const siteUrl = await resolveSiteUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/today`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: "error", message: "We couldn't send your code. Wait a minute and try again.", email };
  }

  return { status: "sent", email };
}

// Six-digit code sign-in. Unlike the link, a code can't be burned by an email
// link scanner, and it doesn't need to be opened in the same browser.
export async function verifyCode(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!EMAIL_RE.test(email) || token.length < 6) {
    return { status: "sent", email, message: "Enter the 6-digit code from the email." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { status: "sent", email, message: "That code is wrong or expired. Request a new one." };
  }
  redirect("/today");
}

// Store reviewers (Chrome Web Store) can't receive our email codes, so this one account signs in with a password.
// Everyone else has no password set, so the check below is a guard rail, not the lock: the lock is that only
// this account has a password (set by hand in the Supabase dashboard).
const REVIEW_EMAIL = "chrome-review@myvalette.com";

export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (email !== REVIEW_EMAIL) {
    return { status: "error", email, message: "Password sign-in is only for app store review. Use the email code instead." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: "error", email, message: "That email and password don't match." };
  }
  redirect("/today");
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