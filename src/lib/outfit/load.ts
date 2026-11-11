import type { SupabaseClient } from "@supabase/supabase-js";
import { checkOutfit, type Composition, type OutfitItem } from "./composition";
import type { FabricRule, ScoreColorProfile, ScoreStyle } from "../scorecard/rules";

const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

/** Loads the pieces plus the wearer's palette and style, and runs the composition check. */
export async function loadAndCheck(
  supabase: SupabaseClient,
  userId: string,
  itemIds: string[]
): Promise<{ composition: Composition; items: OutfitItem[] }> {
  const [{ data: rows }, { data: color }, { data: style }, { data: cards }] = await Promise.all([
    supabase.from("closet_items").select("*").eq("user_id", userId).in("id", itemIds),
    supabase.from("color_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("style_prefs").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("scorecards").select("item_id, verdict").eq("user_id", userId).in("item_id", itemIds).order("created_at", { ascending: false }),
  ]);

  const verdicts = new Map<string, "keep" | "cut" | "provisional">();
  for (const c of cards ?? []) if (!verdicts.has(c.item_id as string)) verdicts.set(c.item_id as string, c.verdict as "keep" | "cut" | "provisional");

  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
  const items: OutfitItem[] = itemIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({
      id: r.id as string,
      name: (r.name as string | null) ?? null,
      subcategory: (r.subcategory as string | null) ?? null,
      category: (r.category as string | null) ?? null,
      colors: Array.isArray(r.colors) ? (r.colors as OutfitItem["colors"]) : [],
      pattern: (r.pattern as string | null) ?? null,
      material: (r.material as string | null) ?? null,
      construction: list(r.construction),
      formality: (r.formality as number | null) ?? null,
      warmth: (r.warmth as number | null) ?? null,
      verdict: verdicts.get(r.id as string) ?? null,
    }));

  const scoreColor: ScoreColorProfile = color
    ? { best_colors: list(color.best_colors), avoid_colors: list(color.avoid_colors), confidence: (color.confidence as string | null) ?? null }
    : null;
  const scoreStyle: ScoreStyle = style
    ? {
        dislikes: list(style.dislikes),
        fabrics_preferred: Array.isArray(style.fabrics_preferred) ? (style.fabrics_preferred as FabricRule[]) : [],
        fabrics_avoid: Array.isArray(style.fabrics_avoid) ? (style.fabrics_avoid as FabricRule[]) : [],
        silhouettes_preferred: list(style.silhouettes_preferred),
        silhouettes_avoid: list(style.silhouettes_avoid),
      }
    : null;

  return { composition: checkOutfit(items, scoreColor, scoreStyle), items };
}
