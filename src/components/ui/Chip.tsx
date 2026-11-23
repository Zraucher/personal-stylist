import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type ChipTone = "neutral" | "outline" | "works" | "almost" | "not" | "info" | "warm" | "overlay";

const TONE: Record<ChipTone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  outline: "ring-1 ring-inset ring-line-strong text-stone-700",
  works: "bg-emerald-700 text-on-accent",
  almost: "bg-amber-500 text-ink",
  not: "bg-red-700 text-on-accent",
  info: "bg-sky-brand text-ink",
  warm: "bg-blush text-ink",
  overlay: "bg-ink/75 text-[#fbf7f2] backdrop-blur-sm",
};

/** Static label: verdicts, statuses, counts. Verdicts read "✓ works on you", "◐ almost", "✕ not for you". */
export function Chip({ tone = "neutral", size = "sm", className, children }: { tone?: ChipTone; size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full font-semibold leading-none", size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm", TONE[tone], className)}>
      {children}
    </span>
  );
}

/** A chip that links somewhere (nudges like "2 new votes"). 44 px touch area on phones. */
export function ChipLink({ tone = "warm", className, children, ...rest }: ComponentProps<typeof Link> & { tone?: ChipTone }) {
  return (
    <Link className={cx("tap inline-flex min-h-9 items-center gap-1 rounded-full px-3.5 text-sm font-semibold transition-opacity duration-200 ease-soft hover:opacity-85", TONE[tone], className)} {...rest}>
      {children}
    </Link>
  );
}

/** Toggle chip. Selected is a light tint with a Night outline, never green (green means "works on you"). */
export function ChipButton({ selected = false, className, ...rest }: Omit<ComponentProps<"button">, "type"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "tap inline-flex min-h-9 items-center justify-center gap-1 rounded-full px-3.5 text-sm font-medium ring-1 ring-inset transition-colors duration-200 ease-soft disabled:opacity-50",
        selected ? "bg-stone-200 text-stone-900 ring-stone-900" : "bg-card text-stone-700 ring-line-strong hover:ring-stone-400",
        className
      )}
      {...rest}
    />
  );
}

/** Wrap a set of ChipButtons so screen readers hear what they choose. */
export function ChipGroup({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className={cx("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
