import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildTaste, type RatedOutfit, type Taste, type TastePiece } from "./profile";
import type { PieceSlot, TasteRating } from "./reasons";

const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

/** A person's Outfit Lab ratings, newest first. Empty (not an error) if the tables aren't there yet. */
export async function loadRatings(supabase: SupabaseClient, userId: string): Promise<RatedOutfit[]> {
  const { data, error } = await supabase
    .from("outfit_ratings")
    .select("item_ids, rating, reasons, outfit_slot_ratings(slot, item_ids, rating, reasons, replacement_item_id, no_match)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500); // shortcut: newest 500 ratings only; move to a stored profile if people rate more
  if (error) {
    console.error("loadRatings failed", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    itemIds: list(r.item_ids),
    rating: r.rating as TasteRating,
    reasons: list(r.reasons),
    slots: ((r.outfit_slot_ratings as Array<Record<string, unknown>> | null) ?? []).map((s) => ({
      slot: s.slot as PieceSlot,
      rating: s.rating as TasteRating,
      reasons: list(s.reasons),
      itemIds: list(s.item_ids),
      replacementId: (s.replacement_item_id as string | null) ?? null,
      noMatch: !!s.no_match,
    })),
  }));
}

/** The taste profile for the engine, or undefined when there are no ratings (engine output unchanged). */
export async function loadTaste(supabase: SupabaseClient, userId: string, closet: TastePiece[]): Promise<Taste | undefined> {
  const rated = await loadRatings(supabase, userId);
  return rated.length ? buildTaste(rated, closet) : undefined;
}
