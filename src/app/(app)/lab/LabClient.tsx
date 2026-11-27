"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, ChipButton, ChipGroup, EmptyState, Eyebrow, Notice, Thumb, cx } from "@/components/ui";
import { RATINGS, reasonOptions, type PieceSlot, type RowSlot, type TasteRating } from "@/lib/taste/reasons";
import type { Occasion } from "@/lib/today/candidates";
import { saveLabRating } from "./actions";

export type LabPiece = { id: string; name: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }>; url: string | null };
export type LabRow = { slot: PieceSlot; label: string; pieces: LabPiece[]; replaceId: string; options: LabPiece[] };
export type LabOutfit = {
  key: string;
  itemIds: string[];
  occasion: Occasion | null;
  source: "lab" | "daily";
  weather: { feelsMin: number; feelsMax: number; season: "spring" | "summer" | "fall" | "winter"; label: string } | null;
  context: string;
  rows: LabRow[];
};

type RowState = { rating?: TasteRating; reasons: string[]; swap?: string | "none" };
type Gap = { label: string; href: string };

const pieceName = (p: LabPiece) => p.name ?? p.subcategory ?? p.category ?? "piece";

export default function LabClient({ outfits }: { outfits: LabOutfit[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [rated, setRated] = useState(0);
  const [pending, start] = useTransition();

  const next = (msg: string) => {
    setRows({});
    setGaps(null);
    setError(null);
    setStatus(msg);
    setIndex((i) => i + 1);
  };

  if (index >= outfits.length) {
    return (
      <div className="space-y-3">
        <p role="status" className="sr-only">
          {status}
        </p>
        <EmptyState
          title="that's the stack"
          body={rated ? `You rated ${rated} ${rated === 1 ? "outfit" : "outfits"}. We'll use them for your next picks.` : "Want a fresh set? We'll put together new combinations."}
          action={
            <Button type="button" variant="secondary" onClick={() => {
                setIndex(0);
                setRated(0);
                setStatus("");
                router.refresh();
              }}>
              Make more outfits
            </Button>
          }
        />
      </div>
    );
  }

  const o = outfits[index];
  const present = o.rows.map((r) => r.slot);
  const all = o.rows.flatMap((r) => r.pieces);
  const state = (k: string): RowState => rows[k] ?? { reasons: [] };
  const patch = (k: string, s: Partial<RowState>) => setRows((cur) => ({ ...cur, [k]: { ...state(k), ...s } }));

  const rate = (k: RowSlot, rating: TasteRating) => {
    const valid = new Set(reasonOptions(rating, k, present).map((r) => r.id));
    patch(k, { rating, reasons: state(k).reasons.filter((r) => valid.has(r)), swap: rating === "love" ? undefined : state(k).swap });
  };
  const toggleReason = (k: string, id: string) => {
    const cur = state(k).reasons;
    patch(k, { reasons: cur.includes(id) ? cur.filter((r) => r !== id) : [...cur, id] });
  };

  const save = () => {
    const overall = state("outfit");
    if (!overall.rating) return;
    const found: Gap[] = [];
    const slots = o.rows.flatMap((r) => {
      const s = state(r.slot);
      if (!s.rating) return [];
      const off = s.rating !== "love";
      const noMatch = off && s.swap === "none";
      if (noMatch) {
        const target = r.pieces.find((p) => p.id === r.replaceId) ?? r.pieces[0];
        const others = all.filter((p) => !r.pieces.includes(p)).map(pieceName);
        const want = target.subcategory ?? r.label.toLowerCase();
        found.push({
          label: want,
          href: `/wishlist?add=${encodeURIComponent(want)}&prefs=${encodeURIComponent(`To wear with ${others.join(", ") || "my outfit"}. ${o.context}.`.slice(0, 400))}`,
        });
      }
      return [
        {
          slot: r.slot,
          itemIds: r.pieces.map((p) => p.id),
          rating: s.rating,
          reasons: s.reasons,
          replacedItemId: off && s.swap && s.swap !== "none" ? r.replaceId : null,
          replacementItemId: off && s.swap && s.swap !== "none" ? s.swap : null,
          noMatch,
        },
      ];
    });
    setError(null);
    start(async () => {
      const res = await saveLabRating({ itemIds: o.itemIds, occasion: o.occasion, source: o.source, weather: o.weather, rating: overall.rating!, reasons: overall.reasons, slots });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRated((n) => n + 1);
      if (found.length) {
        setGaps(found);
        setStatus("Saved. We noted what's missing from your closet.");
      } else next("Saved. Here's the next outfit.");
    });
  };

  const rowsToRate: Array<{ k: RowSlot; label: string; row?: LabRow }> = [{ k: "outfit", label: "Whole outfit" }, ...o.rows.map((r) => ({ k: r.slot, label: r.label, row: r }))];

  return (
    <div className="space-y-4">
      <p role="status" aria-live="polite" className="text-sm text-stone-600">
        {status}
      </p>
      <Card variant="active" className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>{o.context}</Eyebrow>
            <p className="text-xs tabular-nums text-stone-500">
              Outfit {index + 1} of {outfits.length}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {all.map((p) => (
              <figure key={p.id} className="space-y-1">
                <Thumb src={p.url} alt="" item={p} />
                <figcaption className="line-clamp-2 text-xs text-stone-600">{pieceName(p)}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        {rowsToRate.map(({ k, label, row }) => {
          const s = state(k);
          const reasons = s.rating ? reasonOptions(s.rating, k, present) : [];
          const off = !!row && !!s.rating && s.rating !== "love";
          const target = row?.pieces.find((p) => p.id === row.replaceId);
          return (
            <section key={k} aria-label={label} className="space-y-2.5 border-t border-line pt-4">
              <div className="flex items-center gap-3">
                {row && (
                  <div className="flex gap-1.5">
                    {row.pieces.map((p) => (
                      <Thumb key={p.id} size="sm" src={p.url} alt="" item={p} />
                    ))}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold leading-snug">{label}</h2>
                  {row && <p className="truncate text-sm text-stone-600">{row.pieces.map(pieceName).join(" + ")}</p>}
                </div>
              </div>
              <ChipGroup label={`Rate the ${label.toLowerCase()}`}>
                {RATINGS.map((r) => (
                  <ChipButton key={r.id} selected={s.rating === r.id} onClick={() => rate(k, r.id)}>
                    {r.label}
                  </ChipButton>
                ))}
              </ChipGroup>

              {s.rating && (
                <Card variant="inset" className="space-y-3">
                  <p className="text-sm font-semibold text-stone-700">Why? Pick any that fit.</p>
                  <ChipGroup label={`Reasons for the ${label.toLowerCase()}`}>
                    {reasons.map((r) => (
                      <ChipButton key={r.id} selected={s.reasons.includes(r.id)} onClick={() => toggleReason(k, r.id)}>
                        {r.label}
                      </ChipButton>
                    ))}
                  </ChipGroup>

                  {off && row && target && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-stone-700">What would you wear instead of the {pieceName(target)}?</p>
                      {row.options.length ? (
                        <div role="group" aria-label={`Swap for the ${pieceName(target)}`} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                          {row.options.map((p) => {
                            const on = s.swap === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => patch(k, { swap: on ? undefined : p.id })}
                                className={cx(
                                  "tap space-y-1 rounded-thumb p-1 text-left ring-1 ring-inset transition-colors duration-200 ease-soft",
                                  on ? "bg-stone-200 ring-stone-900" : "ring-line-strong hover:ring-stone-400"
                                )}
                              >
                                <Thumb src={p.url} alt="" item={p} />
                                <span className="line-clamp-2 block text-xs text-stone-700">{pieceName(p)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-600">Nothing else in your closet fits this spot.</p>
                      )}
                      <ChipButton selected={s.swap === "none"} onClick={() => patch(k, { swap: s.swap === "none" ? undefined : "none" })}>
                        I don&apos;t have anything that works here
                      </ChipButton>
                    </div>
                  )}
                </Card>
              )}
            </section>
          );
        })}
      </Card>

      {error && <Notice tone="error">{error}</Notice>}

      {gaps ? (
        <div className="space-y-3">
          <Notice tone="success">Saved. Want to find what&apos;s missing? We&apos;ll add it to your wishlist and search stores in your colors.</Notice>
          <div className="flex flex-wrap items-center gap-2">
            {gaps.map((g) => (
              <ButtonLink key={g.href} href={g.href} variant="secondary" size="sm">
                Find {g.label} to buy
              </ButtonLink>
            ))}
            <Button type="button" variant="primary" onClick={() => next("Here's the next outfit.")}>
              Next outfit
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={save} disabled={!state("outfit").rating || pending} aria-busy={pending || undefined}>
            {pending ? "Saving…" : "Save and next"}
          </Button>
          <Button type="button" variant="quiet" onClick={() => next("Skipped. Here's the next outfit.")} disabled={pending}>
            Skip
          </Button>
          {!state("outfit").rating && <p className="text-sm text-stone-500">Rate the whole outfit to save.</p>}
        </div>
      )}
    </div>
  );
}
