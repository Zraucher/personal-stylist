import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadTrip } from "@/lib/plan/trip";
import TripClient from "./TripClient";

export const metadata = { title: "Trip · valette" };

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const trip = await loadTrip(supabase, user!.id, id);
  if (!trip) notFound();
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const temps = trip.looks.map((l) => l.weather).filter((w): w is NonNullable<typeof w> => !!w && w.source !== "default");
  const lo = temps.length ? Math.min(...temps.map((w) => w.feelsMin)) : null;
  const hi = temps.length ? Math.max(...temps.map((w) => w.feelsMax)) : null;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/plan" className="text-sm text-stone-500 hover:text-stone-900">← Plan</Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{trip.title}</h1>
        <p className="text-sm text-stone-500">
          {trip.title !== trip.destination ? `${trip.destination} · ` : ""}
          {fmt(trip.start)} to {fmt(trip.end)}
          {lo != null && hi != null ? ` · feels ${lo}–${hi}°` : ""}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {trip.weatherSource === "forecast"
            ? "Weather from the live forecast."
            : trip.weatherSource === "typical"
              ? "Weather based on the same dates last year. Swap looks closer to the trip if the forecast changes."
              : "No weather found for this place, so looks assume a mild day."}
        </p>
      </div>
      <TripClient trip={trip} />
    </div>
  );
}
