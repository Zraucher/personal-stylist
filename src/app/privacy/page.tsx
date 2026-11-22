import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy · valette" };

// Plain-language summary of how the app handles data. Have it reviewed before a public launch.
// TODO(Zack): add a contact address before public launch; needs legal review
export default function PrivacyPage() {
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
            <h1 className="font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em]">privacy</h1>
            <p className="text-stone-500">Last updated November 21, 2026</p>
          </div>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">What we collect</h2>
            <ul className="list-disc space-y-1 pl-5 text-stone-700">
              <li>Your email address, to sign you in and, if you join the waitlist, to send your invite.</li>
              <li>The profile you build: colors, style preferences, sizes, brands and your city for weather.</li>
              <li>Your closet: the pieces you add and any photos you upload.</li>
              <li>Your feedback on outfits and what you wear, so suggestions and closet insights get better.</li>
              <li>Product links you paste to check a find or watch its price. We fetch that page to read the product photo, name and price, and check it again each day while you watch it.</li>
              <li>If you share a look for a second opinion: anyone with that link can see the pieces in it and vote until it closes. Friends who vote give only an optional first name and comment.</li>
              <li>If you vote on a friend&apos;s look: the first name you type is saved in your own browser so you don&apos;t have to type it again. It stays on your device, and clearing your browser&apos;s site data removes it.</li>
              <li>If you turn on notifications: a device address from your browser, used only to send you Valette notifications.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">How we use it</h2>
            <p className="text-stone-700">Only to give you advice inside Valette: checking outfits and products against your colors and closet, and suggesting what to wear or buy. We don&apos;t sell your data or share it with advertisers.</p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Who helps us run it</h2>
            <p className="text-stone-700">Supabase stores your account and private photos. Vercel hosts the app. Anthropic&apos;s Claude analyzes photos and writes suggestions; it receives only what is needed for each request. Open-Meteo provides weather for your city.</p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Your choices</h2>
            <p className="text-stone-700">You can edit or delete any piece, photo or profile detail in the app at any time. To delete your whole account or leave the waitlist, reply to any email from us and we&apos;ll remove everything.</p>
            <p className="text-stone-700">If you voted on a friend&apos;s look and want your vote, name or comment removed, ask the person who shared the link, or reply to any email from Valette.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
