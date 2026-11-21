import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type CardVariant = "surface" | "active" | "warm" | "inset";

const VARIANT: Record<CardVariant, string> = {
  surface: "bg-card ring-1 ring-line",
  active: "bg-raised ring-1 ring-line shadow-active",
  warm: "bg-blush/60",
  inset: "bg-inset",
};
const PAD = { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-6" } as const;

/** Standard surface. Only one `active` card per screen (the chosen look, today's plan). */
export function Card<T extends ElementType = "div">({
  as,
  variant = "surface",
  pad = "md",
  className,
  children,
  ...rest
}: { as?: T; variant?: CardVariant; pad?: keyof typeof PAD; className?: string; children?: ReactNode } & Omit<ComponentProps<T>, "as" | "className" | "children">) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cx("rounded-card transition-shadow duration-300 ease-soft", VARIANT[variant], PAD[pad], className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Grouped list: a card with hairline dividers between rows. */
export function ListCard({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cx("divide-y divide-line rounded-card bg-card px-4 ring-1 ring-line", className)}>{children}</ul>;
}

/** One row of a ListCard, optionally a link with a chevron. */
export function ListRow({ href, title, meta, leading, trailing }: { href?: string; title: ReactNode; meta?: ReactNode; leading?: ReactNode; trailing?: ReactNode }) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{title}</p>
        {meta && <p className="truncate text-[13px] text-stone-500">{meta}</p>}
      </div>
      {trailing}
      {href && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-stone-500">
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="-mx-4 flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-200 ease-soft hover:bg-inset/60 active:bg-inset">
          {body}
        </Link>
      ) : (
        <div className="flex min-h-14 items-center gap-3 py-3">{body}</div>
      )}
    </li>
  );
}

/** A number with a label, left-aligned. */
export function StatTile({ value, label, className }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-card bg-card px-4 py-4 ring-1 ring-line", className)}>
      <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] text-stone-500">{label}</p>
    </div>
  );
}
