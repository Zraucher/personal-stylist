"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { PlanDayView, WeekView } from "@/lib/plan/server";
import { OCCASIONS } from "@/lib/today/candidates";
import AskFriendsButton from "@/components/AskFriendsButton";
import { Button, ButtonLink, Card, CheckTick, Chip, ConfirmButton, Notice, Select, Thumb } from "@/components/ui";

const dayLabel = (date: string, today: string) => {
  const d = new Date(`${date}T12:00:00`);
  if (date === today) return "Today";
  const t = new Date(`${today}T12:00:00`);
  if ((d.getTime() - t.getTime()) / 86400000 === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long" });
};
const shortDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function PlanClient({ initial }: { initial: WeekView }) {
  const [week, setWeek] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();

  const call = (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setMessage(null);
    start(async () => {
      try {
        const r = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json();
        if (!r.ok) setMessage(j.error === "failed" ? "Something went wrong. Try again." : j.error ?? "Something went wrong.");
        else {
          setWeek(j.week);
          if (j.message) setMessage(j.message);
        }
      } catch {
        setMessage("You look offline. Try again when you're connected.");
      } finally {
        setBusy(null);
      }
    });
  };

  const planned = week.days.filter((d) => d.outfit).length;
  const thin = week.closetSize < 6;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="primary" disabled={!!busy || thin} aria-busy={busy === "fill"} onClick={() => call("fill", { action: "fill" })}>
          {busy === "fill" ? "Planning…" : planned ? "Fill the open days" : "Plan my week"}
        </Button>
        {planned > 0 && (
          <ConfirmButton
            confirmTone="neutral"
            variant="secondary"
            size="md"
            disabled={!!busy}
            title="Replan every day you haven't worn yet?"
            confirmLabel="Replan all"
            onConfirm={() => call("replan", { action: "fill", replan: true })}
          >
            {busy === "replan" ? "Replanning…" : "Replan all"}
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
      {message && <Notice tone="info">{message}</Notice>}

      <ol className="space-y-3">
        {week.days.map((d) => (
          <DayCard key={d.date} d={d} today={week.today} busy={busy} call={call} />
        ))}
      </ol>
    </div>
  );
}

function DayCard({ d, today, busy, call }: { d: PlanDayView; today: string; busy: string | null; call: (key: string, body: Record<string, unknown>) => void }) {
  const w = d.weather;
  const isToday = d.date === today;
  const k = (a: string) => `${a}-${d.date}`;
  return (
    <Card as="li" variant={isToday ? "active" : "surface"} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-snug">
            {dayLabel(d.date, today)} <span className="text-sm font-normal text-stone-500">{shortDate(d.date)}</span>
          </p>
          <p className="text-sm text-stone-500">
            {w.source === "default" ? "No forecast yet" : `${w.feelsMin}–${w.feelsMax}° feels`}
            {w.rainMax >= 30 ? ` · ${w.rainMax}% rain` : ""}
            {w.uvMax >= 8 ? " · strong sun" : ""}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <Select
            aria-label={`Occasion for ${dayLabel(d.date, today)}`}
            value={d.occasion}
            disabled={!!busy || d.worn}
            onChange={(e) => call(k("occ"), { action: "occasion", date: d.date, occasion: e.target.value })}
          >
            {OCCASIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

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
                  <Button type="button" variant="secondary" size="sm" disabled={!!busy} aria-busy={busy === k("wore")} onClick={() => call(k("wore"), { action: "wore", date: d.date })}>
                    {busy === k("wore") ? "Saving…" : "Wore it"}
                  </Button>
                )}
                <Button type="button" variant="quiet" size="sm" disabled={!!busy} aria-busy={busy === k("swap")} onClick={() => call(k("swap"), { action: "swap", date: d.date })}>
                  {busy === k("swap") ? "Finding another…" : "Swap"}
                </Button>
                <ButtonLink href={`/outfits/new?items=${d.outfit.items.map((i) => i.id).join(",")}`} variant="quiet" size="sm">
                  Edit
                </ButtonLink>
                <Button type="button" variant="quiet" size="sm" disabled={!!busy} aria-busy={busy === k("clear")} onClick={() => call(k("clear"), { action: "clear", date: d.date })}>
                  Clear
                </Button>
              </>
            )}
            {isToday || d.date > today ? <AskFriendsButton target={{ kind: "outfit", outfitId: d.outfit.id }} compact /> : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <span>Nothing planned.</span>
          <Button type="button" variant="secondary" size="sm" disabled={!!busy} aria-busy={busy === k("swap")} onClick={() => call(k("swap"), { action: "occasion", date: d.date, occasion: d.occasion })}>
            {busy === k("swap") ? "Planning…" : "Plan this day"}
          </Button>
        </div>
      )}
    </Card>
  );
}
