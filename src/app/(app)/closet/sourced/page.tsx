import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SourcedList, { type SourcedItem } from "./SourcedList";

export default async function SourcedPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("closet_items")
    .select("id, name, brand, colors, source_image_url, source_page_url")
    .is("image_path", null)
    .not("source_image_url", "is", null)
    .neq("status", "gone")
    .order("category")
    .order("name");

  const items: SourcedItem[] = (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string | null,
    brand: r.brand as string | null,
    colors: ((r.colors ?? []) as Array<{ name?: string }>).map((c) => c.name).filter(Boolean).join(", "),
    source_image_url: r.source_image_url as string,
    source_page_url: r.source_page_url as string | null,
  }));

  return (
    <div className="space-y-5">
      <div>
        <Link href="/closet" className="text-sm text-stone-500 hover:text-stone-900">
          ← Closet
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Sourced photos</h1>
        <p className="text-sm text-stone-600">
          Product photos found online for pieces without a photo. Check the color and style match what you own. A photo you
          accept is copied into your private closet.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          Nothing waiting for review.
        </p>
      ) : (
        <SourcedList items={items} />
      )}
    </div>
  );
}
