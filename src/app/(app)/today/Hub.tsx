import Link from "next/link";
import { ButtonLink, Card, ListCard, ListRow, SectionTitle } from "@/components/ui";
import type { AttentionItem } from "@/lib/today/attention";

/** Things waiting on the person, each row a link that does the thing. */
export function NeedsYou({ items }: { items: AttentionItem[] }) {
  return (
    <ListCard>
      {items.map((it) => (
        <ListRow
          key={it.id}
          href={it.href}
          title={it.title}
          meta={it.meta}
          leading={
            <span aria-hidden="true" className="grid h-9 min-w-9 shrink-0 place-items-center rounded-full bg-blush px-2 font-display text-base font-extrabold tabular-nums text-ink">
              {it.count > 99 ? "99+" : it.count}
            </span>
          }
        />
      ))}
    </ListCard>
  );
}

type Day = { date: string; state: "worn" | "planned" | "open" };
type Trip = { id: string; name: string | null; destination: string; start_date: string; end_date: string };

const fmt = (date: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(new Date(`${date}T12:00:00Z`));
const MARK = { worn: "✓", planned: "●", open: "–" } as const;
const SAY = { worn: "worn", planned: "planned", open: "nothing planned" } as const;

/** The next seven days at a glance, and the next trip. */
export function WeekStrip({ days, trip }: { days: Day[]; trip: Trip | null }) {
  const planned = days.filter((d) => d.state !== "open").length;
  const open = days.length - planned;
  return (
    <section aria-labelledby="week-title" className="space-y-3">
      <SectionTitle>
        <span id="week-title">This week</span>
      </SectionTitle>
      <Card className="space-y-4">
        <ol className="grid grid-cols-7 gap-1" aria-label={`${planned} of ${days.length} days planned`}>
          {days.map((d, i) => (
            <li key={d.date} className={"flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-control " + (i === 0 ? "bg-stone-900/[0.06]" : "")}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">{i === 0 ? "Today" : fmt(d.date, { weekday: "short" })}</span>
              <span className="font-display text-lg font-bold leading-none tabular-nums">{fmt(d.date, { day: "numeric" })}</span>
              <span aria-hidden="true" className={"text-xs leading-none " + (d.state === "open" ? "text-stone-500" : "text-stone-900")}>
                {MARK[d.state]}
              </span>
              <span className="sr-only">
                {fmt(d.date, { weekday: "long", month: "long", day: "numeric" })}: {SAY[d.state]}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-stone-600">
          {open === 0 ? "Every day this week has an outfit." : planned === 0 ? "Nothing planned yet. We can lay out the week against the forecast." : `${planned} of 7 days planned. ${open} still open.`}
        </p>
        {trip && (
          <Link href={`/plan/trips/${trip.id}`} className="tap -mx-2 flex min-h-11 items-center justify-between gap-3 rounded-control px-2 text-sm transition-colors duration-200 ease-soft hover:bg-inset/60">
            <span className="min-w-0 truncate">
              <span className="font-semibold">{trip.name || `Trip to ${trip.destination}`}</span>
              <span className="text-stone-500">
                {" "}
                · {fmt(trip.start_date, { month: "short", day: "numeric" })} to {fmt(trip.end_date, { month: "short", day: "numeric" })}
              </span>
            </span>
            <span className="shrink-0 font-medium">Packing list</span>
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink href="/plan" variant={open > 0 ? "secondary" : "quiet"} size="sm">
            {open === 0 ? "See the week" : planned === 0 ? "Plan my week" : `Plan the ${open} open ${open === 1 ? "day" : "days"}`}
          </ButtonLink>
          {!trip && (
            <ButtonLink href="/plan/trips/new" variant="quiet" size="sm">
              Plan a trip
            </ButtonLink>
          )}
        </div>
      </Card>
    </section>
  );
}

type Tool = { href: string; title: string; meta: string };

/** Quick entry to every tool, with a live number where we have one. */
export function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <section aria-labelledby="tools-title" className="space-y-3">
      <SectionTitle>
        <span id="tools-title">Your tools</span>
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tools.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="flex h-full min-h-20 flex-col justify-between gap-1 rounded-card bg-card p-4 ring-1 ring-line transition-colors duration-200 ease-soft hover:bg-inset active:bg-inset"
            >
              <span className="font-display text-base font-bold leading-snug">{t.title}</span>
              <span className="text-[13px] leading-snug text-stone-500">{t.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
