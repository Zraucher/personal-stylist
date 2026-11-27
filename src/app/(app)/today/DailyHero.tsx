"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink, Card, CheckTick, Chip, EmptyState, Eyebrow, OutfitStrip, type StripItem } from "@/components/ui";
import { wearDailyOutfit } from "./actions";

/**
 * Outfit of the day: the one look we pick each morning from the person's own closet.
 * `planned`: it's already today's plan. `locked`: today's plan is worn, so it can't be replaced.
 */
export default function DailyHero({ today, name, reason, items, planned, locked, active }: { today: string; name: string; reason: string; items: StripItem[]; planned: boolean; locked: boolean; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(planned);
  const [wore, setWore] = useState(planned && locked);
  const [error, setError] = useState<string | null>(null);
  const wear = () =>
    start(async () => {
      setError(null);
      const r = await wearDailyOutfit().catch(() => ({ ok: false as const, error: "Couldn't save that. Try again." }));
      if (!r.ok) return setError(r.error);
      setDone(true);
      router.refresh();
    });
  // Once it's today's plan, this card stands in for the planned card, so it carries Wore it too.
  const woreIt = () =>
    start(async () => {
      setError(null);
      const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "wore", date: today }) }).catch(() => null);
      if (!r?.ok) return setError("Couldn't save that. Try again.");
      setWore(true);
      router.refresh();
    });
  const rate = `/lab?items=${items.map((i) => i.id).join(",")}&source=daily`;

  return (
    <Card as="section" variant={active ? "active" : "surface"} aria-labelledby="daily-title" className="space-y-3">
      <Eyebrow>Outfit of the day</Eyebrow>
      <div className="space-y-1">
        <h2 id="daily-title" className="font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
          {name}
        </h2>
        <p className="text-sm text-stone-600">{reason}</p>
      </div>
      <OutfitStrip size="lg" items={items} />
      <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-2">
        {wore ? (
          <Chip tone="works">
            <CheckTick size={14} animate={!locked} className="-ml-1 text-emerald-700" />
            wore it
          </Chip>
        ) : done ? (
          <>
            <Chip tone="works">
              <CheckTick size={14} animate={!planned} className="-ml-1 text-emerald-700" />
              planned for today
            </Chip>
            <Button type="button" variant="secondary" size="sm" disabled={pending} aria-busy={pending} onClick={woreIt}>
              {pending ? "Saving…" : "Wore it"}
            </Button>
          </>
        ) : (
          !locked && (
            <Button type="button" variant="primary" disabled={pending} aria-busy={pending} onClick={wear}>
              {pending ? "Planning…" : "Wear this"}
            </Button>
          )
        )}
        <ButtonLink href={rate} variant="quiet">
          Rate this outfit
        </ButtonLink>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </Card>
  );
}

/** No pick possible yet: send people to add the pieces an outfit needs. */
export function DailyHeroEmpty({ closetSize }: { closetSize: number }) {
  return (
    <EmptyState
      title={closetSize ? "almost ready for a daily pick" : "your daily outfit starts here"}
      body={closetSize ? "We need a top, a bottom and shoes that suit today to pick your outfit each morning. Add a few more pieces." : "Add your clothes and we'll pick one outfit from them every morning, matched to your day and the weather."}
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
  );
}
