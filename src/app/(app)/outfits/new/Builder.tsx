"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkOutfitAction, saveOutfit } from "../actions";
import CompositionPanel from "../CompositionPanel";
import type { Composition } from "@/lib/outfit/composition";
import ItemPlaceholder from "@/lib/closet/placeholder";
import { Button, Card, Chip, Field, Input, Notice, Thumb } from "@/components/ui";

export type PickItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string | null;
  colors: string[];
  verdict: string | null;
  /** Color names with hex, for the garment silhouette when there is no photo. */
  swatches?: Array<{ name: string; hex?: string }>;
};

type Group = { key: string; label: string; items: PickItem[] };

export default function Builder({ groups, initialPicked = [] }: { groups: Group[]; initialPicked?: string[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(initialPicked);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const seq = useRef(0);

  const byId = new Map(groups.flatMap((g) => g.items).map((i) => [i.id, i]));

  useEffect(() => {
    if (picked.length === 0) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setChecking(true);
      const res = await checkOutfitAction(picked);
      if (mine !== seq.current) return;
      setChecking(false);
      if (res.error) setError(res.error);
      else setComposition(res.composition ?? null);
    }, 250);
    return () => clearTimeout(t);
  }, [picked]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 10 ? p : [...p, id]));

  const save = () => {
    setError(null);
    startSaving(async () => {
      const res = await saveOutfit({ itemIds: picked, name, occasion });
      if (res.error) setError(res.error);
      else router.push("/outfits");
    });
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-[5] space-y-3 rounded-card bg-ground/90 p-3 ring-1 ring-line backdrop-blur-md">
        <div className="flex min-h-14 flex-wrap gap-2">
          {picked.length === 0 && <p className="self-center text-sm text-stone-500">Tap pieces below to build an outfit.</p>}
          {picked.map((id) => {
            const i = byId.get(id);
            if (!i) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 text-sm ring-1 ring-inset ring-line-strong transition-colors duration-200 ease-soft hover:ring-stone-400"
                title="Remove"
                aria-label={`Remove ${i.name}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-inset">
                  {i.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ItemPlaceholder category={i.category} subcategory={i.subcategory} colors={i.swatches} label={i.name} compact />
                  )}
                </span>
                <span className="max-w-32 truncate">{i.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-stone-500">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            );
          })}
        </div>
        {picked.length > 0 && composition && (
          <div aria-busy={checking} className={"transition-opacity duration-200 ease-soft " + (checking ? "opacity-60" : "")}>
            <CompositionPanel composition={composition} />
          </div>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.key} className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            {g.label} <span className="tabular-nums">{g.items.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {g.items.map((i) => {
              const on = picked.includes(i.id);
              return (
                <button key={i.id} type="button" onClick={() => toggle(i.id)} aria-pressed={on} className="group min-w-0 space-y-1.5 rounded-thumb text-left">
                  <Thumb
                    src={i.url}
                    alt={i.name}
                    item={{ category: i.category, subcategory: i.subcategory, colors: i.swatches }}
                    className={"transition-shadow duration-200 ease-soft " + (on ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-ground" : "group-hover:opacity-90")}
                    badge={
                      <>
                        {on && (
                          <span aria-hidden="true" className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-stone-900 text-stone-50">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                          </span>
                        )}
                        {i.verdict === "cut" && (
                          <Chip tone="not" className="absolute right-1 top-1 px-1.5 py-0.5 text-[11px]">
                            <span aria-hidden="true">✕</span> not for you
                          </Chip>
                        )}
                      </>
                    }
                  />
                  <p className={"truncate text-xs " + (on ? "font-semibold text-stone-900" : "text-stone-700")}>{i.name}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {picked.length >= 2 && (
        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name (optional)">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Occasion (optional)">
              <Input value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={80} placeholder="Dinner, office, travel day" />
            </Field>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="button" variant="primary" onClick={save} disabled={saving} aria-busy={saving}>
            {saving ? "Saving" : "Save outfit"}
          </Button>
        </Card>
      )}
    </div>
  );
}
