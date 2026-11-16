import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import ItemPlaceholder from "@/lib/closet/placeholder";
import { CATEGORIES, CATEGORY_LABELS, STATUS_LABELS, type ClosetItem } from "@/lib/closet/taxonomy";

export default async function ClosetPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("closet_items")
    .select("*")
    .neq("status", "gone")
    .order("created_at", { ascending: false });
  const items = (data ?? []) as ClosetItem[];
  const urls = await signedImageUrls(
    supabase,
    items.map((i) => i.image_path)
  );

  // Newest scorecard per item, for the verdict badge.
  const { data: cards } = await supabase.from("scorecards").select("item_id, verdict").order("created_at", { ascending: false });
  const verdicts = new Map<string, string>();
  for (const c of cards ?? []) if (!verdicts.has(c.item_id as string)) verdicts.set(c.item_id as string, c.verdict as string);

  const groups = new Map<string, ClosetItem[]>();
  for (const c of CATEGORIES) groups.set(c, []);
  for (const item of items) {
    const key = item.category && groups.has(item.category) ? item.category : "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const withPhoto = items.filter((i) => i.image_path).length;
  const sourced = items.filter((i) => !i.image_path && i.source_image_url).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Closet</h1>
          <p className="text-sm text-stone-500">
            {items.length} {items.length === 1 ? "item" : "items"}
            {items.length > 0 && `, ${withPhoto} with photos`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/closet/review" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:border-stone-500">
            Review
          </Link>
          <Link href="/closet/basics" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:border-stone-500">
            Basics
          </Link>
          <Link href="/closet/new" className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
            Add item
          </Link>
        </div>
      </div>

      {sourced > 0 && (
        <Link
          href="/closet/sourced"
          className="block rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:border-amber-500"
        >
          <span className="font-medium">
            {sourced} product {sourced === 1 ? "photo" : "photos"} found online.
          </span>{" "}
          Review and add them →
        </Link>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">Nothing here yet</p>
          <p className="mt-1 text-sm text-stone-600">
            Fastest start: tick what you own on the <Link href="/closet/basics" className="underline">basics list</Link>, then
            photograph the pieces that matter.
          </p>
        </div>
      ) : (
        Array.from(groups.entries())
          .filter(([, list]) => list.length > 0)
          .map(([key, list]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-medium text-stone-500">
                {key in CATEGORY_LABELS ? CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] : "Other"}{" "}
                <span className="text-stone-400">{list.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {list.map((item) => (
                  <ItemCard key={item.id} item={item} url={item.image_path ? urls[item.image_path] : undefined} verdict={verdicts.get(item.id)} />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}

const VERDICT_BADGE: Record<string, string> = {
  keep: "bg-emerald-700 text-white",
  cut: "bg-red-700 text-white",
  provisional: "bg-stone-300 text-stone-800",
};

function ItemCard({ item, url, verdict }: { item: ClosetItem; url?: string; verdict?: string }) {
  return (
    <Link href={`/closet/${item.id}`} className="group overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="relative aspect-square bg-stone-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={item.name ?? ""} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ItemPlaceholder category={item.category} subcategory={item.subcategory} colors={item.colors} />
        )}
        {item.status !== "available" && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2 py-0.5 text-[11px] text-white">
            {STATUS_LABELS[item.status]}
          </span>
        )}
        {verdict && (
          <span className={"absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium " + (VERDICT_BADGE[verdict] ?? "")}>
            {verdict === "provisional" ? "Provisional" : verdict === "keep" ? "Keep" : "Cut"}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium">{item.name ?? "Untitled"}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="truncate text-xs text-stone-500">{item.brand ?? item.subcategory ?? ""}</p>
          <div className="flex gap-1">
            {item.colors.slice(0, 4).map((c, i) => (
              <span
                key={i}
                title={c.name}
                className="h-3 w-3 rounded-full border border-stone-300"
                style={{ background: c.hex ?? "transparent" }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
