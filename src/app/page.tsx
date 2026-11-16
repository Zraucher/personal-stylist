import type { Metadata } from "next";
import Link from "next/link";
import Wordmark, { CheckDisc } from "@/components/Wordmark";
import WaitlistForm from "@/components/landing/WaitlistForm";

// Public marketing home. Signed-in visitors never see it: the proxy sends them to /today.

export const metadata: Metadata = {
  title: "valette · check it on you before you wear it",
  description: "Valette checks your outfit against your coloring and your closet, tells you in seconds if it works, and shows you what will if it doesn't.",
  openGraph: {
    title: "valette · check it on you before you wear it",
    description: "Your outfit, checked against your coloring and your closet. More outfits from what you own, fewer second guesses.",
    url: "https://www.myvallette.com",
    siteName: "valette",
    type: "website",
  },
};

const STEPS = [
  { title: "Tell us your colors", body: "Answer a few questions or let us read your past favorites. Valette builds your palette: the colors that light you up and the ones that fight you." },
  { title: "Add what you own", body: "Tick the basics in a minute, snap the pieces that matter, or let us find product photos for things you already bought." },
  { title: "Check before you go", body: "Pick where you're headed. Valette checks the weather and your closet and hands you three outfits that work on you." },
];

const FEATURES = [
  { name: "Today", body: "Three outfits every morning, matched to your colors, your plans and the actual forecast for the hours you're outside.", tone: "bg-sky-brand" },
  { name: "Ask", body: "“Rooftop dinner Friday, 95 at sunset, no dress.” Say it the way you'd text a friend and get looks that fit.", tone: "bg-blush" },
  { name: "Shop check", body: "Paste a product link or a screenshot. We read the photo, not the color name, and tell you if it works before you buy.", tone: "bg-amber-100" },
  { name: "Closet gaps", body: "See the one piece that would unlock the most new outfits from what you already own, with the number to prove it.", tone: "bg-emerald-100" },
  { name: "Price watch", body: "Save a find and we keep an eye on it. When the price drops, you'll see exactly how much.", tone: "bg-sky-brand" },
  { name: "Palette card", body: "Your best colors on one shareable card. Handy in a fitting room, fun in a group chat.", tone: "bg-blush" },
];

const FAQ = [
  { q: "Do I need a professional color analysis?", a: "No. Valette starts from what you tell it and what you already wear, and you can refine your palette any time. If you've had a color analysis, add your season and it will use it." },
  { q: "Is it only for women?", a: "No. Valette styles menswear, womenswear or both, for every skin tone, size and budget." },
  { q: "Will it push me to buy things?", a: "Your closet comes first. Shopping suggestions only appear when a piece would add real outfits, and only within the budget you set." },
  { q: "What happens to my photos?", a: "Your closet and photos are private to your account. We use them to give you advice and nothing else, and you can delete any of them at any time." },
  { q: "How much does it cost?", a: "Valette is free during early access. We'll tell you well ahead of any change." },
];

function PhoneMock() {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[2.2rem] bg-stone-900 p-3 shadow-[0_24px_60px_rgba(29,27,43,0.25)]" aria-hidden="true">
      <div className="space-y-3 rounded-[1.6rem] bg-stone-50 p-4 text-stone-900">
        <div className="flex justify-between text-[11px] font-semibold text-stone-500">
          <span>today</span>
          <span>las vegas · 82°</span>
        </div>
        <p className="font-display text-2xl font-extrabold leading-none">rooftop at 7</p>
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-[0_6px_20px_rgba(29,27,43,0.08)]">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold">Easy linen evening</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <i className="block aspect-square rounded-lg bg-sky-brand" />
            <i className="block aspect-square rounded-lg bg-[#6b7a4b]" />
            <i className="block aspect-square rounded-lg border border-stone-200 bg-stone-100" />
          </div>
          <p className="text-xs leading-snug text-stone-600">Linen shirt, olive chinos, white sneakers. Light enough for 82° and sharp enough for the rooftop.</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">✓ works on you</span>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <span className="flex-1 rounded-full bg-emerald-700 py-2 text-center text-white">wore it</span>
          <span className="flex-1 rounded-full border-[1.5px] border-stone-900 py-[7px] text-center">not me</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="valette home">
          <Wordmark size={26} />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <a href="#how" className="hidden text-stone-600 hover:text-stone-900 sm:inline">How it works</a>
          <a href="#faq" className="hidden text-stone-600 hover:text-stone-900 sm:inline">FAQ</a>
          <Link href="/login" className="rounded-full border-[1.5px] border-stone-900 px-4 py-1.5 hover:bg-stone-900 hover:text-white">
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-12">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-blush px-3 py-1 text-sm font-semibold text-stone-800">
              <span className="text-emerald-700"><CheckDisc size={14} /></span> early access, invite only
            </p>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">check it on you before you wear it.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-stone-600">
              Valette looks at your outfit, your coloring and your closet, and tells you in seconds if it works. If it doesn&apos;t, it shows you what will.
            </p>
            <div className="max-w-xl">
              <WaitlistForm source="hero" />
            </div>
          </div>
          <PhoneMock />
        </section>

        {/* Verdicts */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-3">
            {[
              { chip: "✓ works on you", cls: "bg-emerald-700 text-white", body: "The colors, fabric and shape all suit you. Wear it with confidence." },
              { chip: "◐ almost", cls: "bg-amber-500 text-stone-900", body: "Close. We tell you the one change that turns it into a yes." },
              { chip: "✕ not for you", cls: "bg-red-700 text-white", body: "It fights your coloring or your style, and we show you better options you already own." },
            ].map((v) => (
              <div key={v.chip} className="space-y-2">
                <span className={"inline-flex rounded-full px-3 py-1 text-sm font-semibold " + v.cls}>{v.chip}</span>
                <p className="text-stone-600">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">how it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="space-y-3 rounded-3xl border border-stone-200 bg-white p-6">
                <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-stone-900 font-display text-lg font-extrabold text-stone-50">{i + 1}</span>
                <h3 className="font-display text-xl font-bold">{s.title}</h3>
                <p className="leading-relaxed text-stone-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Stat band */}
        <section className="bg-stone-900 text-stone-50">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-stone-300">more from what you own</p>
              <p className="font-display text-6xl font-extrabold leading-[0.95] sm:text-7xl">
                23 pieces
                <br />= 30 outfits
              </p>
              <p className="max-w-md text-lg text-stone-300">From one real closet, across five typical days. Most people own far more outfits than they wear. Valette finds them, checks each one against your colors, and rotates them so nothing gets forgotten.</p>
            </div>
            <ul className="grid gap-3 text-lg">
              {["More outfits. Fewer second guesses.", "Only buy what works on you.", "Every skin tone, every gender, every budget."].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl bg-stone-50/10 px-5 py-4 font-semibold">
                  <span className="text-emerald-400"><CheckDisc size={22} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">a stylist in your pocket</h2>
          <p className="mt-3 max-w-2xl text-lg text-stone-600">Everything starts with your colors, so every suggestion is made for you, not for a trend.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.name} className="space-y-3 rounded-3xl border border-stone-200 bg-white p-6">
                <span className={"block h-2 w-14 rounded-full " + f.tone} />
                <h3 className="font-display text-xl font-bold">{f.name}</h3>
                <p className="leading-relaxed text-stone-600">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-6 border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-3xl px-5 py-20">
            <h2 className="font-display text-4xl font-extrabold">questions</h2>
            <div className="mt-8 divide-y divide-stone-200">
              {FAQ.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                    {f.q}
                    <span className="text-2xl leading-none text-stone-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-stone-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-blush">
          <div className="mx-auto max-w-3xl space-y-6 px-5 py-20 text-center">
            <h2 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">get dressed sure.</h2>
            <p className="text-lg text-stone-700">Join the early access list and we&apos;ll send your invite.</p>
            <div className="mx-auto max-w-xl text-left">
              <WaitlistForm source="footer" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-stone-500">
        <Wordmark size={18} />
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-stone-900">Privacy</Link>
          <Link href="/login" className="hover:text-stone-900">Sign in</Link>
        </div>
        <p>© 2026 valette</p>
      </footer>
    </div>
  );
}
