import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Record that pieces were worn on a date: one wear-log row per piece per day, last worn moves
 * forward, and affinity rises a little so liked pieces come up more often.
 */
export async function recordWear(
  supabase: SupabaseClient,
  userId: string,
  itemIds: string[],
  date: string,
  opts: { outfitId?: string | null; affinity?: number } = {}
): Promise<void> {
  const ids = [...new Set(itemIds)].slice(0, 12);
  if (!ids.length) return;
  const { data: rows } = await supabase.from("closet_items").select("id, affinity, last_worn").in("id", ids).eq("user_id", userId);
  const owned = rows ?? [];
  if (!owned.length) return;
  const { data: already } = await supabase.from("wear_log").select("item_id").eq("user_id", userId).eq("worn_on", date).in("item_id", owned.map((r) => r.id as string));
  const logged = new Set((already ?? []).map((r) => r.item_id as string));
  await supabase
    .from("wear_log")
    .upsert(
      owned.map((r) => ({ user_id: userId, item_id: r.id as string, worn_on: date, outfit_id: opts.outfitId ?? null })),
      { onConflict: "user_id,item_id,worn_on", ignoreDuplicates: true }
    );
  const delta = opts.affinity ?? 0;
  for (const r of owned) {
    const patch: Record<string, unknown> = {};
    if (!r.last_worn || (r.last_worn as string) < date) patch.last_worn = date;
    // Affinity moves once per piece per day, so double taps and retries don't inflate it.
    if (delta && !logged.has(r.id as string)) patch.affinity = Math.max(-5, Math.min(5, Number(r.affinity ?? 0) + delta));
    if (Object.keys(patch).length) await supabase.from("closet_items").update(patch).eq("id", r.id).eq("user_id", userId);
  }
}
