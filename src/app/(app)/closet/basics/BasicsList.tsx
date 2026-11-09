"use client";

import { useState, useTransition } from "react";
import { BASICS, type Basic, type Presentation } from "@/lib/closet/basics";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/closet/taxonomy";
import { toggleBasic } from "../actions";

type Props = { defaultTab: Presentation; showTabs: boolean; ownedIds: string[] };

export default function BasicsList({ defaultTab, showTabs, ownedIds }: Props) {
  const [tab, setTab] = useState<Presentation>(defaultTab);
  const [owned, setOwned] = useState<Set<string>>(() => new Set(ownedIds));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const list = BASICS[tab];
  const groups = CATEGORIES.map((c) => [c, list.filter((b) => b.category === c)] as const).filter(([, items]) => items.length > 0);
  const ownedHere = list.filter((b) => owned.has(b.id)).length;

  const toggle = (b: Basic) => {
    const next = !owned.has(b.id);
    setOwned((s) => {
      const copy = new Set(s);
      if (next) copy.add(b.id);
      else copy.delete(b.id);
      return copy;
    });
    setError(null);
    startTransition(async () => {
      const r = await toggleBasic(b.id, next);
      if (r.error) {
        setError(r.error);
        setOwned((s) => {
          const copy = new Set(s);
          if (next) copy.delete(b.id);
          else copy.add(b.id);
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
              const on = owned.has(b.id);
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => toggle(b)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
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
                    <span className="flex-1 text-sm">{b.name}</span>
                    <span className="flex gap-1">
                      {b.colors.map((c, i) => (
                        <span key={i} className="h-3 w-3 rounded-full border border-stone-300" style={{ background: c.hex ?? "transparent" }} />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
