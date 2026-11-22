import { Section, SectionIntro } from "./Section";

const FAQ = [
  { q: "Do I need a professional color analysis?", a: "No. Valette starts from what you tell it and what you already wear, and you can refine your palette any time. If you've had a color analysis, add your season and it will use it." },
  { q: "Is it only for women?", a: "No. Valette styles menswear, womenswear or both, for every skin tone, size and budget." },
  { q: "Will it push me to buy things?", a: "Your closet comes first. Shopping suggestions only appear when a piece would add real outfits, and only within the budget you set." },
  { q: "What happens to my photos?", a: "Your closet and photos are private to your account. We use them to give you advice. You can delete any photo in the app, and we'll delete your account if you ask." },
  { q: "How much does it cost?", a: "Valette is free during early access. We'll tell you well ahead of any change." },
];

/** Native <details> accordion: no client JavaScript. */
export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-title" narrow>
      <SectionIntro id="faq-title" eyebrow="faq" title="questions." />
      <div className="mt-10 divide-y divide-line-strong border-y border-line-strong">
        {FAQ.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-control py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-900/[0.06] text-stone-600 transition-transform duration-200 ease-soft group-open:rotate-45"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <p className="max-w-[60ch] pb-6 text-lg leading-relaxed text-stone-600">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
