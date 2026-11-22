import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { tally } from "@/lib/opinions/tally";
import { siteOrigin, type OpinionSnapshot } from "@/lib/opinions/server";
import OpinionControls from "./OpinionControls";
import { stillOpen } from "@/lib/time";
import { Card, Chip, EmptyState, ListCard, OutfitStrip, PageHeader, SectionTitle, VoteBar, buttonClass, type ChipTone, type StripItem } from "@/components/ui";

const WORD: Record<string, { glyph: string; label: string; tone: ChipTone }> = {
  works: { glyph: "✓", label: "works on you", tone: "works" },
  almost: { glyph: "◐", label: "almost", tone: "almost" },
  not: { glyph: "✕", label: "not for you", tone: "not" },
};

export const metadata = { title: "Second opinion · valette" };

export default async function OpinionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: o } = await supabase.from("second_opinions").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();
  const { data: votes } = await supabase.from("opinion_votes").select("id, voter_name, verdict, comment, created_at").eq("opinion_id", id).order("created_at", { ascending: false });
  await supabase.from("second_opinions").update({ seen_at: new Date().toISOString() }).eq("id", id);
  const s = o.snapshot as OpinionSnapshot;
  const t = tally(votes ?? []);
  const urls = await signedImageUrls(supabase, (s.items ?? []).map((i) => i.image_path));
  const url = `${siteOrigin(await headers())}/o/${o.token}`;
  const open = stillOpen(o.closes_at as string);
  // Snapshot pieces carry no closet id (the piece may be gone), so the strip doesn't link.
  const strip: StripItem[] =
    o.kind === "find"
      ? [{ id: "find", name: s.title, url: s.image_url ?? null, product: true }]
      : (s.items ?? []).map((it, i) => ({ id: String(i), name: it.name, url: it.image_path ? urls[it.image_path] ?? null : null, subcategory: it.subcategory, colors: it.colors }));

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/opinions", label: "Second opinions" }} title={s.title} subtitle={o.question ? `“${o.question}”` : undefined} />

      {strip.length > 0 && <OutfitStrip items={strip} size="lg" link={false} />}
      {o.kind === "find" && s.url && (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
          Open the product page
        </a>
      )}

      <Card as="section" aria-label="Votes so far" className="space-y-3">
        <p className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em]">{t.summary}</p>
        <VoteBar works={t.works} almost={t.almost} not={t.not} />
        <p className="text-sm text-stone-500 tabular-nums">
          {t.works} works · {t.almost} almost · {t.not} not for you{open ? ` · open until ${new Date(o.closes_at as string).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : " · closed"}
        </p>
        <OpinionControls id={id} url={url} open={open} />
      </Card>

      <section className="space-y-3">
        <SectionTitle>What they said</SectionTitle>
        {!votes?.length ? (
          <EmptyState title="no votes yet" body="Send the link to a friend or two. Votes show up here as they answer." />
        ) : (
          <ListCard>
            {votes.map((v) => {
              const word = WORD[v.verdict as string];
              return (
                <li key={v.id as string} className="space-y-1 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[15px] font-semibold">{(v.voter_name as string | null) ?? "A friend"}</p>
                    {word && (
                      <Chip tone={word.tone} className="shrink-0">
                        <span aria-hidden="true">{word.glyph}</span> {word.label}
                      </Chip>
                    )}
                  </div>
                  {v.comment && <p className="text-sm leading-relaxed text-stone-700">{v.comment as string}</p>}
                </li>
              );
            })}
          </ListCard>
        )}
      </section>
    </div>
  );
}
