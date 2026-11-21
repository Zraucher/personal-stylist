"use client";

import { useActionState } from "react";
import { createTripAction, type TripFormState } from "../actions";

const initial: TripFormState = {};

export default function TripForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createTripAction, initial);
  const input = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base";
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
      <label className="block text-sm">
        <span className="font-medium">Where to?</span>
        <input name="destination" required maxLength={120} placeholder="Scottsdale, AZ" className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium">Leave</span>
          <input name="start" type="date" required min={today} defaultValue={today} className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Come home</span>
          <input name="end" type="date" required min={today} className={input} />
        </label>
      </div>
      <fieldset className="text-sm">
        <legend className="font-medium">Most days you&apos;ll be</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { v: "casual", l: "Out and about" },
            { v: "office", l: "Working" },
            { v: "active", l: "Golf or active" },
          ].map((o, i) => (
            <label key={o.v} className="cursor-pointer rounded-full border border-stone-300 px-3 py-1.5 has-[:checked]:border-stone-900 has-[:checked]:bg-stone-900 has-[:checked]:text-stone-50">
              <input type="radio" name="daytime" value={o.v} defaultChecked={i === 0} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="nights" defaultChecked className="h-4 w-4 accent-emerald-700" /> Dinners out most nights
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="event" className="h-4 w-4 accent-emerald-700" /> One dressy event (wedding, show, big dinner)
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Name it (optional)</span>
        <input name="name" maxLength={80} placeholder="Val's birthday weekend" className={input} />
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-full bg-emerald-700 py-3 font-bold text-white disabled:opacity-60">
        {pending ? "Building your looks…" : "Plan my looks and packing list"}
      </button>
    </form>
  );
}
