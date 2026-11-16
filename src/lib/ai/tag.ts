import "server-only";
import { z } from "zod";
import { CATEGORIES, CONSTRUCTION, SEASONS, SUBCATEGORIES } from "@/lib/closet/taxonomy";
import { MODELS, structured } from "./claude";

export const TagSchema = z.object({
  name: z.string().describe("Short shopper-style name, e.g. 'Olive linen camp-collar shirt'. No brand guesses."),
  category: z.enum(CATEGORIES),
  subcategory: z.string().describe("One of the listed subcategories for the category when it fits, otherwise a short plain word."),
  colors: z
    .array(
      z.object({
        name: z.string().describe("Plain color word a shopper would use: olive, bronze, deep navy, ivory."),
        hex: z.string().describe("Six-digit hex approximating the true fabric color, e.g. #6b705c."),
      })
    )
    .min(1)
    .max(4)
    .describe("Dominant color first. Only colors that cover a meaningful area."),
  pattern: z.string().nullable().describe("null if solid; otherwise stripe, gingham, floral, paisley, check, print..."),
  material: z.string().nullable().describe("Best guess from texture and drape (cotton, linen, silk, satin, denim, wool knit, performance knit). null if unsure."),
  construction: z.array(z.enum(CONSTRUCTION)).describe("Only details that are clearly visible."),
  formality: z.number().int().min(1).max(5).describe("1 lounge, 2 casual, 3 smart casual, 4 business, 5 formal."),
  warmth: z.number().int().min(1).max(5).describe("1 hot weather, 2 warm, 3 mild, 4 cool, 5 cold."),
  seasons: z.array(z.enum(SEASONS)).min(1).describe("Seasons it is comfortable to wear. Use ['all'] for year-round."),
  notes: z.string().describe("One sentence on what is visible that the fields do not capture: fit, finish, condition, anything that would matter to a stylist."),
});

export type GarmentTags = z.infer<typeof TagSchema>;

const SUBCATEGORY_GUIDE = CATEGORIES.map((c) => `${c}: ${SUBCATEGORIES[c].join(", ")}`).join("\n");

export const TAG_SYSTEM = `You tag photos of clothing for a private personal-stylist app. Report only what is visible in the image. Color names lie on retailer sites, so your hex and name are the record of truth for this garment: judge the fabric color itself, not the lighting or the background. If the photo shows a person wearing several pieces, tag the single most prominent garment. If it shows a flat lay or hanger shot, tag that garment.

Subcategories by category:
${SUBCATEGORY_GUIDE}`;

/** Tag one garment photo. `hint` adds retailer text (title, stated color) as context, never as truth. */
export async function tagImage(
  image: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" },
  opts: { hint?: string; model?: string } = {}
): Promise<GarmentTags> {
  const text = opts.hint
    ? `Tag this garment. Retailer text for context only (it may be wrong about color): ${opts.hint}`
    : "Tag this garment.";
  return structured({ schema: TagSchema, system: TAG_SYSTEM, text, images: [image], model: opts.model ?? MODELS.judge, maxTokens: 4000 });
}
