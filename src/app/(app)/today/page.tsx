import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import { localDate } from "@/lib/today/weather";
import TodayClient from "./TodayClient";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", uid).maybeSingle();
  const today = localDate((prof?.timezone as string | null) ?? null);
  // Today's latest pick, if one was made today.
  const { data: latest } = await supabase
    .from("recommendations")
    .select("id, created_at")
    .eq("user_id", uid)
    .eq("kind", "today")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: closetSize } = await supabase.from("closet_items").select("id", { count: "exact", head: true }).eq("user_id", uid).neq("status", "gone");
  const initial = latest ? await loadRecommendation(supabase, uid, latest.id as string) : null;
  const fresh = initial && initial.weather?.date === today ? initial : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-stone-500">Three outfits from your closet for the weather and where you are going.</p>
      </div>
      <TodayClient initial={fresh} closetSize={closetSize ?? 0} />
    </div>
  );
}
