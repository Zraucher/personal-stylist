"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { PlanDayView, WeekView } from "@/lib/plan/server";
import { OCCASIONS } from "@/lib/today/candidates";
import AskFriendsButton from "@/components/AskFriendsButton";
import { Button, ButtonLink, Card, CheckTick, Chip, ChipButton, ChipGroup, ConfirmButton, Notice, Thumb, cx } from "@/components/ui";

const dayLabel = (date: string, today: string) => {
  const d = new Date(`${date}T12:00:00`);
  if (date === today) return "Today";
  const t = new Date(`${today}T12:00:00`);
  if ((d.getTime() - t.getTime()) / 86400000 === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long" });
};
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const occasionLabel = (id: string) => OCCASIONS.find((o) => o.id === id)?.label ?? id;

// Week-wide actions lock every card; a card action only locks its own card.
const GLOBAL = ["fill", "replan"];

type Call = (key: string, body: Record<string, unknown>) => void;

export default function PlanClient({ initial }: { initial: WeekView }) {
  const [week, setWeek] = useState(initial);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const call: Call = (key, body) => {
    setBusy((s) => new Set(s).add(key));
    setMessage(null);
    setError(null);
    start(async () => {
      try {
        const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) setError(j.error && j.error !== "failed" ? j.error : "Something went wrong. Try again.");
        else {
          setWeek(j.week);
          if (j.message) setMessage(j.message);
        }
      } catch {
        setError("You look offline. Try again when you're connected.");
      } finally {
        setBusy((s) => {
          const n = new Set(s);
          n.delete(key);
          return n;
        });
      }
    });
  };

  const planned = week.days.filter((d) => d.outfit).length;
  const thin = week.closetSize < 6;
  const globalBusy = GLOBAL.some((k) => busy.has(k));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" disabled={busy.size > 0 || thin} aria-busy={busy.has("fill")} onClick={() => call("fill", { action: "fill" })}>
          {busy.has("fill") ? "Planning…" : planned ? "Fill the open days" : "Plan my week"}
        </Button>
        {planned > 0 && (
          <ConfirmButton
            confirmTone="neutral"
            variant="secondary"
            size="md"
            disabled={busy.size > 0}
            title="Replan every day you haven't worn yet?"
            confirmLabel="Replan all"
            onConfirm={() => call("replan", { action: "fill", replan: true })}
          >
            {busy.has("replan") ? "Replanning…" : "Replan all"}
          </ConfirmButton>
        )}
        <span role="status" aria-live="polite" className="text-sm text-stone-500 tabular-nums">
          {planned} of 7 days planned{week.place ? ` · ${week.place}` : ""}
        </span>
      </div>
      {thin && (
        <Notice tone="warn">
          The planner needs at least a few tops, bottoms and shoes.{" "}
          <Link href="/closet/basics" className="font-semibold underline underline-offset-2">
            Tick your basics
          </Link>{" "}
          to get started.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="info">{message}</Notice>}

      <ol className="space-y-3">
        {week.days.map((d) => (
          <DayCard key={d.date} d={d} today={week.today} busy={busy} locked={globalBusy || [...busy].some((k) => k.endsWith(`-${d.date}`))} call={call} />
        ))}
      </ol>
    </div>
  );
}

function DayCard({ d, today, busy, locked, call }: { d: PlanDayView; today: string; busy: ReadonlySet<string>; locked: boolean; call: Call }) {
  const [picking, setPicking] = useState(false);
  const w = d.weather;
  const isToday = d.date === today;
  const label = dayLabel(d.date, today);
  const k = (a: string) => `${a}-${d.date}`;
  const pickerId = `occ-${d.date}`;
  const setOccasion = (occasion: string) => {
    setPicking(false);
    call(k("occ"), { action: "occasion", date: d.date, occasion });
  };

  return (
    <Card as="li" variant={isToday ? "active" : "surface"} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-snug">
            {label} <span className="text-sm font-normal text-stone-500">{shortDate(d.date)}</span>
          </h2>
          <p className="text-sm text-stone-500">
            {w.source === "default" ? "No forecast yet" : `Feels ${w.feelsMin}–${w.feelsMax}°F`}
            {w.rainMax >= 30 ? ` · ${w.rainMax}% rain` : ""}
            {w.uvMax >= 8 ? " · strong sun" : ""}
          </p>
        </div>
        {d.worn ? (
          <span className="pt-1 text-sm text-stone-500">{occasionLabel(d.occasion)}</span>
        ) : (
          <Button type="button" variant="quiet" size="sm" className="-mr-2" disabled={locked} aria-expanded={picking} aria-controls={pickerId} onClick={() => setPicking((p) => !p)}>
            <span className="sr-only">Occasion: </span>
            {busy.has(k("occ")) ? "Changing…" : occasionLabel(d.occasion)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx("transition-transform duration-200 ease-soft", picking && "rotate-180")}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        )}
      </div>

      {picking && !d.worn && (
        <div id={pickerId}>
          <ChipGroup label={`Occasion for ${label}`}>
            {OCCASIONS.map((o) =>
              o.id === d.occasion ? (
                <ChipButton key={o.id} selected onClick={() => setPicking(false)}>
                  {o.label}
                </ChipButton>
              ) : d.outfit ? (
                // The API can't bring a replaced outfit back, so ask before replacing it.
                <ConfirmButton
                  key={o.id}
                  variant="quiet"
                  size="sm"
                  confirmTone="neutral"
                  disabled={locked}
                  title={`Plan ${label} for ${o.label}?`}
                  body="This replaces the outfit planned for that day."
                  confirmLabel="Replace outfit"
                  onConfirm={() => setOccasion(o.id)}
                  className="font-medium text-stone-700 ring-1 ring-inset ring-line-strong"
                >
                  {o.label}
                </ConfirmButton>
              ) : (
                <ChipButton key={o.id} disabled={locked} onClick={() => setOccasion(o.id)}>
                  {o.label}
                </ChipButton>
              )
            )}
          </ChipGroup>
        </div>
      )}

      {d.outfit ? (
        <div className="space-y-2">
          <p className="font-semibold">{d.outfit.name}</p>
          <ul className="flex gap-2 overflow-x-auto">
            {d.outfit.items.map((it) => (
              <li key={it.id}>
                <Link href={`/closet/${it.id}`} title={it.name} className="block rounded-[10px]">
                  <Thumb src={it.url} alt={it.name} size="sm" item={{ subcategory: it.subcategory, colors: it.colors }} />
                </Link>
              </li>
            ))}
          </ul>
          {d.outfit.headline && <p className="text-xs text-stone-500">{d.outfit.headline}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {d.worn ? (
              <Chip tone="works">
                <CheckTick size={14} className="-ml-1 text-emerald-700" />
                wore it
              </Chip>
            ) : (
              <>
                {d.date <= today && (
                  <Button type="button" variant="secondary" size="sm" disabled={locked} aria-busy={busy.has(k("wore"))} onClick={() => call(k("wore"), { action: "wore", date: d.date })}>
                    {busy.has(k("wore")) ? "Saving…" : "Wore it"}
                  </Button>
                )}
                <Button type="button" variant="quiet" size="sm" disabled={locked} aria-busy={busy.has(k("swap"))} onClick={() => call(k("swap"), { action: "swap", date: d.date })}>
                  {busy.has(k("swap")) ? "Finding another…" : "Swap"}
                </Button>
                <ButtonLink href={`/outfits/new?items=${d.outfit.items.map((i) => i.id).join(",")}`} variant="quiet" size="sm">
                  Edit
                </ButtonLink>
                <ConfirmButton
                  variant="quiet"
                  confirmTone="neutral"
                  disabled={locked}
                  title={`Clear ${label}?`}
                  body="The outfit comes off the plan. You can plan the day again afterwards."
                  confirmLabel="Clear"
                  onConfirm={() => call(k("clear"), { action: "clear", date: d.date })}
                >
                  {busy.has(k("clear")) ? "Clearing…" : "Clear"}
                </ConfirmButton>
              </>
            )}
            {isToday || d.date > today ? <AskFriendsButton target={{ kind: "outfit", outfitId: d.outfit.id }} compact /> : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <span>Nothing planned.</span>
          <Button type="button" variant="secondary" size="sm" disabled={locked} aria-busy={busy.has(k("swap"))} onClick={() => call(k("swap"), { action: "occasion", date: d.date, occasion: d.occasion })}>
            {busy.has(k("swap")) ? "Planning…" : "Plan this day"}
          </Button>
        </div>
      )}
    </Card>
  );
}
