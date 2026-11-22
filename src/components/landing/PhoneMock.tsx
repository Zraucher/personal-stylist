import { CheckTick, Chip, OutfitStrip, Thumb, VoteBar, WeatherLine, buttonClass } from "@/components/ui";
import { P } from "./mock";

/**
 * A believable Today screen inside a phone frame, built from the real kit. Two small cards float off
 * the frame on wide screens only (overlaps cause tap conflicts on phones). Decorative: the hero copy says it.
 */
export function PhoneMock() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[320px]">
      {/* Shop check, floating left */}
      <div className="absolute -left-24 bottom-10 z-10 hidden w-56 -rotate-3 rounded-card bg-card p-3 shadow-sheet ring-1 ring-line lg:block">
        <div className="flex items-center gap-3">
          <Thumb alt="Linen blazer" item={P.blazer} size="sm" product />
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-sm font-semibold">Linen blazer, sage</p>
            <Chip tone="works">
              <span aria-hidden="true">✓</span> works on you
            </Chip>
          </div>
        </div>
      </div>

      {/* Second opinions, floating right */}
      <div className="absolute -right-20 top-2 z-10 hidden w-48 rotate-2 space-y-2 rounded-card bg-card p-3 shadow-sheet ring-1 ring-line lg:block">
        <p className="text-sm font-semibold">4 friends voted</p>
        <VoteBar works={3} almost={1} not={0} />
        <p className="text-xs text-stone-500">3 works · 1 almost</p>
      </div>

      {/* The phone. Ink, not stone-900: the bezel must stay dark when dark mode inverts the stone scale. */}
      <div className="rounded-[44px] bg-ink p-2 shadow-sheet ring-1 ring-line-strong">
        <div className="overflow-hidden rounded-[36px] bg-ground text-stone-900">
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold tabular-nums">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-ink" />
            <span>84°</span>
          </div>

          <div className="space-y-4 px-4 pb-4 pt-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Saturday</p>
              <p className="font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]">today</p>
            </div>

            <WeatherLine high={84} place="Las Vegas" meta={["low 66°", "rain 0%", "UV 8"]} />

            <div className="space-y-3 rounded-card bg-raised p-3.5 shadow-active ring-1 ring-line">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[17px] font-bold leading-snug">Rooftop at 7</p>
                <Chip tone="works">
                  <span aria-hidden="true">✓</span> works
                </Chip>
              </div>
              <OutfitStrip items={[P.linenShirt, P.chinos, P.sneakers, P.belt]} link={false} />
              <p className="text-xs leading-snug text-stone-600">Light enough for 84° and sharp enough for the rooftop.</p>
              <div className="flex items-center gap-2">
                <Chip tone="neutral" size="md">
                  <CheckTick size={14} className="text-emerald-700" /> wore it
                </Chip>
                <span className={buttonClass("secondary", "sm")}>Try another</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-card bg-card p-3 ring-1 ring-line">
              <OutfitStrip items={[P.tee, P.jeans]} size="sm" link={false} className="shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold">Gallery morning</p>
                <Chip tone="almost">
                  <span aria-hidden="true">◐</span> almost
                </Chip>
              </div>
            </div>
          </div>

          <div className="mx-auto mb-2 h-1 w-28 rounded-full bg-stone-900/70" />
        </div>
      </div>
    </div>
  );
}
