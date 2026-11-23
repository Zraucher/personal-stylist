import type { Metadata } from "next";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy · valette" };

// Plain-language privacy notice. Drafted 2026-11-22; have a lawyer review it before a public launch.
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
            <p className="text-stone-500">Last updated November 22, 2026</p>
          </div>
          <section className="space-y-2">
            <p className="text-stone-700">Valette is a private, invite-only styling app. This page explains what we keep about you, why, and how to get it changed or deleted. Questions or requests: <a className="font-semibold underline underline-offset-2" href="mailto:hello@myvalette.com">hello@myvalette.com</a>.</p>
          </section>
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
            <ul className="list-disc space-y-1 pl-5 text-stone-700">
              <li>Supabase stores your account, profile, closet and private photos (in the United States).</li>
              <li>Vercel hosts the app and handles each page request.</li>
              <li>Anthropic&apos;s Claude analyzes photos and writes suggestions. It receives only what each request needs and doesn&apos;t use it to train its models.</li>
              <li>AgentMail sends our emails: sign-in codes and invites.</li>
              <li>Firecrawl and our own page reader fetch product pages you paste or that we suggest. They receive the link, not your details.</li>
              <li>Open-Meteo provides weather for your city. It receives the city, not who you are.</li>
              <li>If you turn on notifications, your browser&apos;s push service (Apple, Google or Mozilla) delivers them.</li>
            </ul>
            <p className="text-stone-700">Each of them handles your data only to provide their part of the service.</p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Cookies and similar</h2>
            <ul className="list-disc space-y-1 pl-5 text-stone-700">
              <li>A sign-in cookie keeps you signed in. Valette can&apos;t work without it.</li>
              <li>If you vote on a friend&apos;s look, a cookie with a random ID (kept for one year, only on vote links) makes sure you vote once per look and can change your vote.</li>
              <li>To stop vote spam, we keep a scrambled (hashed) form of your network address with each vote. We can&apos;t turn it back into your address, and it&apos;s only used to limit votes per hour.</li>
              <li>On your device, Valette keeps copies of pages and photos you&apos;ve opened so it works offline. Signing out clears them.</li>
              <li>We don&apos;t use advertising or analytics cookies, and we don&apos;t track you across other sites.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">How long we keep it</h2>
            <ul className="list-disc space-y-1 pl-5 text-stone-700">
              <li>Your account, profile, closet and photos: while your account is open. When you delete something in the app, it&apos;s gone right away.</li>
              <li>If you ask us to delete your account, we delete everything within 30 days.</li>
              <li>Waitlist emails: until we send your invite or you ask to leave.</li>
              <li>Votes and comments on a shared look: until the person who shared it deletes the look or their account.</li>
              <li>Our providers may keep routine backups for a short time before they&apos;re overwritten.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Age</h2>
            <p className="text-stone-700">Valette is for adults 18 and over. We don&apos;t knowingly collect data from anyone younger. If you think a child has signed up, email us and we&apos;ll delete the account.</p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Your rights</h2>
            <p className="text-stone-700">Wherever you live, you can ask us to show you, correct, export or delete your data, or to stop using it for a purpose. We&apos;ll answer within 30 days.</p>
            <ul className="list-disc space-y-1 pl-5 text-stone-700">
              <li>We don&apos;t sell your personal information or share it for advertising, including as defined by California law (CCPA/CPRA).</li>
              <li>If you&apos;re in the EU or UK (GDPR): we use your data to provide the service you signed up for, and for notifications only with your consent, which you can withdraw in the app. Your data is stored in the United States. You can also complain to your local data protection authority.</li>
              <li>Valette&apos;s suggestions are style advice only. Nothing it decides has legal or similarly significant effects on you.</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Changes</h2>
            <p className="text-stone-700">If we change this page in a way that matters, we&apos;ll update the date above and email you before it takes effect.</p>
          </section>
          <section className="space-y-2">
            <h2 className="font-display text-xl font-bold">Your choices</h2>
            <p className="text-stone-700">You can edit or delete any piece, photo or profile detail in the app at any time. To delete your whole account or leave the waitlist, email <a className="font-semibold underline underline-offset-2" href="mailto:hello@myvalette.com">hello@myvalette.com</a> or reply to any email from us, and we&apos;ll remove everything within 30 days.</p>
            <p className="text-stone-700">If you voted on a friend&apos;s look and want your vote, name or comment removed, ask the person who shared the link, or email <a className="font-semibold underline underline-offset-2" href="mailto:hello@myvalette.com">hello@myvalette.com</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
