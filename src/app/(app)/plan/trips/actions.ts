"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTrip, swapTripLook } from "@/lib/plan/trip";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const TripEventSchema = z.object({
  date,
  when: z.enum(["day", "evening"]),
  name: z.string().trim().min(1, "Name each event").max(60),
  dress: z.enum(["casual", "smart", "cocktail", "formal", "black-tie"]),
  vibe: z.string().trim().max(60).transform((v) => v || null).nullable(),
});
const TripForm = z
  .object({
    name: z.string().trim().max(80).optional(),
    destination: z.string().trim().min(2, "Where are you going?").max(120),
    start: date,
    end: date,
    daytime: z.enum(["casual", "office", "active"]),
    nights: z.boolean(),
    events: z.array(TripEventSchema).max(12, "Up to 12 events per trip."),
  })
  .refine((v) => v.events.every((e) => e.date >= v.start && e.date <= v.end), { message: "Each event needs a date during the trip.", path: ["events"] })
  .refine((v) => v.end >= v.start, { message: "The trip ends before it starts.", path: ["end"] })
  .refine((v) => (Date.parse(v.end) - Date.parse(v.start)) / 86400000 <= 13, { message: "Trips can be up to 14 days.", path: ["end"] });

export type TripFormState = { error?: string };

export async function createTripAction(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  const p = TripForm.safeParse({
    name: String(form.get("name") ?? "") || undefined,
    destination: form.get("destination") ?? "",
    start: form.get("start") ?? "",
    end: form.get("end") ?? "",
    daytime: form.get("daytime") ?? "casual",
    nights: form.get("nights") === "on",
    events: (() => {
      try {
        return JSON.parse(String(form.get("events") ?? "[]"));
      } catch {
        return [];
      }
    })(),
  });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the trip details and try again." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save this." };
  const { count } = await supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 50) return { error: "You have a lot of trips saved. Delete an old one first." };
  const r = await createTrip(supabase, user.id, {
    name: p.data.name ?? null,
    destination: p.data.destination,
    start: p.data.start,
    end: p.data.end,
    options: { daytime: p.data.daytime, nights: p.data.nights, event: false, events: p.data.events },
  });
  if (r.error || !r.id) return { error: r.error ?? "Couldn't plan the trip. Try again." };
  revalidatePath("/plan");
  redirect(`/plan/trips/${r.id}`);
}

async function owner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function swapLookAction(tripId: string, key: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(tripId).success || key.length > 40) return { error: "That look isn't here anymore. Reload the trip and try again." };
  const { supabase, user } = await owner();
  if (!user) return { error: "You're signed out. Sign in again to save this." };
  const r = await swapTripLook(supabase, user.id, tripId, key);
  revalidatePath(`/plan/trips/${tripId}`);
  return r;
}

export async function togglePackedAction(tripId: string, entry: string, packed: boolean): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(tripId).success || entry.length > 80) return { error: "That piece isn't on this trip anymore. Reload the trip and try again." };
  const { supabase, user } = await owner();
  if (!user) return { error: "You're signed out. Sign in again to save this." };
  const { data: t } = await supabase.from("trips").select("packed").eq("id", tripId).eq("user_id", user.id).maybeSingle();
  if (!t) return { error: "That trip isn't here anymore. Go back to Plan to see your trips." };
  const set = new Set((t.packed as string[]) ?? []);
  if (packed) set.add(entry);
  else set.delete(entry);
  await supabase.from("trips").update({ packed: [...set].slice(0, 300) }).eq("id", tripId).eq("user_id", user.id);
  return {};
}

export async function deleteTripAction(tripId: string): Promise<void> {
  if (!z.string().uuid().safeParse(tripId).success) return;
  const { supabase, user } = await owner();
  if (!user) return;
  await supabase.from("trips").delete().eq("id", tripId).eq("user_id", user.id);
  revalidatePath("/plan");
  redirect("/plan");
}
