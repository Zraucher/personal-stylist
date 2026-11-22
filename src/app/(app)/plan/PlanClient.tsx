"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { PlanDayView, WeekView } from "@/lib/plan/server";
import { OCCASIONS } from "@/lib/today/candidates";
import AskFriendsButton from "@/components/AskFriendsButton";
import { Button, ButtonLink, Card, CheckTick, Chip, ChipButton, ChipGroup, ConfirmButton, Notice, OutfitStrip, Thumb, WeatherLine, cx } from "@/components/ui";

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

// The API answers with short codes for some failures: show a plain line instead.
const API_ERROR: Record<string, string> = {
  unauthorized: "You're signed out. Sign in again to save this.",
  bad_request: "Couldn't do that. Reload the page and try again.",
  failed: "Couldn't update your plan. Try again.",
};
const errorLine = (code: unknown) => (typeof code === "string" && code ? API_ERROR[code] ?? code : API_ERROR.failed);

export default function PlanClient({ initial }: { initial: WeekView }) {
  const [week, setWeek] = useState(initial);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Days marked worn in this session: their tick draws; days loaded already worn show it finished.
  const [justWore, setJustWore] = useState<ReadonlySet<string>>(new Set());
  const [, start] = useTransition();

  const call: Call = (key, body) => {
    setBusy((s) => new Set(s).add(key));
    setMessage(null);
    setError(null);
    start(async () => {
      try {
        const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) setError(errorLine(j.error));
        else {
          setWeek(j.week);
          if (j.message) setMessage(j.message);
          if (body.action === "wore" && typeof body.date === "string") setJustWore((s) => new Set(s).add(body.date as string));
        }
      } catch {
        setError("You seem to be offline. Try again when you're connected.");
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
            body="Outfits planned for those days get replaced."
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
          Plans need a few tops, bottoms and shoes.{" "}
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
          <DayCard key={d.date} d={d} today={week.today} busy={busy} locked={globalBusy || [...busy].some((k) => k.endsWith(`-${d.date}`))} justWore={justWore.has(d.date)} call={call} />
        ))}
      </ol>
    </div>
  );
}

function DayCard({ d, today, busy, locked, justWore, call }: { d: PlanDayView; today: string; busy: ReadonlySet<string>; locked: boolean; justWore: boolean; call: Call }) {
  const [picking, setPicking] = useState(false);
  const [more, setMore] = useState(false);
  const moreId = useId();
  const w = d.weather;
  const isToday = d.date === today;
  const label = dayLabel(d.date, today);
  const k = (a: string) => `${a}-${d.date}`;
  const pickerId = `occ-${d.date}`;
  const setOccasion = (occasion: string) => {
    setPicking(false);
    call(k("occ"), { action: "occasion", date: d.date, occasion });
  };

  // Worn and past days fold into one compact row so the days ahead lead.
  if (d.outfit && (d.worn || d.date < today)) {
    const first = d.outfit.items[0];
    return (
      <Card as="li" pad="sm" className="flex items-center gap-3">
        {first ? <Thumb src={first.url} alt="" size="xs" item={{ subcategory: first.subcategory, colors: first.colors }} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {label} <span className="font-normal text-stone-500">{shortDate(d.date)}</span>
          </p>
          <p className="truncate text-[13px] text-stone-500">{d.outfit.name}</p>
        </div>
        {d.worn && (
          <Chip tone="works" className="shrink-0">
            <CheckTick size={14} animate={justWore} className="-ml-1 text-emerald-700" />
            wore it
          </Chip>
        )}
      </Card>
    );
  }

  const meta = [
    ...(w.source === "default" ? ["No forecast yet"] : [`low ${w.feelsMin}°`]),
    ...(w.rainMax >= 30 ? [`rain ${w.rainMax}%`] : []),
    ...(w.uvMax >= 8 ? ["strong sun"] : []),
  ];

  return (
    <Card as="li" variant={isToday ? "active" : "surface"} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <h2 className="font-display text-lg font-bold leading-snug">
            {label} <span className="text-sm font-normal text-stone-500">{shortDate(d.date)}</span>
          </h2>
          <WeatherLine high={w.source === "default" ? null : w.feelsMax} meta={meta} />
        </div>
        <Button type="button" variant="quiet" size="sm" className="-mr-2" disabled={locked} aria-expanded={picking} aria-controls={pickerId} onClick={() => setPicking((p) => !p)}>
          <span className="sr-only">Occasion: </span>
          {busy.has(k("occ")) ? "Changing…" : occasionLabel(d.occasion)}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx("transition-transform duration-200 ease-soft", picking && "rotate-180")}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </div>

      {picking && (
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
        <div className="space-y-3">
          <OutfitStrip size="lg" items={d.outfit.items.map((it) => ({ id: it.id, name: it.name, url: it.url, subcategory: it.subcategory, colors: it.colors }))} />
          <div className="space-y-0.5">
            <p className="font-semibold">{d.outfit.name}</p>
            {d.outfit.headline && <p className="text-xs text-stone-500">{d.outfit.headline}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {d.date <= today && (
              <Button type="button" variant="secondary" size="sm" disabled={locked} aria-busy={busy.has(k("wore"))} onClick={() => call(k("wore"), { action: "wore", date: d.date })}>
                {busy.has(k("wore")) ? "Saving…" : "Wore it"}
              </Button>
            )}
            <Button type="button" variant={d.date <= today ? "quiet" : "secondary"} size="sm" disabled={locked} aria-busy={busy.has(k("swap"))} onClick={() => call(k("swap"), { action: "swap", date: d.date })}>
              {busy.has(k("swap")) ? "Finding another…" : "Try another"}
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={() => setMore((m) => !m)} aria-expanded={more} aria-controls={moreId}>
              More
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx("transition-transform duration-200 ease-soft", more && "rotate-180")}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </div>
          {more && (
            <div id={moreId} className="flex flex-wrap items-center gap-2">
              <ButtonLink href={`/outfits/new?items=${d.outfit.items.map((i) => i.id).join(",")}`} variant="quiet" size="sm">
                Swap a piece
              </ButtonLink>
              <ConfirmButton
                variant="quiet"
                confirmTone="neutral"
                disabled={locked}
                title={`Clear ${label}?`}
                body="The outfit comes off the plan. You can plan the day again afterwards."
                confirmLabel="Clear day"
                onConfirm={() => call(k("clear"), { action: "clear", date: d.date })}
              >
                {busy.has(k("clear")) ? "Clearing…" : "Clear day"}
              </ConfirmButton>
              <AskFriendsButton target={{ kind: "outfit", outfitId: d.outfit.id }} compact />
            </div>
          )}
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
