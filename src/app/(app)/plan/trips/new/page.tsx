import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/today/weather";
import { PageHeader } from "@/components/ui";
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
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/plan", label: "Plan" }}
        title="Plan a trip"
        subtitle="We check the weather there, build a look for every day from your closet, and reuse pieces so you pack less."
      />
      <TripForm today={today} />
    </div>
  );
}
