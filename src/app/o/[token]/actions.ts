"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TOKEN_RE } from "@/lib/opinions/server";
import { tally, type Tally } from "@/lib/opinions/tally";
import { pushToUser } from "@/lib/push/send";

const Input = z.object({
  token: z.string().regex(TOKEN_RE),
  verdict: z.enum(["works", "almost", "not"]),
  name: z.string().trim().max(40).optional(),
  comment: z.string().trim().max(280).optional(),
});

const COOKIE = "vlt_voter";
const MAX_VOTES = 200;
const NEW_VOTES_PER_NETWORK_PER_HOUR = 6;
const NOTIFY_EVERY_MS = 10 * 60 * 1000;
const WORD = { works: "✓ works on you", almost: "◐ almost", not: "✕ not for you" } as const;

export type VoteResult = { ok: true; tally: Tally } | { ok: false; error: string };

/** A friend's vote. One per browser per ask; voting again changes it. */
export async function castVote(raw: z.input<typeof Input>): Promise<VoteResult> {
  const p = Input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Pick an answer." };
  const { token, verdict } = p.data;
  const name = p.data.name?.replace(/[<>]/g, "") || null;
  const comment = p.data.comment?.replace(/[<>]/g, "") || null;

  const admin = createAdminClient();
  const { data: o } = await admin.from("second_opinions").select("id, user_id, closes_at, snapshot, notified_at").eq("token", token).maybeSingle();
  if (!o) return { ok: false, error: "This link has expired." };
  if (Date.parse(o.closes_at as string) <= Date.now()) return { ok: false, error: "Voting on this one has closed." };

  // The person who asked can preview the page but not vote on their own look.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === o.user_id) return { ok: false, error: "This is your own look. Send the link to a friend." };

  const jar = await cookies();
  let key = jar.get(COOKIE)?.value ?? "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) {
    key = randomBytes(18).toString("base64url");
    jar.set(COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/o" });
  }

  // Network address, hashed with the ask's id: enough to rate-limit, not enough to identify anyone.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(`${o.id}:${ip}`).digest("hex").slice(0, 32);

  const { data: prior } = await admin.from("opinion_votes").select("id").eq("opinion_id", o.id).eq("voter_key", key).maybeSingle();
  if (!prior) {
    const [{ count }, { count: recent }] = await Promise.all([
      admin.from("opinion_votes").select("id", { count: "exact", head: true }).eq("opinion_id", o.id),
      admin.from("opinion_votes").select("id", { count: "exact", head: true }).eq("opinion_id", o.id).eq("ip_hash", ipHash).gt("created_at", new Date(Date.now() - 3600_000).toISOString()),
    ]);
    if ((count ?? 0) >= MAX_VOTES) return { ok: false, error: "This one has plenty of votes already." };
    if ((recent ?? 0) >= NEW_VOTES_PER_NETWORK_PER_HOUR) return { ok: false, error: "Lots of votes from this network already. Try again later." };
  }
  const { error } = await admin
    .from("opinion_votes")
    .upsert({ opinion_id: o.id, voter_key: key, voter_name: name, verdict, comment, ip_hash: ipHash, created_at: new Date().toISOString() }, { onConflict: "opinion_id,voter_key" });
  if (error) return { ok: false, error: error.message.includes("vote cap") ? "This one has plenty of votes already." : "Could not save your vote. Try again." };

  const { data: votes } = await admin.from("opinion_votes").select("verdict").eq("opinion_id", o.id);
  const t = tally(votes ?? []);

  // Group notifications: at most one every 10 minutes per ask; the vote page shows the rest.
  const last = o.notified_at ? Date.parse(o.notified_at as string) : 0;
  if (!prior && Date.now() - last > NOTIFY_EVERY_MS) {
    await admin.from("second_opinions").update({ notified_at: new Date().toISOString() }).eq("id", o.id);
    const title = (o.snapshot as { title?: string })?.title ?? "your look";
    try {
      await pushToUser(o.user_id as string, "votes", {
        title: `${name ?? "A friend"} says ${WORD[verdict]}`,
        body: comment ? `“${comment.slice(0, 120)}” · ${title}` : `${title} · ${t.summary}`,
        url: `/opinions/${o.id}`,
        tag: `vote-${o.id}`,
      });
    } catch {
      // A failed notification never blocks the vote.
    }
  }
  return { ok: true, tally: t };
}
