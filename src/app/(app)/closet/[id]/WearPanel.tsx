"use client";

import { useId, useState, useTransition } from "react";
import { Button, Card, CheckTick, Input } from "@/components/ui";
import { markWorn, setItemPrice, unmarkWorn } from "../wear-actions";

const money = (n: number) => (n >= 100 ? `$${Math.round(n)}` : `$${n.toFixed(2).replace(/\.00$/, "")}`);

export default function WearPanel({ itemId, wears, lastWorn, wornToday, price }: { itemId: string; wears: number; lastWorn: string | null; wornToday: boolean; price: number | null }) {
  const [pending, start] = useTransition();
  const [priceText, setPriceText] = useState(price != null ? String(price) : "");
  const [msg, setMsg] = useState<string | null>(null);
  // The tick draws only when "wore it" lands from a tap here, not on every page load.
  const [justMarked, setJustMarked] = useState(false);
  const priceId = useId();
  const cpw = price != null && price > 0 && wears > 0 ? price / wears : null;

  const savePrice = () =>
    start(async () => {
      const r = await setItemPrice(itemId, priceText);
      setMsg(r.error ?? "Saved");
    });

  return (
    <Card as="section" aria-label="Wear log" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-snug">
            {wears ? `Worn ${wears} time${wears === 1 ? "" : "s"}` : "Not worn yet"}
            {cpw != null && <span className="font-sans text-base font-normal text-stone-500"> · {money(cpw)} per wear</span>}
          </p>
          <p className="text-sm text-stone-500">{lastWorn ? `Last worn ${new Date(`${lastWorn}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Tap below when you wear it."}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={wornToday ? "secondary" : "primary"}
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            setJustMarked(!wornToday);
            start(async () => void (wornToday ? await unmarkWorn(itemId) : await markWorn(itemId)));
          }}
        >
          {wornToday ? (
            <>
              {justMarked ? (
                <CheckTick className="text-emerald-700" />
              ) : (
                <span aria-hidden="true" className="text-emerald-700">
                  ✓
                </span>
              )}
              Worn today (undo)
            </>
          ) : (
            "Wore it today"
          )}
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32 space-y-1.5">
          <label htmlFor={priceId} className="block text-sm font-medium text-stone-700">
            Paid
          </label>
          <Input
            id={priceId}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            onBlur={() => priceText !== (price != null ? String(price) : "") && savePrice()}
            inputMode="decimal"
            placeholder="$0"
            aria-describedby={`${priceId}-msg`}
          />
        </div>
        <p id={`${priceId}-msg`} role="status" aria-live="polite" className={"pb-3 text-xs " + (msg && msg !== "Saved" ? "text-red-700" : "text-stone-500")}>
          {msg === "Saved" ? "✓ Saved" : (msg ?? "for cost per wear")}
        </p>
      </div>
    </Card>
  );
}
