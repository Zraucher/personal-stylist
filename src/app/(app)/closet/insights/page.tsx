import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { loadStyleContext } from "@/lib/profile/context";
import { localDate } from "@/lib/today/weather";
import { computeInsights, type InsightItem } from "@/lib/insights/compute";
import { ROLE_LABEL } from "@/lib/plan/sequence";
import ClosetSubnav from "../../ClosetSubnav";
import { isoDaysAgo } from "@/lib/time";
import { ButtonLink, Card, EmptyState, ListCard, ListRow, Notice, PageHeader, SectionTitle, StatTile, Thumb } from "@/components/ui";

export const metadata = { title: "Insights · valette" };

const money = (n: number) => (n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2).replace(/\.00$/, "")}`);

/** A section: SectionTitle and one line of context above its content. */
function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <SectionTitle>{title}</SectionTitle>
        {sub && <p className="text-sm text-stone-500">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

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

  const pieceThumb = (id: string) => {
    const r = byId.get(id);
    const url = r?.image_path ? urls[r.image_path] : undefined;
    return (
      <Thumb
        size="xs"
        src={url}
        alt={r?.name ?? r?.subcategory ?? "piece"}
        item={{ category: r?.category, subcategory: r?.subcategory, colors: Array.isArray(r?.colors) ? (r?.colors as Array<{ name: string; hex?: string }>) : [] }}
      />
    );
  };
  const piece = (id: string, right?: string, sub?: string) => (
    <ListRow
      key={id}
      href={`/closet/${id}`}
      leading={pieceThumb(id)}
      title={byId.get(id)?.name ?? "Piece"}
      meta={sub}
      trailing={right ? <span className="shrink-0 text-sm font-semibold tabular-nums">{right}</span> : undefined}
    />
  );
  const palTotal = ins.palette.in + ins.palette.near + ins.palette.off + ins.palette.unknown || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Closet insights"
        subtitle="What you wear, what it costs per wear, and what's been sitting."
      />
      <ClosetSubnav />

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={ins.active} label={ins.active === 1 ? "piece" : "pieces"} />
        <StatTile value={`${Math.round(ins.usedShare * 100)}%`} label="worn in 90 days" />
        <StatTile value={ins.wearsLast30} label={ins.wearsLast30 === 1 ? "wear this month" : "wears this month"} />
      </div>

      {totalWears === 0 && (
        <EmptyState
          compact
          title="Insights grow as you log what you wear."
          body={
            <>
              Insights grow as you log what you wear. Tap <b>Wore it</b> on Today, on your plan, or on any piece.
            </>
          }
        />
      )}

      {ins.sleepers.length > 0 && (
        <Section title="Sleeping in your closet" sub="Not worn in 60 days or more. Give one a turn this week, or let it go.">
          <ListCard>
            {ins.sleepers.map((s) => (
              piece(s.id, undefined, s.days == null ? "Not worn yet" : `${s.days} days since you wore it`)
            ))}
          </ListCard>
          <ButtonLink variant="primary" size="sm" href={`/outfits/new?items=${ins.sleepers[0].id}`} className="max-w-full">
            <span className="truncate">Build an outfit around {byId.get(ins.sleepers[0].id)?.name ?? "the first one"}</span>
          </ButtonLink>
        </Section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Best value" sub="Lowest cost per wear.">
          {ins.bestValue.length ? (
            <ListCard>
              {ins.bestValue.map((r) => (
                piece(r.id, money(r.cpw!), `${money(r.price)} · worn ${r.wears}×`)
              ))}
            </ListCard>
          ) : (
            <EmptyState compact title={priced ? "Log a few wears to see cost per wear." : "Add what you paid on a piece's page to see cost per wear."} />
          )}
        </Section>
        <Section title="Still paying off" sub="Highest cost per wear so far.">
          {ins.worstValue.length ? (
            <ListCard>
              {ins.worstValue.map((r) => (
                piece(r.id, r.cpw != null ? money(r.cpw) : "unworn", `${money(r.price)} · worn ${r.wears}×`)
              ))}
            </ListCard>
          ) : (
            <EmptyState compact title="Nothing priced yet." />
          )}
        </Section>
      </div>

      {ins.mostWorn.length > 0 && (
        <Section title="Your favorites" sub="Most worn this year. More like these is a safe bet.">
          <ListCard>
            {ins.mostWorn.map((r) => (
              piece(r.id, `${r.wears}×`)
            ))}
          </ListCard>
        </Section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card as="section" className="space-y-3">
          <div className="space-y-1">
            <SectionTitle>Palette fit</SectionTitle>
            <p className="text-sm text-stone-500">How your closet sits against your best colors.</p>
          </div>
          <div
            className="flex h-4 gap-0.5 overflow-hidden rounded-full bg-inset ring-1 ring-inset ring-line"
            role="img"
            aria-label={`${ins.palette.in} in palette, ${ins.palette.near} close, ${ins.palette.off} off palette, ${ins.palette.unknown} unknown`}
          >
            {/* A 2 px gap shows the track between segments, so adjacent fills never rely on their own contrast. */}
            {ins.palette.in > 0 && <span className="bg-emerald-700" style={{ width: `${(ins.palette.in / palTotal) * 100}%` }} />}
            {ins.palette.near > 0 && <span className="bg-emerald-300" style={{ width: `${(ins.palette.near / palTotal) * 100}%` }} />}
            {ins.palette.off > 0 && <span className="bg-red-600" style={{ width: `${(ins.palette.off / palTotal) * 100}%` }} />}
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm tabular-nums">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-emerald-700" />
              {ins.palette.in} in palette
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-emerald-300" />
              {ins.palette.near} close
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-red-600" />
              {ins.palette.off} off palette
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-inset ring-1 ring-inset ring-line-strong" />
              {ins.palette.unknown} no color yet
            </li>
          </ul>
          {ins.topColors.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {ins.topColors.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-inset ring-line-strong">
                  <span aria-hidden="true" className="size-3 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15" style={{ background: c.hex ?? "transparent" }} />
                  {c.name} · {c.count}
                </span>
              ))}
            </div>
          )}
        </Card>
        <Card as="section" className="space-y-3">
          <SectionTitle>Closet balance</SectionTitle>
          <ul className="space-y-2 text-sm">
            {ins.roles.map((r) => {
              const max = Math.max(...ins.roles.map((x) => x.count));
              return (
                <li key={r.role} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-stone-600">{ROLE_LABEL[r.role]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block h-2.5 rounded-full bg-stone-800" style={{ width: `${Math.max(6, (r.count / max) * 100)}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right tabular-nums text-stone-500">{r.count}</span>
                </li>
              );
            })}
          </ul>
          {ins.balanceHint && (
            <Notice tone="warn">
              {ins.balanceHint}{" "}
              <Link href="/gaps" className="font-semibold underline underline-offset-2">
                See gaps
              </Link>
            </Notice>
          )}
          <p className="text-sm text-stone-500">
            {ins.verdicts.works} work on you · {ins.verdicts.almost} almost · {ins.verdicts.not} not for you · {ins.verdicts.unchecked} unchecked
          </p>
        </Card>
      </div>
    </div>
  );
}
