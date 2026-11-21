import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import HaulReview, { type HaulItemView } from "./HaulReview";
import { PageHeader } from "@/components/ui";

export default async function HaulPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: haul } = await supabase.from("hauls").select("*").eq("id", id).eq("user_id", user!.id).maybeSingle();
  if (!haul) notFound();
  const { data: rows } = await supabase.from("haul_items").select("*").eq("haul_id", id).eq("user_id", user!.id).order("created_at", { ascending: true });
  const urls = await signedImageUrls(supabase, (rows ?? []).map((r) => r.image_path as string | null));
  const items: HaulItemView[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? "Product",
    url: (r.url as string | null) ?? null,
    imageUrl: r.image_path ? urls[r.image_path as string] ?? null : (r.source_image_url as string | null) ?? null,
    brand: (r.brand as string | null) ?? null,
    price: r.price != null ? Number(r.price) : null,
    currency: (r.currency as string | null) ?? null,
    verdict: (r.verdict as string | null) ?? null,
    headline: (r.headline as string | null) ?? null,
    scores: (r.scores as HaulItemView["scores"]) ?? null,
    colors: Array.isArray(r.verified_colors) ? (r.verified_colors as Array<{ name: string; hex?: string }>) : [],
    stated: (r.stated_colorway as string | null) ?? null,
    tailoring: (r.tailoring_needed as string | null) ?? null,
    status: (r.status as string) ?? "considering",
    closetId: (r.closet_item_id as string | null) ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/hauls", label: "Shop" }} title={(haul.retailer as string) || "Haul review"} subtitle={haul.notes ? (haul.notes as string) : undefined} />
      <HaulReview haulId={id} initial={items} />
    </div>
  );
}
