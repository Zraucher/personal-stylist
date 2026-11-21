import { createClient } from "@/lib/supabase/server";
import type { Presentation } from "@/lib/closet/basics";
import BasicsList, { type OwnedInfo } from "./BasicsList";
import { ButtonLink, PageHeader } from "@/components/ui";

export default async function BasicsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: owned }] = await Promise.all([
    supabase.from("profiles").select("presentation").eq("id", user!.id).maybeSingle(),
    supabase
      .from("closet_items")
      .select("generic_id, brand")
      .eq("user_id", user!.id)
      .neq("status", "gone")
      .not("generic_id", "is", null),
  ]);

  const presentation = profile?.presentation as "womens" | "mens" | "both" | undefined;
  const defaultTab: Presentation = presentation === "mens" ? "mens" : "womens";
  const ownedInfo: Record<string, OwnedInfo> = {};
  for (const r of owned ?? []) ownedInfo[r.generic_id as string] = { brand: (r.brand as string | null) ?? null };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Basics"
        subtitle="Tick what you own. Each tick adds a placeholder to your closet, and we ask for the brand and color so it is accurate."
        actions={
          <ButtonLink href="/closet" size="sm">
            Done
          </ButtonLink>
        }
      />
      <BasicsList defaultTab={defaultTab} showTabs={presentation !== "womens" && presentation !== "mens"} owned={ownedInfo} />
    </div>
  );
}
