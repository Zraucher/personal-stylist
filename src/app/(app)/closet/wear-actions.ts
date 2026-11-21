"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/today/weather";
import { recordWear } from "@/lib/wear";

/** "Wore it today" from a piece's page. */
export async function markWorn(itemId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(itemId).success) return { error: "Unknown piece" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  await recordWear(supabase, user.id, [itemId], localDate((prof?.timezone as string | null) ?? null), { affinity: 0.25 });
  revalidatePath(`/closet/${itemId}`);
  return {};
}

/** Undo today's wear for a piece (a mistaken tap). */
export async function unmarkWorn(itemId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(itemId).success) return { error: "Unknown piece" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const today = localDate((prof?.timezone as string | null) ?? null);
  const { data: removed } = await supabase.from("wear_log").delete().eq("user_id", user.id).eq("item_id", itemId).eq("worn_on", today).select("id");
  if (!removed?.length) return {};
  const { data: item } = await supabase.from("closet_items").select("affinity").eq("id", itemId).eq("user_id", user.id).maybeSingle();
  if (item) await supabase.from("closet_items").update({ affinity: Math.max(-5, Number(item.affinity ?? 0) - 0.25) }).eq("id", itemId).eq("user_id", user.id);
  const { data: prev } = await supabase.from("wear_log").select("worn_on").eq("user_id", user.id).eq("item_id", itemId).order("worn_on", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("closet_items").update({ last_worn: (prev?.worn_on as string | undefined) ?? null }).eq("id", itemId).eq("user_id", user.id);
  revalidatePath(`/closet/${itemId}`);
  return {};
}

/** What the piece cost, for cost per wear. Empty clears it. */
export async function setItemPrice(itemId: string, raw: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(itemId).success) return { error: "Unknown piece" };
  const text = raw.replace(/[$,\s]/g, "");
  const price = text === "" ? null : Number(text);
  if (price != null && (!Number.isFinite(price) || price < 0 || price > 100000)) return { error: "Enter a price like 79 or 79.50" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  const { error } = await supabase.from("closet_items").update({ price: price == null ? null : Math.round(price * 100) / 100 }).eq("id", itemId).eq("user_id", user.id);
  if (error) return { error: "Could not save the price." };
  revalidatePath(`/closet/${itemId}`);
  return {};
}
