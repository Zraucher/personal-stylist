"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TripView } from "@/lib/plan/trip";
import { deleteTripAction, swapLookAction, togglePackedAction } from "../actions";

export default function TripClient({ trip }: { trip: TripView }) {
  const router = useRouter();
  const [packed, setPacked] = useState(() => new Set(trip.packed));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"looks" | "pack">("looks");
  const [, start] = useTransition();

  const allEntries = [...trip.packing.flatMap((g) => g.items.map((i) => i.id)), ...trip.extras.map((e) => `extra:${e}`)];
  const done = allEntries.filter((e) => packed.has(e)).length;
  const pieces = trip.packing.reduce((n, g) => n + g.items.length, 0);

  const toggle = (entry: string) => {
    const on = !packed.has(entry);
    setPacked((s) => {
      const n = new Set(s);
      if (on) n.add(entry);
      else n.delete(entry);
      return n;
    });
    start(async () => {
      const r = await togglePackedAction(trip.id, entry, on);
      if (r.error) setError(r.error);
    });
  };

  const swap = (key: string) => {
    setBusy(key);
    setError(null);
    start(async () => {
      const r = await swapLookAction(trip.id, key);
      if (r.error) setError(r.error);
      router.refresh();
      setBusy(null);
    });
  };

  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="font-display text-2xl font-extrabold">{trip.looks.length}</p>
          <p className="text-xs text-stone-500">looks</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="font-display text-2xl font-extrabold">{pieces}</p>
          <p className="text-xs text-stone-500">pieces to pack</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <p className="font-display text-2xl font-extrabold">{done}/{allEntries.length}</p>
          <p className="text-xs text-stone-500">packed</p>
        </div>
      </div>

      <div className="flex gap-1 text-sm" role="tablist">
        {(["looks", "pack"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={"rounded-full px-4 py-1.5 font-semibold " + (tab === t ? "bg-stone-900 text-stone-50" : "text-stone-600")}>
            {t === "looks" ? "Looks" : "Packing list"}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {tab === "looks" ? (
        <ol className="space-y-3">
          {trip.looks.map((l) => (
            <li key={l.key} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {fmt(l.date)} · {l.label}
                </p>
                {l.weather && l.weather.source !== "default" && <p className="text-xs text-stone-500">{l.weather.feelsMin}–{l.weather.feelsMax}°{l.weather.rainMax >= 40 ? ` · ${l.weather.rainMax}% rain` : ""}</p>}
              </div>
              {l.pieces.length ? (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {l.pieces.map((p) => (
                    <Link key={p.id} href={`/closet/${p.id}`} className="w-16 shrink-0" title={p.name}>
                      <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                        {p.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-1 px-1 text-center">
                            <span className="h-4 w-4 rounded-full border border-stone-300" style={{ background: p.hex ?? "#d6d3d1" }} />
                            <span className="text-[9px] leading-tight text-stone-500">{p.subcategory ?? "piece"}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-stone-500">Nothing in the closet fits this one yet.</p>
              )}
              <div className="mt-2 flex gap-2 text-sm">
                <button type="button" disabled={!!busy} onClick={() => swap(l.key)} className="rounded-full border border-stone-300 px-3 py-1 disabled:opacity-60">
                  {busy === l.key ? "Finding another…" : "Swap"}
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-4">
          {trip.packing.map((g) => (
            <section key={g.role} className="rounded-2xl border border-stone-200 bg-white p-4">
              <h2 className="mb-2 font-display font-bold">{g.label}</h2>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg p-1 hover:bg-stone-50">
                      <input type="checkbox" checked={packed.has(it.id)} onChange={() => toggle(it.id)} className="h-5 w-5 accent-emerald-700" />
                      <span className="h-5 w-5 shrink-0 rounded-full border border-stone-300" style={{ background: it.hex ?? "#d6d3d1" }} />
                      <span className={"min-w-0 flex-1 truncate " + (packed.has(it.id) ? "text-stone-400 line-through" : "")}>{it.name}</span>
                      <span className="text-xs text-stone-500">{it.looks} look{it.looks === 1 ? "" : "s"}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="mb-2 font-display font-bold">Don&apos;t forget</h2>
            <ul className="space-y-1">
              {trip.extras.map((e) => (
                <li key={e}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg p-1 hover:bg-stone-50">
                    <input type="checkbox" checked={packed.has(`extra:${e}`)} onChange={() => toggle(`extra:${e}`)} className="h-5 w-5 accent-emerald-700" />
                    <span className={packed.has(`extra:${e}`) ? "text-stone-400 line-through" : ""}>{e}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <form action={deleteTripAction.bind(null, trip.id)} onSubmit={(e) => !confirm("Delete this trip?") && e.preventDefault()}>
        <button type="submit" className="text-sm text-red-700 underline">Delete trip</button>
      </form>
    </div>
  );
}
