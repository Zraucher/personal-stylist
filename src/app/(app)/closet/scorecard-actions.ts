"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CLOSET_BUCKET } from "@/lib/closet/images";

type Result = { error?: string };

/**
 * Agree or disagree with a verdict. One answer per scorecard: answering again replaces the old one.
 * Disagreements are the training signal for the vibe layer, so the optional note matters.
 */
export async function recordAgreement(scorecardId: string, itemId: string, agree: boolean, note?: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };

  const { data: card } = await supabase.from("scorecards").select("id, item_id").eq("id", scorecardId).eq("user_id", user.id).maybeSingle();
  if (!card || card.item_id !== itemId) return { error: "Scorecard not found" };

  await supabase.from("feedback").delete().eq("user_id", user.id).eq("scorecard_id", scorecardId).in("type", ["agree", "disagree"]);
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    target: "item",
    target_id: itemId,
    type: agree ? "agree" : "disagree",
    note: note?.trim() ? note.trim().slice(0, 600) : null,
    scorecard_id: scorecardId,
  });
  if (error) return { error: error.message };

  revalidatePath("/closet/review");
  revalidatePath(`/closet/${itemId}`);
  return {};
}

/**
 * Save a piece as a proven look (positive) or a known failure (negative).
 * Both feed the vibe check as examples. The photo is copied so removing the item later keeps the benchmark.
 */
export async function markBenchmark(itemId: string, polarity: "positive" | "negative", why: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Signed out" };

  const reason = why.trim();
  if (reason.length < 3) return { error: "Say in a few words why it works or why it failed." };

  const { data: item } = await supabase.from("closet_items").select("id, name, image_path").eq("id", itemId).eq("user_id", user.id).maybeSingle();
  if (!item) return { error: "Item not found" };

  let imagePath: string | null = null;
  if (item.image_path) {
    const ext = (item.image_path as string).split(".").pop() ?? "jpg";
    const target = `${user.id}/benchmarks/${crypto.randomUUID()}.${ext}`;
    const { error: copyError } = await supabase.storage.from(CLOSET_BUCKET).copy(item.image_path as string, target);
    if (!copyError) imagePath = target;
  }

  const { error } = await supabase.from("benchmarks").insert({
    user_id: user.id,
    label: (item.name as string | null) ?? "Untitled piece",
    image_path: imagePath,
    why_it_works: reason.slice(0, 600),
    polarity,
  });
  if (error) return { error: error.message };

  await supabase.from("feedback").insert({
    user_id: user.id,
    target: "item",
    target_id: itemId,
    type: polarity === "positive" ? "benchmark" : "failure",
    note: reason.slice(0, 600),
  });

  revalidatePath(`/closet/${itemId}`);
  return {};
}
