"use client";

import { useState, useTransition } from "react";
import { BASICS, type Basic, type Presentation } from "@/lib/closet/basics";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/closet/taxonomy";
import { toggleBasic, updateBasicDetails } from "../actions";
import { Button, Input, Notice, Swatch } from "@/components/ui";

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
        <div role="group" aria-label="Basics list" className="flex gap-1 rounded-full bg-inset p-1 text-sm">
          {(["womens", "mens"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTab(p)}
              aria-pressed={tab === p}
              className={
                "tap min-h-9 flex-1 rounded-full font-medium transition-colors duration-200 ease-soft " +
                (tab === p ? "bg-card text-stone-900 shadow-active" : "text-stone-600 hover:text-stone-900")
              }
            >
              {p === "womens" ? "Women's" : "Men's"}
            </button>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" className="text-sm tabular-nums text-stone-500">
        {ownedHere} of {list.length} ticked
      </p>
      {error && <Notice tone="error">{error}</Notice>}

      {groups.map(([category, items]) => (
        <section key={category} aria-labelledby={`basics-${category}`} className="space-y-2">
          <h2 id={`basics-${category}`} className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-700">
            {CATEGORY_LABELS[category]}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-card ring-1 ring-line">
            {items.map((b) => {
              const info = owned[b.id];
              const on = !!info;
              return (
                <li key={b.id}>
                  <div className="flex items-center transition-colors duration-200 ease-soft hover:bg-inset/60">
                    <button type="button" onClick={() => toggle(b)} className="flex min-h-12 flex-1 items-center gap-3 px-4 py-3 text-left" aria-pressed={on}>
                      <span
                        aria-hidden="true"
                        className={
                          "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] text-xs transition-colors duration-150 ease-soft " +
                          (on ? "border-stone-900 bg-stone-900 text-stone-50" : "border-stone-400 bg-card")
                        }
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1 text-[15px]">
                        {b.name}
                        {info?.brand && <span className="ml-2 text-sm text-stone-500">{info.brand}</span>}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {b.colors.map((c, i) => (
                          <Swatch key={i} hex={c.hex} name={c.name} />
                        ))}
                      </span>
                    </button>
                    {on && open !== b.id && !info.brand && (
                      <Button type="button" variant="quiet" size="sm" className="mr-2 shrink-0" onClick={() => setOpen(b.id)}>
                        Add brand &amp; color
                      </Button>
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
    <div className="space-y-3 bg-inset/60 px-4 py-3">
      <p className="text-xs text-stone-500">What brand and color is yours? A photo can come later.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand (Nike, Uniqlo…)" aria-label={`Brand of your ${basic.name}`} className="min-w-0 flex-1" />
        <input
          type="color"
          value={colorHex}
          onChange={(e) => setColorHex(e.target.value)}
          aria-label="Color swatch"
          className="size-11 shrink-0 cursor-pointer rounded-control border border-stone-400/70 bg-inset p-1"
        />
        <div className="w-32">
          <Input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Color name" aria-label="Color name" />
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="quiet" size="sm" onClick={() => onDone(null)}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
