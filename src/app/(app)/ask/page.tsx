import { createClient } from "@/lib/supabase/server";
import { loadRecommendation } from "@/lib/today/recommend";
import { PageHeader } from "@/components/ui";
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
    <div className="space-y-6">
      <PageHeader title="Ask" subtitle="For days that aren't routine. Say it the way you'd text a friend." />
      <AskClient initial={initial} />
    </div>
  );
}
