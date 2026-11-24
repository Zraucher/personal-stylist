"use client";

import { useState, useTransition } from "react";
import { Button, ButtonLink, Card, CheckTick, Chip, Eyebrow, OutfitPicture, OutfitStrip } from "@/components/ui";

type Item = { id: string; name: string; url: string | null; hex: string | null; category?: string | null; subcategory?: string | null; colors?: Array<{ name: string; hex?: string }> };

export default function PlannedToday({ date, name, items, worn }: { date: string; name: string; items: Item[]; worn: boolean }) {
  const strip = items.map((it) => ({ id: it.id, name: it.name, url: it.url, category: it.category, subcategory: it.subcategory, colors: it.colors ?? (it.hex ? [{ name: it.name, hex: it.hex }] : null) }));
  const [done, setDone] = useState(worn);
  // The tick draws only when the person taps Wore it here, not for a day already marked.
  const [justDone, setJustDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wore = () =>
    start(async () => {
      const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "wore", date }) }).catch(() => null);
      if (r?.ok) {
        setDone(true);
        setJustDone(true);
      } else setError("Couldn't save that. Try again.");
    });
  return (
    <Card as="section" variant="surface" aria-label="Planned for today" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>Planned for today</Eyebrow>
        <ButtonLink href="/plan" variant="quiet" size="sm" className="-my-1.5 -mr-2">
          This week
        </ButtonLink>
      </div>
      <p className="font-display text-lg font-bold leading-snug">{name}</p>
      <OutfitStrip size="sm" items={strip} />
      <OutfitPicture items={strip} />
      <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2">
        {done ? (
          <Chip tone="works">
            <CheckTick size={14} animate={justDone} className="-ml-1 text-emerald-700" />
            wore it
          </Chip>
        ) : (
          <Button type="button" variant="secondary" size="sm" disabled={pending} aria-busy={pending} onClick={wore}>
            {pending ? "Saving…" : "Wore it"}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </Card>
  );
}
