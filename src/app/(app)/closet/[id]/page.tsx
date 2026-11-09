import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { CATEGORIES, type Category, type ClosetItem } from "@/lib/closet/taxonomy";
import ItemForm, { type ItemFormValues } from "../ItemForm";
import DeleteItemButton from "./DeleteItemButton";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("closet_items").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const item = data as ClosetItem;
  const urls = await signedImageUrls(supabase, [item.image_path]);

  const initial: ItemFormValues = {
    name: item.name ?? "",
    category: (CATEGORIES as readonly string[]).includes(item.category ?? "") ? (item.category as Category) : "top",
    subcategory: item.subcategory ?? "",
    colors: item.colors ?? [],
    pattern: item.pattern ?? "",
    material: item.material ?? "",
    construction: item.construction ?? [],
    formality: item.formality,
    warmth: item.warmth,
    seasons: item.seasons ?? [],
    brand: item.brand ?? "",
    size: item.size ?? "",
    status: item.status,
    tailoring_note: item.tailoring_note ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{item.name ?? "Item"}</h1>
        <Link href="/closet" className="text-sm text-stone-600 hover:text-stone-900">
          Back to closet
        </Link>
      </div>

      <ItemForm initial={initial} itemId={item.id} imagePath={item.image_path} imageUrl={item.image_path ? urls[item.image_path] ?? null : null} />

      <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <div className="text-stone-500">
          Added {new Date(item.created_at).toLocaleDateString()}
          {item.generic_id && " from the basics list"}
        </div>
        <DeleteItemButton id={item.id} />
      </div>
    </div>
  );
}
