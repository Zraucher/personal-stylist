import Link from "next/link";
import Wordmark from "@/components/Wordmark";

const link = "tap inline-flex items-center py-1.5 text-stone-600 transition-colors duration-200 ease-soft hover:text-stone-900";
const heading = "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500";

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-line bg-ground">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-xs space-y-3">
            <Wordmark size={22} />
            <p className="text-sm leading-relaxed text-stone-600">A personal stylist that checks every outfit against your colors and your closet.</p>
          </div>
          <nav aria-label="Product" className="space-y-2 text-sm">
            <p className={heading}>Product</p>
            <ul>
              <li><a href="#how" className={link}>How it works</a></li>
              <li><a href="#features" className={link}>Features</a></li>
              <li><a href="#pricing" className={link}>Pricing</a></li>
              <li><a href="#faq" className={link}>FAQ</a></li>
            </ul>
          </nav>
          <nav aria-label="Account" className="space-y-2 text-sm">
            <p className={heading}>Account</p>
            <ul>
              <li>
                {signedIn ? (
                  <Link href="/today" className={link}>Open the app</Link>
                ) : (
                  <Link href="/login" className={link}>Sign in</Link>
                )}
              </li>
              <li><Link href="/help" className={link}>Help</Link></li>
              <li><Link href="/privacy" className={link}>Privacy</Link></li>
            </ul>
          </nav>
        </div>
        <p className="mt-12 border-t border-line pt-6 text-xs text-stone-500">© 2026 valette</p>
      </div>
    </footer>
  );
}
