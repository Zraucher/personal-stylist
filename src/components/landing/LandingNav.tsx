import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ButtonLink } from "@/components/ui";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Sticky top bar. Its button is secondary on purpose: the hero's call to action is the one green
 * action in the first view. On phones only the wordmark and one button show.
 */
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 bg-ground/80 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_var(--color-line)] backdrop-blur-md">
      <a
        href="#main"
        className="sr-only rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-30"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="valette home" className="tap inline-flex items-center rounded-full">
          <Wordmark size={24} />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <ul className="mr-3 hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="inline-flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-stone-600 transition-colors duration-200 ease-soft hover:bg-stone-900/[0.06] hover:text-stone-900"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          {signedIn ? (
            <ButtonLink href="/today" variant="secondary" size="sm">
              Open the app
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="quiet" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="#join" variant="secondary" size="sm" className="hidden sm:inline-flex">
                Get an invite
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
