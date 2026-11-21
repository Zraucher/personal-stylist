import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/today/weather";
import TripForm from "./TripForm";

export const metadata = { title: "Plan a trip · valette" };

export default async function NewTripPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user!.id).maybeSingle();
  const today = localDate((prof?.timezone as string | null) ?? null);
  return (
    <div className="space-y-5">
      <div>
        <Link href="/plan" className="text-sm text-stone-500 hover:text-stone-900">← Plan</Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Plan a trip</h1>
        <p className="text-sm text-stone-500">We check the weather there, build a look for every day from your closet, and reuse pieces so you pack less.</p>
      </div>
      <TripForm today={today} />
    </div>
  );
}
