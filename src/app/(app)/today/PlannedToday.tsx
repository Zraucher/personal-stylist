"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type Item = { id: string; name: string; url: string | null; hex: string | null };

export default function PlannedToday({ date, name, items, worn }: { date: string; name: string; items: Item[]; worn: boolean }) {
  const [done, setDone] = useState(worn);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wore = () =>
    start(async () => {
      const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "wore", date }) }).catch(() => null);
      if (r?.ok) setDone(true);
      else setError("Could not save. Try again.");
    });
  return (
    <section className={"rounded-2xl border bg-white p-4 " + (done ? "border-emerald-700" : "border-stone-200")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Planned for today</p>
        <Link href="/plan" className="text-sm text-stone-600 underline-offset-2 hover:underline">Week plan</Link>
      </div>
      <p className="mt-1 font-display text-lg font-bold">{name}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto">
        {items.map((it) => (
          <div key={it.id} className="w-14 shrink-0" title={it.name}>
            <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
              {it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt={it.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center">
                  <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: it.hex ?? "#d6d3d1" }} />
                  <span className="line-clamp-2 text-[9px] leading-tight text-stone-500">{it.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-sm">
        {done ? (
          <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white">✓ wore it</span>
        ) : (
          <button type="button" disabled={pending} onClick={wore} className="rounded-full bg-emerald-700 px-4 py-1.5 font-semibold text-white disabled:opacity-60">
            {pending ? "Saving…" : "wore it"}
          </button>
        )}
        {error && <span className="ml-2 text-red-700">{error}</span>}
      </div>
    </section>
  );
}
