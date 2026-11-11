import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import type { Composition } from "@/lib/outfit/composition";
import { OverallChip } from "./CompositionPanel";
import DeleteOutfitButton from "./DeleteOutfitButton";

type OutfitRow = {
  id: string;
  name: string | null;
  occasion: string | null;
  item_ids: string[];
  composition: Composition | null;
  composition_notes: string | null;
  created_at: string;
};

export default async function OutfitsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("outfits").select("id, name, occasion, item_ids, composition, composition_notes, created_at").order("created_at", { ascending: false });
  const outfits = (data ?? []) as OutfitRow[];

  const allIds = Array.from(new Set(outfits.flatMap((o) => o.item_ids)));
  const { data: itemRows } = allIds.length
    ? await supabase.from("closet_items").select("id, name, image_path").in("id", allIds)
    : { data: [] as Array<{ id: string; name: string | null; image_path: string | null }> };
  const items = new Map((itemRows ?? []).map((r) => [r.id as string, r as { id: string; name: string | null; image_path: string | null }]));
  const urls = await signedImageUrls(
    supabase,
    (itemRows ?? []).map((r) => r.image_path as string | null)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Outfits</h1>
          <p className="text-sm text-stone-500">
            {outfits.length} saved. Each one is checked for counterbalance, contrast and palette.
          </p>
        </div>
        <Link href="/outfits/new" className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
          Build outfit
        </Link>
      </div>

      {outfits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">No outfits yet</p>
          <p className="mt-1 text-sm text-stone-600">Pick a top, a bottom and shoes from your closet and see how the combination reads.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {outfits.map((o) => (
            <li key={o.id} className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {o.composition && <OverallChip overall={o.composition.overall} />}
                  <p className="truncate text-sm font-medium">{o.name ?? o.occasion ?? "Untitled outfit"}</p>
                  {o.name && o.occasion && <p className="truncate text-xs text-stone-500">{o.occasion}</p>}
                </div>
                <DeleteOutfitButton id={o.id} />
              </div>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {o.item_ids.map((id) => {
                  const it = items.get(id);
                  const url = it?.image_path ? urls[it.image_path] : undefined;
                  return (
                    <Link key={id} href={`/closet/${id}`} className="w-16 shrink-0" title={it?.name ?? "Removed piece"}>
                      <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt={it?.name ?? ""} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-stone-400">{it?.name ?? "Gone"}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {o.composition && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-stone-600">{o.composition.headline}</summary>
                  <ul className="mt-2 space-y-1 text-stone-600">
                    {o.composition.checks
                      .filter((c) => c.status === "caution" || c.status === "fail")
                      .map((c) => (
                        <li key={c.id}>
                          <span className="font-medium text-stone-800">{c.label}.</span> {c.reason}
                          {c.fix && <span className="text-stone-500"> Try: {c.fix}</span>}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
