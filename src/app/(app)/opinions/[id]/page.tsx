import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/closet/images";
import { tally } from "@/lib/opinions/tally";
import { siteOrigin, type OpinionSnapshot } from "@/lib/opinions/server";
import OpinionControls from "./OpinionControls";
import { stillOpen } from "@/lib/time";
import { Card, Chip, EmptyState, ListCard, PageHeader, SectionTitle, Thumb, buttonClass, type ChipTone } from "@/components/ui";

const WORD: Record<string, { glyph: string; label: string; tone: ChipTone }> = {
  works: { glyph: "✓", label: "works on you", tone: "works" },
  almost: { glyph: "◐", label: "almost", tone: "almost" },
  not: { glyph: "✕", label: "not for you", tone: "not" },
};

export const metadata = { title: "Votes · valette" };

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
  const bar = (n: number) => `${t.total ? (n / t.total) * 100 : 0}%`;

  return (
    <div className="space-y-6">
      <PageHeader back={{ href: "/opinions", label: "Second opinions" }} title={s.title} subtitle={o.question ? `“${o.question}”` : undefined} />

      <Card as="section" aria-label="Votes so far" className="space-y-3">
        <p className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em]">{t.summary}</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-inset" aria-hidden="true">
          <span className="bg-emerald-700 transition-[width] duration-300 ease-soft" style={{ width: bar(t.works) }} />
          <span className="bg-amber-500 transition-[width] duration-300 ease-soft" style={{ width: bar(t.almost) }} />
          <span className="bg-red-700 transition-[width] duration-300 ease-soft" style={{ width: bar(t.not) }} />
        </div>
        <p className="text-sm text-stone-500 tabular-nums">
          {t.works} works · {t.almost} almost · {t.not} not for you{open ? ` · open until ${new Date(o.closes_at as string).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : " · closed"}
        </p>
        <OpinionControls id={id} url={url} open={open} />
      </Card>

      {(s.items?.length ?? 0) > 0 && (
        <ul className="flex gap-2 overflow-x-auto">
          {s.items!.map((it, i) => (
            <li key={i}>
              <Thumb src={it.image_path ? urls[it.image_path] : null} alt={it.name} size="md" item={{ subcategory: it.subcategory, colors: it.colors }} />
            </li>
          ))}
        </ul>
      )}
      {o.kind === "find" && s.url && (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
          Open the product page
        </a>
      )}

      <section className="space-y-3">
        <SectionTitle>What they said</SectionTitle>
        {!votes?.length ? (
          <EmptyState compact title="No votes yet. Send the link to a friend or two." />
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
