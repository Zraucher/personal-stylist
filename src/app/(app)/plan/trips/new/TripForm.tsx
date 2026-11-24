"use client";

import { useActionState, useState } from "react";
import { createTripAction, type TripFormState } from "../actions";
import { DRESS_CODES, type TripEvent } from "@/lib/plan/sequence";
import { Button, Card, Checkbox, Field, Input, Notice, Select } from "@/components/ui";

const initial: TripFormState = {};

// A radio that looks like a ChipButton: Night when chosen, outlined otherwise.
const RADIO_CHIP =
  "tap inline-flex min-h-9 cursor-pointer items-center rounded-full bg-card px-3.5 text-sm font-medium text-stone-700 ring-1 ring-inset ring-line-strong transition-colors duration-200 ease-soft hover:ring-stone-400 has-[:checked]:bg-stone-900 has-[:checked]:text-stone-50 has-[:checked]:ring-stone-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stone-900";

export default function TripForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createTripAction, initial);
  // Coming home can't be before leaving.
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState("");
  const [events, setEvents] = useState<TripEvent[]>([]);
  const edit = (i: number, patch: Partial<TripEvent>) => setEvents((xs) => xs.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <Card as="form" action={action} className="space-y-4">
      <Field label="Where to?">
        <Input name="destination" required maxLength={120} placeholder="Scottsdale, AZ" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Leave">
          <Input name="start" type="date" required min={today} value={start} onChange={(e) => setStart(e.target.value || today)} />
        </Field>
        <Field label="Come home">
          <Input name="end" type="date" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">Most days you&apos;ll be</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { v: "casual", l: "Out and about" },
            { v: "office", l: "Working" },
            { v: "active", l: "Golf or active" },
          ].map((o, i) => (
            <label key={o.v} className={RADIO_CHIP}>
              <input type="radio" name="daytime" value={o.v} defaultChecked={i === 0} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>
      <Checkbox name="nights" defaultChecked label="Dinners out most nights" />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-700">Plans you already know about</legend>
        <p className="text-sm text-stone-500">A wedding, a show, a hike. Each gets a look that fits its dress code and style.</p>
        <input type="hidden" name="events" value={JSON.stringify(events)} />
        {events.map((e, i) => (
          <div key={i} className="space-y-3 rounded-card bg-inset p-3">
            <div className="flex items-end gap-2">
              <Field label="What is it?" className="min-w-0 flex-1">
                <Input value={e.name} required maxLength={60} placeholder="Rehearsal dinner" onChange={(x) => edit(i, { name: x.target.value })} />
              </Field>
              <button
                type="button"
                onClick={() => setEvents((xs) => xs.filter((_, k) => k !== i))}
                className="tap mb-1 inline-grid size-9 shrink-0 place-items-center rounded-full text-lg leading-none text-stone-500 transition-colors duration-200 ease-soft hover:bg-stone-900/[0.06] hover:text-stone-900"
                aria-label={`Remove ${e.name || "this event"}`}
                title="Remove"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Day">
                <Input type="date" required value={e.date} min={start} max={end || undefined} onChange={(x) => edit(i, { date: x.target.value })} />
              </Field>
              <Field label="When">
                <Select value={e.when} onChange={(x) => edit(i, { when: x.target.value as TripEvent["when"] })}>
                  <option value="day">Daytime</option>
                  <option value="evening">Evening</option>
                </Select>
              </Field>
              <Field label="Dress code">
                <Select value={e.dress} onChange={(x) => edit(i, { dress: x.target.value as TripEvent["dress"] })}>
                  {DRESS_CODES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Style (optional)">
                <Input value={e.vibe ?? ""} maxLength={60} placeholder="All white, western" onChange={(x) => edit(i, { vibe: x.target.value })} />
              </Field>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={events.length >= 12}
          onClick={() => setEvents((xs) => [...xs, { date: start, when: "evening", name: "", dress: "smart", vibe: "" }])}
        >
          Add a plan
        </Button>
      </fieldset>
      <Field label="Name it (optional)">
        <Input name="name" maxLength={80} placeholder="Val's birthday weekend" />
      </Field>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Button type="submit" variant="primary" block disabled={pending} aria-busy={pending}>
        {pending ? "Building your looks…" : "Plan my looks and packing list"}
      </Button>
    </Card>
  );
}
