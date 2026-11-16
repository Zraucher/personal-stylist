"use client";

import { useState } from "react";
import { OCCASIONS, type Occasion } from "@/lib/today/candidates";
import type { RecommendationView } from "@/lib/today/recommend";
import RecommendationCards from "./RecommendationCards";

type Hour = "morning" | "midday" | "evening";

export default function TodayClient({ initial }: { initial: RecommendationView | null }) {
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

  const chip = (on: boolean) =>
    "rounded-full border px-3 py-1.5 text-sm " + (on ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500");

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
        <div>
          <p className="text-sm text-stone-500">Where are you going?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <button key={o.id} type="button" onClick={() => setOccasion(o.id)} className={chip(occasion === o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-stone-500">When will you be outside?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["morning", "midday", "evening"] as Hour[]).map((h) => (
              <button key={h} type="button" onClick={() => toggleHour(h)} className={chip(hours.includes(h))}>
                {h[0].toUpperCase() + h.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={indoorCold} onChange={(e) => setIndoorCold(e.target.checked)} /> Indoor air will be cold
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={tomorrow} onChange={(e) => setTomorrow(e.target.checked)} /> Plan for tomorrow
          </label>
        </div>
        <button type="button" onClick={run} disabled={loading} className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white disabled:opacity-60 sm:w-auto">
          {loading ? "Picking outfits…" : rec ? "Pick again" : "Pick three outfits"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </section>

      {rec ? (
        <RecommendationCards key={rec.id} rec={rec} />
      ) : (
        <p className="text-sm text-stone-500">Choose where you are going and get three outfits from your own closet, matched to the weather.</p>
      )}
    </div>
  );
}
