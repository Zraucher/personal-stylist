"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import type { TripView } from "@/lib/plan/trip";
import { deleteTripAction, swapLookAction, togglePackedAction } from "../actions";
import { Button, Card, ConfirmButton, Notice, Thumb, cx } from "@/components/ui";

// A packing row: the whole line is the tap target.
const ROW = "-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 transition-colors duration-200 ease-soft hover:bg-inset/60";
const CHECK = "size-[18px] shrink-0 accent-stone-900";

const TABS = [
  { id: "looks", label: "Looks" },
  { id: "pack", label: "Packing list" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function TripClient({ trip }: { trip: TripView }) {
  const router = useRouter();
  const deleteForm = useRef<HTMLFormElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ looks: null, pack: null });
  const [packed, setPacked] = useState(() => new Set(trip.packed));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("looks");
  const [, start] = useTransition();

  const allEntries = [...trip.packing.flatMap((g) => g.items.map((i) => i.id)), ...trip.extras.map((e) => `extra:${e}`)];
  const done = allEntries.filter((e) => packed.has(e)).length;
  const pieces = trip.packing.reduce((n, g) => n + g.items.length, 0);

  const setEntry = (entry: string, on: boolean) =>
    setPacked((s) => {
      const n = new Set(s);
      if (on) n.add(entry);
      else n.delete(entry);
      return n;
    });

  const toggle = (entry: string) => {
    const on = !packed.has(entry);
    setEntry(entry, on);
    setError(null);
    start(async () => {
      const r = await togglePackedAction(trip.id, entry, on);
      if (r.error) {
        // Put the tick back the way it was so the list never claims something is packed when it isn't saved.
        setEntry(entry, !on);
        setError(r.error);
      }
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

  // Tabs pattern: arrow keys move between tabs, Home/End jump to the ends.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-stone-600 tabular-nums">
            {trip.looks.length} look{trip.looks.length === 1 ? "" : "s"} · {pieces} piece{pieces === 1 ? "" : "s"} to pack
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {done} of {allEntries.length} packed
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Packed"
          aria-valuemin={0}
          aria-valuemax={allEntries.length}
          aria-valuenow={done}
          className="h-2 overflow-hidden rounded-full bg-inset ring-1 ring-inset ring-line"
        >
          <div className="h-full rounded-full bg-stone-900 transition-[width] duration-300 ease-soft" style={{ width: `${allEntries.length ? (done / allEntries.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="inline-flex rounded-full bg-inset p-1" role="tablist" aria-label="Trip" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={cx(
              "tap min-h-9 rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ease-soft",
              tab === t.id ? "bg-card text-stone-900 shadow-sm ring-1 ring-line" : "text-stone-600 hover:text-stone-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}

      {tab === "looks" ? (
        <div role="tabpanel" id="panel-looks" aria-labelledby="tab-looks">
          <ol className="space-y-3">
            {trip.looks.map((l) => (
              <Card as="li" key={l.key} className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-bold leading-snug">
                    {fmt(l.date)} · {l.label}
                  </h2>
                  {l.weather && l.weather.source !== "default" && (
                    <p className="shrink-0 text-xs text-stone-500 tabular-nums">
                      Feels {l.weather.feelsMin}–{l.weather.feelsMax}°F{l.weather.rainMax >= 40 ? ` · ${l.weather.rainMax}% rain` : ""}
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
        </div>
      ) : (
        <div role="tabpanel" id="panel-pack" aria-labelledby="tab-pack" className="space-y-3">
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
