import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createHaul } from "./actions";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Shop</h1>
          <p className="text-sm text-stone-500">Review products before you buy. Every haul is saved.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/wishlist" className="rounded-lg border border-stone-300 bg-white px-3 py-2 hover:border-stone-500">
            Wishlist
          </Link>
          <Link href="/gaps" className="rounded-lg border border-stone-300 bg-white px-3 py-2 hover:border-stone-500">
            Closet gaps
          </Link>
        </div>
      </div>

      <form action={createHaul} className="flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-white p-4">
        <input name="retailer" placeholder="Store (optional)" maxLength={80} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base" />
        <input name="notes" placeholder="What is it for? (optional)" maxLength={300} className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base" />
        <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white">
          Start a haul review
        </button>
      </form>

      {(hauls ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No hauls yet. Start one, then paste product links or upload screenshots.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
          {(hauls ?? []).map((h) => {
            const c = counts.get(h.id as string) ?? { n: 0, keep: 0, cut: 0 };
            return (
              <li key={h.id as string}>
                <Link href={`/hauls/${h.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{(h.retailer as string) || "Haul"} · {(h.date as string) ?? ""}</p>
                    {h.notes && <p className="truncate text-sm text-stone-500">{h.notes as string}</p>}
                  </div>
                  <p className="shrink-0 text-sm text-stone-500 tabular-nums">
                    {c.n} {c.n === 1 ? "item" : "items"} · {c.keep} keep · {c.cut} cut
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
