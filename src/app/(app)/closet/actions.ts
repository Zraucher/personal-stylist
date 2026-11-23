"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { CUTOUT, originalOf, photoFiles } from "@/lib/closet/cutout";
import { findBasic } from "@/lib/closet/basics";
import { CATEGORIES, SEASONS, STATUSES } from "@/lib/closet/taxonomy";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === "" ? null : v));

const ItemInput = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(120),
  category: z.enum(CATEGORIES),
  subcategory: nullableText(60),
  colors: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        hex: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
    )
    .max(6),
  pattern: nullableText(60),
  material: nullableText(80),
  construction: z.array(z.string().trim().min(1).max(40)).max(24),
  formality: z.number().int().min(1).max(5).nullable(),
  warmth: z.number().int().min(1).max(5).nullable(),
  seasons: z.array(z.enum(SEASONS)),
  brand: nullableText(80),
  size: nullableText(30),
  status: z.enum(STATUSES),
  tailoring_note: nullableText(400),
  image_path: z.string().nullable(),
});

export type ItemInput = z.input<typeof ItemInput>;

type SaveResult = { id: string } | { error: string };

export async function saveItem(raw: ItemInput, id?: string): Promise<SaveResult> {
  const parsed = ItemInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save this." };

  if (input.image_path && !input.image_path.startsWith(`${user.id}/`)) {
    return { error: "That photo isn't from your account. Upload it again." };
  }

  const row = {
    ...input,
    tailoring_note: input.status === "tailoring" ? input.tailoring_note : null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase.from("closet_items").update(row).eq("id", id).eq("user_id", user.id);
    if (error) return { error: "Couldn't save this piece. Try again." };
    revalidatePath("/closet");
    revalidatePath(`/closet/${id}`);
    return { id };
  }

  const { data, error } = await supabase
    .from("closet_items")
    .insert({ ...row, user_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't save this piece. Try again." };
  revalidatePath("/closet");
  return { id: data.id as string };
}

/** Attach a newly uploaded photo to a saved item, replacing (and deleting) any previous one. */
export async function setItemPhoto(id: string, path: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save this." };
  if (!path.startsWith(`${user.id}/`)) return { error: "That photo isn't from your account. Upload it again." };

  const { data: item } = await supabase.from("closet_items").select("image_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!item) return { error: "That piece isn't here anymore. Go back to your closet." };

  const { error } = await supabase
    .from("closet_items")
    .update({ image_path: path, source_image_url: null, source_page_url: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save this piece. Try again." };

  if (item.image_path && item.image_path !== path) {
    await supabase.storage.from(CLOSET_BUCKET).remove(photoFiles(item.image_path as string));
  }
  revalidatePath("/closet");
  revalidatePath(`/closet/${id}`);
  revalidatePath("/closet/sourced");
  return { ok: true };
}

/** Show the background-free version, uploaded next to the original as `<original>.cutout.<ext>`. */
export async function applyCutout(id: string, path: string): Promise<{ ok: true } | { error: string }> {
  return swapPhoto(id, (current) => (CUTOUT.test(path) && originalOf(path) === current ? path : null));
}

/** Back to the photo as taken; the cut-out file goes. */
export async function restorePhoto(id: string): Promise<{ ok: true } | { error: string }> {
  return swapPhoto(id, originalOf, true);
}

async function swapPhoto(id: string, next: (current: string) => string | null, dropCurrent = false): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save this." };
  const { data: item } = await supabase.from("closet_items").select("image_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!item?.image_path) return { error: "That piece isn't here anymore. Go back to your closet." };
  const path = next(item.image_path as string);
  if (!path) return { error: "That photo changed. Reload the page and try again." };
  const { error } = await supabase.from("closet_items").update({ image_path: path, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Couldn't save this piece. Try again." };
  if (dropCurrent) await supabase.storage.from(CLOSET_BUCKET).remove([item.image_path as string]);
  revalidatePath("/closet");
  revalidatePath(`/closet/${id}`);
  return { ok: true };
}

const BasicDetails = z.object({
  brand: z.string().trim().max(80),
  colorName: z.string().trim().max(40),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

/** Brand and color the user gives for a ticked basic. Empty fields leave the old value alone. */
export async function updateBasicDetails(
  genericId: string,
  raw: { brand: string; colorName: string; colorHex?: string }
): Promise<{ error?: string }> {
  const parsed = BasicDetails.safeParse(raw);
  if (!parsed.success) return { error: "Check the brand and color." };
  if (!findBasic(genericId)) return { error: "That basic isn't on the list anymore. Reload the page." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save this." };

  const { brand, colorName, colorHex } = parsed.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (brand) patch.brand = brand;
  if (colorName) patch.colors = [{ name: colorName, ...(colorHex ? { hex: colorHex } : {}) }];

  const { error } = await supabase.from("closet_items").update(patch).eq("user_id", user.id).eq("generic_id", genericId);
  if (error) return { error: "Couldn't save the photo. Try again." };
  revalidatePath("/closet");
  revalidatePath("/closet/basics");
  return {};
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("closet_items")
    .select("image_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (item?.image_path) {
    await supabase.storage.from(CLOSET_BUCKET).remove(photoFiles(item.image_path));
  }
  await supabase.from("closet_items").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/closet");
  redirect("/closet");
}

/**
 * Basics checklist toggle. Ticking creates a generic item; unticking removes
 * it unless a photo has been attached since, in which case it is marked gone
 * so nothing with a photo is ever destroyed from a checkbox.
 */
export async function toggleBasic(genericId: string, owned: boolean): Promise<{ error?: string }> {
  const basic = findBasic(genericId);
  if (!basic) return { error: "That basic isn't on the list anymore. Reload the page." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in again to save this." };

  if (owned) {
    const { data: existing } = await supabase
      .from("closet_items")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("generic_id", genericId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.status === "gone") {
        await supabase.from("closet_items").update({ status: "available" }).eq("id", existing.id);
      }
    } else {
      const { error } = await supabase.from("closet_items").insert({
        user_id: user.id,
        generic_id: basic.id,
        name: basic.name,
        category: basic.category,
        subcategory: basic.subcategory,
        colors: basic.colors,
        construction: basic.construction ?? [],
        formality: basic.formality,
        warmth: basic.warmth,
        seasons: basic.seasons,
        status: "available",
      });
      if (error) return { error: "Couldn't save this piece. Try again." };
    }
  } else {
    const { data: rows } = await supabase
      .from("closet_items")
      .select("id, image_path")
      .eq("user_id", user.id)
      .eq("generic_id", genericId);
    for (const r of rows ?? []) {
      if (r.image_path) {
        await supabase.from("closet_items").update({ status: "gone" }).eq("id", r.id);
      } else {
        await supabase.from("closet_items").delete().eq("id", r.id);
      }
    }
  }

  revalidatePath("/closet");
  revalidatePath("/closet/basics");
  return {};
}
