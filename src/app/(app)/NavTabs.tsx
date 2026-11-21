"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export const NAV = [
  { href: "/today", label: "Today", match: ["/today", "/opinions"] },
  { href: "/plan", label: "Plan", match: ["/plan"] },
  { href: "/closet", label: "Closet", match: ["/closet", "/gaps", "/outfits"] },
  { href: "/ask", label: "Ask", match: ["/ask"] },
  { href: "/hauls", label: "Shop", match: ["/hauls", "/wishlist"] },
  { href: "/profile", label: "Profile", match: ["/profile"] },
];

/** 2px rounded line icons for the tab bar (sun, calendar, hanger, bubble, bag, person). */
const ICONS: Record<string, ReactNode> = {
  "/today": (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  "/plan": (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  "/closet": (
    <>
      <path d="M10 6a2 2 0 1 1 3 1.73c-.6.35-1 .98-1 1.67V10" />
      <path d="M12 10 3.5 16.2a1 1 0 0 0 .6 1.8h15.8a1 1 0 0 0 .6-1.8Z" />
    </>
  ),
  "/ask": <path d="M20 12a8 8 0 0 1-11.6 7.14L4 20l.9-4.2A8 8 0 1 1 20 12Z" />,
  "/hauls": (
    <>
      <path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8Z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </>
  ),
  "/profile": (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

function useActive() {
  const path = usePathname() ?? "";
  return (match: string[]) => match.some((m) => path === m || path.startsWith(`${m}/`));
}

/** Inline links in the header on wider screens. */
export function TopNav() {
  const active = useActive();
  return (
    <>
      {NAV.map((n) => {
        const on = active(n.match);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={
              "rounded-full px-3 py-1.5 transition-colors duration-200 ease-soft " +
              (on ? "bg-stone-900/[0.06] font-semibold text-stone-900" : "text-stone-600 hover:text-stone-900")
            }
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}

/** Bottom tab bar on phones. */
export function BottomTabs() {
  const active = useActive();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 bg-ground/85 pb-[max(env(safe-area-inset-bottom),6px)] shadow-[0_-1px_0_var(--color-line)] backdrop-blur-xl backdrop-saturate-150 sm:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-6">
        {NAV.map((n) => {
          const on = active(n.match);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={"flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium " + (on ? "text-stone-900" : "text-stone-500")}
            >
              <span
                className={
                  "grid h-7 w-12 place-items-center rounded-full transition-colors duration-200 ease-soft " +
                  (on ? "bg-stone-900/[0.08] text-stone-900" : "text-stone-500")
                }
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {ICONS[n.href]}
                </svg>
              </span>
              <span className={on ? "font-semibold" : undefined}>{n.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
