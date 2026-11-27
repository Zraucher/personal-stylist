import type { ReactNode } from "react";
import type { RecommendationView } from "@/lib/today/recommend";
import type { WeatherSummary } from "@/lib/today/weather";
import type { AttentionItem } from "@/lib/today/attention";
import TodayClient from "./TodayClient";
import PlannedToday from "./PlannedToday";
import { ClosetTile, Tile } from "./Tools";
import DailyHero, { DailyHeroEmpty } from "./DailyHero";
import { WeekStrip, type NextTrip, type WeekDay } from "./Week";
import { type StripItem, ButtonLink, Eyebrow, EmptyState, ListCard, ListRow, PageHeader, SectionTitle, Thumb, WeatherLine } from "@/components/ui";

type PlannedItem = { id: string; name: string; url: string | null; hex: string | null; category: string | null; subcategory: string | null; colors: Array<{ name: string; hex?: string }> };
type Photo = { id: string; name: string | null; src: string | null; category: string | null; subcategory: string | null };

/** Numbered editorial section: a small index, the title, then the blocks. */
function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      <div className="space-y-1">
        <Eyebrow className="tabular-nums">{n}</Eyebrow>
        <SectionTitle>{title}</SectionTitle>
      </div>
      {children}
    </section>
  );
}

/** "2026-11-26" -> "Thursday, November 26" (read as a calendar date so it never shifts a day). */
function longDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

/** The Today hub: what to wear now, what's waiting on the person, and a way into every tool. Data comes from page.tsx. */
export default function TodayView(p: {
  today: string;
  lead: string;
  planWeather: WeatherSummary | null;
  planned: { name: string; items: PlannedItem[]; worn: boolean; active: boolean } | null;
  fresh: RecommendationView | null;
  closetSize: number;
  attention: AttentionItem[];
  photos: Photo[];
  daysPlanned: number;
  watching: number;
  season: string | null;
  gaps: ReactNode;
  daily: { name: string; reason: string; items: StripItem[]; planned: boolean } | null;
  week: WeekDay[];
  trip: NextTrip | null;
}) {
  const w = p.planWeather;
  // A closet too thin for any outfit: the hero's empty state is the way forward, so the picker stays out.
  const thin = !p.daily && !p.planned && !p.fresh && p.closetSize < 8;
  const n = (i: number) => String(thin ? i - 1 : i).padStart(2, "0");
  return (
    <div className="space-y-10 sm:space-y-12">
      <PageHeader eyebrow={longDate(p.today)} title="Today" subtitle={p.lead} />

      {p.daily ? (
        <DailyHero
          today={p.today}
          name={p.daily.name}
          reason={p.daily.reason}
          items={p.daily.items}
          planned={p.daily.planned}
          locked={!!p.planned?.worn}
          active={p.daily.planned ? !!p.planned?.active : !p.planned && !p.fresh?.chosenOutfitId}
        />
      ) : (
        <DailyHeroEmpty closetSize={p.closetSize} />
      )}

      {!thin && (
        <Section n={n(1)} title="What to wear">
          {w?.source === "forecast" && <WeatherLine high={w.feelsMax} place={w.place} meta={[`low ${w.feelsMin}°`, `rain ${w.rainMax}%`, `UV ${w.uvMax}`]} />}
          {/* When today's plan is the outfit of the day, the hero above already shows it. */}
          {p.planned && !p.daily?.planned && <PlannedToday date={p.today} name={p.planned.name} items={p.planned.items} worn={p.planned.worn} active={p.planned.active} />}
          <TodayClient initial={p.fresh} closetSize={p.closetSize} planned={!!p.planned || !!p.daily} />
        </Section>
      )}

      <Section n={n(2)} title="This week">
        <WeekStrip days={p.week} trip={p.trip} />
      </Section>

      <Section n={n(3)} title="Waiting on you">
        {p.attention.length ? (
          <ListCard>
            {p.attention.map((a) => (
              <ListRow
                key={a.id}
                href={a.href}
                title={a.title}
                meta={a.meta}
                leading={
                  a.thumb ? (
                    <Thumb size="xs" src={a.thumb.src} product={a.thumb.product} alt="" item={{ category: a.thumb.category, subcategory: a.thumb.subcategory }} />
                  ) : (
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-inset font-display text-[15px] font-extrabold tabular-nums text-stone-700">
                      {a.mark}
                    </span>
                  )
                }
              />
            ))}
          </ListCard>
        ) : (
          <EmptyState
            title="you're all caught up"
            body="Nothing's waiting on you. Save a product you're eyeing and we'll watch its price."
            action={
              <ButtonLink href="/save" variant="secondary" size="sm">
                Save a product
              </ButtonLink>
            }
          />
        )}
      </Section>

      <Section n={n(4)} title="Your tools">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <ClosetTile size={p.closetSize} photos={p.photos} />
          <Tile href="/plan" title="Plan" meta={`${p.daysPlanned} of the next 7 days planned`} />
          <Tile href="/ask" title="Ask" meta="Describe your day, get a look" />
          <Tile href="/outfits" title="Outfits" meta="Build and save looks" />
          {p.gaps}
          <Tile href="/hauls" title="Shop" meta="Check products before you buy" />
          <Tile href="/wishlist" title="Wishlist" meta={p.watching ? `${p.watching} on price watch` : "Pieces you want, products you saved"} />
          <Tile href="/opinions" title="Second opinions" meta="Ask a friend about a look" />
          <Tile href="/profile/palette" title="Your colors" meta={p.season ?? "Find the colors that work on you"} />
        </div>
      </Section>
    </div>
  );
}
