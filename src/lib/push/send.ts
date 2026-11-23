import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Web push. Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in the environment; without them,
// sending is a no-op and the app hides the notification switch.

export type PushKind = "morning" | "prices" | "votes";
export type PushMessage = { title: string; body: string; url: string; tag?: string };

// Only the browsers' own push services: the endpoint comes from the client, so never let it point anywhere else.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.apple\.com$/];
export function isPushEndpoint(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function setup() {
  if (ready || !pushConfigured()) return ready;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://www.myvalette.com", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
  return true;
}

/** Send to every device a person has opted in on for this kind. Returns how many got it. */
export async function pushToUser(userId: string, kind: PushKind, msg: PushMessage): Promise<number> {
  if (!setup()) return 0;
  const admin = createAdminClient();
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, prefs").eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    const prefs = (s.prefs ?? {}) as Partial<Record<PushKind, boolean>>;
    if (prefs[kind] === false || !isPushEndpoint(s.endpoint as string)) continue;
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
        JSON.stringify({ ...msg, tag: msg.tag ?? kind }),
        { TTL: 60 * 60 * 6 }
      );
      sent++;
      await admin.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // Gone or not found: the device unsubscribed or the browser dropped it.
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return sent;
}
