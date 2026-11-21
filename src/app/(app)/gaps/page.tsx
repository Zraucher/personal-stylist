import { createClient } from "@/lib/supabase/server";
import { loadStyleContext } from "@/lib/profile/context";
import { loadCloset } from "@/lib/today/recommend";
import { findGaps, gapLabel, SCENARIOS } from "@/lib/gaps/unlock";
import ClosetSubnav from "../ClosetSubnav";
import { ButtonLink, Card, EmptyState, PageHeader, Thumb } from "@/components/ui";

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
      <PageHeader
        title="Closet gaps"
        subtitle={
          <>
            Your closet makes {base} {base === 1 ? "outfit" : "outfits"} across {SCENARIOS.length} typical days ({SCENARIOS.map((s) => s.label).join(", ")}). These single pieces would add the most.
          </>
        }
      />

      {worth.length === 0 ? (
        <EmptyState
          title="no big gaps right now"
          body={`No single piece adds ${MIN_ADDED} or more outfits right now. That usually means the closet is well rounded, or that most pieces still need warmth and dress-level tags.`}
        />
      ) : (
        <ol className="space-y-3">
          {worth.map((g, i) => (
            <Card as="li" key={g.piece.id} className="flex gap-4">
              <Thumb size="md" alt={gapLabel(g)} item={{ category: g.piece.category, subcategory: g.piece.subcategory, colors: g.piece.colors }} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-1">
                  <p className="font-display text-lg font-bold leading-snug">
                    <span className="tabular-nums text-stone-500">{i + 1}.</span> {gapLabel(g)}: {g.added} new {g.added === 1 ? "outfit" : "outfits"}
                  </p>
                  <p className="text-sm text-stone-600">Mostly for {g.scenarios.join(", ")}.</p>
                </div>
                <ButtonLink
                  size="sm"
                  href={`/wishlist?add=${encodeURIComponent(g.piece.name ?? g.piece.subcategory ?? "piece")}&prefs=${encodeURIComponent(`Fills a closet gap: adds ${g.added} outfits.`)}`}
                >
                  Add to wishlist and find it
                </ButtonLink>
              </div>
            </Card>
          ))}
        </ol>
      )}
      <p className="text-xs text-stone-500">Counts use the same rules as Today: warmth, dress level, season and the composition check. Pieces marked cut are left out.</p>
    </div>
  );
}
