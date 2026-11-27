import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerifyForm from "./VerifyForm";

export const metadata = { title: "Authenticator code · valette" };

// The proxy sends aal1 sessions with an authenticator here; it also sends everyone else away.
export default async function VerifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!user.factors?.some((f) => f.status === "verified")) redirect("/today");
  return <VerifyForm />;
}
