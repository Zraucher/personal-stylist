import type { ReactNode } from "react";
import { cx } from "@/components/ui";

// Shared building blocks for the landing page sections. The landing page uses a wider type
// scale than the app and alternating grounds (Linen, card white, Night, Blush), nothing else new.

type Tone = "ground" | "card" | "night" | "blush";

const TONE: Record<Tone, string> = {
  ground: "bg-ground",
  card: "bg-card border-y border-line",
  // Ink and fixed Linen, not the stone scale (which inverts). Raised in dark mode so the band still reads on the Night page.
  night: "bg-ink text-[#fbf7f2] dark:bg-raised",
  blush: "bg-blush",
};

const PAD = {
  lg: "py-24 sm:py-32",
  sm: "py-10 sm:py-12",
} as const;

/** One landing section: a full-bleed ground with a centred column. */
export function Section({
  id,
  tone = "ground",
  pad = "lg",
  labelledBy,
  narrow = false,
  children,
}: {
  id?: string;
  tone?: Tone;
  pad?: keyof typeof PAD;
  labelledBy?: string;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx("scroll-mt-16", TONE[tone])}>
      <div className={cx("mx-auto px-4 sm:px-6", narrow ? "max-w-3xl" : "max-w-6xl", PAD[pad])}>{children}</div>
    </section>
  );
}

/** Section title size on the landing page (the app's section titles stay smaller). */
export const DISPLAY_H2 = "text-balance font-display text-[36px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[48px]";

/** Small pill label above a heading. */
export function EyebrowPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", className ?? "text-stone-600 ring-1 ring-inset ring-line-strong")}>
      {children}
    </p>
  );
}

/** Eyebrow, h2 and a one-line lede. */
export function SectionIntro({ id, eyebrow, title, lede, center = false }: { id: string; eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; center?: boolean }) {
  return (
    <div className={cx("max-w-2xl space-y-4", center && "mx-auto text-center")}>
      {eyebrow && <EyebrowPill>{eyebrow}</EyebrowPill>}
      <h2 id={id} className={DISPLAY_H2}>
        {title}
      </h2>
      {lede && <p className="text-pretty text-lg leading-relaxed text-stone-600">{lede}</p>}
    </div>
  );
}

/**
 * The frame every product fragment sits in: an inset tray with a card inside, concentric corners.
 * Fragments are illustrations, so they are hidden from screen readers; the copy beside them says the same thing.
 */
export function Bezel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("rounded-[26px] bg-inset p-1.5 ring-1 ring-line", className)}>
      <div className="h-full rounded-card bg-card p-4 ring-1 ring-line sm:p-5">{children}</div>
    </div>
  );
}

/** A Night ring check for lists of what you get. Green stays reserved for "works on you". */
export function RingTick({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-[1.5px] ring-current", className)}>
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
