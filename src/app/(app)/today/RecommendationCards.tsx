"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ItemPlaceholder from "@/lib/closet/placeholder";
import type { RecommendationView } from "@/lib/today/recommend";
import { respondToOutfit } from "./actions";

type Fb = "wore" | "skipped" | "disliked" | "benchmark" | "failure";
const FB_LABEL: Record<Fb, string> = { wore: "Wore it", skipped: "Skip", disliked: "Not me", benchmark: "Exactly me", failure: "Felt like a costume" };

export function WeatherLine({ rec }: { rec: RecommendationView }) {
  const w = rec.weather;
  if (!w) return null;
  return (
    <p className="text-sm text-stone-600">
      {w.source === "forecast" ? (
        <>
          {w.place ? `${w.place}: ` : ""}feels like {w.feelsMin}–{w.feelsMax}°F ({w.hours.join(", ")}), rain {w.rainMax}%, UV {w.uvMax}, wind {w.windMax} mph.
        </>
      ) : w.source === "stated" ? (
        <>Planned for {w.feelsMax}°F.</>
      ) : (
        <>No forecast available, so this assumes a mild day. Add your city on the Profile page for real weather.</>
      )}
    </p>
  );
}

export default function RecommendationCards({ rec }: { rec: RecommendationView }) {
  const [chosen, setChosen] = useState<string | null>(rec.chosenOutfitId);
  const [given, setGiven] = useState<Record<string, Fb>>({});
  const [noteFor, setNoteFor] = useState<{ id: string; type: Fb } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = (outfitId: string, type: Fb, text?: string) =>
    startTransition(async () => {
      setError(null);
      const r = await respondToOutfit({ recommendationId: rec.id, outfitId, type, note: text });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setGiven((g) => ({ ...g, [outfitId]: type }));
      if (type === "wore") setChosen(outfitId);
      setNoteFor(null);
      setNote("");
    });

  return (
    <div className="space-y-4">
      <WeatherLine rec={rec} />
      {rec.note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{rec.note}</p>}
      {rec.missing.length > 0 && (
        <p className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600">
          Your closet is missing {rec.missing.join("; ")}. Add one and the picks get better.
        </p>
      )}
      {rec.picks.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No outfit from your closet fits these conditions yet.{" "}
          <Link href="/closet/new" className="underline">
            Add a piece
          </Link>
          .
        </div>
      )}
      {rec.picks.map((p, idx) => (
        <article key={p.outfitId} className={"rounded-xl border bg-white p-4 " + (chosen === p.outfitId ? "border-emerald-700" : "border-stone-200")}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium">
              {idx + 1}. {p.why}
            </h3>
            {chosen === p.outfitId && <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-0.5 text-xs text-white">Wearing</span>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {p.items.map((i) => (
              <Link key={i.id} href={`/closet/${i.id}`} className="overflow-hidden rounded-lg border border-stone-200">
                <div className="aspect-square bg-stone-100">
                  {i.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.url} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    <ItemPlaceholder category={i.category} subcategory={i.subcategory} colors={i.colors} />
                  )}
                </div>
                <p className="truncate px-1.5 py-1 text-[11px] text-stone-600">{i.name}</p>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">{p.headline}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {(["wore", "skipped", "disliked", "benchmark", "failure"] as Fb[]).map((t) => (
              <button
                key={t}
                type="button"
                disabled={pending}
                onClick={() => (t === "disliked" || t === "failure" ? setNoteFor({ id: p.outfitId, type: t }) : send(p.outfitId, t))}
                className={
                  "rounded-full border px-3 py-1 disabled:opacity-60 " +
                  (given[p.outfitId] === t ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500")
                }
              >
                {FB_LABEL[t]}
              </button>
            ))}
            <Link href={`/outfits/new?items=${p.items.map((i) => i.id).join(",")}`} className="rounded-full border border-stone-300 px-3 py-1 hover:border-stone-500">
              Swap a piece
            </Link>
          </div>
          {noteFor?.id === p.outfitId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was off? (optional)"
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <button type="button" disabled={pending} onClick={() => send(p.outfitId, noteFor.type, note)} className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white">
                Save
              </button>
            </div>
          )}
        </article>
      ))}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
