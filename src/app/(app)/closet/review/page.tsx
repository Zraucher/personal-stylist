import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import type { ClosetItem } from "@/lib/closet/taxonomy";
import ScorecardPanel, { type ScorecardRow } from "../ScorecardPanel";

const GOAL = 10;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ skip?: string }> }) {
  const { skip } = await searchParams;
  const skipped = new Set((skip ?? "").split(",").filter(Boolean));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: itemRows }, { data: feedbackRows }] = await Promise.all([
    supabase.from("closet_items").select("*").eq("user_id", user!.id).neq("status", "gone").order("created_at", { ascending: true }),
    supabase
      .from("feedback")
      .select("target_id, type, created_at")
      .eq("user_id", user!.id)
      .eq("target", "item")
      .in("type", ["agree", "disagree"])
      .order("created_at", { ascending: true }),
  ]);

  const items = (itemRows ?? []) as ClosetItem[];

  // Latest answer per item wins.
  const answers = new Map<string, "agree" | "disagree">();
  for (const f of feedbackRows ?? []) answers.set(f.target_id as string, f.type as "agree" | "disagree");
  const reviewed = answers.size;
  const agreed = Array.from(answers.values()).filter((a) => a === "agree").length;

  const withPhoto = items.filter((i) => i.image_path);
  const noPhoto = items.length - withPhoto.length;
  const next = withPhoto.find((i) => !answers.has(i.id) && !skipped.has(i.id));

  let scorecard: ScorecardRow | null = null;
  let url: string | undefined;
  if (next) {
    const [{ data: latest }, urls] = await Promise.all([
      supabase.from("scorecards").select("*").eq("item_id", next.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      signedImageUrls(supabase, [next.image_path]),
    ]);
    scorecard = (latest as ScorecardRow | null) ?? null;
    // Older cards that stalled on "no color recorded" are scored again, now that the
    // color is read from the photo.
    if (scorecard && scorecard.headline?.includes("no color recorded")) scorecard = null;
    url = next.image_path ? urls[next.image_path] : undefined;
  }

  const skipHref = next ? `/closet/review?skip=${[...skipped, next.id].join(",")}` : "/closet/review";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Review</h1>
          <p className="text-sm text-stone-500">
            {reviewed} reviewed, {agreed} agreed
            {reviewed > 0 && ` (${Math.round((agreed / reviewed) * 100)}%)`}. Goal: agree with 8 of {GOAL}.
          </p>
        </div>
        <Link href="/closet" className="text-sm text-stone-600 hover:text-stone-900">
          Back to closet
        </Link>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full bg-stone-900 transition-all" style={{ width: `${Math.min(100, (reviewed / GOAL) * 100)}%` }} />
      </div>

      {next ? (
        <>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="aspect-[4/3] bg-stone-100">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={next.name ?? ""} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-400">Photo unavailable</div>
              )}
            </div>
            <div className="flex items-center justify-between p-3">
              <p className="font-medium">{next.name ?? "Untitled"}</p>
              <Link href={skipHref} className="text-sm text-stone-500 hover:text-stone-900">
                Skip
              </Link>
            </div>
          </div>
          <ScorecardPanel
            key={next.id}
            itemId={next.id}
            hasImage
            initial={scorecard}
            initialAnswer={null}
            autoRun
            nextHref="/closet/review"
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
          <p className="font-medium">{reviewed >= GOAL ? "Review goal reached" : "Nothing left with a photo"}</p>
          <p className="mt-1 text-sm text-stone-600">
            {reviewed >= GOAL
              ? `You agreed with ${agreed} of ${reviewed}. Disagreements are saved as feedback for the next tuning pass.`
              : "Photograph more pieces to keep reviewing."}
            {noPhoto > 0 && ` ${noPhoto} ${noPhoto === 1 ? "piece has" : "pieces have"} no photo yet.`}
          </p>
          <Link href="/closet/new" className="mt-4 inline-block rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">
            Add a piece
          </Link>
        </div>
      )}
    </div>
  );
}
