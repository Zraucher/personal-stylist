import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { CATEGORIES, CATEGORY_LABELS, type ClosetItem } from "@/lib/closet/taxonomy";
import Builder, { type PickItem } from "./Builder";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function NewOutfitPage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const { items: preset } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("closet_items").select("*").eq("status", "available").order("created_at", { ascending: false });
  const items = (data ?? []) as ClosetItem[];
  const urls = await signedImageUrls(
    supabase,
    items.map((i) => i.image_path)
  );
  const { data: cards } = await supabase.from("scorecards").select("item_id, verdict").order("created_at", { ascending: false });
  const verdicts = new Map<string, string>();
  for (const c of cards ?? []) if (!verdicts.has(c.item_id as string)) verdicts.set(c.item_id as string, c.verdict as string);

  const order = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory", "jewelry"];
  const groups = CATEGORIES.filter((c) => order.includes(c))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      items: items
        .filter((i) => i.category === key)
        .map<PickItem>((i) => ({
          id: i.id,
          name: i.name ?? i.subcategory ?? "Untitled",
          category: key,
          subcategory: i.subcategory,
          url: i.image_path ? urls[i.image_path] ?? null : null,
          colors: (i.colors ?? []).map((c) => c.name),
          swatches: (i.colors ?? []).map((c) => ({ name: c.name, hex: c.hex ?? undefined })),
          verdict: verdicts.get(i.id) ?? null,
        })),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Build an outfit" back={{ href: "/outfits", label: "Back to outfits" }} />
      {groups.length === 0 ? (
        <EmptyState
          title="Your closet is empty"
          body={
            <>
              Add pieces on the <Link href="/closet/basics" className="font-semibold underline underline-offset-2">basics list</Link> or <Link href="/closet/new" className="font-semibold underline underline-offset-2">photograph a few</Link>, then come back.
            </>
          }
        />
      ) : (
        <Builder groups={groups} initialPicked={(preset ?? "").split(",").filter((id) => groups.some((g) => g.items.some((i) => i.id === id)))} />
      )}
    </div>
  );
}
