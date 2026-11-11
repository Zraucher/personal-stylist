"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loadAndCheck } from "@/lib/outfit/load";
import type { Composition } from "@/lib/outfit/composition";

const MAX_PIECES = 10;

const clean = (ids: string[]) => Array.from(new Set(ids.filter((i) => typeof i === "string"))).slice(0, MAX_PIECES);

/** Live check while building. Nothing is saved. */
export async function checkOutfitAction(itemIds: string[]): Promise<{ composition?: Composition; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  const ids = clean(itemIds);
  if (ids.length === 0) return {};
  const { composition } = await loadAndCheck(supabase, user.id, ids);
  return { composition };
}

/** Saves an outfit with the composition check that was true when it was saved. */
export async function saveOutfit(input: { itemIds: string[]; name?: string; occasion?: string }): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };

  const ids = clean(input.itemIds);
  if (ids.length < 2) return { error: "Pick at least two pieces" };

  const { composition, items } = await loadAndCheck(supabase, user.id, ids);
  if (items.length !== ids.length) return { error: "Some pieces are no longer in your closet" };

  const { data, error } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      item_ids: ids,
      name: input.name?.trim() ? input.name.trim().slice(0, 80) : null,
      occasion: input.occasion?.trim() ? input.occasion.trim().slice(0, 80) : null,
      source: "user",
      composition_notes: composition.headline,
      composition,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/outfits");
  return { id: data.id as string };
}

export async function deleteOutfit(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };
  const { error } = await supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/outfits");
  return {};
}
