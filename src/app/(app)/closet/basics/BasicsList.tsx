"use client";

import { useState, useTransition } from "react";
import { BASICS, type Basic, type Presentation } from "@/lib/closet/basics";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/closet/taxonomy";
import { toggleBasic, updateBasicDetails } from "../actions";

export type OwnedInfo = { brand: string | null };
type Props = { defaultTab: Presentation; showTabs: boolean; owned: Record<string, OwnedInfo> };

export default function BasicsList({ defaultTab, showTabs, owned: initialOwned }: Props) {
  const [tab, setTab] = useState<Presentation>(defaultTab);
  const [owned, setOwned] = useState<Record<string, OwnedInfo>>(initialOwned);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const list = BASICS[tab];
  const groups = CATEGORIES.map((c) => [c, list.filter((b) => b.category === c)] as const).filter(([, items]) => items.length > 0);
  const ownedHere = list.filter((b) => b.id in owned).length;

  const toggle = (b: Basic) => {
    const next = !(b.id in owned);
    setOwned((s) => {
      const copy = { ...s };
      if (next) copy[b.id] = { brand: null };
      else delete copy[b.id];
      return copy;
    });
    setOpen(next ? b.id : null);
    setError(null);
    startTransition(async () => {
      const r = await toggleBasic(b.id, next);
      if (r.error) {
        setError(r.error);
        setOwned((s) => {
          const copy = { ...s };
          if (next) delete copy[b.id];
          else copy[b.id] = { brand: null };
          return copy;
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {showTabs && (
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1 text-sm">
          {(["womens", "mens"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTab(p)}
              className={"flex-1 rounded-md py-1.5 " + (tab === p ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100")}
            >
              {p === "womens" ? "Women's" : "Men's"}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-stone-500">
        {ownedHere} of {list.length} ticked
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {groups.map(([category, items]) => (
        <section key={category} className="rounded-xl border border-stone-200 bg-white">
          <h2 className="border-b border-stone-100 px-4 py-2 text-sm font-medium text-stone-500">{CATEGORY_LABELS[category]}</h2>
          <ul className="divide-y divide-stone-100">
            {items.map((b) => {
              const info = owned[b.id];
              const on = !!info;
              return (
                <li key={b.id}>
                  <div className="flex items-center hover:bg-stone-50">
                    <button
                      type="button"
                      onClick={() => toggle(b)}
                      className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
                      aria-pressed={on}
                    >
                      <span
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs " +
                          (on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white")
                        }
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="flex-1 text-sm">
                        {b.name}
                        {info?.brand && <span className="ml-2 text-stone-500">{info.brand}</span>}
                      </span>
                      <span className="flex gap-1">
                        {b.colors.map((c, i) => (
                          <span key={i} className="h-3 w-3 rounded-full border border-stone-300" style={{ background: c.hex ?? "transparent" }} />
                        ))}
                      </span>
                    </button>
                    {on && open !== b.id && !info.brand && (
                      <button type="button" onClick={() => setOpen(b.id)} className="mr-4 shrink-0 text-xs text-amber-800 underline">
                        Add brand &amp; color
                      </button>
                    )}
                  </div>
                  {on && open === b.id && (
                    <BasicDetailsForm
                      basic={b}
                      onDone={(brand) => {
                        if (brand) setOwned((s) => ({ ...s, [b.id]: { brand } }));
                        setOpen(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function BasicDetailsForm({ basic, onDone }: { basic: Basic; onDone: (savedBrand: string | null) => void }) {
  const first = basic.colors[0];
  const [brand, setBrand] = useState("");
  const [colorName, setColorName] = useState(first?.name ?? "");
  const [colorHex, setColorHex] = useState(first?.hex ?? "#888888");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const r = await updateBasicDetails(basic.id, { brand, colorName, colorHex: colorName ? colorHex : undefined });
      if (r.error) {
        setError(r.error);
        return;
      }
      onDone(brand.trim() || null);
    });
  };

  return (
    <div className="space-y-2 border-t border-stone-100 bg-stone-50 px-4 py-3">
      <p className="text-xs text-stone-500">What brand and color is yours? A photo can come later.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Brand (Nike, Uniqlo…)"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <input
          type="color"
          value={colorHex}
          onChange={(e) => setColorHex(e.target.value)}
          aria-label="Color swatch"
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
        />
        <input
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
          placeholder="Color name"
          className="w-32 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-stone-900 px-3 py-1.5 text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => onDone(null)} className="text-stone-500 underline">
          Skip for now
        </button>
      </div>
    </div>
  );
}
