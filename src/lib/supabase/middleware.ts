import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { aalOf, gate, mfaPending } from "@/lib/auth-rules";

/**
 * Refreshes the Supabase session cookie on every request and gates the app:
 * signed-out users go to /login (the home page and privacy page stay public),
 * signed-in users on /login go to /today. The installed app opens on /today (manifest start_url).
 * Two-factor: a user with a verified authenticator factor whose session is still aal1 reaches only
 * public pages (incl. /auth/signout) and /login/verify until they enter their code; API routes answer 401.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add logic between createServerClient and getUser(); it can cause
  // random sign-outs. getUser() validates the token with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user.factors comes from getUser() (server-validated), and so does the token we read aal from.
  // The cookie's own copy of the user could be edited, so it is not trusted for this.
  let pending = false;
  if (user?.factors?.some((f) => f.status === "verified")) {
    const { data } = await supabase.auth.getSession();
    pending = mfaPending(user.factors, aalOf(data.session?.access_token));
  }

  const path = request.nextUrl.pathname;
  const target = gate(path, !!user, pending);
  if (!target) return response;

  if (pending && path.startsWith("/api/")) {
    return withCookies(NextResponse.json({ error: "Enter your authenticator code first." }, { status: 401 }), response);
  }
  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = "";
  return withCookies(NextResponse.redirect(url), response);
}

// Keep any refreshed session cookies on redirects, or the browser is left holding a used refresh token.
function withCookies(to: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}
