import { Cta } from "./Cta";
import { PhoneMock } from "./PhoneMock";
import { EyebrowPill } from "./Section";

/** Headline, one-sentence subhead, the call to action and the phone. */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-10 sm:px-6 sm:pt-16 md:grid-cols-[1.15fr_1fr] md:gap-10 md:pb-32 lg:gap-20">
        <div className="space-y-7">
          <EyebrowPill className="bg-blush text-ink">early access · invite only</EyebrowPill>
          <h1
            id="hero-title"
            className="text-balance font-display text-[46px] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-[64px] lg:text-[80px]"
          >
            check it on you before you wear it.
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-stone-600 sm:text-xl">
            Valette looks at your outfit, your coloring and your closet, and tells you in seconds if it works.
          </p>
          <div className={signedIn ? "flex flex-wrap items-center gap-x-6 gap-y-3" : "max-w-xl space-y-5"}>
            <Cta signedIn={signedIn} source="hero" />
            <a
              href="#how"
              className="group tap inline-flex items-center gap-3 rounded-full py-1 text-[15px] font-semibold text-stone-900"
            >
              See how it works
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-stone-900/[0.06] transition-transform duration-300 ease-soft group-hover:translate-y-0.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M6 13l6 6 6-6" />
                </svg>
              </span>
            </a>
          </div>
        </div>
        <PhoneMock />
      </div>
    </section>
  );
}
