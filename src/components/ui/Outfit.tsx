import Link from "next/link";
import type { ReactNode } from "react";
import { Thumb } from "./Thumb";
import { cx } from "./cx";
import { Skeleton } from "./States";

export type StripItem = {
  id: string;
  name: string;
  url?: string | null;
  category?: string | null;
  subcategory?: string | null;
  colors?: Array<{ name: string; hex?: string }> | null;
  /** Retailer photo: sits in a white well instead of filling the frame. */
  product?: boolean;
};

/**
 * Every outfit in the app is shown with this strip, so a look reads the same on Today, Plan,
 * Trips, Second opinions and Outfits. `lg` is the lead view (pieces first on a card), `sm` a compact row.
 * Pieces link to the closet item unless `link` is false.
 */
export function OutfitStrip({ items, size = "lg", link = true, className }: { items: StripItem[]; size?: "sm" | "lg"; link?: boolean; className?: string }) {
  const shown = size === "lg" ? items.slice(0, 4) : items;
  const extra = items.length - shown.length;
  return (
    <ul className={cx(size === "lg" ? "grid grid-cols-4 gap-2" : "flex gap-1.5 overflow-x-auto", className)}>
      {shown.map((it, i) => {
        const thumb = (
          <Thumb
            src={it.url}
            alt={it.name}
            size={size === "lg" ? "fill" : "sm"}
            product={it.product}
            item={{ category: it.category, subcategory: it.subcategory, colors: it.colors }}
            badge={
              extra > 0 && i === shown.length - 1 ? (
                <span className="absolute inset-0 grid place-items-center bg-ink/55 font-display text-lg font-extrabold text-[#fbf7f2]">+{extra}</span>
              ) : undefined
            }
          />
        );
        return (
          <li key={it.id + i} className="min-w-0">
            {link && !it.product ? (
              <Link href={`/closet/${it.id}`} title={it.name} className="block rounded-thumb transition-opacity duration-200 ease-soft hover:opacity-90">
                {thumb}
              </Link>
            ) : (
              thumb
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Weather in one glance: the feels-like high large, the rest as small meta.
 * Pass already-formatted meta strings ("low 61°", "rain 40%", "UV 9").
 */
export function WeatherLine({ high, place, meta = [], note, className }: { high: number | null; place?: string | null; meta?: ReactNode[]; note?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      {high != null && (
        <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
          {high}°<span className="sr-only"> feels like</span>
        </p>
      )}
      <p className="text-[13px] text-stone-500 tabular-nums">
        {[place, ...meta].filter(Boolean).map((m, i) => (
          <span key={i}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {m}
          </span>
        ))}
      </p>
      {note && <p className="basis-full text-[13px] text-stone-500">{note}</p>}
    </div>
  );
}

/** Friends' votes as one bar: works, almost, not for you. Animates width on change. */
export function VoteBar({ works, almost, not, className }: { works: number; almost: number; not: number; className?: string }) {
  const total = works + almost + not;
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className={cx("flex h-3 gap-[2px] overflow-hidden rounded-full bg-inset", className)} aria-hidden="true">
      {works > 0 && <span className="rounded-full bg-emerald-700 transition-[width] duration-500 ease-soft" style={{ width: pct(works) }} />}
      {almost > 0 && <span className="rounded-full bg-amber-500 transition-[width] duration-500 ease-soft" style={{ width: pct(almost) }} />}
      {not > 0 && <span className="rounded-full bg-red-700 transition-[width] duration-500 ease-soft" style={{ width: pct(not) }} />}
    </div>
  );
}

/** Loading shape of an outfit card: title, four 4:5 pieces, a button row. */
export function OutfitCardSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 rounded-card bg-card p-4 ring-1 ring-line sm:p-5">
      <Skeleton className="h-5 w-40 rounded-full" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-thumb" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}

/** Loading shape of a garment grid. */
export function GridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[4/5] rounded-thumb" />
          <Skeleton className="h-3.5 w-3/4 rounded-full" />
        </div>
      ))}
    </div>
  );
}
