"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { TripView } from "@/lib/plan/trip";
import { deleteTripAction, swapLookAction, togglePackedAction } from "../actions";
import { Button, Card, ConfirmButton, Notice, StatTile, Thumb, cx } from "@/components/ui";

// A packing row: the whole line is the tap target.
const ROW = "-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 transition-colors duration-200 ease-soft hover:bg-inset/60";
const CHECK = "size-[18px] shrink-0 accent-emerald-700";

export default function TripClient({ trip }: { trip: TripView }) {
  const router = useRouter();
  const deleteForm = useRef<HTMLFormElement>(null);
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile value={trip.looks.length} label="looks" />
        <StatTile value={pieces} label="pieces to pack" />
        <StatTile
          value={
            <>
              {done}
              <span className="text-lg text-stone-500">/{allEntries.length}</span>
            </>
          }
          label="packed"
        />
      </div>

      <div className="inline-flex rounded-full bg-inset p-1" role="tablist" aria-label="Trip">
        {(["looks", "pack"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              "tap min-h-9 rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ease-soft",
              tab === t ? "bg-card text-stone-900 shadow-sm ring-1 ring-line" : "text-stone-600 hover:text-stone-900"
            )}
          >
            {t === "looks" ? "Looks" : "Packing list"}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}

      {tab === "looks" ? (
        <ol className="space-y-3">
          {trip.looks.map((l) => (
            <Card as="li" key={l.key} className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-lg font-bold leading-snug">
                  {fmt(l.date)} · {l.label}
                </p>
                {l.weather && l.weather.source !== "default" && (
                  <p className="shrink-0 text-xs text-stone-500 tabular-nums">
                    {l.weather.feelsMin}–{l.weather.feelsMax}°{l.weather.rainMax >= 40 ? ` · ${l.weather.rainMax}% rain` : ""}
                  </p>
                )}
              </div>
              {l.pieces.length ? (
                <ul className="flex gap-2 overflow-x-auto">
                  {l.pieces.map((p) => (
                    <li key={p.id}>
                      <Link href={`/closet/${p.id}`} title={p.name} className="block rounded-[10px]">
                        <Thumb src={p.url} alt={p.name} size="sm" item={{ subcategory: p.subcategory, colors: p.hex ? [{ name: p.name, hex: p.hex }] : null }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500">Nothing in the closet fits this one yet.</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" disabled={!!busy} aria-busy={busy === l.key} onClick={() => swap(l.key)}>
                  {busy === l.key ? "Finding another…" : "Swap"}
                </Button>
              </div>
            </Card>
          ))}
        </ol>
      ) : (
        <div className="space-y-3">
          {trip.packing.map((g) => (
            <Card as="section" key={g.role} className="space-y-1">
              <h2 className="font-display text-lg font-bold leading-snug">{g.label}</h2>
              <ul>
                {g.items.map((it) => {
                  const on = packed.has(it.id);
                  return (
                    <li key={it.id}>
                      <label className={ROW}>
                        <input type="checkbox" checked={on} onChange={() => toggle(it.id)} className={CHECK} />
                        <Thumb src={it.url} alt="" size="xs" item={{ subcategory: it.subcategory, colors: it.hex ? [{ name: it.name, hex: it.hex }] : null }} />
                        <span className={cx("min-w-0 flex-1 truncate", on && "text-stone-500 line-through")}>{it.name}</span>
                        <span className="shrink-0 text-xs text-stone-500 tabular-nums">
                          {it.looks} look{it.looks === 1 ? "" : "s"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
          <Card as="section" className="space-y-1">
            <h2 className="font-display text-lg font-bold leading-snug">Don&apos;t forget</h2>
            <ul>
              {trip.extras.map((e) => {
                const on = packed.has(`extra:${e}`);
                return (
                  <li key={e}>
                    <label className={ROW}>
                      <input type="checkbox" checked={on} onChange={() => toggle(`extra:${e}`)} className={CHECK} />
                      <span className={cx("min-w-0 flex-1", on && "text-stone-500 line-through")}>{e}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      <form ref={deleteForm} action={deleteTripAction.bind(null, trip.id)}>
        <ConfirmButton title="Delete this trip?" onConfirm={() => deleteForm.current?.requestSubmit()}>
          Delete trip
        </ConfirmButton>
      </form>
    </div>
  );
}
