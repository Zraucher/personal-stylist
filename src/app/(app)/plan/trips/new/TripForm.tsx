"use client";

import { useActionState } from "react";
import { createTripAction, type TripFormState } from "../actions";
import { Button, Card, Checkbox, Field, Input, Notice } from "@/components/ui";

const initial: TripFormState = {};

export default function TripForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createTripAction, initial);
  return (
    <Card as="form" action={action} className="space-y-4">
      <Field label="Where to?">
        <Input name="destination" required maxLength={120} placeholder="Scottsdale, AZ" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Leave">
          <Input name="start" type="date" required min={today} defaultValue={today} />
        </Field>
        <Field label="Come home">
          <Input name="end" type="date" required min={today} />
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
            <label
              key={o.v}
              className="tap inline-flex min-h-9 cursor-pointer items-center rounded-full bg-card px-3.5 text-sm font-medium text-stone-700 ring-1 ring-inset ring-line-strong transition-colors duration-200 ease-soft hover:ring-stone-400 has-[:checked]:bg-stone-900 has-[:checked]:text-stone-50 has-[:checked]:ring-stone-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stone-900"
            >
              <input type="radio" name="daytime" value={o.v} defaultChecked={i === 0} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col items-start gap-1">
        <Checkbox name="nights" defaultChecked label="Dinners out most nights" />
        <Checkbox name="event" label="One dressy event (wedding, show, big dinner)" />
      </div>
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
