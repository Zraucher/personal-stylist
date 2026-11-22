"use client";

import { useState } from "react";
import { OCCASIONS, type Occasion } from "@/lib/today/candidates";
import type { RecommendationView } from "@/lib/today/recommend";
import { Button, ButtonLink, Card, Checkbox, ChipButton, ChipGroup, EmptyState, Notice, Skeleton } from "@/components/ui";
import RecommendationCards from "./RecommendationCards";

type Hour = "morning" | "midday" | "evening";

export default function TodayClient({ initial, closetSize }: { initial: RecommendationView | null; closetSize: number }) {
  const [occasion, setOccasion] = useState<Occasion>((initial?.occasion as Occasion) ?? "casual");
  const [hours, setHours] = useState<Hour[]>(["morning", "midday", "evening"]);
  const [indoorCold, setIndoorCold] = useState(false);
  const [tomorrow, setTomorrow] = useState(false);
  const [rec, setRec] = useState<RecommendationView | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleHour = (h: Hour) => setHours((xs) => (xs.includes(h) ? xs.filter((x) => x !== h) : [...xs, h]));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, hours, indoorCold, dayOffset: tomorrow ? 1 : 0 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.recommendation) throw new Error(body.detail || "Could not build outfits.");
      setRec(body.recommendation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build outfits.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card as="section" variant="inset" aria-label="Today's plans" className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Where are you going?</p>
          <ChipGroup label="Where are you going?">
            {OCCASIONS.map((o) => (
              <ChipButton key={o.id} selected={occasion === o.id} onClick={() => setOccasion(o.id)}>
                {o.label}
              </ChipButton>
            ))}
          </ChipGroup>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">When will you be outside?</p>
          <ChipGroup label="When will you be outside?">
            {(["morning", "midday", "evening"] as Hour[]).map((h) => (
              <ChipButton key={h} selected={hours.includes(h)} onClick={() => toggleHour(h)}>
                {h[0].toUpperCase() + h.slice(1)}
              </ChipButton>
            ))}
          </ChipGroup>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Checkbox label="Indoor air will be cold" checked={indoorCold} onChange={(e) => setIndoorCold(e.target.checked)} />
          <Checkbox label="Plan for tomorrow" checked={tomorrow} onChange={(e) => setTomorrow(e.target.checked)} />
        </div>
        <Button type="button" variant="primary" onClick={run} disabled={loading} aria-busy={loading} className="w-full sm:w-auto">
          {loading ? "Picking outfits…" : rec ? "Pick again" : "Pick three outfits"}
        </Button>
        {error && <Notice tone="error">{error}</Notice>}
      </Card>

      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Picking outfits…</span>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : rec ? (
        <RecommendationCards key={rec.id} rec={rec} />
      ) : closetSize < 8 ? (
        <EmptyState
          title={`Your closet has ${closetSize} ${closetSize === 1 ? "piece" : "pieces"} so far.`}
          body="Outfits need a top, a bottom and shoes at least. Tick the basics you own; it takes a minute."
          action={
            <>
              <ButtonLink href="/closet/basics" variant="secondary" size="sm">
                Tick your basics
              </ButtonLink>
              <ButtonLink href="/closet/new" variant="quiet" size="sm">
                Add a piece
              </ButtonLink>
            </>
          }
        />
      ) : (
        <p className="text-sm text-stone-500">Choose where you are going and get three outfits from your own closet, matched to the weather.</p>
      )}
    </div>
  );
}
