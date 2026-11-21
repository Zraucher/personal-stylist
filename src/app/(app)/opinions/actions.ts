"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildSnapshot, newToken, siteOrigin } from "@/lib/opinions/server";

const Input = z.union([
  z.object({ kind: z.literal("outfit"), outfitId: z.string().uuid(), question: z.string().trim().max(200).optional() }),
  z.object({ kind: z.literal("find"), candidateId: z.string().uuid(), question: z.string().trim().max(200).optional() }),
]);

export type AskResult = { ok: true; id: string; url: string; title: string } | { ok: false; error: string };

/** Create (or reuse) a share link that asks friends whether a look or a find works on you. */
export async function askForOpinion(raw: z.input<typeof Input>): Promise<AskResult> {
  const p = Input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Nothing to share." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Signed out" };
  const origin = siteOrigin(await headers());
  const question = p.data.question || null;

  // One open ask per look or find: sharing again reuses the same link and keeps the votes.
  const col = p.data.kind === "outfit" ? "outfit_id" : "candidate_id";
  const targetId = p.data.kind === "outfit" ? p.data.outfitId : p.data.candidateId;
  const { data: existing } = await supabase
    .from("second_opinions")
    .select("id, token, snapshot")
    .eq("user_id", user.id)
    .eq(col, targetId)
    .gt("closes_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    if (question) await supabase.from("second_opinions").update({ question }).eq("id", existing.id).eq("user_id", user.id);
    return { ok: true, id: existing.id as string, url: `${origin}/o/${existing.token}`, title: ((existing.snapshot as { title?: string })?.title ?? "my look") };
  }

  const snapshot = await buildSnapshot(supabase, user.id, p.data.kind === "outfit" ? { kind: "outfit", outfitId: p.data.outfitId } : { kind: "find", candidateId: p.data.candidateId });
  if (!snapshot) return { ok: false, error: "That look is no longer in your closet." };
  const { count } = await supabase.from("second_opinions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gt("created_at", new Date(Date.now() - 86400000).toISOString());
  if ((count ?? 0) >= 30) return { ok: false, error: "That's a lot of asks today. Try again tomorrow." };

  const token = newToken();
  const { data, error } = await supabase
    .from("second_opinions")
    .insert({ user_id: user.id, token, kind: p.data.kind, [col]: targetId, question, snapshot })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not create the link." };
  revalidatePath("/opinions");
  return { ok: true, id: data.id as string, url: `${origin}/o/${token}`, title: snapshot.title };
}

export async function closeOpinion(id: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Unknown ask" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  await supabase.from("second_opinions").update({ closes_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/opinions");
  revalidatePath(`/opinions/${id}`);
  return {};
}

export async function deleteOpinion(id: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Unknown ask" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  await supabase.from("second_opinions").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/opinions");
  return {};
}
