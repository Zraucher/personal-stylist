import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import type { ClosetItem } from "@/lib/closet/taxonomy";
import { ButtonLink, Card, EmptyState, PageHeader, Thumb } from "@/components/ui";
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
    <div className="space-y-6">
      <PageHeader
        title="Review"
        back={{ href: "/closet", label: "Closet" }}
        subtitle={
          <>
            {reviewed} reviewed, {agreed} agreed
            {reviewed > 0 && ` (${Math.round((agreed / reviewed) * 100)}%)`}. Goal: agree with 8 of {GOAL}.
          </>
        }
      />

      <div
        role="progressbar"
        aria-label="Review progress"
        aria-valuemin={0}
        aria-valuemax={GOAL}
        aria-valuenow={Math.min(GOAL, reviewed)}
        className="h-1.5 overflow-hidden rounded-full bg-stone-200"
      >
        <div className="h-full rounded-full bg-stone-900 transition-[width] duration-300 ease-soft" style={{ width: `${Math.min(100, (reviewed / GOAL) * 100)}%` }} />
      </div>

      {next ? (
        <>
          <Card variant="active" pad="sm" className="space-y-3">
            <Thumb src={url} alt={next.name ?? ""} item={next} size="fill" className="mx-auto max-w-xs" />
            <div className="flex items-center justify-between gap-3 pl-1">
              <p className="min-w-0 truncate font-display text-lg font-bold leading-snug">{next.name ?? "Untitled"}</p>
              <ButtonLink href={skipHref} variant="quiet" size="sm">
                Skip
              </ButtonLink>
            </div>
          </Card>
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
        <EmptyState
          title={reviewed >= GOAL ? "review goal reached" : "nothing left with a photo"}
          body={
            <>
              {reviewed >= GOAL
                ? `You agreed with ${agreed} of ${reviewed}. Disagreements are saved as feedback for the next tuning pass.`
                : "Photograph more pieces to keep reviewing."}
              {noPhoto > 0 && ` ${noPhoto} ${noPhoto === 1 ? "piece has" : "pieces have"} no photo yet.`}
            </>
          }
          action={
            <ButtonLink href="/closet/new" variant="primary">
              Add a piece
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}
