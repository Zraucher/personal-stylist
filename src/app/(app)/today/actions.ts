"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/today/weather";
import { recordWear } from "@/lib/wear";
import { loadWeekState, savePlanDay } from "@/lib/plan/server";
import { checkOutfit } from "@/lib/outfit/composition";
import type { Occasion } from "@/lib/today/candidates";

const Input = z.object({
  recommendationId: z.string().uuid(),
  outfitId: z.string().uuid(),
  type: z.enum(["wore", "skipped", "disliked", "benchmark", "failure"]),
  note: z.string().trim().max(400).optional(),
});

/**
 * Feedback on a recommended outfit. Wore marks the day's choice, updates last worn and
 * nudges affinity up; Not me nudges it down; "Exactly me" and "Felt like a costume"
 * become benchmarks the vibe check sees next time.
 */
export async function respondToOutfit(raw: z.input<typeof Input>): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = Input.safeParse(raw);
  if (!p.success) return { ok: false, error: "Couldn't save that. Try again." };
  const { recommendationId, outfitId, type, note } = p.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Sign in again to save this." };

  const { data: outfit } = await supabase.from("outfits").select("id, name, item_ids, composition_notes").eq("id", outfitId).eq("user_id", user.id).maybeSingle();
  if (!outfit) return { ok: false, error: "That outfit isn't in your closet anymore." };
  const itemIds = (outfit.item_ids as string[]) ?? [];

  const { error } = await supabase.from("feedback").insert({ user_id: user.id, target: "outfit", target_id: outfitId, type, note: note || null });
  if (error) {
    console.error("respondToOutfit: feedback insert failed", error.message);
    return { ok: false, error: "Couldn't save that. Try again." };
  }

  if (type === "wore") {
    const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
    const today = localDate((prof?.timezone as string | null) ?? null);
    await recordWear(supabase, user.id, itemIds, today, { outfitId, affinity: 0.5 });
    await supabase.from("recommendations").update({ chosen_outfit_id: outfitId }).eq("id", recommendationId).eq("user_id", user.id);
  }
  if (type === "disliked") {
    const { data: rows } = await supabase.from("closet_items").select("id, affinity").in("id", itemIds).eq("user_id", user.id);
    for (const r of rows ?? []) {
      const affinity = Math.max(-5, Math.min(5, Number(r.affinity ?? 0) - 0.5));
      await supabase.from("closet_items").update({ affinity }).eq("id", r.id).eq("user_id", user.id);
    }
  }

  if (type === "benchmark" || type === "failure") {
    await supabase.from("benchmarks").insert({
      user_id: user.id,
      label: (outfit.name as string) ?? "Outfit",
      why_it_works: note || (outfit.composition_notes as string | null) || (type === "benchmark" ? "Felt exactly like me." : "Felt like a costume."),
      polarity: type === "benchmark" ? "positive" : "negative",
    });
  }

  revalidatePath("/today");
  return { ok: true };
}

/** "Wear this" on the outfit of the day: plans it for today through the same path as the Plan page. */
export async function wearDailyOutfit(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out. Sign in again to save this." };

  try {
    const s = await loadWeekState(supabase, user.id);
    const { data: daily } = await supabase.from("daily_outfits").select("item_ids, occasion").eq("user_id", user.id).eq("date", s.today).maybeSingle();
    if (!daily) return { ok: false, error: "Today's pick isn't ready. Reload the page and try again." };
    if (s.plans.get(s.today)?.worn) return { ok: false, error: "You've already worn today's outfit." };
    const ids = (daily.item_ids as string[]) ?? [];
    const items = ids.map((id) => s.closet.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
    if (items.length !== ids.length) return { ok: false, error: "A piece in this outfit has left your closet. Pick outfits below instead." };
    await savePlanDay(supabase, user.id, s, s.today, daily.occasion as Occasion, { items, composition: checkOutfit(items, s.ctx.scoreColor, s.ctx.scoreStyle), score: 0, layered: false });
  } catch (e) {
    console.error("wearDailyOutfit failed", e);
    return { ok: false, error: "Couldn't save that. Try again." };
  }
  revalidatePath("/today");
  return { ok: true };
}
