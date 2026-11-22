import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createHaul } from "./actions";
import { Button, ButtonLink, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";

export default async function HaulsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: hauls }, { data: items }] = await Promise.all([
    supabase.from("hauls").select("id, date, retailer, status, notes, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }),
    supabase.from("haul_items").select("haul_id, verdict").eq("user_id", user!.id),
  ]);
  const counts = new Map<string, { n: number; keep: number; cut: number }>();
  for (const i of items ?? []) {
    const c = counts.get(i.haul_id as string) ?? { n: 0, keep: 0, cut: 0 };
    c.n++;
    if (i.verdict === "keep") c.keep++;
    if (i.verdict === "cut") c.cut++;
    counts.set(i.haul_id as string, c);
  }

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

      <Card as="form" action={createHaul} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Store (optional)">
            <Input name="retailer" maxLength={80} />
          </Field>
          <Field label="What is it for? (optional)">
            <Input name="notes" maxLength={300} />
          </Field>
        </div>
        <Button type="submit" variant="primary">
          Start a haul review
        </Button>
      </Card>

      {(hauls ?? []).length === 0 ? (
        <EmptyState compact title="No hauls yet. Start one, then paste product links or upload screenshots." />
      ) : (
        <ul className="divide-y divide-line rounded-card bg-card px-4 ring-1 ring-line">
          {(hauls ?? []).map((h) => {
            const c = counts.get(h.id as string) ?? { n: 0, keep: 0, cut: 0 };
            return (
              <li key={h.id as string}>
                <Link href={`/hauls/${h.id}`} className="-mx-4 flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-200 ease-soft hover:bg-inset/60 active:bg-inset">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">
                      {(h.retailer as string) || "Haul"} · <span className="tabular-nums">{(h.date as string) ?? ""}</span>
                    </p>
                    {h.notes && <p className="truncate text-[13px] text-stone-600">{h.notes as string}</p>}
                    <p className="text-[13px] tabular-nums text-stone-500">
                      {c.n} {c.n === 1 ? "item" : "items"} · {c.keep} work on you · {c.cut} not for you
                    </p>
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
