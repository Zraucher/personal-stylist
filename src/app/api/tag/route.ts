import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { CATEGORIES, CONSTRUCTION, SEASONS, SUBCATEGORIES } from "@/lib/closet/taxonomy";

export const maxDuration = 60;

const TagSchema = z.object({
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

const SYSTEM = `You tag photos of clothing for a private personal-stylist app. Report only what is visible in the image. Color names lie on retailer sites, so your hex and name are the record of truth for this garment: judge the fabric color itself, not the lighting or the background. If the photo shows a person wearing several pieces, tag the single most prominent garment. If it shows a flat lay or hanger shot, tag that garment.

Subcategories by category:
${SUBCATEGORY_GUIDE}`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "tagging_unavailable" }, { status: 503 });
  }

  let path: string;
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path !== "string") throw new Error("path required");
    path = body.path;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // Storage RLS already scopes to the user's folder; this check gives a clearer error.
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: blob, error: dlError } = await supabase.storage.from(CLOSET_BUCKET).download(path);
  if (dlError || !blob) return NextResponse.json({ error: "image_not_found" }, { status: 404 });

  const mediaType = (["image/jpeg", "image/png", "image/webp", "image/gif"] as const).find((t) => t === blob.type) ?? "image/jpeg";
  const data = Buffer.from(await blob.arrayBuffer()).toString("base64");

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: "Tag this garment." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(TagSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: "could_not_tag" }, { status: 422 });
    }
    return NextResponse.json({ tags: response.parsed_output });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "tagging_unavailable" }, { status: 503 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "tagging_failed", detail: err.message }, { status: 502 });
    }
    throw err;
  }
}
