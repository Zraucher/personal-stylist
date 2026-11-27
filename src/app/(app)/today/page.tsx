import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import { localDate, type WeatherSummary } from "@/lib/today/weather";
import TodayClient from "./TodayClient";
import PlannedToday from "./PlannedToday";
import { ChipLink, PageHeader, WeatherLine } from "@/components/ui";
import { signedImageUrls } from "@/lib/closet/images";
import { isoDaysAgo, stillOpen } from "@/lib/time";
import { setupSteps } from "@/lib/profile/setup";
import SetupCard from "./SetupCard";
import { Tools, WaitingOnYou, type ToolGroup, type WaitingItem } from "./Hub";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  // Everything that doesn't depend on the person's date, in one round trip.
  const [{ data: prof }, { data: latest }, { data: pieces }, { data: color }, { data: asks }, { data: watched }, { data: verdicts }, { count: savedOutfits }, { count: openWishes }, { count: openHauls }] =
    await Promise.all([
      supabase.from("profiles").select("timezone, location").eq("id", uid).maybeSingle(),
      // Today's latest pick, if one was made today.
      supabase.from("recommendations").select("id, created_at").eq("user_id", uid).eq("kind", "today").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("closet_items").select("id, image_path, source_image_url").eq("user_id", uid).neq("status", "gone"),
      supabase.from("color_profiles").select("season_label, best_colors").eq("user_id", uid).maybeSingle(),
      supabase.from("second_opinions").select("id, seen_at, created_at, closes_at").eq("user_id", uid).gt("created_at", isoDaysAgo(30)),
      supabase.from("wishlist_candidates").select("id, price, first_price").eq("user_id", uid).eq("watch", true),
      supabase.from("feedback").select("target_id").eq("user_id", uid).eq("target", "item").in("type", ["agree", "disagree"]),
      supabase.from("outfits").select("id", { count: "exact", head: true }).eq("user_id", uid).is("origin", null),
      supabase.from("wishlist").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "open"),
      supabase.from("hauls").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "considering"),
    ]);

  const tz = (prof?.timezone as string | null) ?? null;
  const today = localDate(tz);
  const closet = pieces ?? [];
  const closetSize = closet.length;
  const steps = setupSteps({ location: (prof?.location as string | null) ?? null, closetSize, hasPalette: !!(color?.season_label || (Array.isArray(color?.best_colors) && color.best_colors.length)) });

  const [initial, { data: plan }, { data: week }, { data: day }] = await Promise.all([
    latest ? loadRecommendation(supabase, uid, latest.id as string) : Promise.resolve(null),
    supabase.from("plans").select("date, worn, outfit_id, weather").eq("user_id", uid).eq("date", today).maybeSingle(),
    supabase.from("plans").select("date").eq("user_id", uid).gte("date", today).lte("date", localDate(tz, 6)).not("outfit_id", "is", null),
    supabase.from("day_profiles").select("weather").eq("user_id", uid).eq("date", today).maybeSingle(),
  ]);
  const fresh = initial && initial.weather?.date === today ? initial : null;

  type PlannedItem = { id: string; name: string; url: string | null; hex: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }> };
  const loadPlanned = async (): Promise<{ name: string; items: PlannedItem[] } | null> => {
    if (!plan?.outfit_id) return null;
    const { data: o } = await supabase.from("outfits").select("name, item_ids").eq("id", plan.outfit_id).maybeSingle();
    const ids = (o?.item_ids as string[] | undefined) ?? [];
    const { data: rows } = ids.length ? await supabase.from("closet_items").select("id, name, category, subcategory, colors, image_path").in("id", ids) : { data: [] };
    const urls = await signedImageUrls(supabase, (rows ?? []).map((r) => r.image_path as string | null));
    const byId = new Map((rows ?? []).map((r) => [r.id as string, r]));
    return {
      name: (o?.name as string | null) ?? "Your outfit",
      items: ids
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((r) => ({ id: r.id as string, name: (r.name as string | null) ?? "Piece", url: r.image_path ? urls[r.image_path as string] ?? null : null, hex: (Array.isArray(r.colors) ? (r.colors as Array<{ hex?: string }>)[0]?.hex : null) ?? null, category: (r.category as string | null) ?? null, subcategory: (r.subcategory as string | null) ?? null, colors: Array.isArray(r.colors) ? (r.colors as Array<{ name: string; hex?: string }>) : [] })),
    };
  };
  const countNewVotes = async () => {
    if (!asks?.length) return 0;
    const { data: votes } = await supabase.from("opinion_votes").select("opinion_id, created_at").in("opinion_id", asks.map((a) => a.id as string));
    const seen = new Map(asks.map((a) => [a.id as string, ((a.seen_at as string | null) ?? (a.created_at as string)) as string]));
    return (votes ?? []).filter((v) => (v.created_at as string) > (seen.get(v.opinion_id as string) ?? "")).length;
  };
  const [planned, newVotes] = await Promise.all([loadPlanned(), countNewVotes()]);

  const drops = (watched ?? []).filter((c) => c.price != null && c.first_price != null && Number(c.first_price) - Number(c.price) >= 1 && Number(c.price) <= Number(c.first_price) * 0.97).length;
  const found = closet.filter((p) => !p.image_path && p.source_image_url).length;
  const judged = new Set((verdicts ?? []).map((f) => f.target_id as string));
  const toReview = closet.filter((p) => p.image_path && !judged.has(p.id as string)).length;
  const openAsks = (asks ?? []).filter((a) => stillOpen(a.closes_at as string)).length;
  const daysPlanned = new Set((week ?? []).map((p) => p.date as string)).size;

  // Most time-sensitive first: friends and prices move without you, photos and verdicts wait.
  const waiting: WaitingItem[] = [
    newVotes > 0 && { href: "/opinions", title: "Read your second opinions", meta: `${plural(newVotes, "new vote")} from friends`, count: newVotes },
    drops > 0 && { href: "/wishlist", title: "Check price drops", meta: `${plural(drops, "product")} you watch got cheaper`, count: drops },
    found > 0 && { href: "/closet/sourced", title: "Check the photos we found", meta: `${plural(found, "product photo")} to match to your pieces`, count: found },
    toReview > 0 && { href: "/closet/review", title: "Review your pieces", meta: `${plural(toReview, "piece")} ${toReview === 1 ? "needs" : "need"} your verdict`, count: toReview },
  ].filter((x): x is WaitingItem => !!x);

  const tools: ToolGroup[] = [
    {
      label: "Get dressed",
      links: [
        { href: "/plan", title: "Plan the week", meta: `${daysPlanned} of the next 7 days planned` },
        { href: "/ask", title: "Ask for an outfit", meta: "Describe your day" },
        { href: "/outfits/new", title: "Build an outfit", meta: savedOutfits ? `${plural(savedOutfits, "outfit")} saved` : "Pick pieces, we check the mix" },
      ],
    },
    {
      label: "Closet",
      links: [
        { href: "/closet", title: "Your closet", meta: plural(closetSize, "piece") },
        { href: "/gaps", title: "Closet gaps", meta: "What adds the most outfits" },
        { href: "/profile#color", title: "Your colors", meta: color?.season_label ? String(color.season_label) : "Not found yet" },
      ],
    },
    {
      label: "Shop",
      links: [
        { href: "/wishlist", title: "Wishlist", meta: [openWishes ? `${plural(openWishes, "wish", "wishes")} open` : null, watched?.length ? `${watched.length} watched` : null].filter(Boolean).join(" · ") || "Nothing on it yet" },
        { href: "/hauls", title: "Review a haul", meta: openHauls ? `${plural(openHauls, "haul")} you're considering` : "Check before you buy" },
        { href: "/opinions", title: "Second opinions", meta: openAsks ? `${openAsks} open for votes` : "Ask a friend from any outfit" },
      ],
    },
  ];

  // What the day looks like before any picks: today's saved forecast, from a plan or an earlier pick.
  const weather = (fresh ? null : ((plan?.weather ?? day?.weather) as WeatherSummary | null)) ?? null;
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const direction =
    closetSize < 3
      ? "Tick the basics you own, then we can pick outfits."
      : planned && !plan?.worn
        ? "You planned an outfit. Wear it, or pick something else below."
        : fresh
          ? "Your picks are ready. Wore one? Tell us and we'll learn."
          : "Pick three outfits from your closet for today's weather.";

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <PageHeader
          eyebrow={dateLabel}
          title="Today"
          subtitle={direction}
          actions={
            waiting.length > 0 && (
              <ChipLink href="#waiting" tone="warm">
                {waiting.length} waiting on you
              </ChipLink>
            )
          }
        />
        {weather?.source === "forecast" && (
          <WeatherLine high={weather.feelsMax} place={weather.place} meta={[`low ${weather.feelsMin}°`, `rain ${weather.rainMax}%`, `UV ${weather.uvMax}`]} />
        )}
      </div>
      {steps.some((s) => !s.done) && <SetupCard steps={steps} />}
      <section aria-label="Get dressed" className="space-y-6">
        {planned && <PlannedToday date={today} name={planned.name} items={planned.items} worn={!!plan?.worn} lift={!fresh?.chosenOutfitId} />}
        <TodayClient initial={fresh} closetSize={closetSize} />
      </section>
      <WaitingOnYou items={waiting} />
      <Tools groups={tools} />
    </div>
  );
}
