"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/closet", label: "Pieces", on: (p: string) => p === "/closet" || (p.startsWith("/closet/") && !p.startsWith("/closet/insights")) },
  { href: "/outfits", label: "Outfits", on: (p: string) => p.startsWith("/outfits") },
  { href: "/gaps", label: "Gaps", on: (p: string) => p.startsWith("/gaps") },
  { href: "/closet/insights", label: "Insights", on: (p: string) => p.startsWith("/closet/insights") },
];

/** Pieces · Outfits · Gaps · Insights, shared by the closet pages. */
export default function ClosetSubnav() {
  const path = usePathname() ?? "";
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <nav aria-label="Closet" className="inline-flex rounded-full bg-inset p-1 text-sm ring-1 ring-line">
        {LINKS.map((l) => {
          const on = l.on(path);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={
                "tap inline-flex min-h-9 shrink-0 items-center rounded-full px-3.5 transition-[background-color,color] duration-200 ease-soft " +
                (on ? "bg-raised text-stone-900 shadow-active ring-1 ring-line font-semibold" : "font-medium text-stone-600 hover:text-stone-900")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
