import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadWeekState, weekView } from "@/lib/plan/server";
import PlanClient from "./PlanClient";

export const metadata = { title: "Plan · valette" };

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const s = await loadWeekState(supabase, user!.id);
  const [week, { data: trips }] = await Promise.all([
    weekView(supabase, s),
    supabase.from("trips").select("id, name, destination, start_date, end_date, looks, packed").eq("user_id", user!.id).gte("end_date", s.today).order("start_date", { ascending: true }).limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Plan</h1>
        <p className="text-sm text-stone-500">Your week, laid out against the forecast. No top twice, nothing two days running.</p>
      </div>

      <PlanClient initial={week} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Trips</h2>
          <Link href="/plan/trips/new" className="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-semibold text-stone-50">
            Plan a trip
          </Link>
        </div>
        {!trips?.length ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">
            Going somewhere? Tell us where and when, and we build a look for every day and a packing list from your closet.
          </p>
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => {
              const looks = Array.isArray(t.looks) ? (t.looks as Array<{ item_ids: string[] }>) : [];
              const pieces = new Set(looks.flatMap((l) => l.item_ids ?? []));
              const packed = ((t.packed as string[]) ?? []).filter((id) => pieces.has(id)).length;
              return (
                <li key={t.id as string}>
                  <Link href={`/plan/trips/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-400">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{(t.name as string | null) ?? t.destination}</p>
                      <p className="text-sm text-stone-500">
                        {new Date(`${t.start_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} to {new Date(`${t.end_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {pieces.size} pieces
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-stone-500">{packed}/{pieces.size} packed</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
