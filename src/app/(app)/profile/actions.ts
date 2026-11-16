"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { ALL_SLOT_IDS } from "@/lib/profile/photo-slots";

type Result = { ok: true } | { ok: false; error: string };

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));
const tags = z.array(z.string().trim().min(1).max(60)).max(40);
const num = z.number().min(0).max(400).nullable();

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function fail(e: z.ZodError): Result {
  return { ok: false, error: e.issues[0]?.message ?? "Check the form" };
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
const Account = z.object({
  name: text(80),
  location: text(120),
  presentation: z.enum(["womens", "mens", "both"]),
});

export async function saveAccount(raw: z.input<typeof Account>): Promise<Result> {
  const p = Account.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("profiles").update(p.data).eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------
const Measurements = z.object({
  height_in: num,
  inseam_in: num,
  shoulders_in: num,
  chest_bust_in: num,
  waist_in: num,
  hips_in: num,
  neck_in: num,
  sleeve_in: num,
  rise_target_in: text(40),
  sizing_notes: text(500),
});

export async function saveMeasurements(raw: z.input<typeof Measurements>): Promise<Result> {
  const p = Measurements.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase
    .from("measurements")
    .upsert({ user_id: user.id, ...p.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
const Color = z.object({
  season_label: text(80),
  undertone: text(60),
  depth: text(60),
  contrast: text(60),
  best_colors: tags,
  avoid_colors: tags,
  notes: text(600),
});

export async function saveColor(raw: z.input<typeof Color>): Promise<Result> {
  const p = Color.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase
    .from("color_profiles")
    .upsert({ user_id: user.id, ...p.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Style preferences
// ---------------------------------------------------------------------------
const Fabric = z.object({ name: z.string().trim().min(1).max(60), strength: z.enum(["soft", "hard"]) });
const Style = z.object({
  aesthetic_statement: text(800),
  loves: tags,
  dislikes: tags,
  silhouettes_preferred: tags,
  silhouettes_avoid: tags,
  fabrics_preferred: z.array(Fabric).max(40),
  fabrics_avoid: z.array(Fabric).max(40),
});

export async function saveStyle(raw: z.input<typeof Style>): Promise<Result> {
  const p = Style.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase
    .from("style_prefs")
    .upsert({ user_id: user.id, ...p.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
const Brand = z.object({
  name: z.string().trim().min(1, "Give the brand a name").max(80),
  status: z.enum(["loved", "mixed", "avoid"]),
  note: text(200),
});

export async function addBrand(raw: z.input<typeof Brand>): Promise<Result> {
  const p = Brand.safeParse(raw);
  if (!p.success) return fail(p.error);
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("brands").insert({ user_id: user.id, ...p.data });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteBrand(id: string): Promise<Result> {
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { error } = await supabase.from("brands").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Photos of you
// ---------------------------------------------------------------------------
/** Record a photo already uploaded to <user id>/profile/. Replaces (and deletes) the slot's old file. */
export async function savePhotoSlot(slot: string, path: string): Promise<Result> {
  if (!ALL_SLOT_IDS.includes(slot)) return { ok: false, error: "Unknown photo slot" };
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  if (!path.startsWith(`${user.id}/profile/`)) return { ok: false, error: "Image does not belong to you" };

  const { data: old } = await supabase.from("profile_photos").select("image_path").eq("user_id", user.id).eq("slot", slot).maybeSingle();
  const { error } = await supabase
    .from("profile_photos")
    .upsert({ user_id: user.id, slot, image_path: path, updated_at: new Date().toISOString() }, { onConflict: "user_id,slot" });
  if (error) return { ok: false, error: error.message };
  if (old?.image_path && old.image_path !== path) {
    await supabase.storage.from(CLOSET_BUCKET).remove([old.image_path as string]);
  }
  revalidatePath("/profile");
  return { ok: true };
}

export async function removePhotoSlot(slot: string): Promise<Result> {
  if (!ALL_SLOT_IDS.includes(slot)) return { ok: false, error: "Unknown photo slot" };
  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Signed out" };
  const { data: old } = await supabase.from("profile_photos").select("image_path").eq("user_id", user.id).eq("slot", slot).maybeSingle();
  const { error } = await supabase.from("profile_photos").delete().eq("user_id", user.id).eq("slot", slot);
  if (error) return { ok: false, error: error.message };
  if (old?.image_path) await supabase.storage.from(CLOSET_BUCKET).remove([old.image_path as string]);
  revalidatePath("/profile");
  return { ok: true };
}
