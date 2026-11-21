import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { loadStyleContext } from "@/lib/profile/context";
import { localDate } from "@/lib/today/weather";
import { computeInsights, type InsightItem } from "@/lib/insights/compute";
import { ROLE_LABEL } from "@/lib/plan/sequence";
import ClosetSubnav from "../../ClosetSubnav";
import { isoDaysAgo } from "@/lib/time";

export const metadata = { title: "Insights · valette" };

const money = (n: number) => (n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2).replace(/\.00$/, "")}`);

type Row = { id: string; name: string | null; category: string | null; subcategory: string | null; price: number | null; colors: unknown; status: string | null; created_at: string; image_path: string | null };

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  const since = isoDaysAgo(400).slice(0, 10);
  const [{ data: rows }, { data: wears }, { data: cards }, ctx, { data: prof }] = await Promise.all([
    supabase.from("closet_items").select("id, name, category, subcategory, price, colors, status, created_at, image_path").eq("user_id", uid),
    supabase.from("wear_log").select("item_id, worn_on").eq("user_id", uid).gte("worn_on", since).limit(5000),
    supabase.from("scorecards").select("item_id, verdict").eq("user_id", uid).order("created_at", { ascending: false }),
    loadStyleContext(supabase, uid),
    supabase.from("profiles").select("timezone").eq("id", uid).maybeSingle(),
  ]);
  const verdicts = new Map<string, InsightItem["verdict"]>();
  for (const c of cards ?? []) if (!verdicts.has(c.item_id as string)) verdicts.set(c.item_id as string, c.verdict as InsightItem["verdict"]);
  const all = (rows ?? []) as Row[];
  const items: InsightItem[] = all.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory,
    price: r.price != null ? Number(r.price) : null,
    colors: Array.isArray(r.colors) ? (r.colors as InsightItem["colors"]) : [],
    status: r.status,
    createdAt: r.created_at,
    verdict: verdicts.get(r.id) ?? null,
  }));
  const today = localDate((prof?.timezone as string | null) ?? null);
  const ins = computeInsights(items, (wears ?? []).map((w) => ({ itemId: w.item_id as string, wornOn: w.worn_on as string })), today, ctx.scoreColor);
  const byId = new Map(all.map((r) => [r.id, r]));
  const shown = new Set([...ins.bestValue, ...ins.worstValue, ...ins.mostWorn, ...ins.sleepers].map((x) => x.id));
  const urls = await signedImageUrls(supabase, [...shown].map((id) => byId.get(id)?.image_path));
  const priced = items.filter((i) => i.status !== "gone" && i.price != null && i.price > 0).length;
  const totalWears = Object.values(ins.wears).reduce((a, b) => a + b, 0);

  const Thumb = ({ id }: { id: string }) => {
    const r = byId.get(id);
    const url = r?.image_path ? urls[r.image_path] : undefined;
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-[9px] leading-tight text-stone-400">{r?.subcategory ?? "piece"}</div>
        )}
      </div>
    );
  };
  const Piece = ({ id, right, sub }: { id: string; right?: string; sub?: string }) => (
    <li>
      <Link href={`/closet/${id}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-stone-50">
        <Thumb id={id} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{byId.get(id)?.name ?? "Piece"}</p>
          {sub && <p className="truncate text-xs text-stone-500">{sub}</p>}
        </div>
        {right && <span className="shrink-0 text-sm font-semibold">{right}</span>}
      </Link>
    </li>
  );
  const card = "rounded-2xl border border-stone-200 bg-white p-4";
  const palTotal = ins.palette.in + ins.palette.near + ins.palette.off + ins.palette.unknown || 1;

  return (
    <div className="space-y-6">
      <ClosetSubnav />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Closet insights</h1>
        <p className="text-sm text-stone-500">What you actually wear, what it costs per wear, and what has been sitting.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { n: String(ins.active), label: "pieces" },
          { n: `${Math.round(ins.usedShare * 100)}%`, label: "worn in 90 days" },
          { n: String(ins.wearsLast30), label: "wears this month" },
        ].map((s) => (
          <div key={s.label} className={card + " text-center"}>
            <p className="font-display text-3xl font-extrabold">{s.n}</p>
            <p className="text-xs text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>

      {totalWears === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">
          Insights grow as you log what you wear. Tap <b>wore it</b> on Today or your plan, or <b>Wore it today</b> on any piece.
        </p>
      )}

      {ins.sleepers.length > 0 && (
        <section className={card}>
          <h2 className="font-display text-lg font-bold">Sleeping in your closet</h2>
          <p className="mb-2 text-sm text-stone-500">Not worn in 60 days or more. Give one a turn this week, or let it go.</p>
          <ul className="divide-y divide-stone-100">
            {ins.sleepers.map((s) => (
              <Piece key={s.id} id={s.id} sub={s.days == null ? "Never logged as worn" : `${s.days} days since you wore it`} />
            ))}
          </ul>
          <Link href={`/outfits/new?items=${ins.sleepers[0].id}`} className="mt-3 inline-block rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            Build an outfit around the first one
          </Link>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={card}>
          <h2 className="font-display text-lg font-bold">Best value</h2>
          <p className="mb-2 text-sm text-stone-500">Lowest cost per wear.</p>
          {ins.bestValue.length ? (
            <ul className="divide-y divide-stone-100">
              {ins.bestValue.map((r) => (
                <Piece key={r.id} id={r.id} right={money(r.cpw!)} sub={`${money(r.price)} · worn ${r.wears}×`} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">{priced ? "Log a few wears to see cost per wear." : "Add what you paid on a piece's page to see cost per wear."}</p>
          )}
        </section>
        <section className={card}>
          <h2 className="font-display text-lg font-bold">Still paying off</h2>
          <p className="mb-2 text-sm text-stone-500">Highest cost per wear so far.</p>
          {ins.worstValue.length ? (
            <ul className="divide-y divide-stone-100">
              {ins.worstValue.map((r) => (
                <Piece key={r.id} id={r.id} right={r.cpw != null ? money(r.cpw) : "unworn"} sub={`${money(r.price)} · worn ${r.wears}×`} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Nothing priced yet.</p>
          )}
        </section>
      </div>

      {ins.mostWorn.length > 0 && (
        <section className={card}>
          <h2 className="font-display text-lg font-bold">Your favorites</h2>
          <p className="mb-2 text-sm text-stone-500">Most worn this year. More like these is a safe bet.</p>
          <ul className="divide-y divide-stone-100">
            {ins.mostWorn.map((r) => (
              <Piece key={r.id} id={r.id} right={`${r.wears}×`} />
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={card}>
          <h2 className="font-display text-lg font-bold">Palette fit</h2>
          <p className="mb-3 text-sm text-stone-500">How your closet sits against your best colors.</p>
          <div className="flex h-4 overflow-hidden rounded-full bg-stone-100" role="img" aria-label={`${ins.palette.in} in palette, ${ins.palette.near} close, ${ins.palette.off} off palette, ${ins.palette.unknown} unknown`}>
            <span className="bg-emerald-700" style={{ width: `${(ins.palette.in / palTotal) * 100}%` }} />
            <span className="bg-emerald-300" style={{ width: `${(ins.palette.near / palTotal) * 100}%` }} />
            <span className="bg-red-600" style={{ width: `${(ins.palette.off / palTotal) * 100}%` }} />
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-1 text-sm">
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-emerald-700" />{ins.palette.in} in palette</li>
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-emerald-300" />{ins.palette.near} close</li>
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />{ins.palette.off} off palette</li>
            <li><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-stone-200" />{ins.palette.unknown} no color yet</li>
          </ul>
          {ins.topColors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ins.topColors.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-2 py-0.5 text-xs">
                  <span className="h-3 w-3 rounded-full border border-stone-300" style={{ background: c.hex ?? "transparent" }} />
                  {c.name} · {c.count}
                </span>
              ))}
            </div>
          )}
        </section>
        <section className={card}>
          <h2 className="font-display text-lg font-bold">Closet balance</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {ins.roles.map((r) => {
              const max = Math.max(...ins.roles.map((x) => x.count));
              return (
                <li key={r.role} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-stone-600">{ROLE_LABEL[r.role]}</span>
                  <span className="h-2.5 rounded-full bg-stone-800" style={{ width: `${Math.max(6, (r.count / max) * 100)}%` }} />
                  <span className="text-stone-500">{r.count}</span>
                </li>
              );
            })}
          </ul>
          {ins.balanceHint && (
            <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-stone-800">
              {ins.balanceHint} <Link href="/gaps" className="font-semibold underline">See gaps</Link>
            </p>
          )}
          <p className="mt-3 text-sm text-stone-500">
            {ins.verdicts.works} work on you · {ins.verdicts.almost} almost · {ins.verdicts.not} not for you · {ins.verdicts.unchecked} unchecked
          </p>
        </section>
      </div>
    </div>
  );
}
