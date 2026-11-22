import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { CATEGORIES, type Category, type ClosetItem } from "@/lib/closet/taxonomy";
import ItemForm, { type ItemFormValues } from "../ItemForm";
import DeleteItemButton from "./DeleteItemButton";
import ScorecardPanel, { type ScorecardRow } from "../ScorecardPanel";
import WearPanel from "./WearPanel";
import { localDate } from "@/lib/today/weather";
import { Card, PageHeader, Thumb } from "@/components/ui";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("closet_items").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const item = data as ClosetItem;
  const urls = await signedImageUrls(supabase, [item.image_path]);

  const { data: latest } = await supabase
    .from("scorecards")
    .select("*")
    .eq("item_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const scorecard = (latest as ScorecardRow | null) ?? null;
  let answer: "agree" | "disagree" | null = null;
  if (scorecard) {
    const { data: fb } = await supabase
      .from("feedback")
      .select("type")
      .eq("scorecard_id", scorecard.id)
      .in("type", ["agree", "disagree"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    answer = (fb?.type as "agree" | "disagree" | undefined) ?? null;
  }

  const [{ data: wearRows }, { data: prof }] = await Promise.all([
    supabase.from("wear_log").select("worn_on").eq("item_id", id).order("worn_on", { ascending: false }),
    supabase.from("profiles").select("timezone").eq("id", item.user_id).maybeSingle(),
  ]);
  const wornDates = (wearRows ?? []).map((r) => r.worn_on as string);
  const today = localDate((prof?.timezone as string | null) ?? null);

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

  const imageUrl = item.image_path ? urls[item.image_path] ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader title={item.name ?? "Item"} back={{ href: "/closet", label: "Closet" }} />

      <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-start sm:gap-5">
        {/* The garment leads. Its name is the heading right above, so the image needs no alt text. */}
        <div className="mx-auto w-full max-w-[240px]">
          <Thumb src={imageUrl} alt="" item={item} size="fill" />
          {!item.image_path && <p className="mt-2 text-center text-xs text-stone-500">No photo yet. Add one under Edit details.</p>}
        </div>
        <div className="min-w-0 space-y-4">
          <ScorecardPanel itemId={item.id} hasImage={!!item.image_path} initial={scorecard} initialAnswer={answer} />
          <WearPanel itemId={item.id} wears={wornDates.length} lastWorn={wornDates[0] ?? item.last_worn ?? null} wornToday={wornDates[0] === today} price={item.price != null ? Number(item.price) : null} />
        </div>
      </div>

      {/* Open by default only when there is no photo yet, since the photo is added from the form. */}
      <details className="group space-y-4" open={!item.image_path}>
        <summary className="tap flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card bg-card px-4 ring-1 ring-line transition-colors duration-200 ease-soft hover:bg-inset/60 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-display text-lg font-bold leading-snug">Edit details</span>
            <span className="block text-xs text-stone-500">Photo, colors, construction, when to wear it, status</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-stone-500 transition-transform duration-200 ease-soft group-open:rotate-90">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </summary>
        <ItemForm initial={initial} itemId={item.id} imagePath={item.image_path} imageUrl={imageUrl} />
      </details>

      <Card pad="sm" className="flex flex-wrap items-center justify-between gap-3 pl-4 text-sm">
        <p className="text-stone-500">
          Added {new Date(item.created_at).toLocaleDateString()}
          {item.generic_id && " from the basics list"}
        </p>
        <DeleteItemButton id={item.id} />
      </Card>
    </div>
  );
}
