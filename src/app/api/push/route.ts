import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushEndpoint, pushConfigured, pushToUser } from "@/lib/push/send";

const Sub = z.object({
  endpoint: z.string().url().max(1000).refine(isPushEndpoint, "Not a browser push service"),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});
const Prefs = z.object({ morning: z.boolean(), prices: z.boolean(), votes: z.boolean() }).partial();
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("subscribe"), subscription: Sub, prefs: Prefs.optional() }),
  z.object({ action: z.literal("unsubscribe"), endpoint: z.string().max(1000) }),
  z.object({ action: z.literal("prefs"), endpoint: z.string().max(1000), prefs: Prefs }),
  z.object({ action: z.literal("test") }),
]);

/** Public key for the browser, and whether push is set up at all. */
export async function GET() {
  return NextResponse.json({ configured: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = Body.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const b = p.data;

  if (b.action === "subscribe") {
    if (!pushConfigured()) return NextResponse.json({ error: "Notifications aren't available yet. Try again later." }, { status: 503 });
    const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= 10) return NextResponse.json({ error: "Notifications are on for 10 devices. Turn them off on one you don't use." }, { status: 400 });
    // The endpoint is unique across users. Holding it proves control of the device, so a device
    // that changed hands moves to whoever is signed in now.
    await createAdminClient().from("push_subscriptions").delete().eq("endpoint", b.subscription.endpoint);
    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: user.id,
      endpoint: b.subscription.endpoint,
      p256dh: b.subscription.keys.p256dh,
      auth: b.subscription.keys.auth,
      prefs: { morning: true, prices: true, votes: true, ...(b.prefs ?? {}) },
    });
    if (error) return NextResponse.json({ error: "Couldn't turn on notifications. Check that this browser allows them, then try again." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "unsubscribe") {
    await supabase.from("push_subscriptions").delete().eq("endpoint", b.endpoint).eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "prefs") {
    const { data: row } = await supabase.from("push_subscriptions").select("id, prefs").eq("endpoint", b.endpoint).eq("user_id", user.id).maybeSingle();
    if (!row) return NextResponse.json({ error: "Notifications are off on this device. Turn them on first." }, { status: 404 });
    await supabase.from("push_subscriptions").update({ prefs: { ...(row.prefs as object), ...b.prefs } }).eq("id", row.id);
    return NextResponse.json({ ok: true });
  }
  // Test send: at most once a minute.
  const { data: recent } = await supabase.from("push_subscriptions").select("last_sent_at").eq("user_id", user.id).order("last_sent_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (recent?.last_sent_at && Date.now() - Date.parse(recent.last_sent_at as string) < 60_000) return NextResponse.json({ ok: true, sent: 0 });
  const sent = await pushToUser(user.id, "votes", { title: "Notifications are on", body: "You'll get your morning outfit, price drops and friends' votes here.", url: "/today", tag: "test" });
  return NextResponse.json({ ok: sent > 0, sent });
}
