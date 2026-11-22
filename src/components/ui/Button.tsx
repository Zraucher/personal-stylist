import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-soft active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 text-sm tap",
  md: "min-h-11 px-5 text-[15px]",
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-emerald-700 text-on-accent hover:bg-emerald-800",
  secondary: "bg-transparent text-stone-900 ring-[1.5px] ring-inset ring-stone-900 hover:bg-stone-900/[0.06]",
  quiet: "text-stone-600 hover:bg-stone-900/[0.06] hover:text-stone-900",
  danger: "text-red-700 hover:bg-red-100",
};

/** Class string for anything that should look like a button (labels, summary elements). */
export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", block = false): string {
  return cx(BASE, SIZE[size], VARIANT[variant], block && "w-full");
}

type Own = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

/**
 * Pill button. One `primary` per screen. `type` is required so forms never submit by accident
 * (and never silently stop submitting).
 */
export function Button({ variant = "secondary", size = "md", block, className, type, ...rest }: ComponentProps<"button"> & Own & { type: "button" | "submit" | "reset" }) {
  return <button type={type} className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}

/** A link styled as a pill button. */
export function ButtonLink({ variant = "secondary", size = "md", block, className, ...rest }: ComponentProps<typeof Link> & Own) {
  return <Link className={cx(buttonClass(variant, size, block), className)} {...rest} />;
}
