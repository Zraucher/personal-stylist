import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeUrl } from "@/lib/retail/scrape";
import { CLOSET_BUCKET } from "./images";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export type PhotoType = "image/jpeg" | "image/png" | "image/webp";

/** Copy a store's product photo into the person's private closet folder. */
export async function storeRemotePhoto(
  supabase: SupabaseClient,
  userId: string,
  link: string
): Promise<{ path: string; bytes: ArrayBuffer; type: PhotoType } | { error: "link" | "fetch" | "type" | "size" | "upload" }> {
  const url = safeUrl(link);
  if (!url) return { error: "link" };
  let bytes: ArrayBuffer;
  let type: string;
  try {
    const res = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/jpeg,image/png,image/webp" },
    });
    if (!res.ok) return { error: "fetch" };
    type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type === "image/jpg" || type === "image/pjpeg") type = "image/jpeg";
    if (!TYPES[type]) return { error: "type" };
    bytes = await res.arrayBuffer();
  } catch {
    return { error: "fetch" };
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return { error: "size" };
  const path = `${userId}/${crypto.randomUUID()}.${TYPES[type]}`;
  const { error } = await supabase.storage.from(CLOSET_BUCKET).upload(path, bytes, { contentType: type });
  if (error) return { error: "upload" };
  return { path, bytes, type: type as PhotoType };
}
