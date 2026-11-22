"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";
import { CATEGORIES } from "@/lib/closet/taxonomy";

const SIGNED_OUT = "You're signed out. Sign in again to save this.";
const GONE = "That product isn't here anymore. Refresh the page to see the rest of the haul.";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createHaul(formData: FormData): Promise<void> {
  const { supabase, user } = await me();
  if (!user) redirect("/login");
  const retailer = String(formData.get("retailer") ?? "").trim().slice(0, 80) || null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 300) || null;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("hauls").insert({ user_id: user.id, retailer, notes, date: today, status: "considering" }).select("id").single();
  if (error || !data) throw new Error("Couldn't start the haul. Try again.");
  redirect(`/hauls/${data.id}`);
}

const Status = z.enum(["considering", "purchased", "returned", "passed"]);

/** Mark a reviewed product. Bought copies it into the closet with its photo and tags. */
export async function setHaulItemStatus(itemId: string, status: z.infer<typeof Status>): Promise<{ ok: true; closetId?: string } | { ok: false; error: string }> {
  if (!Status.safeParse(status).success) return { ok: false, error: "Couldn't save that. Try again." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: SIGNED_OUT };
  const { data: item } = await supabase.from("haul_items").select("*").eq("id", itemId).eq("user_id", user.id).maybeSingle();
  if (!item) return { ok: false, error: GONE };

  let closetId: string | undefined = (item.closet_item_id as string | null) ?? undefined;
  if (status === "purchased" && !closetId) {
    let photo: string | null = null;
    if (item.image_path) {
      const dest = `${user.id}/${crypto.randomUUID()}.${String(item.image_path).split(".").pop() || "jpg"}`;
      const { error: cpErr } = await supabase.storage.from(CLOSET_BUCKET).copy(item.image_path as string, dest);
      if (!cpErr) photo = dest;
    }
    const category = (CATEGORIES as readonly string[]).includes(item.category as string) ? (item.category as string) : "top";
    const { data: created, error } = await supabase
      .from("closet_items")
      .insert({
        user_id: user.id,
        name: String(item.name ?? "New piece").slice(0, 120),
        category,
        subcategory: item.subcategory ?? null,
        colors: Array.isArray(item.verified_colors) ? item.verified_colors : [],
        pattern: item.pattern ?? null,
        material: item.material ?? null,
        construction: item.construction ?? [],
        brand: item.brand ?? null,
        price: item.price ?? null,
        image_path: photo,
        status: "available",
      })
      .select("id")
      .single();
    if (error || !created) return { ok: false, error: "Couldn't add it to your closet. Try again." };
    closetId = created.id as string;
  }

  const { error } = await supabase
    .from("haul_items")
    .update({ status, ...(closetId ? { closet_item_id: closetId } : {}) })
    .eq("id", itemId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath(`/hauls/${item.haul_id}`);
  revalidatePath("/closet");
  return { ok: true, closetId };
}

export async function deleteHaulItem(itemId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: SIGNED_OUT };
  const { data: item } = await supabase.from("haul_items").select("haul_id, image_path").eq("id", itemId).eq("user_id", user.id).maybeSingle();
  if (!item) return { ok: false, error: GONE };
  const { error } = await supabase.from("haul_items").delete().eq("id", itemId).eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't remove that product. Try again." };
  if (item.image_path) await supabase.storage.from(CLOSET_BUCKET).remove([item.image_path as string]);
  revalidatePath(`/hauls/${item.haul_id}`);
  return { ok: true };
}

export async function deleteHaul(haulId: string): Promise<void> {
  const { supabase, user } = await me();
  if (!user) redirect("/login");
  const { data: items } = await supabase.from("haul_items").select("image_path").eq("haul_id", haulId).eq("user_id", user.id);
  const paths = (items ?? []).map((i) => i.image_path as string | null).filter((p): p is string => !!p);
  await supabase.from("hauls").delete().eq("id", haulId).eq("user_id", user.id);
  if (paths.length) await supabase.storage.from(CLOSET_BUCKET).remove(paths);
  revalidatePath("/hauls");
  redirect("/hauls");
}
