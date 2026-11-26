import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { EmptyState, ListCard, PageHeader } from "@/components/ui";
import { InviteRow } from "./InviteRow";

export const metadata: Metadata = { title: "Invites · valette", robots: { index: false } };
export const dynamic = "force-dynamic";

// Admin only (ADMIN_EMAILS). Everyone else gets a plain 404.
export default async function InvitesAdminPage() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!isAdmin(user?.email)) notFound();

  const db = createAdminClient();
  const [{ data: waiting }, { data: invited }] = await Promise.all([
    db.from("waitlist").select("email, first_name, created_at").order("created_at"),
    db.from("invites").select("email"),
  ]);
  const have = new Set((invited ?? []).map((i) => i.email.toLowerCase()));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <PageHeader eyebrow="admin" title="Waitlist" subtitle="Invite adds them to the invite list and sends one email. Sending can't be undone." />
      {!waiting?.length ? (
        <EmptyState title="Nobody is waiting" />
      ) : (
        <ListCard>
          {waiting.map((w) => (
            <li key={w.email} className="py-3">
              <InviteRow email={w.email} label={`${w.first_name ? `${w.first_name} · ` : ""}${w.email} · ${new Date(w.created_at).toLocaleDateString("en-US")}`} invited={have.has(w.email.toLowerCase())} />
            </li>
          ))}
        </ListCard>
      )}
    </main>
  );
}
