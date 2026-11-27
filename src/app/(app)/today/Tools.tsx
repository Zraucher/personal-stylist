import Link from "next/link";
import type { ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, Thumb, cx } from "@/components/ui";
import { loadStyleContext } from "@/lib/profile/context";
import { loadCloset } from "@/lib/today/recommend";
import { findGaps, gapLabel } from "@/lib/gaps/unlock";

/** The arrow in its own small disc, flush to the tile's corner. */
function Arrow() {
  return (
    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-ground text-stone-700 ring-1 ring-line">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </span>
  );
}

/** One entry point on the Today hub: the whole tile is the link. */
export function Tile({ href, title, meta, className, children }: { href: string; title: string; meta: ReactNode; className?: string; children?: ReactNode }) {
  return (
    <Card as={Link} href={href} pad="none" className={cx("flex min-h-[8.5rem] flex-col gap-3 p-4 hover:ring-line-strong", className)}>
      {children}
      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-display text-lg font-bold leading-snug">{title}</p>
          <p className="text-[13px] leading-snug text-stone-600">{meta}</p>
        </div>
        <Arrow />
      </div>
    </Card>
  );
}

type Photo = { id: string; name: string | null; src: string | null; category: string | null; subcategory: string | null };
// No photos yet: the four shapes an outfit needs, drawn as silhouettes.
const SHAPES: Photo[] = [
  { id: "top", name: null, src: null, category: "top", subcategory: "tee" },
  { id: "bottom", name: null, src: null, category: "bottom", subcategory: "jeans" },
  { id: "shoes", name: null, src: null, category: "shoes", subcategory: "sneakers" },
  { id: "layer", name: null, src: null, category: "layer", subcategory: "jacket" },
];

/** The big tile: the newest closet photos, set in an inset tray. */
export function ClosetTile({ size, photos }: { size: number; photos: Photo[] }) {
  const shown = photos.length >= 4 ? photos.slice(0, 4) : [...photos, ...SHAPES.slice(photos.length)];
  return (
    <Tile
      href="/closet"
      title="Closet"
      meta={size ? `${size} ${size === 1 ? "piece" : "pieces"} · add, tag and score them` : "Add your first pieces"}
      className="col-span-2 sm:row-span-2"
    >
      <div className="grid grid-cols-4 gap-1.5 rounded-[18px] bg-inset p-1.5 sm:grid-cols-2">
        {shown.map((p) => (
          <Thumb key={p.id} src={p.src} alt="" item={{ category: p.category, subcategory: p.subcategory }} />
        ))}
      </div>
    </Tile>
  );
}

// Same bar as the Closet gaps page: only a piece that adds 3 or more outfits is worth a line.
const MIN_ADDED = 3;

/** Streams in after the page: counting outfits across typical days is the heaviest thing on Today. */
export async function GapsTile({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [ctx, closet] = await Promise.all([loadStyleContext(supabase, userId), loadCloset(supabase, userId)]);
  const top = findGaps(closet, ctx.presentation, ctx.scoreColor, ctx.scoreStyle, { top: 1 }).gaps[0];
  const worth = top && top.added >= MIN_ADDED;
  return <Tile href="/gaps" title="Closet gaps" meta={worth ? `${gapLabel(top)} adds ${top.added} outfits` : "No big gaps right now"} />;
}

export function GapsTileFallback() {
  return <Tile href="/gaps" title="Closet gaps" meta="The one piece that adds the most outfits" />;
}
