"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ItemPlaceholder from "@/lib/closet/placeholder";
import type { RecommendationView } from "@/lib/today/recommend";
import { respondToOutfit } from "./actions";
import AskFriendsButton from "@/components/AskFriendsButton";

type Fb = "wore" | "skipped" | "disliked" | "benchmark" | "failure";
const FB_LABEL: Record<Fb, string> = { wore: "wore it", skipped: "skip", disliked: "not me", benchmark: "this is so me", failure: "felt like a costume" };
const PRIMARY: Fb[] = ["wore", "disliked"];
const MORE: Fb[] = ["benchmark", "failure", "skipped"];

// A thin closet gets a direct way to fill it.
const THIN_CLOSET = 8;

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
        <>
          No forecast available, so this assumes a mild day.{" "}
          <Link href="/profile" className="underline">
            Add your city
          </Link>{" "}
          for real weather.
        </>
      )}
    </p>
  );
}

function FillCloset({ missing, size }: { missing: string[]; size: number }) {
  if (!missing.length && size >= THIN_CLOSET) return null;
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm">
      {missing.length > 0 && (
        <>
          <p className="font-medium">Your closet is missing:</p>
          <ul className="list-disc space-y-0.5 pl-5 text-stone-600">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
      {size < THIN_CLOSET && <p className="text-stone-600">You have {size} {size === 1 ? "piece" : "pieces"} so far. Tick the basics you own and the picks get much better.</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/closet/basics" className="rounded-lg bg-stone-900 px-3 py-1.5 text-white">
          Tick your basics
        </Link>
        <Link href="/closet/new" className="rounded-lg border border-stone-300 px-3 py-1.5 hover:border-stone-500">
          Add a piece
        </Link>
        <Link href="/gaps" className="rounded-lg border border-stone-300 px-3 py-1.5 hover:border-stone-500">
          What to buy next
        </Link>
      </div>
    </div>
  );
}

export default function RecommendationCards({ rec }: { rec: RecommendationView }) {
  const [chosen, setChosen] = useState<string | null>(rec.chosenOutfitId);
  const [given, setGiven] = useState<Record<string, Fb>>({});
  const [moreFor, setMoreFor] = useState<string | null>(null);
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
      setMoreFor(null);
      setNote("");
    });

  const click = (outfitId: string, t: Fb) => (t === "disliked" || t === "failure" ? setNoteFor({ id: outfitId, type: t }) : send(outfitId, t));
  const chip = (on: boolean) =>
    "rounded-full border px-3 py-1 disabled:opacity-60 " + (on ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300 bg-white hover:border-stone-500");

  return (
    <div className="space-y-4">
      <WeatherLine rec={rec} />
      {rec.note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{rec.note}</p>}
      {rec.relaxed && rec.picks.length > 0 && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
          Nothing in your closet fully fits this, so these are the closest matches. Adding one of the missing pieces below will fix it.
        </p>
      )}
      {rec.picks.length === 0 && <p className="text-sm text-stone-600">No outfit from your closet fits yet.</p>}
      {rec.picks.map((p, idx) => (
        <article key={p.outfitId} className={"rounded-xl border bg-white p-4 " + (chosen === p.outfitId ? "border-emerald-700" : "border-stone-200")}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-lg font-bold">
              {idx + 1}. {p.name}
            </h3>
            {chosen === p.outfitId ? (
              <span className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-white">✓ wearing it</span>
            ) : rec.relaxed ? (
              <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-stone-900">◐ closest match</span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-white">✓ works on you</span>
            )}
          </div>
          {p.why && p.why !== p.headline && <p className="mt-1 text-sm text-stone-700">{p.why}</p>}
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
            {PRIMARY.map((t) => (
              <button key={t} type="button" disabled={pending} onClick={() => click(p.outfitId, t)} className={chip(given[p.outfitId] === t)}>
                {FB_LABEL[t]}
              </button>
            ))}
            <Link href={`/outfits/new?items=${p.items.map((i) => i.id).join(",")}`} className={chip(false)}>
              Swap a piece
            </Link>
            <button type="button" onClick={() => setMoreFor(moreFor === p.outfitId ? null : p.outfitId)} className="px-1 text-stone-500 underline-offset-2 hover:underline" aria-expanded={moreFor === p.outfitId}>
              More
            </button>
          </div>
          <div className="mt-2">
            <AskFriendsButton target={{ kind: "outfit", outfitId: p.outfitId }} compact />
          </div>
          {moreFor === p.outfitId && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {MORE.map((t) => (
                <button key={t} type="button" disabled={pending} onClick={() => click(p.outfitId, t)} className={chip(given[p.outfitId] === t)}>
                  {FB_LABEL[t]}
                </button>
              ))}
            </div>
          )}
          {noteFor?.id === p.outfitId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was off? (optional)"
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-base"
              />
              <button type="button" disabled={pending} onClick={() => send(p.outfitId, noteFor.type, note)} className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white">
                Save
              </button>
            </div>
          )}
        </article>
      ))}
      <FillCloset missing={rec.missing} size={rec.closetSize} />
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
