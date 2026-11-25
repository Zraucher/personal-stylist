import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiError, aiAvailable, aiErrorStatus, blobToImage } from "@/lib/ai/claude";
import { readSelfie } from "@/lib/ai/selfie";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const TYPES = ["image/jpeg", "image/png", "image/webp"];
// Each reading is a paid AI call. The count lives in app_metadata, which only the server can write.
const PER_DAY = 5;

// Selfie in, color quiz answers out. The photo goes to Claude for this request only and is never stored.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again to use a selfie." }, { status: 401 });
  if (!aiAvailable()) return NextResponse.json({ error: "Reading photos isn't available right now. Answer the questions instead." }, { status: 503 });

  const file = (await request.formData().catch(() => null))?.get("photo");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Add a photo first." }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Use a JPEG, PNG or WebP photo." }, { status: 415 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "That photo is too large. Try another one." }, { status: 413 });

  const day = new Date().toISOString().slice(0, 10);
  const used = user.app_metadata?.selfie_day === day ? Number(user.app_metadata?.selfie_count) || 0 : 0;
  if (used >= PER_DAY) return NextResponse.json({ error: `That's ${PER_DAY} photos today. Try again tomorrow, or answer the questions.` }, { status: 429 });
  await createAdminClient().auth.admin.updateUserById(user.id, { app_metadata: { selfie_day: day, selfie_count: used + 1 } });

  try {
    const r = await readSelfie(await blobToImage(file));
    if (!r.face_visible) return NextResponse.json({ error: "We couldn't see a face clearly. Try a closer photo in daylight." }, { status: 422 });
    return NextResponse.json({ skin: r.skin, undertone: r.undertone, hair: r.hair, eyes: r.eyes, warning: r.warning });
  } catch (err) {
    if (err instanceof AiError) console.error("color-selfie", err.code, err.message.slice(0, 300));
    if (err instanceof AiError) return NextResponse.json({ error: "We couldn't read that photo. Try again, or answer the questions." }, { status: aiErrorStatus(err) });
    throw err;
  }
}
