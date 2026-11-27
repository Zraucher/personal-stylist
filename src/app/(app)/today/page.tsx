import { Suspense } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import { localDate, type WeatherSummary } from "@/lib/today/weather";
import { attentionItems } from "@/lib/today/attention";
import TodayView from "./TodayView";
import { GapsTile, GapsTileFallback } from "./Tools";
import { signedImageUrls } from "@/lib/closet/images";
import { isoDaysAgo } from "@/lib/time";
import { setupSteps } from "@/lib/profile/setup";
import { ensureDailyOutfit } from "@/lib/today/daily-server";

type PlannedItem = { id: string; name: string; url: string | null; hex: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }> };

async function loadPlanned(supabase: SupabaseClient, outfitId: string): Promise<{ name: string; items: PlannedItem[] }> {
  const { data: o } = await supabase.from("outfits").select("name, item_ids").eq("id", outfitId).maybeSingle();
  return { name: (o?.name as string | null) ?? "Your outfit", items: await loadItems(supabase, (o?.item_ids as string[] | undefined) ?? []) };
}

/** Closet pieces by id, in the order given, with photo links. */
async function loadItems(supabase: SupabaseClient, ids: string[]): Promise<PlannedItem[]> {
  const { data: rows } = ids.length ? await supabase.from("closet_items").select("id, name, category, subcategory, colors, image_path").in("id", ids) : { data: [] };
  const urls = await signedImageUrls(supabase, (rows ?? []).map((r) => r.image_path as string | null));
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => {
      const colors = Array.isArray(r.colors) ? (r.colors as Array<{ name: string; hex?: string }>) : [];
      return { id: r.id as string, name: (r.name as string | null) ?? "Piece", url: r.image_path ? urls[r.image_path as string] ?? null : null, hex: colors[0]?.hex ?? null, category: (r.category as string | null) ?? null, subcategory: (r.subcategory as string | null) ?? null, colors };
    });
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  // Everything that doesn't need the person's local date, in one round trip.
  const [{ data: prof }, { data: latest }, { count: closetSize }, { data: color }, { data: photos }, { data: answered }, sourced, { data: watched }, { data: asks }] = await Promise.all([
    supabase.from("profiles").select("timezone, location").eq("id", uid).maybeSingle(),
    supabase.from("recommendations").select("id").eq("user_id", uid).eq("kind", "today").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", uid).neq("status", "gone"),
    supabase.from("color_profiles").select("season_label, best_colors").eq("user_id", uid).maybeSingle(),
    // shortcut: the newest 300 photographed pieces stand in for "to review"; page it if closets grow past that.
    supabase.from("closet_items").select("id, name, category, subcategory, image_path").eq("user_id", uid).neq("status", "gone").not("image_path", "is", null).order("created_at", { ascending: false }).limit(300),
    supabase.from("feedback").select("target_id").eq("user_id", uid).eq("target", "item").in("type", ["agree", "disagree"]),
    supabase.from("closet_items").select("name, category, subcategory, source_image_url", { count: "exact" }).eq("user_id", uid).is("image_path", null).not("source_image_url", "is", null).neq("status", "gone").limit(1),
    supabase.from("wishlist_candidates").select("name, image_url, price, first_price").eq("user_id", uid).eq("watch", true),
    supabase.from("second_opinions").select("id, seen_at, created_at").eq("user_id", uid).gt("created_at", isoDaysAgo(30)),
  ]);

  const tz = (prof?.timezone as string | null) ?? null;
  const today = localDate(tz);
  const tomorrow = localDate(tz, 1);
  const seen = new Set((answered ?? []).map((f) => f.target_id as string));
  const toReview = (photos ?? []).filter((p) => !seen.has(p.id as string));

  const [initial, { data: plans }, { data: votes }, urls, { data: trip }, daily] = await Promise.all([
    latest ? loadRecommendation(supabase, uid, latest.id as string) : null,
    supabase.from("plans").select("date, worn, outfit_id, weather").eq("user_id", uid).gte("date", today).lte("date", localDate(tz, 6)),
    asks?.length ? supabase.from("opinion_votes").select("opinion_id, created_at").in("opinion_id", asks.map((a) => a.id as string)) : Promise.resolve({ data: [] as Array<{ opinion_id: string; created_at: string }> }),
    signedImageUrls(supabase, [...(photos ?? []).slice(0, 4), toReview[0]].map((p) => p?.image_path as string | null)),
    supabase.from("trips").select("id, name, destination, start_date, end_date").eq("user_id", uid).gte("end_date", today).lte("start_date", localDate(tz, 6)).order("start_date").limit(1).maybeSingle(),
    // The hero must not take the page down: a failed pick shows the empty state instead.
    ensureDailyOutfit(uid).catch((e) => {
      console.error("daily outfit failed", e);
      return null;
    }),
  ]);
  const fresh = initial && initial.weather?.date === today ? initial : null;
  const plan = (plans ?? []).find((p) => p.date === today);
  const [planned, dailyItems] = await Promise.all([plan?.outfit_id ? loadPlanned(supabase, plan.outfit_id as string) : null, daily ? loadItems(supabase, daily.itemIds) : []]);
  const daysPlanned = (plans ?? []).filter((p) => p.outfit_id).length;
  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));
  // A piece deleted since this morning leaves the pick short: show the empty state rather than half an outfit.
  const dailyView =
    daily && dailyItems.length === daily.itemIds.length
      ? { name: daily.name, reason: daily.reason, items: dailyItems, planned: !!planned && sameSet(planned.items.map((i) => i.id), daily.itemIds) }
      : null;
  const byDate = new Map((plans ?? []).map((p) => [p.date as string, p]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = localDate(tz, i);
    const p = byDate.get(date);
    return { date, state: p?.worn ? ("worn" as const) : p?.outfit_id ? ("planned" as const) : ("open" as const) };
  });

  const lastSeen = new Map((asks ?? []).map((a) => [a.id as string, ((a.seen_at as string | null) ?? (a.created_at as string)) as string]));
  const newVotes = (votes ?? []).filter((v) => (v.created_at as string) > (lastSeen.get(v.opinion_id as string) ?? "")).length;

  const size = closetSize ?? 0;
  const steps = setupSteps({ location: (prof?.location as string | null) ?? null, closetSize: size, hasPalette: !!(color?.season_label || (Array.isArray(color?.best_colors) && color.best_colors.length)) });
  const src = (path: unknown) => (typeof path === "string" ? urls[path] ?? null : null);
  const firstSourced = sourced.data?.[0];
  const attention = attentionItems({
    steps,
    newVotes,
    watched: (watched ?? []) as Array<{ name: string | null; price: number | null; first_price: number | null; image_url: string | null }>,
    sourced: { count: sourced.count ?? 0, first: firstSourced ? { name: firstSourced.name as string | null, src: firstSourced.source_image_url as string, category: firstSourced.category as string | null, subcategory: firstSourced.subcategory as string | null } : null },
    toReview: { count: toReview.length, first: toReview[0] ? { name: toReview[0].name as string | null, src: src(toReview[0].image_path), category: toReview[0].category as string | null, subcategory: toReview[0].subcategory as string | null } : null },
    // Only once there's enough closet to plan with, and only for a day with nothing on it yet.
    tomorrowOpen: size >= 8 && !(plans ?? []).some((p) => p.date === tomorrow && p.outfit_id),
  });

  // The weather comes with the picks; with none yet, the week plan may have saved today's forecast.
  const planWeather = !fresh && plan?.weather ? (plan.weather as WeatherSummary) : null;
  const lead = planned
    ? plan?.worn
      ? "You've worn today's plan. See what's waiting on you below."
      : `${planned.name} is planned for today. Tap Wore it once you're dressed.`
    : fresh
      ? "Your three picks for today are below. Wear one and tell us."
      : dailyView
        ? "Here's today's outfit from your closet. Wear it, or get three others below."
        : size < 3
        ? "Add a few pieces and we'll start picking outfits for you."
        : "Tell us where you're headed and we'll pick three outfits from your closet.";

  const photoTiles = (photos ?? []).slice(0, 4).map((p) => ({ id: p.id as string, name: p.name as string | null, src: src(p.image_path), category: p.category as string | null, subcategory: p.subcategory as string | null }));

  return (
    <TodayView
      today={today}
      lead={lead}
      planWeather={planWeather}
      planned={planned ? { ...planned, worn: !!plan?.worn, active: !fresh?.chosenOutfitId } : null}
      fresh={fresh}
      closetSize={size}
      attention={attention}
      photos={photoTiles}
      daysPlanned={daysPlanned}
      watching={watched?.length ?? 0}
      season={(color?.season_label as string | null) ?? null}
      daily={dailyView}
      week={week}
      trip={(trip as { id: string; name: string | null; destination: string; start_date: string; end_date: string } | null) ?? null}
      gaps={
        <Suspense fallback={<GapsTileFallback />}>
          <GapsTile supabase={supabase} userId={uid} />
        </Suspense>
      }
    />
  );
}
