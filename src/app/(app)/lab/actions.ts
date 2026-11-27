"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/today/weather";
import { REASON_IDS } from "@/lib/taste/reasons";

const Rating = z.enum(["love", "neutral", "not"]);
const Reasons = z.array(z.string().refine((r) => REASON_IDS.has(r))).max(16);
const Id = z.string().uuid();

const Input = z.object({
  itemIds: z.array(Id).min(1).max(12),
  occasion: z.enum(["office", "casual", "dinner", "event", "active", "travel"]).nullable(),
  source: z.enum(["lab", "daily"]),
  weather: z
    .object({ feelsMin: z.number(), feelsMax: z.number(), season: z.enum(["spring", "summer", "fall", "winter"]), label: z.string().max(60) })
    .nullable(),
  rating: Rating,
  reasons: Reasons,
  slots: z
    .array(
      z.object({
        slot: z.enum(["top", "bottom", "footwear", "accessories"]),
        itemIds: z.array(Id).min(1).max(12),
        rating: Rating,
        reasons: Reasons,
        replacedItemId: Id.nullable(),
        replacementItemId: Id.nullable(),
        noMatch: z.boolean(),
      })
    )
    .max(4),
});

export type LabRatingInput = z.input<typeof Input>;

/** Save one rated outfit and its rows. Every piece must be in the signed-in person's closet. */
export async function saveLabRating(raw: LabRatingInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = Input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Couldn't save that. Try again." };
  const d = p.data;
  if (d.slots.some((s) => s.itemIds.some((id) => !d.itemIds.includes(id)) || (s.noMatch && s.replacementItemId))) {
    return { ok: false, error: "Couldn't save that. Try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Sign in again to save this." };

  const ids = [...new Set([...d.itemIds, ...d.slots.flatMap((s) => [s.replacedItemId, s.replacementItemId].filter((x): x is string => !!x))])];
  const { data: owned } = await supabase.from("closet_items").select("id").eq("user_id", user.id).in("id", ids);
  if ((owned ?? []).length !== ids.length) return { ok: false, error: "Some of those pieces aren't in your closet anymore." };

  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const today = localDate((prof?.timezone as string | null) ?? null);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();

  // Daily outfits are rated for the real day: keep its saved forecast when there is one.
  let weather: unknown = d.weather;
  if (d.source === "daily") {
    const { data: day } = await supabase.from("day_profiles").select("weather").eq("user_id", user.id).eq("date", today).maybeSingle();
    weather = day?.weather ?? null;
  }

  const { data: row, error } = await supabase
    .from("outfit_ratings")
    .insert({
      user_id: user.id,
      item_ids: d.itemIds,
      occasion: d.occasion,
      day_type: dow === 0 || dow === 6 ? "weekend" : "weekday",
      weather,
      source: d.source,
      rating: d.rating,
      reasons: d.reasons,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("saveLabRating: outfit insert failed", error?.message);
    return { ok: false, error: "Couldn't save that. Try again." };
  }

  if (d.slots.length) {
    const { error: slotErr } = await supabase.from("outfit_slot_ratings").insert(
      d.slots.map((s) => ({
        outfit_rating_id: row.id,
        user_id: user.id,
        slot: s.slot,
        item_ids: s.itemIds,
        rating: s.rating,
        reasons: s.reasons,
        replaced_item_id: s.replacedItemId,
        replacement_item_id: s.replacementItemId,
        no_match: s.noMatch,
      }))
    );
    if (slotErr) {
      console.error("saveLabRating: slot insert failed", slotErr.message);
      await supabase.from("outfit_ratings").delete().eq("id", row.id).eq("user_id", user.id);
      return { ok: false, error: "Couldn't save that. Try again." };
    }
  }
  return { ok: true };
}
