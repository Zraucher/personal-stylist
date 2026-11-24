import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validUnsubscribe } from "@/lib/email/alerts";

// Signed link from the price-alert email: works signed out. POST is the one-click (RFC 8058) form mail apps use.
async function unsubscribe(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const s = req.nextUrl.searchParams.get("s") ?? "";
  const secret = process.env.CRON_SECRET;
  const plain = { "Content-Type": "text/plain; charset=utf-8" };
  if (!secret || !/^[0-9a-f-]{36}$/.test(u) || !validUnsubscribe(u, s, secret))
    return new NextResponse("That link isn't valid. Turn price emails off in Profile instead.", { status: 400, headers: plain });
  const { error } = await createAdminClient().from("profiles").update({ email_alerts: false }).eq("id", u);
  if (error) return new NextResponse("Couldn't turn price emails off. Try again, or turn them off in Profile.", { status: 500, headers: plain });
  return new NextResponse("Price emails are off. You can turn them back on in Profile.", { headers: plain });
}
export const GET = unsubscribe;
export const POST = unsubscribe;
