import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadStyleContext } from "@/lib/profile/context";
import { loadCloset } from "@/lib/today/recommend";
import { findGaps, gapLabel, SCENARIOS } from "@/lib/gaps/unlock";
import ItemPlaceholder from "@/lib/closet/placeholder";
import ClosetSubnav from "../ClosetSubnav";

// A suggestion appears only when it is quantified and worth it.
const MIN_ADDED = 3;

export default async function GapsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [ctx, closet] = await Promise.all([loadStyleContext(supabase, user!.id), loadCloset(supabase, user!.id)]);
  const { base, gaps } = findGaps(closet, ctx.presentation, ctx.scoreColor, ctx.scoreStyle, { top: 6 });
  const worth = gaps.filter((g) => g.added >= MIN_ADDED);

  return (
    <div className="space-y-6">
      <ClosetSubnav />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Closet gaps</h1>
        <p className="text-sm text-stone-500">
          Your closet makes {base} {base === 1 ? "outfit" : "outfits"} across {SCENARIOS.length} typical days ({SCENARIOS.map((s) => s.label).join(", ")}). These single pieces would add the most.
        </p>
      </div>

      {worth.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          No single piece adds {MIN_ADDED} or more outfits right now. That usually means the closet is well rounded, or that most pieces still need warmth and dress-level tags.
        </p>
      ) : (
        <ol className="space-y-3">
          {worth.map((g, i) => (
            <li key={g.piece.id} className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <ItemPlaceholder category={g.piece.category} subcategory={g.piece.subcategory} colors={g.piece.colors} label=" " />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">
                  {i + 1}. {gapLabel(g)}: {g.added} new {g.added === 1 ? "outfit" : "outfits"}
                </p>
                <p className="text-sm text-stone-600">Mostly for {g.scenarios.join(", ")}.</p>
                <Link
                  href={`/wishlist?add=${encodeURIComponent(g.piece.name ?? g.piece.subcategory ?? "piece")}&prefs=${encodeURIComponent(`Fills a closet gap: adds ${g.added} outfits.`)}`}
                  className="inline-block rounded-lg border border-stone-300 px-3 py-1 text-sm hover:border-stone-500"
                >
                  Add to wishlist and find it
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-stone-400">Counts use the same rules as Today: warmth, dress level, season and the composition check. Pieces marked cut are left out.</p>
    </div>
  );
}
