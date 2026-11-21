import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { CATEGORIES, type Category, type ClosetItem } from "@/lib/closet/taxonomy";
import ItemForm, { type ItemFormValues } from "../ItemForm";
import DeleteItemButton from "./DeleteItemButton";
import ScorecardPanel, { type ScorecardRow } from "../ScorecardPanel";
import WearPanel from "./WearPanel";
import { localDate } from "@/lib/today/weather";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{item.name ?? "Item"}</h1>
        <Link href="/closet" className="text-sm text-stone-600 hover:text-stone-900">
          Back to closet
        </Link>
      </div>

      <ScorecardPanel itemId={item.id} hasImage={!!item.image_path} initial={scorecard} initialAnswer={answer} />

      <WearPanel itemId={item.id} wears={wornDates.length} lastWorn={wornDates[0] ?? item.last_worn ?? null} wornToday={wornDates[0] === today} price={item.price != null ? Number(item.price) : null} />

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
