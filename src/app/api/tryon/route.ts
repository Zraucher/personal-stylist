import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { DAILY_TRYONS, tryOnPath, tryOnPrompt, tryOnSteps, type TryOnPiece } from "@/lib/tryon/steps";

// "See it on me": dresses the person's full-body Profile photo in the whole outfit (shoes, bag and accessories too)
// with Nano Banana 2 edit on fal, in one call. About $0.08 a picture at 1K.
export const maxDuration = 120;

const FAL = "https://fal.run/fal-ai/nano-banana-2/edit";
const BODY_SLOTS = ["full_front", "full_three_quarter"];
const Body = z.object({ itemIds: z.array(z.string().uuid()).min(1).max(12) });
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

async function signed(supabase: Awaited<ReturnType<typeof createClient>>, path: string) {
  const { data } = await supabase.storage.from(CLOSET_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export async function POST(req: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return fail("Try-on isn't switched on yet.", 503);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Couldn't read that outfit. Refresh and try again.", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("You're signed out. Sign in again to try this on.", 401);

  const [{ data: photos }, { data: pieces }] = await Promise.all([
    supabase.from("profile_photos").select("slot, image_path").eq("user_id", user.id).in("slot", BODY_SLOTS),
    supabase.from("closet_items").select("id, image_path, category, subcategory").eq("user_id", user.id).in("id", parsed.data.itemIds),
  ]);
  const body = BODY_SLOTS.map((s) => photos?.find((p) => p.slot === s)?.image_path as string | undefined).find(Boolean);
  if (!body) return fail("Add a full-body photo (Front) in Profile first, then try again.", 409);
  const steps = tryOnSteps((pieces ?? []) as TryOnPiece[]);
  if (!steps.length) return fail("We need a photo of at least one piece in this outfit to try it on.", 422);

  // Cached: the same photo and pieces were tried before.
  const out = tryOnPath(user.id, body, steps);
  const cached = await signed(supabase, out);
  if (cached) return NextResponse.json({ url: cached });

  // shortcut: counts today's pictures in storage (UTC day), no table; a usage table is the upgrade once it's paid.
  const { data: done } = await supabase.storage.from(CLOSET_BUCKET).list(`${user.id}/tryon`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  const today = new Date().toISOString().slice(0, 10);
  if ((done ?? []).filter((f) => (f.created_at ?? "").startsWith(today)).length >= DAILY_TRYONS)
    return fail(`That's ${DAILY_TRYONS} try-ons today. More tomorrow.`, 429);

  const urls = await Promise.all([body, ...steps.map((s) => s.path)].map((p) => signed(supabase, p)));
  if (urls.some((u) => !u)) return fail("Couldn't open one of the photos. Try again.", 500);
  const res = await fetch(FAL, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: tryOnPrompt(steps), image_urls: urls, num_images: 1, aspect_ratio: "auto", resolution: "1K", output_format: "png" }),
  }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as { images?: Array<{ url?: string }> } | null;
  const made = json?.images?.[0]?.url;
  if (!res?.ok || !made) {
    console.error("tryon failed", res?.status, JSON.stringify(json).slice(0, 300));
    return fail("We couldn't make the picture this time. Try again, or try a clearer full-body photo.", 502);
  }

  const img = await fetch(made).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  if (!img) return fail("We couldn't make the picture this time. Try again.", 502);
  const { error } = await supabase.storage.from(CLOSET_BUCKET).upload(out, img, { contentType: "image/png", upsert: true });
  if (error) return fail("Couldn't save the picture. Try again.", 500);
  return NextResponse.json({ url: await signed(supabase, out) });
}
