// Pure sign-in rules shared by the proxy, the login page and Profile. No imports, so node --test can load it.

export const MFA_PATH = "/login/verify";

const PUBLIC_PATHS = ["/login", "/auth", "/privacy", "/help", "/o/", "/offline", "/api/cron/", "/api/alerts/"];
// The marketing home page is public for everyone; signed-in visitors see it too, with an "Open the app" button.
const PUBLIC_EXACT = ["/"];

export const isPublicPath = (path: string) => PUBLIC_EXACT.includes(path) || PUBLIC_PATHS.some((p) => path.startsWith(p));

/** The `aal` claim of an access token. Only call on a token Supabase has already validated (getUser). */
export function aalOf(accessToken: string | undefined): string | null {
  try {
    const part = (accessToken ?? "").split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

/** A verified second factor exists but this session hasn't used it yet (aal1 -> aal2 pending). */
export const mfaPending = (factors: ReadonlyArray<{ status: string }> | undefined, aal: string | null) =>
  !!factors?.some((f) => f.status === "verified") && aal !== "aal2";

/**
 * Where the proxy sends a request, or null to let it through.
 * Signed out: app routes go to /login. Signed in with MFA pending: everything except public pages
 * (including /auth/signout and the verify page) goes to the verify step. Signed in and done: /login goes to /today.
 */
export function gate(path: string, signedIn: boolean, pending: boolean): string | null {
  if (!signedIn) return path === MFA_PATH || !isPublicPath(path) ? "/login" : null;
  if (pending) return path === "/login" || !isPublicPath(path) ? MFA_PATH : null;
  return path === "/login" || path === MFA_PATH ? "/today" : null;
}

export const PASSWORD_MIN = 8;

/** Why a new password can't be saved, or null. Supabase caps passwords at 72 characters (bcrypt). */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > 72) return "Use 72 characters or fewer.";
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

type MaybeError = { code?: string; name?: string; message?: string; cause?: unknown } | null | undefined;

/** Friendly words for a passkey failure. Never shows the raw server message. */
export function passkeyErrorMessage(e: MaybeError, doing: "sign in" | "add"): string {
  const code = e?.code ?? "";
  const causeName = (e?.cause as { name?: string } | undefined)?.name;
  if (code === "passkey_disabled" || /passkey.*disabled|disabled.*passkey/i.test(e?.message ?? ""))
    return "Passkeys aren't turned on yet. Use your email code or password for now.";
  if (code === "ERROR_CEREMONY_ABORTED" || e?.name === "NotAllowedError" || causeName === "NotAllowedError" || e?.name === "AbortError")
    return doing === "sign in" ? "Passkey sign-in was cancelled. Try again, or use your email code." : "Adding the passkey was cancelled.";
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return "This device already has a passkey for valette.";
  if (code === "webauthn_challenge_expired") return "That took too long. Try again.";
  return doing === "sign in"
    ? "We couldn't sign you in with a passkey. Try again, or use your email code."
    : "We couldn't add the passkey. Try again in a minute.";
}
