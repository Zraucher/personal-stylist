import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Presentation } from "@/lib/closet/basics";
import BasicsList from "./BasicsList";

export default async function BasicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: owned }] = await Promise.all([
    supabase.from("profiles").select("presentation").eq("id", user!.id).maybeSingle(),
    supabase.from("closet_items").select("generic_id").eq("user_id", user!.id).neq("status", "gone").not("generic_id", "is", null),
  ]);

  const presentation = profile?.presentation as "womens" | "mens" | "both" | undefined;
  const defaultTab: Presentation = presentation === "mens" ? "mens" : "womens";
  const ownedIds = (owned ?? []).map((r) => r.generic_id as string);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Basics</h1>
          <p className="text-sm text-stone-500">Tick what you own. Each tick becomes a closet item you can photograph later.</p>
        </div>
        <Link href="/closet" className="text-sm text-stone-600 hover:text-stone-900">
          Done
        </Link>
      </div>
      <BasicsList defaultTab={defaultTab} showTabs={presentation !== "womens" && presentation !== "mens"} ownedIds={ownedIds} />
    </div>
  );
}
