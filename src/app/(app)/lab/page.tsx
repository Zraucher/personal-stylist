import { createClient } from "@/lib/supabase/server";
import { loadStyleContext } from "@/lib/profile/context";
import { loadCloset } from "@/lib/today/recommend";
import { buildCandidates, OCCASIONS, type ClosetPiece, type Occasion } from "@/lib/today/candidates";
import { localDate } from "@/lib/today/weather";
import { SCENARIOS } from "@/lib/gaps/unlock";
import { signedImageUrls } from "@/lib/closet/images";
import { loadRatings } from "@/lib/taste/load";
import { buildTaste } from "@/lib/taste/profile";
import { comboKey, groupSlots, rankReplacements } from "@/lib/taste/lab";
import { ButtonLink, EmptyState, Notice, PageHeader } from "@/components/ui";
import ClosetSubnav from "../ClosetSubnav";
import LabClient, { type LabOutfit, type LabPiece } from "./LabClient";

const STACK = 10;
type Draft = { items: ClosetPiece[]; occasion: Occasion | null; source: "lab" | "daily"; weather: LabOutfit["weather"]; context: string };

export default async function LabPage({ searchParams }: { searchParams: Promise<{ items?: string; source?: string; occasion?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  const [ctx, closet, rated, { data: prof }] = await Promise.all([
    loadStyleContext(supabase, uid),
    loadCloset(supabase, uid),
    loadRatings(supabase, uid),
    supabase.from("profiles").select("timezone").eq("id", uid).maybeSingle(),
  ]);
  const today = localDate((prof?.timezone as string | null) ?? null);
  const taste = rated.length ? buildTaste(rated, closet) : undefined;
  const byId = new Map(closet.map((p) => [p.id, p]));
  const seen = new Set(rated.map((r) => comboKey(r.itemIds)));
  const drafts: Draft[] = [];
  let notice: string | null = null;

  // A specific outfit (e.g. the home page's Outfit of the Day). loadCloset only returns this person's pieces.
  if (params.items) {
    const ids = [...new Set(params.items.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 12);
    const pieces = ids.map((id) => byId.get(id));
    if (ids.length && pieces.every((p): p is ClosetPiece => !!p)) {
      const daily = params.source === "daily";
      drafts.push({
        items: pieces,
        occasion: OCCASIONS.some((o) => o.id === params.occasion) ? (params.occasion as Occasion) : null,
        source: daily ? "daily" : "lab",
        weather: null,
        context: daily ? "Today's outfit" : "This outfit",
      });
      seen.add(comboKey(ids));
    } else {
      notice = "We couldn't find those pieces in your closet, so here are fresh outfits instead.";
    }
  }

  // Fresh combinations: rotate through typical days so occasions vary, skip anything already rated.
  const start = rated.length % SCENARIOS.length;
  const lists = SCENARIOS.map((_, i) => SCENARIOS[(start + i) % SCENARIOS.length]).map((s) => ({
    s,
    cands: buildCandidates(closet, s.day, { occasion: s.occasion, today }, ctx.scoreColor, ctx.scoreStyle, { limit: 6, taste }).candidates,
  }));
  for (let round = 0; round < 6 && drafts.length < STACK; round++) {
    for (const { s, cands } of lists) {
      const c = cands[round];
      if (!c || drafts.length >= STACK) continue;
      const key = comboKey(c.items.map((p) => p.id));
      if (seen.has(key)) continue;
      seen.add(key);
      drafts.push({
        items: c.items,
        occasion: s.occasion,
        source: "lab",
        weather: { feelsMin: s.day.feelsMin, feelsMax: s.day.feelsMax, season: s.day.season, label: s.label },
        context: `For ${s.label}`,
      });
    }
  }

  const withOptions = drafts.map((d) => ({
    d,
    groups: groupSlots(d.items).map((g) => ({ g, options: rankReplacements(d.items, g.pieces[0], closet, ctx.scoreColor, ctx.scoreStyle, { taste, limit: 6 }) })),
  }));
  const path = (p: ClosetPiece) => (p as ClosetPiece & { imagePath?: string | null }).imagePath ?? null;
  const urls = await signedImageUrls(
    supabase,
    withOptions.flatMap(({ d, groups }) => [...d.items, ...groups.flatMap((x) => x.options)].map(path))
  );
  const view = (p: ClosetPiece): LabPiece => ({ id: p.id, name: p.name, category: p.category, subcategory: p.subcategory, colors: p.colors, url: urls[path(p) ?? ""] ?? null });
  const outfits: LabOutfit[] = withOptions.map(({ d, groups }) => ({
    key: comboKey(d.items.map((p) => p.id)),
    itemIds: d.items.map((p) => p.id),
    occasion: d.occasion,
    source: d.source,
    weather: d.weather,
    context: d.context,
    rows: groups.map(({ g, options }) => ({ slot: g.slot, label: g.label, pieces: g.pieces.map(view), replaceId: g.pieces[0].id, options: options.map(view) })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Outfit Lab" subtitle="Rate outfits from your closet. Each rating teaches us what you love, so your picks and shopping ideas get closer to you." />
      <ClosetSubnav />
      {notice && <Notice tone="warn">{notice}</Notice>}
      {outfits.length === 0 ? (
        <EmptyState
          title="nothing new to rate"
          body={closet.length < 3 ? "Add a few tops, bottoms and shoes and we'll start putting outfits together." : "You've rated every outfit we can make right now. Add pieces to get new combinations."}
          action={
            <ButtonLink href="/closet/new" variant="secondary">
              Add a piece
            </ButtonLink>
          }
        />
      ) : (
        <LabClient key={outfits.map((o) => o.key).join(";")} outfits={outfits} />
      )}
    </div>
  );
}
