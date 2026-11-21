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
    <nav aria-label="Closet" className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm">
      {LINKS.map((l) => {
        const on = l.on(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={"shrink-0 rounded-full px-3.5 py-1.5 font-semibold " + (on ? "bg-stone-900 text-stone-50" : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
