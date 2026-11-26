"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";

const Email = z.string().trim().toLowerCase().email().max(254);

/** Invite one waitlisted person: add to invites, email them once, drop them from the waitlist. Admins only. */
export type InviteState = { ok: boolean; error?: string };

export async function inviteFromWaitlist(_prev: InviteState, form: FormData): Promise<InviteState> {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!isAdmin(user?.email)) throw new Error("Not allowed");
  const email = Email.parse(form.get("email"));

  const db = createAdminClient();
  const { error } = await db.from("invites").upsert({ email, invited_by: user!.email }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return { ok: false, error: "Could not save the invite." };

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.myvalette.com").replace(/\/$/, "");
  const sent = await sendEmail({
    to: email,
    subject: "Your Valette invite is ready",
    text: `Your Valette invite is ready.\n\nSign in at ${site}/login with this email address. We'll send a 6-digit code.\n\nThis is the only email about your invite.`,
    labels: ["invite"],
    html: `<p>Your Valette invite is ready.</p><p><a href="${site}/login">Sign in at myvalette.com</a> with this email address. We'll send a 6-digit code.</p><p>This is the only email about your invite.</p>`,
  });
  // Keep the waitlist row if the email didn't go out, so the page still shows who needs a nudge.
  if (!sent) return { ok: false, error: "Invited, but the email did not send. Try Resend." };
  // ilike so older mixed-case rows match; escape the wildcards.
  await db.from("waitlist").delete().ilike("email", email.replace(/[\\%_]/g, "\\$&"));
  revalidatePath("/admin/invites");
  return { ok: true };
}
