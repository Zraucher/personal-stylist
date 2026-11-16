import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import {
  decideVerdict,
  resolveColor,
  scoreRules,
  untestableDislikes,
  type Criterion,
  type FabricRule,
  type ScoreColorProfile,
  type ScoreItem,
  type ScoreStyle,
  type Vibe,
} from "@/lib/scorecard/rules";

export const maxDuration = 60;

const MODEL = "claude-opus-5-5";

const VibeSchema = z.object({
  photo_clear: z
    .boolean()
    .describe("False if the photo is too dark, blurry, cropped or ambiguous to judge color and construction. Then no verdict is possible."),
  rating: z
    .enum(["strong", "ok", "weak", "fail"])
    .describe("strong: unmistakably like them. ok: fits. weak: technically fine but not them. fail: wrong for them even if the rules pass."),
  reason: z.string().describe("One sentence. Concrete: name the color, texture or shape you are reacting to."),
  tailoring_needed: z.boolean(),
  tailoring_note: z.string().nullable().describe("What the tailor should do, or null."),
  observed_colors: z
    .array(
      z.object({
        name: z.string().describe("Plain color name, e.g. navy, smoke grey, olive."),
        hex: z.string().describe("Six-digit hex like #1f2a44, the color of the piece itself, not the background or a model's skin."),
      })
    )
    .describe("One to three dominant colors of the piece as it appears in the photo, most dominant first."),
});

type Row = Record<string, unknown>;

const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

function buildSystem(args: {
  name: string;
  color: Row | null;
  style: Row | null;
  universal: string[];
  personal: string[];
  positives: string[];
  negatives: string[];
  untestable: string[];
}): string {
  const { name, color, style, universal, personal, positives, negatives, untestable } = args;
  const lines = [
    `You are ${name}'s personal stylist. You review one piece of clothing from their closet and judge how it sits against their palette, fabric preferences, silhouette preferences and, above all, their vibe.`,
    ``,
    `The rules (palette, fabric, silhouette) are already computed in code and shown to you. Do not redo them. Your job is the fourth criterion, the vibe check, which outranks the other three: does this feel like them, not just does it fit the rules. A piece can pass every rule and still be wrong for them. That is the costliest mistake to repeat.`,
    ``,
    `Their aesthetic: ${(style?.aesthetic_statement as string) ?? "not recorded"}`,
    `Colors: season ${(color?.season_label as string) ?? "unknown"}; best ${list(color?.best_colors).join(", ") || "none listed"}; avoid ${list(color?.avoid_colors).join(", ") || "none listed"}.`,
    `They love: ${list(style?.loves).join("; ") || "not recorded"}.`,
    `They dislike: ${list(style?.dislikes).join("; ") || "not recorded"}.`,
  ];
  if (untestable.length) {
    lines.push(`The code cannot test these dislikes, so you must judge them from the photo: ${untestable.join("; ")}.`);
  }
  lines.push(``, `Universal principles:`, ...universal.map((p) => `- ${p}`));
  if (personal.length) lines.push(``, `Their personal rules:`, ...personal.map((p) => `- ${p}`));
  if (positives.length) lines.push(``, `Looks that proved to work for them:`, ...positives.map((p) => `- ${p}`));
  if (negatives.length) lines.push(``, `Known failures for them:`, ...negatives.map((p) => `- ${p}`));
  lines.push(
    ``,
    `Rules for your answer:`,
    `- Judge only what is visible. Color names lie; the photo is the record.`,
    `- If the photo is not clear enough, set photo_clear to false. Never finalize on incomplete information.`,
    `- Respect their instincts. You assess construction, palette and fit; you do not override their taste.`,
    `- Keep the reason to one concrete sentence. They prefer short over long.`,
    `- Flag tailoring only for fit problems a tailor can fix (hem length, taking in, sleeve length).`
  );
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let itemId: string;
  try {
    const body = (await request.json()) as { itemId?: unknown };
    if (typeof body.itemId !== "string") throw new Error("itemId required");
    itemId = body.itemId;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: item } = await supabase.from("closet_items").select("*").eq("id", itemId).eq("user_id", user.id).maybeSingle();
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [{ data: profile }, { data: color }, { data: style }, { data: principles }, { data: benchmarks }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    supabase.from("color_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("style_prefs").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("principles").select("user_id, rule, sort_order").order("sort_order", { ascending: true }),
    supabase.from("benchmarks").select("label, why_it_works, polarity").eq("user_id", user.id),
  ]);

  const scoreItem: ScoreItem = {
    name: (item.name as string | null) ?? null,
    subcategory: (item.subcategory as string | null) ?? null,
    colors: Array.isArray(item.colors) ? (item.colors as ScoreItem["colors"]) : [],
    pattern: (item.pattern as string | null) ?? null,
    material: (item.material as string | null) ?? null,
    construction: list(item.construction),
  };
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

  let rules = scoreRules(scoreItem, scoreColor, scoreStyle);
  const hasImage = typeof item.image_path === "string" && item.image_path.length > 0;

  let vibe: Vibe = null;
  let photoUnclear = false;
  let tailoringNeeded = item.status === "tailoring";
  let tailoringNote: string | null = (item.tailoring_note as string | null) ?? null;

  if (hasImage) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "scoring_unavailable" }, { status: 503 });
    }
    const { data: blob, error: dlError } = await supabase.storage.from(CLOSET_BUCKET).download(item.image_path as string);
    if (dlError || !blob) return NextResponse.json({ error: "image_not_found" }, { status: 404 });
    const mediaType = (["image/jpeg", "image/png", "image/webp", "image/gif"] as const).find((t) => t === blob.type) ?? "image/jpeg";
    const data = Buffer.from(await blob.arrayBuffer()).toString("base64");

    const rows = (principles ?? []) as Array<{ user_id: string | null; rule: string }>;
    const system = buildSystem({
      name: (profile?.name as string | null) ?? "this person",
      color: color as Row | null,
      style: style as Row | null,
      universal: rows.filter((p) => p.user_id === null).map((p) => p.rule),
      personal: rows.filter((p) => p.user_id !== null).map((p) => p.rule),
      positives: ((benchmarks ?? []) as Row[]).filter((b) => b.polarity === "positive").map((b) => `${b.label}: ${b.why_it_works ?? ""}`),
      negatives: ((benchmarks ?? []) as Row[]).filter((b) => b.polarity === "negative").map((b) => `${b.label}: ${b.why_it_works ?? ""}`),
      untestable: untestableDislikes(scoreStyle),
    });

    const ruleLines = (Object.entries(rules) as Array<[string, Criterion]>).map(([k, v]) => `${k}: ${v.status}. ${v.reason}`).join("\n");
    const tagLine = `Tagged as: ${scoreItem.name ?? "unnamed"} (${scoreItem.subcategory ?? "?"}); colors ${scoreItem.colors.map((c) => c.name).join(", ") || "none"}; material ${scoreItem.material ?? "unknown"}; construction ${scoreItem.construction.join(", ") || "none recorded"}.`;

    try {
      const client = new Anthropic();
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 3000,
        system,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data } },
              { type: "text", text: `${tagLine}\n\nRules already computed:\n${ruleLines}\n\nGive the vibe check for this piece.` },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(VibeSchema) },
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        return NextResponse.json({ error: "could_not_score" }, { status: 422 });
      }
      const out = response.parsed_output;
      photoUnclear = !out.photo_clear;
      vibe = { rating: out.rating, reason: out.reason };

      // A piece with no usable color (none recorded, or a name like "collab colorway")
      // used to stay provisional forever. The photo is the record, so read the color
      // from it, save it on the item, and score the palette for real.
      if (out.photo_clear && !scoreItem.colors.some((c) => resolveColor(c))) {
        const observed = out.observed_colors
          .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex) && c.name.trim())
          .slice(0, 3)
          .map((c) => ({ name: c.name.trim().slice(0, 40), hex: c.hex.toLowerCase() }));
        if (observed.length > 0) {
          scoreItem.colors = observed;
          rules = scoreRules(scoreItem, scoreColor, scoreStyle);
          await supabase.from("closet_items").update({ colors: observed, updated_at: new Date().toISOString() }).eq("id", itemId).eq("user_id", user.id);
        }
      }
      if (out.tailoring_needed) {
        tailoringNeeded = true;
        tailoringNote = out.tailoring_note ?? tailoringNote;
      }
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      if (err instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "scoring_unavailable" }, { status: 503 });
      if (err instanceof Anthropic.APIError) return NextResponse.json({ error: "scoring_failed", detail: err.message }, { status: 502 });
      throw err;
    }
  }

  const { verdict, headline } = decideVerdict(rules, vibe, { hasImage, photoUnclear });
  const vibeStatus = !vibe ? "unknown" : vibe.rating === "strong" ? "good" : vibe.rating === "ok" ? "ok" : vibe.rating === "weak" ? "caution" : "fail";
  const scores = {
    ...rules,
    vibe: { status: vibeStatus, reason: vibe?.reason ?? (hasImage ? "Photo not clear enough to judge." : "Needs a photo.") },
  };

  const { data: saved, error } = await supabase
    .from("scorecards")
    .insert({
      user_id: user.id,
      item_id: itemId,
      verdict,
      headline,
      scores,
      tailoring_needed: tailoringNeeded,
      tailoring_note: tailoringNeeded ? tailoringNote : null,
      model: hasImage ? MODEL : null,
    })
    .select("*")
    .single();
  if (error || !saved) return NextResponse.json({ error: "save_failed", detail: error?.message }, { status: 500 });

  return NextResponse.json({ scorecard: saved });
}
