import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { tally } from "@/lib/opinions/tally";
import { siteOrigin, type OpinionSnapshot } from "@/lib/opinions/server";
import OpinionControls from "./OpinionControls";
import { stillOpen } from "@/lib/time";

const WORD: Record<string, { label: string; cls: string }> = {
  works: { label: "✓ works on you", cls: "bg-emerald-700 text-white" },
  almost: { label: "◐ almost", cls: "bg-amber-500 text-stone-900" },
  not: { label: "✕ not for you", cls: "bg-red-700 text-white" },
};

export const metadata = { title: "Votes · valette" };

export default async function OpinionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase.from("second_opinions").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();
  const { data: votes } = await supabase.from("opinion_votes").select("id, voter_name, verdict, comment, created_at").eq("opinion_id", id).order("created_at", { ascending: false });
  await supabase.from("second_opinions").update({ seen_at: new Date().toISOString() }).eq("id", id);
  const s = o.snapshot as OpinionSnapshot;
  const t = tally(votes ?? []);
  const urls = await signedImageUrls(supabase, (s.items ?? []).map((i) => i.image_path));
  const url = `${siteOrigin(await headers())}/o/${o.token}`;
  const open = stillOpen(o.closes_at as string);
  const bar = (n: number) => `${t.total ? (n / t.total) * 100 : 0}%`;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/opinions" className="text-sm text-stone-500 hover:text-stone-900">← Second opinions</Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{s.title}</h1>
        {o.question && <p className="text-stone-600">“{o.question}”</p>}
      </div>

      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="font-display text-2xl font-extrabold">{t.summary}</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
          <span className="bg-emerald-700" style={{ width: bar(t.works) }} />
          <span className="bg-amber-500" style={{ width: bar(t.almost) }} />
          <span className="bg-red-700" style={{ width: bar(t.not) }} />
        </div>
        <p className="text-sm text-stone-500">
          {t.works} works · {t.almost} almost · {t.not} not for you{open ? ` · open until ${new Date(o.closes_at as string).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : " · closed"}
        </p>
        <OpinionControls id={id} url={url} open={open} />
      </section>

      {(s.items?.length ?? 0) > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {s.items!.map((it, i) => (
            <div key={i} className="w-20 shrink-0">
              <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                {it.image_path && urls[it.image_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[it.image_path]} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-stone-400">{it.name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {o.kind === "find" && s.url && (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold underline">Open the product page</a>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">What they said</h2>
        {!votes?.length ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">No votes yet. Send the link to a friend or two.</p>
        ) : (
          <ul className="space-y-2">
            {votes.map((v) => (
              <li key={v.id as string} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{(v.voter_name as string | null) ?? "A friend"}</p>
                  <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + (WORD[v.verdict as string]?.cls ?? "")}>{WORD[v.verdict as string]?.label}</span>
                </div>
                {v.comment && <p className="mt-1 text-sm text-stone-700">{v.comment as string}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
