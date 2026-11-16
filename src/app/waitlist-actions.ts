"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type WaitlistState = { status: "idle" | "joined" | "error"; message?: string };

const Input = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  first_name: z.string().trim().max(60).optional(),
  source: z.string().trim().max(40).optional(),
});

/** Add an email to the invite waitlist. Joining twice is treated as joined. */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  // A hidden field people never see; bots that fill every input get a quiet success and nothing is saved.
  if (String(form.get("company") ?? "").trim()) return { status: "joined" };
  const p = Input.safeParse({
    email: form.get("email") ?? "",
    first_name: String(form.get("first_name") ?? "") || undefined,
    source: String(form.get("source") ?? "") || undefined,
  });
  if (!p.success) return { status: "error", message: p.error.issues[0]?.message ?? "Check your email address." };
  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email: p.data.email, first_name: p.data.first_name ?? null, source: p.data.source ?? "home" });
  if (error && error.code !== "23505") return { status: "error", message: "Could not save that. Try again in a moment." };
  return { status: "joined" };
}
