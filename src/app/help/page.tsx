import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Help · valette", description: "Answers about valette and the valette Chrome extension, and how to reach us." };

const EMAIL = "hello@myvalette.com";
const mail = <a className="font-semibold underline underline-offset-2" href={`mailto:${EMAIL}`}>{EMAIL}</a>;

const FAQ: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "How do I sign in?",
    a: <>valette is invite only for now. Enter your invited email on the <Link className="font-semibold underline underline-offset-2" href="/login">sign-in page</Link> and we email you a 6-digit code. No invite yet? Join the waitlist from that page.</>,
  },
  {
    q: "The Chrome extension says “Sign in to valette”",
    a: "The extension uses your valette sign-in from the same browser. Sign in at myvalette.com in that browser, then click the extension again on the product page.",
  },
  {
    q: "What does the extension do?",
    a: "On a product page, click the valette button and choose Shopping list or My closet (I bought it). It only reads the page you're on, and only when you click it. You can also right-click a product link for the same two choices.",
  },
  {
    q: "The extension couldn't read a product",
    a: "Some stores block our reader. Make sure the product page itself is open (not a search or category page) and try again. If it still fails, paste the link into valette instead, or email us the link and we'll take a look.",
  },
  {
    q: "How does “Should I buy it?” work?",
    a: "We read the product's reviews and price, then tell you if it's worth buying, whether to size up or down, and what we think of the price. It's style advice, so trust your own fit too.",
  },
  {
    q: "I'm not getting price alerts",
    a: "Price alerts arrive as notifications. Turn them on in Profile, under The app. On iPhone, add valette to your Home Screen first (Share, then Add to Home Screen); notifications only work there. We check prices once a day.",
  },
  {
    q: "How do I add something I bought online?",
    a: "Use the extension's My closet (I bought it) button on the product page, or go to Closet, Add a piece, and paste the product link under “Bought it online?”. We copy the store's photo and details.",
  },
  {
    q: "Can I take the background out of a photo?",
    a: "Yes. Open the piece in your closet and tap Remove the background under its photo. It works best on a plain background like a bed, floor or wall. Put the background back undoes it.",
  },
  {
    q: "How do I delete my account?",
    a: <>Email {mail} from your account&apos;s address and we&apos;ll remove everything within 30 days. You can delete single pieces and photos in the app at any time.</>,
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-ground text-stone-900">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="valette home" className="rounded-full">
          <Wordmark size={24} />
        </Link>
        <ButtonLink href="/login" variant="secondary" size="sm">
          Sign in
        </ButtonLink>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-6 leading-relaxed">
        <div className="max-w-[65ch] space-y-8">
          <div className="space-y-2">
            <h1 className="font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em]">help</h1>
            <p className="text-stone-700">Questions, problems or ideas: email {mail}.</p>
          </div>
          <section className="space-y-2" aria-label="Common questions">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-card bg-card px-4 py-3 ring-1 ring-line">
                <summary className="cursor-pointer font-display text-[17px] font-bold">{q}</summary>
                <p className="mt-2 text-stone-700">{a}</p>
              </details>
            ))}
          </section>
          <p className="text-sm text-stone-600">
            How we handle your data: <Link className="font-semibold underline underline-offset-2" href="/privacy">privacy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
