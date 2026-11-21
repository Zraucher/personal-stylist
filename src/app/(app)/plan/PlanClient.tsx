"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { PlanDayView, WeekView } from "@/lib/plan/server";
import { OCCASIONS } from "@/lib/today/candidates";
import AskFriendsButton from "@/components/AskFriendsButton";

const dayLabel = (date: string, today: string) => {
  const d = new Date(`${date}T12:00:00`);
  if (date === today) return "Today";
  const t = new Date(`${today}T12:00:00`);
  if ((d.getTime() - t.getTime()) / 86400000 === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long" });
};
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function PlanClient({ initial }: { initial: WeekView }) {
  const [week, setWeek] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();

  const call = (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setMessage(null);
    start(async () => {
      try {
        const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) setMessage(j.error === "failed" ? "Something went wrong. Try again." : j.error ?? "Something went wrong.");
        else {
          setWeek(j.week);
          if (j.message) setMessage(j.message);
        }
      } catch {
        setMessage("You look offline. Try again when you're connected.");
      } finally {
        setBusy(null);
      }
    });
  };

  const planned = week.days.filter((d) => d.outfit).length;
  const thin = week.closetSize < 6;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!!busy || thin} onClick={() => call("fill", { action: "fill" })} className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-60">
          {busy === "fill" ? "Planning…" : planned ? "Fill the open days" : "Plan my week"}
        </button>
        {planned > 0 && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => confirm("Replan every day you haven't worn yet?") && call("replan", { action: "fill", replan: true })}
            className="rounded-full border-[1.5px] border-stone-900 px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy === "replan" ? "Replanning…" : "Replan all"}
          </button>
        )}
        <span className="text-sm text-stone-500">{planned} of 7 days planned{week.place ? ` · ${week.place}` : ""}</span>
      </div>
      {thin && (
        <p className="rounded-xl bg-amber-100 p-3 text-sm">
          The planner needs at least a few tops, bottoms and shoes. <Link href="/closet/basics" className="font-semibold underline">Tick your basics</Link> to get started.
        </p>
      )}
      {message && <p className="rounded-xl bg-white p-3 text-sm text-stone-700 ring-1 ring-stone-200">{message}</p>}

      <ol className="space-y-3">
        {week.days.map((d) => (
          <DayCard key={d.date} d={d} today={week.today} busy={busy} call={call} />
        ))}
      </ol>
    </div>
  );
}

function DayCard({ d, today, busy, call }: { d: PlanDayView; today: string; busy: string | null; call: (key: string, body: Record<string, unknown>) => void }) {
  const w = d.weather;
  const isToday = d.date === today;
  const k = (a: string) => `${a}-${d.date}`;
  return (
    <li className={"rounded-2xl border bg-white p-4 " + (d.worn ? "border-emerald-700" : "border-stone-200")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold leading-tight">
            {dayLabel(d.date, today)} <span className="text-sm font-normal text-stone-500">{shortDate(d.date)}</span>
          </p>
          <p className="text-sm text-stone-500">
            {w.source === "default" ? "No forecast yet" : `${w.feelsMin}–${w.feelsMax}° feels`}
            {w.rainMax >= 30 ? ` · ${w.rainMax}% rain` : ""}
            {w.uvMax >= 8 ? " · strong sun" : ""}
          </p>
        </div>
        <select
          aria-label={`Occasion for ${dayLabel(d.date, today)}`}
          value={d.occasion}
          disabled={!!busy || d.worn}
          onChange={(e) => call(k("occ"), { action: "occasion", date: d.date, occasion: e.target.value })}
          className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm"
        >
          {OCCASIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {d.outfit ? (
        <div className="mt-3 space-y-2">
          <p className="font-semibold">{d.outfit.name}</p>
          <div className="flex gap-2 overflow-x-auto">
            {d.outfit.items.map((it) => (
              <Link key={it.id} href={`/closet/${it.id}`} className="w-16 shrink-0" title={it.name}>
                <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                  {it.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center">
                      <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: it.colors[0]?.hex ?? "#d6d3d1" }} />
                      <span className="text-[9px] leading-tight text-stone-500">{it.subcategory ?? "piece"}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {d.outfit.headline && <p className="text-xs text-stone-500">{d.outfit.headline}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            {d.worn ? (
              <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">✓ wore it</span>
            ) : (
              <>
                {d.date <= today && (
                  <button type="button" disabled={!!busy} onClick={() => call(k("wore"), { action: "wore", date: d.date })} className="rounded-full bg-emerald-700 px-3 py-1 font-semibold text-white disabled:opacity-60">
                    {busy === k("wore") ? "Saving…" : "wore it"}
                  </button>
                )}
                <button type="button" disabled={!!busy} onClick={() => call(k("swap"), { action: "swap", date: d.date })} className="rounded-full border border-stone-300 px-3 py-1 disabled:opacity-60">
                  {busy === k("swap") ? "Finding another…" : "Swap"}
                </button>
                <Link href={`/outfits/new?items=${d.outfit.items.map((i) => i.id).join(",")}`} className="rounded-full border border-stone-300 px-3 py-1">
                  Edit
                </Link>
                <button type="button" disabled={!!busy} onClick={() => call(k("clear"), { action: "clear", date: d.date })} className="px-1 text-stone-500 underline-offset-2 hover:underline disabled:opacity-60">
                  Clear
                </button>
              </>
            )}
            {isToday || d.date > today ? <AskFriendsButton target={{ kind: "outfit", outfitId: d.outfit.id }} compact /> : null}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-sm text-stone-500">
          <span>Nothing planned.</span>
          <button type="button" disabled={!!busy} onClick={() => call(k("swap"), { action: "occasion", date: d.date, occasion: d.occasion })} className="font-semibold text-stone-900 underline disabled:opacity-60">
            {busy === k("swap") ? "Planning…" : "Plan this day"}
          </button>
        </div>
      )}
    </li>
  );
}
