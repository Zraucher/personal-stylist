import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tally } from "@/lib/opinions/tally";
import type { OpinionSnapshot } from "@/lib/opinions/server";
import { stillOpen } from "@/lib/time";

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

  return (
    <div className="space-y-5">
      <div>
        <Link href="/today" className="text-sm text-stone-500 hover:text-stone-900">← Today</Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Second opinions</h1>
        <p className="text-sm text-stone-500">Looks and finds you asked friends about. Tap <b>Ask a friend</b> on any outfit or shop find to start one.</p>
      </div>
      {!rows?.length ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
          Nothing shared yet. On <Link href="/today" className="underline">Today</Link> or <Link href="/outfits" className="underline">Outfits</Link>, tap <b>Ask a friend</b> and send the link. Friends vote without an account.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const vs = byOpinion.get(r.id as string) ?? [];
            const t = tally(vs);
            const seen = (r.seen_at as string | null) ?? (r.created_at as string);
            const fresh = vs.filter((v) => v.created_at > seen).length;
            const open = stillOpen(r.closes_at as string);
            const s = r.snapshot as OpinionSnapshot;
            return (
              <li key={r.id as string}>
                <Link href={`/opinions/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-400">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s?.title ?? "Look"}</p>
                    <p className="truncate text-sm text-stone-500">{r.question ? `“${r.question}” · ` : ""}{t.summary}{open ? "" : " · closed"}</p>
                  </div>
                  {fresh > 0 && <span className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">{fresh} new</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
