"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkOutfitAction, saveOutfit } from "../actions";
import CompositionPanel from "../CompositionPanel";
import type { Composition } from "@/lib/outfit/composition";

export type PickItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string | null;
  colors: string[];
  verdict: string | null;
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
    if (picked.length === 0) {
      setComposition(null);
      return;
    }
    const mine = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
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
    <div className="space-y-5">
      <div className="sticky top-14 z-[5] space-y-3 rounded-xl border border-stone-200 bg-stone-50/95 p-3 backdrop-blur">
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
                className="flex items-center gap-2 rounded-full border border-stone-300 bg-white py-1 pl-1 pr-3 text-xs"
                title="Remove"
              >
                {i.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="h-8 w-8 rounded-full bg-stone-200" />
                )}
                <span className="max-w-32 truncate">{i.name}</span>
                <span aria-hidden className="text-stone-400">
                  ×
                </span>
              </button>
            );
          })}
        </div>
        {composition && <div className={checking ? "opacity-60 transition-opacity" : "transition-opacity"}><CompositionPanel composition={composition} /></div>}
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="mb-2 text-sm font-medium text-stone-500">
            {g.label} <span className="text-stone-400">{g.items.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {g.items.map((i) => {
              const on = picked.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => toggle(i.id)}
                  aria-pressed={on}
                  className={"overflow-hidden rounded-lg border bg-white text-left " + (on ? "border-stone-900 ring-2 ring-stone-900" : "border-stone-200")}
                >
                  <div className="relative aspect-square bg-stone-100">
                    {i.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.url} alt={i.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-center text-[10px] uppercase tracking-wide text-stone-400">
                        {i.subcategory ?? i.category}
                      </div>
                    )}
                    {i.verdict === "cut" && <span className="absolute right-1 top-1 rounded-full bg-red-700 px-1.5 text-[10px] text-white">Cut</span>}
                  </div>
                  <p className="truncate p-1.5 text-xs">{i.name}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {picked.length >= 2 && (
        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-stone-500">Name (optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
            <label className="text-sm">
              <span className="text-stone-500">Occasion (optional)</span>
              <input value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={80} placeholder="Dinner, office, travel day" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
            </label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving" : "Save outfit"}
          </button>
        </div>
      )}
    </div>
  );
}
