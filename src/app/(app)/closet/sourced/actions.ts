"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";

export type SourcedResult = { ok: true } | { ok: false; error: string };

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Only plain public https hosts. No IP literals, no local names.
function safeUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
  if (h === "localhost" || /\.(local|internal|localhost|lan|home)$/.test(h)) return null;
  return u;
}

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

  const url = safeUrl(item.source_image_url as string);
  if (!url) return { ok: false, error: "We can't use that photo link. Add a photo yourself instead." };

  let bytes: ArrayBuffer;
  let type: string;
  try {
    const res = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/jpeg,image/png,image/webp" },
    });
    if (!res.ok) return { ok: false, error: "We couldn't get that photo. Try again later, or add one yourself." };
    type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type === "image/jpg" || type === "image/pjpeg") type = "image/jpeg";
    if (!TYPES[type]) return { ok: false, error: "That link didn't give us a usable photo. Add one yourself instead." };
    bytes = await res.arrayBuffer();
  } catch {
    return { ok: false, error: "We couldn't get that photo. Try again later, or add one yourself." };
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return { ok: false, error: "That photo is too large. Add a smaller one yourself." };

  const path = `${user.id}/${crypto.randomUUID()}.${TYPES[type]}`;
  const { error: upError } = await supabase.storage.from(CLOSET_BUCKET).upload(path, bytes, { contentType: type });
  if (upError) return { ok: false, error: "Couldn't save the photo. Try again." };

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
