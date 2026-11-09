"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
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
  name: z.string().trim().min(1, "Give it a name").max(120),
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
    return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };

  if (input.image_path && !input.image_path.startsWith(`${user.id}/`)) {
    return { error: "Image does not belong to you" };
  }

  const row = {
    ...input,
    tailoring_note: input.status === "tailoring" ? input.tailoring_note : null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase.from("closet_items").update(row).eq("id", id).eq("user_id", user.id);
    if (error) return { error: error.message };
    revalidatePath("/closet");
    revalidatePath(`/closet/${id}`);
    return { id };
  }

  const { data, error } = await supabase
    .from("closet_items")
    .insert({ ...row, user_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not save" };
  revalidatePath("/closet");
  return { id: data.id as string };
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
    await supabase.storage.from(CLOSET_BUCKET).remove([item.image_path]);
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
  if (!basic) return { error: "Unknown basic" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };

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
      if (error) return { error: error.message };
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
