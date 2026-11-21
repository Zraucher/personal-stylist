import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { firstName, tally, type Tally } from "./tally";
import { TOKEN_RE, type OpinionSnapshot } from "./server";

export type PublicOpinion = {
  id: string;
  userId: string;
  kind: "outfit" | "find";
  question: string | null;
  snapshot: OpinionSnapshot;
  closed: boolean;
  owner: string;
  images: Array<string | null>; // per snapshot item
  tally: Tally;
};

/** A shared ask as a friend sees it. Read with the service role: the link itself is the permission. */
export async function loadPublicOpinion(token: string, opts: { images?: boolean } = {}): Promise<PublicOpinion | null> {
  if (!TOKEN_RE.test(token)) return null;
  const admin = createAdminClient();
  const { data: o } = await admin.from("second_opinions").select("id, user_id, kind, question, snapshot, closes_at").eq("token", token).maybeSingle();
  if (!o) return null;
  const [{ data: prof }, { data: votes }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", o.user_id).maybeSingle(),
    admin.from("opinion_votes").select("verdict").eq("opinion_id", o.id),
  ]);
  const snapshot = (o.snapshot ?? { title: "This look" }) as OpinionSnapshot;
  let images: Array<string | null> = (snapshot.items ?? []).map(() => null);
  if (opts.images !== false && snapshot.items?.length) {
    // Only plain files directly in the owner's own folder; the snapshot is owner-written data.
    const safe = (p: string | null): p is string => !!p && p.startsWith(`${o.user_id}/`) && /^[A-Za-z0-9-]+\/[A-Za-z0-9_-]+\.[A-Za-z0-9]{2,5}$/.test(p);
    const paths = snapshot.items.map((i) => i.image_path).filter(safe);
    if (paths.length) {
      const { data } = await admin.storage.from(CLOSET_BUCKET).createSignedUrls(paths, 60 * 60);
      const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
      images = snapshot.items.map((i) => (safe(i.image_path) ? map.get(i.image_path) ?? null : null));
    }
  }
  return {
    id: o.id as string,
    userId: o.user_id as string,
    kind: o.kind as "outfit" | "find",
    question: (o.question as string | null) ?? null,
    snapshot: { ...snapshot, image_url: snapshot.image_url && /^https:\/\//.test(snapshot.image_url) ? snapshot.image_url : null },
    closed: Date.parse(o.closes_at as string) <= Date.now(),
    owner: firstName(prof?.name as string | null),
    images,
    tally: tally(votes ?? []),
  };
}
