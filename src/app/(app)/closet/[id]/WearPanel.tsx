"use client";

import { useState, useTransition } from "react";
import { markWorn, setItemPrice, unmarkWorn } from "../wear-actions";

const money = (n: number) => (n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2).replace(/\.00$/, "")}`);

export default function WearPanel({ itemId, wears, lastWorn, wornToday, price }: { itemId: string; wears: number; lastWorn: string | null; wornToday: boolean; price: number | null }) {
  const [pending, start] = useTransition();
  const [priceText, setPriceText] = useState(price != null ? String(price) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const cpw = price != null && price > 0 && wears > 0 ? price / wears : null;

  const savePrice = () =>
    start(async () => {
      const r = await setItemPrice(itemId, priceText);
      setMsg(r.error ?? "Saved");
    });

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {wears ? `Worn ${wears} time${wears === 1 ? "" : "s"}` : "Not worn yet"}
            {cpw != null && <span className="text-stone-500"> · {money(cpw)} per wear</span>}
          </p>
          <p className="text-sm text-stone-500">{lastWorn ? `Last worn ${new Date(`${lastWorn}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Tap below when you wear it."}</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (wornToday ? await unmarkWorn(itemId) : await markWorn(itemId)))}
          className={"rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 " + (wornToday ? "border-[1.5px] border-emerald-700 text-emerald-800" : "bg-emerald-700 text-white")}
        >
          {wornToday ? "✓ Worn today (undo)" : "Wore it today"}
        </button>
      </div>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-600">Paid</span>
        <input
          value={priceText}
          onChange={(e) => setPriceText(e.target.value)}
          onBlur={() => priceText !== (price != null ? String(price) : "") && savePrice()}
          inputMode="decimal"
          placeholder="$0"
          className="w-24 rounded-lg border border-stone-300 bg-white px-2 py-1"
        />
        <span className="text-xs text-stone-500">{msg ?? "for cost per wear"}</span>
      </label>
    </section>
  );
}
