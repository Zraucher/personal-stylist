import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import { localDate } from "@/lib/today/weather";
import TodayClient from "./TodayClient";
import PlannedToday from "./PlannedToday";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { signedImageUrls } from "@/lib/closet/images";
import { isoDaysAgo } from "@/lib/time";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", uid).maybeSingle();
  const today = localDate((prof?.timezone as string | null) ?? null);
  // Today's latest pick, if one was made today.
  const { data: latest } = await supabase
    .from("recommendations")
    .select("id, created_at")
    .eq("user_id", uid)
    .eq("kind", "today")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: closetSize } = await supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", uid).neq("status", "gone");
  const initial = latest ? await loadRecommendation(supabase, uid, latest.id as string) : null;
  const fresh = initial && initial.weather?.date === today ? initial : null;

  // Today's planned outfit, new votes from friends, and price drops on watched finds.
  const [{ data: plan }, { data: asks }, { data: watched }] = await Promise.all([
    supabase.from("plans").select("date, worn, outfit_id").eq("user_id", uid).eq("date", today).maybeSingle(),
    supabase.from("second_opinions").select("id, seen_at, created_at").eq("user_id", uid).gt("created_at", isoDaysAgo(30)),
    supabase.from("wishlist_candidates").select("id, price, first_price").eq("user_id", uid).eq("watch", true),
  ]);
  let planned: { name: string; items: Array<{ id: string; name: string; url: string | null; hex: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }> }> } | null = null;
  if (plan?.outfit_id) {
    const { data: o } = await supabase.from("outfits").select("name, item_ids").eq("id", plan.outfit_id).maybeSingle();
    const ids = (o?.item_ids as string[] | undefined) ?? [];
    const { data: rows } = ids.length ? await supabase.from("closet_items").select("id, name, category, subcategory, colors, image_path").in("id", ids) : { data: [] };
    const urls = await signedImageUrls(supabase, (rows ?? []).map((r) => r.image_path as string | null));
    const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
    planned = {
      name: (o?.name as string | null) ?? "Your outfit",
      items: ids
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((r) => ({ id: r.id as string, name: (r.name as string | null) ?? "Piece", url: r.image_path ? urls[r.image_path as string] ?? null : null, hex: (Array.isArray(r.colors) ? (r.colors as Array<{ hex?: string }>)[0]?.hex : null) ?? null, category: (r.category as string | null) ?? null, subcategory: (r.subcategory as string | null) ?? null, colors: Array.isArray(r.colors) ? (r.colors as Array<{ name: string; hex?: string }>) : [] })),
    };
  }
  let newVotes = 0;
  if (asks?.length) {
    const { data: votes } = await supabase.from("opinion_votes").select("opinion_id, created_at").in("opinion_id", asks.map((a) => a.id as string));
    const seen = new Map(asks.map((a) => [a.id as string, ((a.seen_at as string | null) ?? (a.created_at as string)) as string]));
    newVotes = (votes ?? []).filter((v) => (v.created_at as string) > (seen.get(v.opinion_id as string) ?? "")).length;
  }
  const drops = (watched ?? []).filter((c) => c.price != null && c.first_price != null && Number(c.first_price) - Number(c.price) >= 1 && Number(c.price) <= Number(c.first_price) * 0.97).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Today" subtitle="Three outfits from your closet for the weather and where you are going." />
      {(newVotes > 0 || drops > 0) && (
        <div className="flex flex-wrap gap-2">
          {newVotes > 0 && (
            <Link href="/opinions" className="tap inline-flex min-h-9 items-center rounded-full bg-blush px-3.5 text-sm font-semibold text-ink transition-colors dark:text-stone-900 duration-200 ease-soft hover:bg-blush/80">
              {newVotes} new vote{newVotes === 1 ? "" : "s"} from friends
            </Link>
          )}
          {drops > 0 && (
            <Link href="/wishlist" className="tap inline-flex min-h-9 items-center rounded-full bg-sky-brand px-3.5 text-sm font-semibold text-ink transition-colors dark:text-stone-900 duration-200 ease-soft hover:bg-sky-brand/80">
              {drops} price drop{drops === 1 ? "" : "s"} on finds you watch
            </Link>
          )}
        </div>
      )}
      {planned && <PlannedToday date={today} name={planned.name} items={planned.items} worn={!!plan?.worn} />}
      <TodayClient initial={fresh} closetSize={closetSize ?? 0} />
    </div>
  );
}
