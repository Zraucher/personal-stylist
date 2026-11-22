import type { ReactNode } from "react";
import { cx } from "./cx";

/** Nothing here yet: a warm panel with one lowercase line, one sentence and one action. */
export function EmptyState({ title, body, action, compact = false, className }: { title: ReactNode; body?: ReactNode; action?: ReactNode; compact?: boolean; className?: string }) {
  if (compact) {
    return <div className={cx("rounded-card bg-blush/50 px-4 py-3.5 text-sm text-stone-700 dark:bg-blush/70", className)}>{body ?? title}</div>;
  }
  return (
    <div className={cx("rounded-card bg-blush/50 px-5 py-8 text-center dark:bg-blush/70", className)}>
      <p className="font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-[42ch] text-sm leading-relaxed text-stone-700">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export type NoticeTone = "info" | "warn" | "error" | "success";
const TONE: Record<NoticeTone, string> = {
  info: "bg-sky-brand/70 text-stone-900",
  warn: "bg-amber-50 text-amber-900",
  error: "bg-red-100 text-red-900",
  success: "bg-emerald-100 text-emerald-900",
};

/** Inline message. Errors are announced (role=alert), others politely (role=status). */
export function Notice({ tone = "info", className, children }: { tone?: NoticeTone; className?: string; children: ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-control px-4 py-3 text-sm leading-relaxed", TONE[tone], className)}>
      {children}
    </div>
  );
}

/** Loading placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("rounded-card bg-stone-200/70 motion-safe:animate-pulse", className)} />;
}
