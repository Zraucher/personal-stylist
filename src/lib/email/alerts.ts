// Pure: the price-alert email and its signed unsubscribe link. Plain Node can test it.
import { createHmac, timingSafeEqual } from "node:crypto";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const unsubscribeSig = (userId: string, secret: string) => createHmac("sha256", secret).update(`email-alerts:${userId}`).digest("base64url");

export function validUnsubscribe(userId: string, sig: string, secret: string): boolean {
  const want = Buffer.from(unsubscribeSig(userId, secret));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function priceAlertEmail(lines: string[], site: string, unsubscribeUrl: string) {
  const subject = lines.length === 1 ? "Price alert" : `${lines.length} price alerts`;
  const text = `${lines.map((l) => `• ${l}`).join("\n")}\n\nSee them: ${site}/wishlist\n\nStop these emails: ${unsubscribeUrl}`;
  const html = `<div style="font:16px/1.5 system-ui,sans-serif;color:#1c1917;max-width:520px">
<p style="font-weight:700;font-size:18px;margin:0 0 12px">${subject}</p>
<ul style="padding-left:20px;margin:0 0 20px">${lines.map((l) => `<li style="margin-bottom:6px">${esc(l)}</li>`).join("")}</ul>
<p><a href="${site}/wishlist" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#1f5a3a;color:#fff;text-decoration:none;font-weight:600">See your shopping list</a></p>
<p style="font-size:13px;color:#57534e;margin-top:24px">You get these because you watch prices in valette. <a href="${esc(unsubscribeUrl)}" style="color:#57534e">Stop price emails</a></p></div>`;
  return { subject, text, html };
}
