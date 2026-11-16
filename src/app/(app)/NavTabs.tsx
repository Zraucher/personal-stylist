"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/today", label: "Today", match: ["/today"] },
  { href: "/closet", label: "Closet", match: ["/closet", "/gaps"] },
  { href: "/outfits", label: "Outfits", match: ["/outfits"] },
  { href: "/ask", label: "Ask", match: ["/ask"] },
  { href: "/hauls", label: "Shop", match: ["/hauls", "/wishlist"] },
  { href: "/profile", label: "Profile", match: ["/profile"] },
];

function useActive() {
  const path = usePathname() ?? "";
  return (match: string[]) => match.some((m) => path === m || path.startsWith(`${m}/`));
}

/** Inline links in the header on wider screens. */
export function TopNav() {
  const active = useActive();
  return (
    <>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.match) ? "page" : undefined}
          className={"hidden sm:inline " + (active(n.match) ? "font-medium text-stone-900" : "text-stone-600 hover:text-stone-900")}
        >
          {n.label}
        </Link>
      ))}
    </>
  );
}

/** Bottom tab bar on phones. */
export function BottomTabs() {
  const active = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-stone-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden" aria-label="Main">
      <div className="grid grid-cols-6">
        {NAV.map((n) => {
          const on = active(n.match);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={"flex flex-col items-center gap-1 py-2.5 text-[11px] " + (on ? "font-semibold text-stone-900" : "text-stone-500")}
            >
              <span className={"h-1 w-6 rounded-full " + (on ? "bg-stone-900" : "bg-transparent")} />
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
