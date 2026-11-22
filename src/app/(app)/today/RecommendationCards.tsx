"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { RecommendationView } from "@/lib/today/recommend";
import { respondToOutfit } from "./actions";
import AskFriendsButton from "@/components/AskFriendsButton";
import { Button, ButtonLink, Card, CheckTick, Chip, Field, Input, Notice, Thumb, buttonClass, cx, type ButtonVariant } from "@/components/ui";

type Fb = "wore" | "skipped" | "disliked" | "benchmark" | "failure";
const FB_LABEL: Record<Fb, string> = { wore: "wore it", skipped: "skip", disliked: "not me", benchmark: "this is so me", failure: "felt like a costume" };
// Kept visible: the two things people do most mornings. Everything else lives under More.
const MORE: Fb[] = ["disliked", "benchmark", "failure", "skipped"];

// Buttons use sentence case; the stored labels stay lowercase.
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);

// Selected feedback is Night (never green: green means "works on you").
const NIGHT =
  "tap inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-stone-900 px-3.5 text-sm font-semibold text-stone-50 transition-[background-color,color,transform] duration-200 ease-soft active:scale-[0.98] disabled:opacity-50";

function FbButton({ on, variant, disabled, onClick, children }: { on: boolean; variant: ButtonVariant; disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={on ? NIGHT : buttonClass(variant, "sm")}>
      {cap(children)}
    </button>
  );
}

// A thin closet gets a direct way to fill it.
const THIN_CLOSET = 8;

export function WeatherLine({ rec }: { rec: RecommendationView }) {
  const w = rec.weather;
  if (!w) return null;
  return (
    <p className="text-sm text-stone-600">
      {w.source === "forecast" ? (
        <>
          {w.place ? `${w.place}: ` : ""}feels {w.feelsMin}–{w.feelsMax}°F ({w.hours.join(", ")}), rain {w.rainMax}%, UV {w.uvMax}, wind {w.windMax} mph.
        </>
      ) : w.source === "stated" ? (
        <>Planned for {w.feelsMax}°F.</>
      ) : (
        <>
          No forecast available, so this assumes a mild day.{" "}
          <Link href="/profile" className="font-medium text-stone-900 underline underline-offset-2">
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
    <Card variant="warm" className="space-y-2 text-sm text-stone-700">
      {missing.length > 0 && (
        <>
          <p className="font-semibold text-stone-900">Your closet is missing:</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
      {size < THIN_CLOSET && (
        <p>
          You have {size} {size === 1 ? "piece" : "pieces"} so far. Tick the basics you own and the picks get much better.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <ButtonLink href="/closet/basics" variant="secondary" size="sm">
          Tick your basics
        </ButtonLink>
        <ButtonLink href="/closet/new" variant="quiet" size="sm">
          Add a piece
        </ButtonLink>
        <ButtonLink href="/gaps" variant="quiet" size="sm">
          What to buy next
        </ButtonLink>
      </div>
    </Card>
  );
}

/** The note field takes focus as soon as it opens. */
function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <Field label="What was off? (optional)" srOnly className="min-w-0 flex-1">
      <Input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder="What was off? (optional)" />
    </Field>
  );
}

export default function RecommendationCards({ rec, showWeather = true }: { rec: RecommendationView; showWeather?: boolean }) {
  const [chosen, setChosen] = useState<string | null>(rec.chosenOutfitId);
  const [given, setGiven] = useState<Record<string, Fb>>({});
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<{ id: string; type: Fb } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
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
      const name = rec.picks.find((p) => p.outfitId === outfitId)?.name ?? "this outfit";
      setAnnounce(type === "wore" ? `Wearing ${name}.` : `Saved “${FB_LABEL[type]}” for ${name}.`);
      setNoteFor(null);
      setMoreFor(null);
      setNote("");
    });

  const click = (outfitId: string, t: Fb) => (t === "disliked" || t === "failure" ? setNoteFor({ id: outfitId, type: t }) : send(outfitId, t));

  return (
    <div className="space-y-4">
      {showWeather && <WeatherLine rec={rec} />}
      {rec.note && <Notice tone="warn">{rec.note}</Notice>}
      {rec.relaxed && rec.picks.length > 0 && (
        <Notice tone="info">Nothing in your closet fully fits this, so these are the closest matches. Adding one of the missing pieces below will fix it.</Notice>
      )}
      {rec.picks.length === 0 && <p className="text-sm text-stone-600">No outfit from your closet fits yet.</p>}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      <div className="space-y-3">
        {rec.picks.map((p) => {
          const isChosen = chosen === p.outfitId;
          const open = moreFor === p.outfitId;
          const moreId = `more-${p.outfitId}`;
          return (
            <Card as="article" key={p.outfitId} variant={isChosen ? "active" : "surface"} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 font-display text-lg font-bold leading-snug">{p.name}</h2>
                {isChosen ? (
                  <Chip tone="works" className="shrink-0">
                    {/* The disc matches the chip, so the tick draws straight onto it. */}
                    <CheckTick size={14} className="-ml-1 text-emerald-700" />
                    wearing it
                  </Chip>
                ) : rec.relaxed ? (
                  <Chip tone="almost" className="shrink-0">
                    <span aria-hidden="true">◐</span> closest match
                  </Chip>
                ) : null}
              </div>
              {p.why && p.why !== p.headline && <p className="text-sm leading-relaxed text-stone-700">{p.why}</p>}
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
                {p.items.map((i) => (
                  <li key={i.id} className="min-w-0">
                    <Link href={`/closet/${i.id}`} className="group block space-y-1 rounded-thumb">
                      <Thumb src={i.url} alt="" item={i} size="fill" className="transition-opacity duration-200 ease-soft group-hover:opacity-90" />
                      <p className="truncate text-xs text-stone-600">{i.name}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              {p.headline && <p className="text-xs text-stone-500">{p.headline}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <FbButton on={given[p.outfitId] === "wore"} variant="secondary" disabled={pending} onClick={() => click(p.outfitId, "wore")}>
                  {FB_LABEL.wore}
                </FbButton>
                <ButtonLink href={`/outfits/new?items=${p.items.map((i) => i.id).join(",")}`} variant="quiet" size="sm">
                  Swap a piece
                </ButtonLink>
                <Button type="button" variant="quiet" size="sm" onClick={() => setMoreFor(open ? null : p.outfitId)} aria-expanded={open} aria-controls={moreId}>
                  More
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx("transition-transform duration-200 ease-soft", open && "rotate-180")}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Button>
              </div>
              {open && (
                <div id={moreId} className="flex flex-wrap items-center gap-2">
                  {MORE.map((t) => (
                    <FbButton key={t} on={given[p.outfitId] === t} variant="quiet" disabled={pending} onClick={() => click(p.outfitId, t)}>
                      {FB_LABEL[t]}
                    </FbButton>
                  ))}
                  <AskFriendsButton target={{ kind: "outfit", outfitId: p.outfitId }} compact />
                </div>
              )}
              {noteFor?.id === p.outfitId && (
                <div className="flex flex-wrap items-end gap-2">
                  <NoteField value={note} onChange={setNote} />
                  <Button type="button" variant="secondary" disabled={pending} aria-busy={pending} onClick={() => send(p.outfitId, noteFor.type, note)}>
                    Save
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <FillCloset missing={rec.missing} size={rec.closetSize} />
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
