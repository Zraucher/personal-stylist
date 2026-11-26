"use client";

import { useId, useState } from "react";
import { OCCASIONS, type Occasion } from "@/lib/today/candidates";
import type { RecommendationView } from "@/lib/today/recommend";
import { Button, ButtonLink, Card, Checkbox, ChipButton, ChipGroup, EmptyState, Notice, OutfitCardSkeleton } from "@/components/ui";
import { whereAmI } from "@/lib/here";
import RecommendationCards, { RecWeather } from "./RecommendationCards";

const FAILED = "Couldn't pick outfits just now. Try again in a minute.";

type Hour = "morning" | "midday" | "evening";
const HOURS: Hour[] = ["morning", "midday", "evening"];

/** One line that says what the current picks were made for. */
function summarize(occasion: Occasion, hours: Hour[], indoorCold: boolean, tomorrow: boolean) {
  const parts = [OCCASIONS.find((o) => o.id === occasion)?.label ?? occasion];
  parts.push(hours.length === HOURS.length ? "outside all day" : hours.length === 0 ? "indoors all day" : `outside ${hours.join(" and ")}`);
  if (indoorCold) parts.push("cold indoors");
  if (tomorrow) parts.push("for tomorrow");
  return parts.join(" · ");
}

export default function TodayClient({ initial, closetSize }: { initial: RecommendationView | null; closetSize: number }) {
  const [occasion, setOccasion] = useState<Occasion>((initial?.occasion as Occasion) ?? "casual");
  const [hours, setHours] = useState<Hour[]>(HOURS);
  const [indoorCold, setIndoorCold] = useState(false);
  const [tomorrow, setTomorrow] = useState(false);
  const [rec, setRec] = useState<RecommendationView | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // With picks in hand the controls fold into a summary, so the outfits come first.
  const [editing, setEditing] = useState(!initial);
  const controlsId = useId();

  const toggleHour = (h: Hour) => setHours((xs) => (xs.includes(h) ? xs.filter((x) => x !== h) : [...xs, h]));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const here = await whereAmI();
      const res = await fetch("/api/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, hours, indoorCold, dayOffset: tomorrow ? 1 : 0, here }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.recommendation) throw new Error(typeof body.detail === "string" ? body.detail : FAILED);
      setRec(body.recommendation);
      setEditing(false);
    } catch (e) {
      // A network failure throws a TypeError with a browser message: show our line instead.
      setError(e instanceof Error && !(e instanceof TypeError) ? e.message : FAILED);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Nothing to pick from yet: the empty state below is the only action. */}
      <div className={"space-y-3" + (!rec && closetSize < 3 ? " hidden" : "")}>
        {rec && <RecWeather rec={rec} />}
        {rec && !editing ? (
          <div className="flex items-center justify-between gap-3 rounded-control bg-inset py-1.5 pl-4 pr-1.5">
            <p className="min-w-0 text-sm text-stone-700">{summarize(occasion, hours, indoorCold, tomorrow)}</p>
            <Button type="button" variant="quiet" size="sm" aria-expanded={false} onClick={() => setEditing(true)}>
              Change
            </Button>
          </div>
        ) : (
          <Card as="section" id={controlsId} variant="inset" aria-label="Today's plans" className="space-y-4">
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
                {HOURS.map((h) => (
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
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="primary" onClick={run} disabled={loading} aria-busy={loading} className="w-full sm:w-auto">
                {loading ? "Picking outfits…" : rec ? "Pick again" : "Pick three outfits"}
              </Button>
              {rec && !loading && (
                <Button type="button" variant="quiet" aria-expanded aria-controls={controlsId} onClick={() => setEditing(false)} className="w-full sm:w-auto">
                  Keep these picks
                </Button>
              )}
            </div>
            {error && <Notice tone="error">{error}</Notice>}
          </Card>
        )}
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Picking outfits…</span>
          {[0, 1, 2].map((i) => (
            <OutfitCardSkeleton key={i} />
          ))}
        </div>
      ) : rec ? (
        <RecommendationCards key={rec.id} rec={rec} showWeather={false} />
      ) : closetSize < 8 ? (
        <EmptyState
          title={`${closetSize} ${closetSize === 1 ? "piece" : "pieces"} so far`}
          body="Outfits need at least a top, a bottom and shoes. Tick the basics you own. It takes a minute."
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
        <p className="text-sm text-stone-500">Choose where you&rsquo;re going and get three outfits from your own closet, matched to the weather.</p>
      )}
    </div>
  );
}
