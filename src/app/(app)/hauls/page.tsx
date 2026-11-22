import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { createHaul } from "./actions";
import StartHaulButton from "./StartHaulButton";
import { ButtonLink, EmptyState, Field, Input, PageHeader, Thumb } from "@/components/ui";

export const metadata = { title: "Shop · valette" };

/** "2026-11-21" -> "Nov 21" (parsed as a local date so it never shifts a day). */
function shortDate(d: string | null): string {
  if (!d) return "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d);
  if (Number.isNaN(date.getTime())) return d;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

type Counts = { n: number; keep: number; cut: number };
type Preview = { key: string; name: string; path: string | null; src: string | null; category: string | null; subcategory: string | null };

/** "3 products · 2 work on you · 1 not for you", leaving out the zero counts. */
function countLine(c: Counts): string {
  if (c.n === 0) return "No products yet";
  return [
    `${c.n} ${c.n === 1 ? "product" : "products"}`,
    c.keep > 0 ? `${c.keep} ${c.keep === 1 ? "works" : "work"} on you` : null,
    c.cut > 0 ? `${c.cut} not for you` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const summaryClass =
  "tap inline-flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-full px-1.5 text-sm font-medium text-stone-600 transition-colors duration-200 ease-soft hover:text-stone-900 [&::-webkit-details-marker]:hidden";

export default async function HaulsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: hauls }, { data: items }] = await Promise.all([
    supabase.from("hauls").select("id, date, retailer, status, notes, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase
      .from("haul_items")
      .select("id, haul_id, verdict, name, image_path, source_image_url, category, subcategory")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
  ]);
  const counts = new Map<string, Counts>();
  const previews = new Map<string, Preview[]>();
  for (const i of items ?? []) {
    const hid = i.haul_id as string;
    const c = counts.get(hid) ?? { n: 0, keep: 0, cut: 0 };
    c.n++;
    if (i.verdict === "keep") c.keep++;
    if (i.verdict === "cut") c.cut++;
    counts.set(hid, c);
    const p = previews.get(hid) ?? [];
    if (p.length < 3) {
      p.push({
        key: i.id as string,
        name: (i.name as string | null) ?? "Product",
        path: (i.image_path as string | null) ?? null,
        src: (i.source_image_url as string | null) ?? null,
        category: (i.category as string | null) ?? null,
        subcategory: (i.subcategory as string | null) ?? null,
      });
      previews.set(hid, p);
    }
  }
  // One batch of signed URLs for every preview photo on the page.
  const signed = await signedImageUrls(
    supabase,
    [...previews.values()].flat().map((p) => p.path)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop"
        subtitle="Review products before you buy. Every haul is saved."
        actions={
          <>
            <ButtonLink href="/wishlist" variant="secondary" size="sm">
              Wishlist
            </ButtonLink>
            <ButtonLink href="/gaps" variant="quiet" size="sm">
              Closet gaps
            </ButtonLink>
          </>
        }
      />

      <form action={createHaul} className="space-y-2">
        <StartHaulButton />
        <details className="group">
          <summary className={summaryClass}>
            Add details
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-200 ease-soft group-open:rotate-180">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <Field label="Store (optional)">
              <Input name="retailer" maxLength={80} />
            </Field>
            <Field label="What's it for? (optional)">
              <Input name="notes" maxLength={300} />
            </Field>
          </div>
        </details>
      </form>

      {(hauls ?? []).length === 0 ? (
        <EmptyState compact title="No hauls yet. Start one, then paste product links or upload screenshots." />
      ) : (
        // A ListCard whose rows carry two meta lines (notes, then counts).
        <ul className="divide-y divide-line rounded-card bg-card px-4 ring-1 ring-line">
          {(hauls ?? []).map((h) => {
            const c = counts.get(h.id as string) ?? { n: 0, keep: 0, cut: 0 };
            const thumbs = previews.get(h.id as string) ?? [];
            return (
              <li key={h.id as string}>
                <Link href={`/hauls/${h.id}`} className="-mx-4 flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-200 ease-soft hover:bg-inset/60 active:bg-inset">
                  {thumbs.length > 0 && (
                    <div className="flex shrink-0 -space-x-3" aria-hidden="true">
                      {thumbs.map((p) => (
                        <Thumb
                          key={p.key}
                          src={(p.path ? signed[p.path] : null) ?? p.src}
                          alt=""
                          size="xs"
                          product
                          item={{ category: p.category, subcategory: p.subcategory }}
                          className="ring-2 ring-card"
                        />
                      ))}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {(h.retailer as string) || "Haul"} · <span className="tabular-nums">{shortDate(h.date as string | null)}</span>
                    </p>
                    {h.notes && <p className="truncate text-[13px] text-stone-600">{h.notes as string}</p>}
                    <p className="text-[13px] tabular-nums text-stone-500">{countLine(c)}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-stone-500">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
