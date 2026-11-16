import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import AskClient from "./AskClient";

export default async function AskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: latest } = await supabase
    .from("recommendations")
    .select("id")
    .eq("user_id", user!.id)
    .eq("kind", "ask")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const initial = latest ? await loadRecommendation(supabase, user!.id, latest.id as string) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ask</h1>
        <p className="text-sm text-stone-500">For days that are not routine. Say it the way you would to a friend.</p>
      </div>
      <AskClient initial={initial} />
    </div>
  );
}
