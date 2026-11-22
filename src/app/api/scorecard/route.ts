import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { AiError, aiAvailable, blobToImage, MODELS } from "@/lib/ai/claude";
import { loadStyleContext } from "@/lib/profile/context";
import { runScorecard } from "@/lib/scorecard/run";
import type { ScoreItem } from "@/lib/scorecard/rules";

export const maxDuration = 60;

const list = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === "string") : []);

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

  const hasImage = typeof item.image_path === "string" && item.image_path.length > 0;
  let image = null;
  if (hasImage) {
    if (!aiAvailable()) return NextResponse.json({ error: "scoring_unavailable" }, { status: 503 });
    const { data: blob, error: dlError } = await supabase.storage.from(CLOSET_BUCKET).download(item.image_path as string);
    if (dlError || !blob) return NextResponse.json({ error: "image_not_found" }, { status: 404 });
    image = await blobToImage(blob);
  }

  const ctx = await loadStyleContext(supabase, user.id);
  const scoreItem: ScoreItem = {
    name: (item.name as string | null) ?? null,
    subcategory: (item.subcategory as string | null) ?? null,
    colors: Array.isArray(item.colors) ? (item.colors as ScoreItem["colors"]) : [],
    pattern: (item.pattern as string | null) ?? null,
    material: (item.material as string | null) ?? null,
    construction: list(item.construction),
  };

  let result;
  try {
    result = await runScorecard(ctx, scoreItem, image, {
      owned: true,
      tailoring: { needed: item.status === "tailoring", note: (item.tailoring_note as string | null) ?? null },
    });
  } catch (err) {
    if (err instanceof AiError) {
      const map = { unavailable: [503, "scoring_unavailable"], rate_limited: [429, "rate_limited"], refused: [422, "could_not_score"], failed: [502, "scoring_failed"] } as const;
      const [status, error] = map[err.code];
      return NextResponse.json({ error }, { status });
    }
    throw err;
  }

  if (result.filledColors) {
    await supabase.from("closet_items").update({ colors: result.filledColors, updated_at: new Date().toISOString() }).eq("id", itemId).eq("user_id", user.id);
  }

  const { data: saved, error } = await supabase
    .from("scorecards")
    .insert({
      user_id: user.id,
      item_id: itemId,
      verdict: result.verdict,
      headline: result.headline,
      scores: result.scores,
      tailoring_needed: result.tailoringNeeded,
      tailoring_note: result.tailoringNote,
      model: hasImage ? MODELS.judge : null,
    })
    .select("*")
    .single();
  if (error || !saved) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  return NextResponse.json({ scorecard: saved });
}
