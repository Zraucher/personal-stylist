import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import type { Composition } from "@/lib/outfit/composition";
import { OverallChip, cleanHeadline } from "./CompositionPanel";
import DeleteOutfitButton from "./DeleteOutfitButton";
import ClosetSubnav from "../ClosetSubnav";
import AskFriendsButton from "@/components/AskFriendsButton";
import { ButtonLink, Card, EmptyState, OutfitPicture, OutfitStrip, PageHeader } from "@/components/ui";

export const metadata = { title: "Outfits · valette" };

type OutfitRow = {
  id: string;
  name: string | null;
  occasion: string | null;
  item_ids: string[];
  composition: Composition | null;
  composition_notes: string | null;
  created_at: string;
};

/** The checks worth opening: cautions and fails. */
const issues = (c: Composition) => c.checks.filter((x) => x.status === "caution" || x.status === "fail");

type ItemRow = { id: string; name: string | null; image_path: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }> | null };

export default async function OutfitsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("outfits").select("id, name, occasion, item_ids, composition, composition_notes, created_at").is("origin", null).order("created_at", { ascending: false });
  const outfits = (data ?? []) as OutfitRow[];

  const allIds = Array.from(new Set(outfits.flatMap((o) => o.item_ids)));
  // category/subcategory/colors feed the garment silhouette when a piece has no photo.
  const { data: itemRows } = allIds.length
    ? await supabase.from("closet_items").select("id, name, image_path, category, subcategory, colors").in("id", allIds)
    : { data: [] as ItemRow[] };
  const items = new Map((itemRows ?? []).map((r) => [r.id as string, r as ItemRow]));
  const urls = await signedImageUrls(
    supabase,
    (itemRows ?? []).map((r) => r.image_path as string | null)
  );

  const pieces = (ids: string[]) =>
    ids.map((id) => {
      const it = items.get(id);
      return {
        id,
        name: it?.name ?? "Removed piece",
        url: it?.image_path ? urls[it.image_path] : null,
        category: it?.category,
        subcategory: it?.subcategory,
        colors: it?.colors,
      };
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outfits"
        subtitle={<>{outfits.length} saved. Each one is checked for counterbalance, contrast and palette.</>}
        actions={
          <>
            <ButtonLink href="/opinions" variant="quiet" size="sm">
              Second opinions
            </ButtonLink>
            <ButtonLink href="/outfits/new" variant="primary" size="sm">
              Build an outfit
            </ButtonLink>
          </>
        }
      />
      <ClosetSubnav />

      {outfits.length === 0 ? (
        <EmptyState
          title="no outfits yet"
          body="Pick a top, a bottom and shoes from your closet and see how the combination reads."
          action={
            <ButtonLink href="/outfits/new" variant="secondary" size="sm">
              Build an outfit
            </ButtonLink>
          }
        />
      ) : (
        <ul className="space-y-3">
          {outfits.map((o) => (
            <Card as="li" key={o.id} className="space-y-3">
              <OutfitStrip items={pieces(o.item_ids)} />
              <OutfitPicture items={pieces(o.item_ids)} />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {o.composition && <OverallChip overall={o.composition.overall} />}
                <h2 className="min-w-0 truncate font-display text-lg font-bold leading-snug">{o.name ?? o.occasion ?? "Untitled outfit"}</h2>
                {o.name && o.occasion && <p className="truncate text-xs text-stone-500">{o.occasion}</p>}
              </div>
              {o.composition &&
                (issues(o.composition).length > 0 ? (
                  <details className="group text-sm">
                    <summary className="tap flex cursor-pointer list-none items-center gap-1.5 text-stone-600 hover:text-stone-900 [&::-webkit-details-marker]:hidden">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 transition-transform duration-200 ease-soft group-open:rotate-90">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                      {cleanHeadline(o.composition.headline)}
                    </summary>
                    <ul className="mt-2 space-y-1 pl-5 text-stone-600">
                      {issues(o.composition).map((c) => (
                        <li key={c.id}>
                          <span className="font-medium text-stone-800">{c.label}.</span> {c.reason}
                          {c.fix && <span className="text-stone-500"> {c.fix}</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  // Nothing to fix: the headline is plain text, not a disclosure that opens onto nothing.
                  <p className="text-sm text-stone-600">{cleanHeadline(o.composition.headline)}</p>
                ))}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <AskFriendsButton target={{ kind: "outfit", outfitId: o.id }} compact />
                <DeleteOutfitButton id={o.id} />
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
