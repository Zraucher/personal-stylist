import { createClient } from "@/lib/supabase/server";
import { loadWeekState, weekView } from "@/lib/plan/server";
import { ButtonLink, EmptyState, ListCard, ListRow, PageHeader, SectionTitle } from "@/components/ui";
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
      <PageHeader title="Plan" subtitle="Your week, laid out against the forecast. No top twice, nothing two days running." />

      <PlanClient initial={week} />

      <section className="space-y-3">
        <SectionTitle
          action={
            <ButtonLink href="/plan/trips/new" variant="secondary" size="sm">
              Plan a trip
            </ButtonLink>
          }
        >
          Trips
        </SectionTitle>
        {!trips?.length ? (
          <EmptyState title="going somewhere?" body="Tell us where and when, and we'll build a look for every day and a packing list from your closet." />
        ) : (
          <ListCard>
            {trips.map((t) => {
              const looks = Array.isArray(t.looks) ? (t.looks as Array<{ item_ids: string[] }>) : [];
              const pieces = new Set(looks.flatMap((l) => l.item_ids ?? []));
              const packed = ((t.packed as string[]) ?? []).filter((id) => pieces.has(id)).length;
              return (
                <ListRow
                  key={t.id as string}
                  href={`/plan/trips/${t.id}`}
                  title={(t.name as string | null) ?? t.destination}
                  meta={
                    <>
                      {new Date(`${t.start_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} to {new Date(`${t.end_date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {pieces.size} pieces
                    </>
                  }
                  trailing={
                    <span className="shrink-0 text-sm text-stone-500 tabular-nums">
                      {packed}/{pieces.size} packed
                    </span>
                  }
                />
              );
            })}
          </ListCard>
        )}
      </section>
    </div>
  );
}
