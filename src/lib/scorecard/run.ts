import "server-only";
import { z } from "zod";
import { MODELS, structured } from "@/lib/ai/claude";
import type { StyleContext } from "@/lib/profile/context";
import { decideVerdict, resolveColor, scoreRules, untestableDislikes, type Criterion, type ScoreItem, type Verdict, type Vibe } from "./rules";

// The full scorecard for one piece, owned or not: rules in code, vibe from Claude
// with the photo, verdict from both. Shared by the closet scorecard and haul review.

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

function buildSystem(ctx: StyleContext, untestable: string[], owned: boolean): string {
  const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);
  const lines = [
    `You are ${ctx.name}'s personal stylist. You review one piece of clothing ${owned ? "from their closet" : "they are thinking of buying"} and judge how it sits against their palette, fabric preferences, silhouette preferences and, above all, their vibe.`,
    ``,
    `The rules (palette, fabric, silhouette) are already computed in code and shown to you. Do not redo them. Your job is the fourth criterion, the vibe check, which outranks the other three: does this feel like them, not just does it fit the rules. A piece can pass every rule and still be wrong for them. That is the costliest mistake to repeat.`,
    ``,
    `Their aesthetic: ${(ctx.style?.aesthetic_statement as string) ?? "not recorded"}`,
    `Colors: season ${(ctx.color?.season_label as string) ?? "unknown"}; best ${list(ctx.color?.best_colors).join(", ") || "none listed"}; avoid ${list(ctx.color?.avoid_colors).join(", ") || "none listed"}.`,
    `They love: ${list(ctx.style?.loves).join("; ") || "not recorded"}.`,
    `They dislike: ${list(ctx.style?.dislikes).join("; ") || "not recorded"}.`,
  ];
  if (untestable.length) lines.push(`The code cannot test these dislikes, so you must judge them from the photo: ${untestable.join("; ")}.`);
  lines.push(``, `Universal principles:`, ...ctx.universal.map((p) => `- ${p}`));
  if (ctx.personal.length) lines.push(``, `Their personal rules:`, ...ctx.personal.map((p) => `- ${p}`));
  if (ctx.positives.length) lines.push(``, `Looks that proved to work for them:`, ...ctx.positives.map((p) => `- ${p}`));
  if (ctx.negatives.length) lines.push(``, `Known failures for them:`, ...ctx.negatives.map((p) => `- ${p}`));
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

export type ScorecardResult = {
  verdict: Verdict;
  headline: string;
  scores: Record<string, { status: string; reason: string; hard?: boolean }>;
  tailoringNeeded: boolean;
  tailoringNote: string | null;
  /** Colors read from the photo when the item had none usable; the caller may save them. */
  filledColors: Array<{ name: string; hex: string }> | null;
};

/**
 * Score a piece. `image` null means no photo: the verdict is provisional and no AI call is made.
 * Throws AiError when the vibe call fails.
 */
export async function runScorecard(
  ctx: StyleContext,
  item: ScoreItem,
  image: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" } | null,
  opts: { owned?: boolean; tailoring?: { needed: boolean; note: string | null }; extraText?: string } = {}
): Promise<ScorecardResult> {
  const scoreItem: ScoreItem = { ...item, colors: [...item.colors] };
  let rules = scoreRules(scoreItem, ctx.scoreColor, ctx.scoreStyle);
  let vibe: Vibe = null;
  let photoUnclear = false;
  let tailoringNeeded = opts.tailoring?.needed ?? false;
  let tailoringNote = opts.tailoring?.note ?? null;
  let filledColors: ScorecardResult["filledColors"] = null;

  if (image) {
    const ruleLines = (Object.entries(rules) as Array<[string, Criterion]>).map(([k, v]) => `${k}: ${v.status}. ${v.reason}`).join("\n");
    const tagLine = `Tagged as: ${scoreItem.name ?? "unnamed"} (${scoreItem.subcategory ?? "?"}); colors ${scoreItem.colors.map((c) => c.name).join(", ") || "none"}; material ${scoreItem.material ?? "unknown"}; construction ${scoreItem.construction.join(", ") || "none recorded"}.`;
    const out = await structured({
      schema: VibeSchema,
      system: buildSystem(ctx, untestableDislikes(ctx.scoreStyle), opts.owned ?? true),
      text: `${tagLine}${opts.extraText ? `\n${opts.extraText}` : ""}\n\nRules already computed:\n${ruleLines}\n\nGive the vibe check for this piece.`,
      images: [image],
      model: MODELS.judge,
    });
    photoUnclear = !out.photo_clear;
    vibe = { rating: out.rating, reason: out.reason };
    // A piece with no usable color (none recorded, or "collab colorway") would stay provisional
    // forever. The photo is the record, so read the color from it and score the palette for real.
    if (out.photo_clear && !scoreItem.colors.some((c) => resolveColor(c))) {
      const observed = out.observed_colors
        .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex) && c.name.trim())
        .slice(0, 3)
        .map((c) => ({ name: c.name.trim().slice(0, 40), hex: c.hex.toLowerCase() }));
      if (observed.length) {
        scoreItem.colors = observed;
        rules = scoreRules(scoreItem, ctx.scoreColor, ctx.scoreStyle);
        filledColors = observed;
      }
    }
    if (out.tailoring_needed) {
      tailoringNeeded = true;
      tailoringNote = out.tailoring_note ?? tailoringNote;
    }
  }

  const { verdict, headline } = decideVerdict(rules, vibe, { hasImage: !!image, photoUnclear });
  const vibeStatus = !vibe ? "unknown" : vibe.rating === "strong" ? "good" : vibe.rating === "ok" ? "ok" : vibe.rating === "weak" ? "caution" : "fail";
  return {
    verdict,
    headline,
    scores: { ...rules, vibe: { status: vibeStatus, reason: vibe?.reason ?? (image ? "Photo not clear enough to judge." : "Needs a photo.") } },
    tailoringNeeded,
    tailoringNote: tailoringNeeded ? tailoringNote : null,
    filledColors,
  };
}
