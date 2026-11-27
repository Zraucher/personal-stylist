import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";

export type WeekDay = { date: string; state: "worn" | "planned" | "open" };
export type NextTrip = { id: string; name: string | null; destination: string; start_date: string; end_date: string };

const fmt = (date: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(new Date(`${date}T12:00:00Z`));
const MARK = { worn: "✓", planned: "●", open: "–" } as const;
const SAY = { worn: "worn", planned: "planned", open: "nothing planned" } as const;

/** The next seven days at a glance (planned outfits per day), and the next trip. */
export function WeekStrip({ days, trip }: { days: WeekDay[]; trip: NextTrip | null }) {
  const planned = days.filter((d) => d.state !== "open").length;
  const open = days.length - planned;
  return (
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
  );
}
