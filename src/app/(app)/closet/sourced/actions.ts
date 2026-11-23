"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { storeRemotePhoto } from "@/lib/closet/photo";

export type SourcedResult = { ok: true } | { ok: false; error: string };

const PHOTO_ERRORS = {
  link: "We can't use that photo link. Add a photo yourself instead.",
  fetch: "We couldn't get that photo. Try again later, or add one yourself.",
  type: "That link didn't give us a usable photo. Add one yourself instead.",
  size: "That photo is too large. Add a smaller one yourself.",
  upload: "Couldn't save the photo. Try again.",
};

/** Copy the sourced product photo into the user's private folder and attach it. */
export async function acceptSourcedPhoto(itemId: string): Promise<SourcedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Sign in again to save this." };

  const { data: item } = await supabase
    .from("closet_items")
    .select("id, image_path, source_image_url")
    .eq("id", itemId)
    .maybeSingle();
  if (!item || !item.source_image_url) return { ok: false, error: "That photo isn't here anymore. Go back to your closet." };
  if (item.image_path) return { ok: false, error: "This piece already has a photo." };

  const got = await storeRemotePhoto(supabase, user.id, item.source_image_url as string);
  if ("error" in got) return { ok: false, error: PHOTO_ERRORS[got.error] };
  const path = got.path;

  const { error } = await supabase.from("closet_items").update({ image_path: path }).eq("id", itemId);
  if (error) {
    await supabase.storage.from(CLOSET_BUCKET).remove([path]);
    return { ok: false, error: "Couldn't add the photo to this piece. Try again." };
  }

  revalidatePath("/closet");
  revalidatePath("/closet/sourced");
  return { ok: true };
}

/** Wrong match: drop the suggestion so the item waits for a real photo. */
export async function dismissSourcedPhoto(itemId: string): Promise<SourcedResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("closet_items")
    .update({ source_image_url: null, source_page_url: null })
    .eq("id", itemId);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath("/closet");
  revalidatePath("/closet/sourced");
  return { ok: true };
}
