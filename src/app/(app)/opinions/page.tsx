import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { tally } from "@/lib/opinions/tally";
import type { OpinionSnapshot } from "@/lib/opinions/server";
import { stillOpen } from "@/lib/time";
import { Chip, EmptyState, ListCard, ListRow, PageHeader, Thumb } from "@/components/ui";

export const metadata = { title: "Second opinions · valette" };

export default async function OpinionsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("second_opinions").select("id, kind, question, snapshot, closes_at, seen_at, created_at").order("created_at", { ascending: false }).limit(50);
  const ids = (rows ?? []).map((r) => r.id as string);
  const { data: votes } = ids.length ? await supabase.from("opinion_votes").select("opinion_id, verdict, created_at").in("opinion_id", ids) : { data: [] };
  const byOpinion = new Map<string, Array<{ verdict: string; created_at: string }>>();
  for (const v of votes ?? []) {
    const list = byOpinion.get(v.opinion_id as string) ?? [];
    list.push({ verdict: v.verdict as string, created_at: v.created_at as string });
    byOpinion.set(v.opinion_id as string, list);
  }
  // Each row leads with its first piece: sign every first image in one batch.
  const firstPaths = (rows ?? []).map((r) => (r.snapshot as OpinionSnapshot | null)?.items?.[0]?.image_path ?? null);
  const urls = await signedImageUrls(supabase, firstPaths);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/today", label: "Today" }}
        title="Second opinions"
        subtitle={
          <>
            Looks and products you asked friends about. Tap <b className="font-semibold text-stone-700">Ask a friend</b> on any outfit or product to start one.
          </>
        }
      />
      {!rows?.length ? (
        <EmptyState
          title="nothing shared yet"
          body={
            <>
              On{" "}
              <Link href="/today" className="font-medium underline underline-offset-2">
                Today
              </Link>{" "}
              or{" "}
              <Link href="/outfits" className="font-medium underline underline-offset-2">
                Outfits
              </Link>
              , tap <b>Ask a friend</b> and send the link. Friends vote without an account.
            </>
          }
        />
      ) : (
        <ListCard>
          {rows.map((r) => {
            const vs = byOpinion.get(r.id as string) ?? [];
            const t = tally(vs);
            const seen = (r.seen_at as string | null) ?? (r.created_at as string);
            const fresh = vs.filter((v) => v.created_at > seen).length;
            const open = stillOpen(r.closes_at as string);
            const s = r.snapshot as OpinionSnapshot;
            const first = s?.items?.[0];
            const lead =
              r.kind === "find" ? (
                <Thumb src={s?.image_url} alt="" size="xs" product />
              ) : (
                <Thumb src={first?.image_path ? urls[first.image_path] : null} alt="" size="xs" item={{ subcategory: first?.subcategory, colors: first?.colors }} />
              );
            return (
              <ListRow
                key={r.id as string}
                href={`/opinions/${r.id}`}
                leading={lead}
                title={s?.title ?? "Look"}
                meta={
                  <>
                    {r.question ? `“${r.question}” · ` : ""}
                    {t.summary}
                    {open ? "" : " · closed"}
                  </>
                }
                trailing={
                  fresh > 0 ? (
                    <Chip tone="warm" className="shrink-0 tabular-nums">
                      {fresh} new
                    </Chip>
                  ) : undefined
                }
              />
            );
          })}
        </ListCard>
      )}
    </div>
  );
}
