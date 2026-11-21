import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { CATEGORIES, CATEGORY_LABELS, STATUS_LABELS, type ClosetItem } from "@/lib/closet/taxonomy";
import { verdictLabel } from "@/lib/verdict";
import { ButtonLink, Chip, EmptyState, Field, Input, Notice, PageHeader, Swatch, Thumb, type ChipTone } from "@/components/ui";
import ClosetSubnav from "../ClosetSubnav";

const LAYER = /hoodie|sweatshirt|jacket|cardigan|vest|coat|blazer|quarter-zip|overshirt/i;
const VERDICT_TONE: Record<string, ChipTone> = { keep: "works", provisional: "almost", cut: "not" };

export default async function ClosetPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase
    .from("closet_items")
    .select("*")
    .neq("status", "gone")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as ClosetItem[];
  const items = query
    ? all.filter((i) => [i.name, i.brand, i.subcategory, i.category, ...(i.colors ?? []).map((c) => c.name)].some((v) => (v ?? "").toLowerCase().includes(query)))
    : all;
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
    // Hoodies and jackets saved under another category still belong with outerwear.
    const key = item.category !== "outerwear" && item.category !== "top" && LAYER.test(item.subcategory ?? "") ? "outerwear" : item.category && groups.has(item.category) ? item.category : "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const withPhoto = items.filter((i) => i.image_path).length;
  const sourced = items.filter((i) => !i.image_path && i.source_image_url).length;

  return (
    <div className="space-y-6">
      <ClosetSubnav />
      <PageHeader
        title="Closet"
        subtitle={
          <>
            {all.length} {all.length === 1 ? "item" : "items"}
            {all.length > 0 && `, ${withPhoto} with photos`}
          </>
        }
        actions={
          <>
            <ButtonLink href="/closet/review" size="sm">
              Review
            </ButtonLink>
            <ButtonLink href="/closet/basics" size="sm">
              Basics
            </ButtonLink>
            <ButtonLink href="/closet/new" variant="primary" size="sm">
              Add item
            </ButtonLink>
          </>
        }
      />

      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <form action="/closet" role="search" className="min-w-0 flex-1">
            <Field label="Search closet" srOnly>
              <Input type="search" name="q" defaultValue={q ?? ""} placeholder="Search by name, brand or color" />
            </Field>
          </form>
          <ButtonLink href="/gaps" variant="quiet" size="sm">
            What to buy next
          </ButtonLink>
        </div>
      )}
      {query && (
        <p role="status" aria-live="polite" className="text-sm text-stone-500">
          {items.length} {items.length === 1 ? "match" : "matches"} for “{q}”.{" "}
          <Link href="/closet" className="font-medium text-stone-700 underline underline-offset-2 hover:text-stone-900">
            Clear
          </Link>
        </p>
      )}

      {sourced > 0 && (
        <Notice tone="warn">
          <Link href="/closet/sourced" className="block hover:underline">
            <span className="font-semibold">
              {sourced} product {sourced === 1 ? "photo" : "photos"} found online.
            </span>{" "}
            Review and add them <span aria-hidden="true">→</span>
          </Link>
        </Notice>
      )}

      {all.length === 0 ? (
        <EmptyState
          title="nothing here yet"
          body="Fastest start: tick what you own on the basics list, then photograph the pieces that matter."
          action={
            <ButtonLink href="/closet/basics" variant="primary">
              Open the basics list
            </ButtonLink>
          }
        />
      ) : (
        Array.from(groups.entries())
          .filter(([, list]) => list.length > 0)
          .map(([key, list]) => (
            <section key={key} className="space-y-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700">
                {key === "outerwear" ? "Outerwear & layers" : key in CATEGORY_LABELS ? CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] : "Socks, underlayers & extras"}{" "}
                <span className="tabular-nums text-stone-500">{list.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
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

function ItemCard({ item, url, verdict }: { item: ClosetItem; url?: string; verdict?: string }) {
  const tone = verdict ? VERDICT_TONE[verdict] : undefined;
  return (
    <Link
      href={`/closet/${item.id}`}
      className="group block rounded-card bg-card p-1.5 ring-1 ring-line transition-shadow duration-200 ease-soft hover:ring-line-strong"
    >
      <Thumb
        src={url}
        alt={item.name ?? ""}
        item={item}
        size="fill"
        badge={
          <>
            {item.status !== "available" && (
              <Chip tone="overlay" className="absolute left-2 top-2">
                {STATUS_LABELS[item.status]}
              </Chip>
            )}
            {tone && (
              <Chip tone={tone} className="absolute right-2 top-2">
                {verdictLabel(verdict, true)}
              </Chip>
            )}
          </>
        }
      />
      <div className="px-1 pb-0.5 pt-2">
        <p className="truncate text-sm font-semibold">{item.name ?? "Untitled"}</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-stone-500">{[item.brand ?? item.subcategory, item.colors[0]?.name].filter(Boolean).join(" · ")}</p>
          <div className="flex shrink-0 gap-1">
            {item.colors.slice(0, 4).map((c, i) => (
              <Swatch key={i} hex={c.hex} name={c.name} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
