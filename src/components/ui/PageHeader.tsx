import Link from "next/link";
import type { ReactNode } from "react";

/** Every app page starts with this: optional back link and eyebrow, the title, a subtitle and actions. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-1">
      {back && (
        <Link href={back.href} className="tap -ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 text-sm font-medium text-stone-500 transition-colors duration-200 ease-soft hover:text-stone-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{eyebrow}</p>}
      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-balance font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[32px]">{title}</h1>
        {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-1">{actions}</div>}
      </div>
      {subtitle && <p className="max-w-prose text-pretty text-[15px] text-stone-500">{subtitle}</p>}
    </header>
  );
}

/** Section heading inside a page. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-bold leading-tight">{children}</h2>
      {action}
    </div>
  );
}

/** Small uppercase label above a group. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={"text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500 " + className}>{children}</p>;
}
