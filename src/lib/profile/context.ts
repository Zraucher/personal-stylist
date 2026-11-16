import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FabricRule, ScoreColorProfile, ScoreStyle } from "@/lib/scorecard/rules";

type Row = Record<string, unknown>;
const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

export type StyleContext = {
  name: string;
  location: string | null;
  presentation: "womens" | "mens" | "both";
  latitude: number | null;
  longitude: number | null;
  color: Row | null;
  style: Row | null;
  scoreColor: ScoreColorProfile;
  scoreStyle: ScoreStyle;
  universal: string[];
  personal: string[];
  positives: string[];
  negatives: string[];
  lovedBrands: string[];
};

/** Everything the stylist needs to know about one person, loaded once per request. */
export async function loadStyleContext(supabase: SupabaseClient, userId: string): Promise<StyleContext> {
  const [{ data: profile }, { data: color }, { data: style }, { data: principles }, { data: benchmarks }, { data: brands }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("color_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("style_prefs").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("principles").select("user_id, rule, sort_order").order("sort_order", { ascending: true }),
    supabase.from("benchmarks").select("label, why_it_works, polarity").eq("user_id", userId),
    supabase.from("brands").select("name, status").eq("user_id", userId),
  ]);
  const rows = (principles ?? []) as Array<{ user_id: string | null; rule: string }>;
  const bench = (benchmarks ?? []) as Row[];
  const num = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    name: (profile?.name as string | null) ?? "this person",
    location: (profile?.location as string | null) ?? null,
    presentation: ((profile?.presentation as string) ?? "both") as StyleContext["presentation"],
    latitude: num(profile?.latitude),
    longitude: num(profile?.longitude),
    color: (color as Row | null) ?? null,
    style: (style as Row | null) ?? null,
    scoreColor: color
      ? { best_colors: list(color.best_colors), avoid_colors: list(color.avoid_colors), confidence: (color.confidence as string | null) ?? null }
      : null,
    scoreStyle: style
      ? {
          dislikes: list(style.dislikes),
          fabrics_preferred: Array.isArray(style.fabrics_preferred) ? (style.fabrics_preferred as FabricRule[]) : [],
          fabrics_avoid: Array.isArray(style.fabrics_avoid) ? (style.fabrics_avoid as FabricRule[]) : [],
          silhouettes_preferred: list(style.silhouettes_preferred),
          silhouettes_avoid: list(style.silhouettes_avoid),
        }
      : null,
    universal: rows.filter((p) => p.user_id === null).map((p) => p.rule),
    personal: rows.filter((p) => p.user_id !== null).map((p) => p.rule),
    positives: bench.filter((b) => b.polarity === "positive").map((b) => `${b.label}: ${b.why_it_works ?? ""}`),
    negatives: bench.filter((b) => b.polarity === "negative").map((b) => `${b.label}: ${b.why_it_works ?? ""}`),
    lovedBrands: ((brands ?? []) as Row[]).filter((b) => b.status === "loved").map((b) => b.name as string),
  };
}

/** A short plain-text portrait of the person, for prompts. */
export function describeStyle(ctx: StyleContext): string {
  const s = ctx.style;
  return [
    `Aesthetic: ${(s?.aesthetic_statement as string) ?? "not recorded"}`,
    `Best colors: ${ctx.scoreColor?.best_colors.join(", ") || "none listed"}. Avoid: ${ctx.scoreColor?.avoid_colors.join(", ") || "none listed"}.`,
    `Loves: ${list(s?.loves).join("; ") || "not recorded"}.`,
    `Dislikes: ${list(s?.dislikes).join("; ") || "not recorded"}.`,
    ctx.personal.length ? `Personal rules: ${ctx.personal.join(" ")}` : "",
    ctx.universal.length ? `Universal principles: ${ctx.universal.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
