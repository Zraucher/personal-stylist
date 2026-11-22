"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkOutfitAction, saveOutfit } from "../actions";
import CompositionPanel, { OverallChip, cleanHeadline } from "../CompositionPanel";
import type { Composition } from "@/lib/outfit/composition";
import { Button, Card, Chip, Field, Input, Thumb } from "@/components/ui";

export type PickItem = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  url: string | null;
  colors: string[];
  verdict: string | null;
  /** Color names with hex, for the garment silhouette when there is no photo. */
  swatches?: Array<{ name: string; hex?: string }>;
};

type Group = { key: string; label: string; items: PickItem[] };

const LIMIT = 10;

export default function Builder({ groups, initialPicked = [] }: { groups: Group[]; initialPicked?: string[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(initialPicked);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [saving, startSaving] = useTransition();
  const seq = useRef(0);

  const byId = new Map(groups.flatMap((g) => g.items).map((i) => [i.id, i]));

  useEffect(() => {
    if (picked.length === 0) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      setChecking(true);
      const res = await checkOutfitAction(picked);
      if (mine !== seq.current) return;
      setChecking(false);
      if (res.error) setError(res.error);
      else {
        setError(null);
        setComposition(res.composition ?? null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [picked]);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      setLimitHit(false);
      setPicked((p) => p.filter((x) => x !== id));
    } else if (picked.length >= LIMIT) {
      setLimitHit(true);
    } else {
      setPicked((p) => [...p, id]);
    }
  };

  const save = () => {
    setError(null);
    startSaving(async () => {
      const res = await saveOutfit({ itemIds: picked, name, occasion });
      if (res.error) setError(res.error);
      else router.push("/outfits");
    });
  };

  const status =
    error ??
    (limitHit
      ? `${LIMIT} pieces is the limit. Remove one to add another.`
      : picked.length === 0
        ? "Tap pieces below to build an outfit."
        : composition
          ? cleanHeadline(composition.headline)
          : "Checking the combination…");
  const showVerdict = picked.length > 0 && composition !== null && !error && !limitHit;

  return (
    <div className="space-y-6">
      {/* The tray stays small: picked pieces, one status line and Save. The full checks sit below the closet. */}
      <div className="sticky top-14 z-[5] space-y-3 rounded-card bg-ground/90 p-3 ring-1 ring-line backdrop-blur-md">
        {picked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {picked.map((id) => {
              const i = byId.get(id);
              if (!i) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-card py-1 pl-1 pr-3 text-sm ring-1 ring-inset ring-line-strong transition-colors duration-200 ease-soft hover:ring-stone-400"
                  title="Remove"
                  aria-label={`Remove ${i.name}`}
                >
                  <Thumb size="xs" src={i.url} alt="" item={{ category: i.category, subcategory: i.subcategory, colors: i.swatches }} className="rounded-[8px]" />
                  <span className="max-w-32 truncate">{i.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-stone-500">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {showVerdict && composition && (
            <span aria-busy={checking} className={"transition-opacity duration-200 ease-soft " + (checking ? "opacity-60" : "")}>
              <OverallChip overall={composition.overall} />
            </span>
          )}
          <p role="status" aria-live="polite" className={"min-w-0 flex-1 text-sm " + (error ? "font-medium text-red-700" : "text-stone-700")}>
            {status}
            {showVerdict && picked.length >= 2 && (
              <>
                {" "}
                <a href="#outfit-checks" className="font-medium text-stone-600 underline underline-offset-2 hover:text-stone-900">
                  See checks
                </a>
              </>
            )}
          </p>
          {picked.length >= 2 && (
            <Button type="button" variant="primary" size="sm" onClick={save} disabled={saving} aria-busy={saving || undefined}>
              {saving ? "Saving…" : "Save outfit"}
            </Button>
          )}
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="space-y-3">
          <h2 className="font-display text-lg font-bold leading-snug">
            {g.label} <span className="font-sans text-sm font-normal tabular-nums text-stone-500">{g.items.length}</span>
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {g.items.map((i) => {
              const on = picked.includes(i.id);
              return (
                <button key={i.id} type="button" onClick={() => toggle(i.id)} aria-pressed={on} className="group min-w-0 space-y-1.5 rounded-thumb text-left">
                  <Thumb
                    src={i.url}
                    alt=""
                    item={{ category: i.category, subcategory: i.subcategory, colors: i.swatches }}
                    className={"transition-shadow duration-200 ease-soft " + (on ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-ground" : "group-hover:opacity-90")}
                    badge={
                      <>
                        {on && (
                          <span aria-hidden="true" className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-stone-900 text-stone-50">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                          </span>
                        )}
                        {i.verdict === "cut" && (
                          <Chip tone="not" className="absolute right-1.5 top-1.5">
                            <span aria-hidden="true">✕</span>
                            <span className="sr-only">not for you</span>
                          </Chip>
                        )}
                      </>
                    }
                  />
                  <p className={"truncate text-xs " + (on ? "font-semibold text-stone-900" : "text-stone-700")}>{i.name}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {picked.length >= 2 && (
        <section id="outfit-checks" aria-label="Checks and details" className="scroll-mt-48 space-y-3">
          {composition && <CompositionPanel composition={composition} />}
          <Card className="grid gap-3 sm:grid-cols-2">
            <Field label="Name (optional)">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </Field>
            <Field label="Occasion (optional)">
              <Input value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={80} placeholder="Dinner, office, travel day" />
            </Field>
          </Card>
        </section>
      )}
    </div>
  );
}
