import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import { localDate, type WeatherSummary } from "@/lib/today/weather";
import TodayClient from "./TodayClient";
import PlannedToday from "./PlannedToday";
import { PageHeader, SectionTitle, WeatherLine } from "@/components/ui";
import { signedImageUrls } from "@/lib/closet/images";
import { isoDaysAgo } from "@/lib/time";
import { setupSteps } from "@/lib/profile/setup";
import { attentionItems, newVoteCount, priceDrops, unreviewedCount, weekDates } from "@/lib/today/attention";
import SetupCard from "./SetupCard";
import { NeedsYou, ToolGrid, WeekStrip } from "./Hub";

type PlannedItem = { id: string; name: string; url: string | null; hex: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }> };

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  // First page after sign-in: every query starts as early as its inputs allow, none waits on an unrelated one.
  // Promise.resolve runs the query once: a Supabase builder re-sends on every .then.
  const profP = Promise.resolve(supabase.from("profiles").select("timezone, location").eq("id", uid).maybeSingle());
  const todayP = profP.then(({ data }) => localDate((data?.timezone as string | null) ?? null));
  const recP = supabase
    .from("recommendations")
    .select("id, created_at")
    .eq("user_id", uid)
    .eq("kind", "today")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(({ data }) => (data ? loadRecommendation(supabase, uid, data.id as string) : null));
  const asksP = supabase.from("second_opinions").select("id, seen_at, created_at").eq("user_id", uid).gt("created_at", isoDaysAgo(30));
  const votesP = asksP.then(async ({ data: asks }) => {
    if (!asks?.length) return 0;
    const { data: votes } = await supabase.from("opinion_votes").select("opinion_id, created_at").in("opinion_id", asks.map((a) => a.id as string));
    return newVoteCount(asks as Array<{ id: string; seen_at: string | null; created_at: string }>, (votes ?? []) as Array<{ opinion_id: string; created_at: string }>);
  });
  const weekP = todayP.then((today) => {
    const dates = weekDates(today);
    return Promise.all([
      supabase.from("plans").select("date, worn, outfit_id").eq("user_id", uid).gte("date", dates[0]).lte("date", dates[6]),
      supabase.from("trips").select("id, name, destination, start_date, end_date").eq("user_id", uid).gte("end_date", today).lte("start_date", dates[6]).order("start_date").limit(1).maybeSingle(),
      supabase.from("day_profiles").select("weather").eq("user_id", uid).eq("date", today).maybeSingle(),
    ]);
  });

  const plannedP = Promise.all([todayP, weekP]).then(([today, [{ data: plans }]]) => {
    const p = (plans ?? []).find((x) => x.date === today);
    return p?.outfit_id ? loadPlanned(supabase, p.outfit_id as string) : null;
  });

  const [
    { data: prof },
    today,
    initial,
    newVotes,
    [{ data: plans }, { data: trip }, { data: day }],
    { count: closetSize },
    { data: color },
    { data: watched },
    { count: sourced },
    { data: withPhoto },
    { data: answered },
    { count: savedOutfits },
    planned,
  ] = await Promise.all([
    profP,
    todayP,
    recP,
    votesP,
    weekP,
    supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", uid).neq("status", "gone"),
    supabase.from("color_profiles").select("season_label, best_colors").eq("user_id", uid).maybeSingle(),
    supabase.from("wishlist_candidates").select("id, price, first_price").eq("user_id", uid).eq("watch", true),
    // Same filter as /closet/sourced.
    supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", uid).is("image_path", null).not("source_image_url", "is", null).neq("status", "gone"),
    supabase.from("closet_items").select("id").eq("user_id", uid).neq("status", "gone").not("image_path", "is", null),
    supabase.from("feedback").select("target_id").eq("user_id", uid).eq("target", "item").in("type", ["agree", "disagree"]),
    supabase.from("outfits").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("source", "user"),
    plannedP,
  ]);

  const size = closetSize ?? 0;
  const steps = setupSteps({ location: (prof?.location as string | null) ?? null, closetSize: size, hasPalette: !!(color?.season_label || (Array.isArray(color?.best_colors) && color.best_colors.length)) });
  const fresh = initial && initial.weather?.date === today ? initial : null;
  const plan = (plans ?? []).find((p) => p.date === today) ?? null;

  const attention = attentionItems({
    drops: priceDrops(watched ?? []),
    newVotes,
    sourced: sourced ?? 0,
    toReview: unreviewedCount((withPhoto ?? []).map((r) => r.id as string), (answered ?? []).map((r) => r.target_id as string)),
  });
  const setupLeft = steps.filter((s) => !s.done).length;
  const waiting = attention.length + setupLeft;

  const byDate = new Map((plans ?? []).map((p) => [p.date as string, p]));
  const days = weekDates(today).map((date) => {
    const p = byDate.get(date);
    return { date, state: p?.worn ? ("worn" as const) : p?.outfit_id ? ("planned" as const) : ("open" as const) };
  });
  const plannedCount = days.filter((d) => d.state !== "open").length;
  // The cached forecast shows up front only when no fresh pick is already showing its own weather line.
  const weather = !fresh ? ((day?.weather as WeatherSummary | null) ?? null) : null;
  const watchCount = watched?.length ?? 0;
  const season = (color?.season_label as string | null) ?? null;

  const headline = planned
    ? plan?.worn
      ? "You wore today's plan."
      : "Your outfit is planned."
    : fresh
      ? "Your three picks are below."
      : size < 3
        ? "Start with your closet and we'll pick outfits from it."
        : "Pick an outfit for the day.";
  const status = waiting === 0 ? " Nothing else is waiting on you." : ` ${waiting} ${waiting === 1 ? "thing needs" : "things need"} you.`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(new Date(`${today}T12:00:00Z`))}
        title="Today"
        subtitle={headline + status}
      />

      {waiting > 0 && (
        <section aria-labelledby="needs-title" className="space-y-3">
          <SectionTitle>
            <span id="needs-title">Needs you</span>
          </SectionTitle>
          {setupLeft > 0 && <SetupCard steps={steps} />}
          {attention.length > 0 && <NeedsYou items={attention} />}
        </section>
      )}

      <section aria-labelledby="now-title" className="space-y-3">
        <SectionTitle>
          <span id="now-title">{planned ? "Wear today" : "Pick today's outfit"}</span>
        </SectionTitle>
        {weather?.source === "forecast" && <WeatherLine high={weather.feelsMax} place={weather.place} meta={[`low ${weather.feelsMin}°`, `rain ${weather.rainMax}%`, `UV ${weather.uvMax}`]} />}
        {planned && <PlannedToday date={today} name={planned.name} items={planned.items} worn={!!plan?.worn} />}
        <TodayClient initial={fresh} closetSize={size} />
      </section>

      <WeekStrip days={days} trip={(trip as { id: string; name: string | null; destination: string; start_date: string; end_date: string } | null) ?? null} />

      <ToolGrid
        tools={[
          { href: "/ask", title: "Ask", meta: "Describe your day, get an outfit" },
          { href: "/plan", title: "Plan", meta: `${plannedCount} of 7 days planned` },
          { href: "/closet", title: "Closet", meta: `${size} ${size === 1 ? "piece" : "pieces"}` },
          { href: "/outfits", title: "Outfits", meta: savedOutfits ? `${savedOutfits} saved` : "Build and save a look" },
          { href: "/gaps", title: "Closet gaps", meta: "Pieces that add the most outfits" },
          { href: "/hauls", title: "Shop", meta: "Check a haul before you keep it" },
          { href: "/wishlist", title: "Wishlist", meta: watchCount ? `${watchCount} on price watch` : "Save products, watch prices" },
          { href: "/opinions", title: "Second opinions", meta: "Ask a friend to vote" },
          { href: "/profile/palette", title: "Your colors", meta: season ?? "Find the colors that work on you" },
        ]}
      />
    </div>
  );
}

async function loadPlanned(supabase: Awaited<ReturnType<typeof createClient>>, outfitId: string): Promise<{ name: string; items: PlannedItem[] }> {
  const { data: o } = await supabase.from("outfits").select("name, item_ids").eq("id", outfitId).maybeSingle();
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
}
