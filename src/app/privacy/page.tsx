import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export const metadata: Metadata = { title: "Privacy · valette" };

// Plain-language summary of how the app handles data. Have it reviewed before a public launch.
export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="valette home">
          <Wordmark size={24} />
        </Link>
        <Link href="/login" className="text-sm font-semibold text-stone-600 hover:text-stone-900">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-5 pb-20 pt-6 leading-relaxed">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-extrabold">privacy</h1>
          <p className="text-stone-500">Last updated November 21, 2026</p>
        </div>
        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5 text-stone-700">
            <li>Your email address, to sign you in and, if you join the waitlist, to send your invite.</li>
            <li>The profile you build: colors, style preferences, sizes, brands and your city for weather.</li>
            <li>Your closet: the items you add and any photos you upload.</li>
            <li>Your feedback on outfits and what you wear, so suggestions and closet insights get better.</li>
            <li>If you share a look for a second opinion: anyone with that link can see the pieces in it and vote until it closes. Friends who vote give only an optional first name and comment.</li>
            <li>If you turn on notifications: a device address from your browser, used only to send you Valette notifications.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">How we use it</h2>
          <p className="text-stone-700">Only to give you advice inside Valette: checking outfits and products against your colors and closet, and suggesting what to wear or buy. We do not sell your data or share it with advertisers.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">Who helps us run it</h2>
          <p className="text-stone-700">Supabase stores your account and private photos. Vercel hosts the app. Anthropic&apos;s Claude analyzes photos and writes suggestions; it receives only what is needed for each request. Open-Meteo provides weather for your city.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">Your choices</h2>
          <p className="text-stone-700">You can edit or delete any item, photo or profile detail in the app at any time. To delete your whole account or leave the waitlist, reply to any email from us and we&apos;ll remove everything.</p>
        </section>
      </main>
    </div>
  );
}
