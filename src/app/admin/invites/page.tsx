import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { Button, EmptyState, ListCard, PageHeader } from "@/components/ui";
import { inviteFromWaitlist } from "./actions";

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
              <form action={inviteFromWaitlist} className="flex w-full items-center justify-between gap-3">
                <input type="hidden" name="email" value={w.email} />
                <span className="min-w-0 truncate text-sm">
                  {w.first_name ? `${w.first_name} · ` : ""}
                  {w.email}
                  <span className="text-stone-500"> · {new Date(w.created_at).toLocaleDateString("en-US")}</span>
                </span>
                <Button type="submit" size="sm" variant={have.has(w.email.toLowerCase()) ? "secondary" : "primary"}>
                  {have.has(w.email.toLowerCase()) ? "Resend" : "Invite"}
                </Button>
              </form>
            </li>
          ))}
        </ListCard>
      )}
    </main>
  );
}
