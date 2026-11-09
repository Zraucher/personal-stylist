import type { SupabaseClient } from "@supabase/supabase-js";

export const CLOSET_BUCKET = "closet";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Signed URLs for private closet images, keyed by storage path.
 * The bucket is private and RLS keeps each user inside their own folder,
 * so the signing itself is the access check.
 */
export async function signedImageUrls(
  supabase: SupabaseClient,
  paths: Array<string | null | undefined>
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => typeof p === "string" && p.length > 0)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(CLOSET_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}
