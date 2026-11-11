import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { CATEGORIES, CATEGORY_LABELS, type ClosetItem } from "@/lib/closet/taxonomy";
import Builder, { type PickItem } from "./Builder";

export default async function NewOutfitPage() {
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
          verdict: verdicts.get(i.id) ?? null,
        })),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Build an outfit</h1>
        <Link href="/outfits" className="text-sm text-stone-600 hover:text-stone-900">
          Back to outfits
        </Link>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">Your closet is empty</p>
          <p className="mt-1 text-sm text-stone-600">
            Add pieces on the <Link href="/closet/basics" className="underline">basics list</Link> or <Link href="/closet/new" className="underline">photograph a few</Link>, then come back.
          </p>
        </div>
      ) : (
        <Builder groups={groups} />
      )}
    </div>
  );
}
