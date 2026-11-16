"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type R = { ok: true; id?: string } | { ok: false; error: string };

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const Wish = z.object({
  title: z.string().trim().min(1, "Say what you are looking for").max(80),
  preferences: z.string().trim().max(400),
  budget: z.string().trim().max(40),
  colors: z.array(z.string().trim().min(1).max(30)).max(6),
});

export async function addWish(raw: z.input<typeof Wish>): Promise<R> {
  const p = Wish.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the form" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Signed out" };
  const { data, error } = await supabase
    .from("wishlist")
    .insert({ user_id: user.id, category: p.data.title.toLowerCase(), title: p.data.title, preferences: p.data.preferences || null, budget: p.data.budget || null, colors: p.data.colors })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wishlist");
  return { ok: true, id: data.id as string };
}

export async function setWishStatus(id: string, status: "open" | "found" | "dropped"): Promise<R> {
  if (!["open", "found", "dropped"].includes(status)) return { ok: false, error: "Unknown status" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("wishlist").update({ status }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function deleteWish(id: string): Promise<R> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("wishlist").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wishlist");
  return { ok: true };
}

export async function setCandidateState(id: string, state: "new" | "saved" | "dismissed"): Promise<R> {
  if (!["new", "saved", "dismissed"].includes(state)) return { ok: false, error: "Unknown state" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("wishlist_candidates").update({ state }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** The haul that sourcing reviews go into, one per wishlist entry. */
export async function sourcingHaul(wishId: string): Promise<R> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Signed out" };
  const { data: wish } = await supabase.from("wishlist").select("id, title, category").eq("id", wishId).eq("user_id", user.id).maybeSingle();
  if (!wish) return { ok: false, error: "Not found" };
  const label = `Sourcing: ${(wish.title as string | null) ?? (wish.category as string)}`.slice(0, 80);
  const { data: existing } = await supabase.from("hauls").select("id").eq("user_id", user.id).eq("retailer", label).limit(1).maybeSingle();
  if (existing) return { ok: true, id: existing.id as string };
  const { data, error } = await supabase
    .from("hauls")
    .insert({ user_id: user.id, retailer: label, status: "considering", date: new Date().toISOString().slice(0, 10), notes: "Products found from the wishlist." })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

export async function upcomingStatus(id: string, status: "open" | "styled" | "done"): Promise<R> {
  if (!["open", "styled", "done"].includes(status)) return { ok: false, error: "Unknown status" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("upcoming_needs").update({ status }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/wishlist");
  return { ok: true };
}
