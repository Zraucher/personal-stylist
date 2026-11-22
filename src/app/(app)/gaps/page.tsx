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
      <PageHeader
        title="Closet gaps"
        subtitle={
          <>
            Your closet makes {base} {base === 1 ? "outfit" : "outfits"} across {SCENARIOS.length} typical days. These single pieces would add the most.
          </>
        }
      />
      <ClosetSubnav />

      {worth.length === 0 ? (
        <EmptyState
          title="no big gaps right now"
          body={`No single piece adds ${MIN_ADDED} or more outfits right now. That usually means your closet is well rounded, or pieces are missing warmth and formality. Add those on each piece.`}
          action={
            <ButtonLink href="/closet" variant="secondary">
              Open your closet
            </ButtonLink>
          }
        />
      ) : (
        <ol className="space-y-3">
          {worth.map((g, i) => (
            <Card as="li" key={g.piece.id} variant={i === 0 ? "active" : "surface"} className="flex gap-4">
              <div className={i === 0 ? "w-28 shrink-0" : "w-20 shrink-0"}>
                <Thumb size="fill" alt="" item={{ category: g.piece.category, subcategory: g.piece.subcategory, colors: g.piece.colors }} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-1">
                  <p className="font-display text-lg font-bold leading-snug">
                    <span className="tabular-nums text-stone-500">{i + 1}.</span> {gapLabel(g)} adds {g.added} new {g.added === 1 ? "outfit" : "outfits"}
                  </p>
                  <p className="text-sm text-stone-600">Mostly for {g.scenarios.join(", ")}.</p>
                </div>
                <ButtonLink
                  size="sm"
                  href={`/wishlist?add=${encodeURIComponent(g.piece.name ?? g.piece.subcategory ?? "piece")}&prefs=${encodeURIComponent(`Fills a closet gap. Adds ${g.added} outfits.`)}`}
                >
                  Add to wishlist and find it<span className="sr-only"> for {gapLabel(g)}</span>
                </ButtonLink>
              </div>
            </Card>
          ))}
        </ol>
      )}
      <p className="text-xs text-stone-500">
        Typical days are {SCENARIOS.map((s) => s.label).join(", ")}. Counts use the same rules as Today, like warmth, formality, season and the outfit checks. Pieces that came back not for you are left out.
      </p>
    </div>
  );
}
