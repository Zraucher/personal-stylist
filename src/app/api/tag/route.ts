import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { AiError, aiAvailable, blobToImage } from "@/lib/ai/claude";
import { tagImage } from "@/lib/ai/tag";

export type { GarmentTags } from "@/lib/ai/tag";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!aiAvailable()) return NextResponse.json({ error: "tagging_unavailable" }, { status: 503 });

  let path: string;
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path !== "string") throw new Error("path required");
    path = body.path;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // Storage RLS already scopes to the user's folder; this check gives a clearer error.
  if (!path.startsWith(`${user.id}/`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: blob, error: dlError } = await supabase.storage.from(CLOSET_BUCKET).download(path);
  if (dlError || !blob) return NextResponse.json({ error: "image_not_found" }, { status: 404 });

  try {
    const tags = await tagImage(await blobToImage(blob));
    return NextResponse.json({ tags });
  } catch (err) {
    if (err instanceof AiError) {
      const map = { unavailable: [503, "tagging_unavailable"], rate_limited: [429, "rate_limited"], refused: [422, "could_not_tag"], failed: [502, "tagging_failed"] } as const;
      const [status, error] = map[err.code];
      return NextResponse.json({ error, detail: err.message }, { status });
    }
    throw err;
  }
}
