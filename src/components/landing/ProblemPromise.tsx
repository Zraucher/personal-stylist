import { Card } from "@/components/ui";
import { DISPLAY_H2, EyebrowPill, RingTick, Section } from "./Section";

const PROBLEMS = [
  "Mornings spent putting things on and taking them off.",
  "Pieces that looked right in the store and wrong at home.",
  "A closet full of things you never reach for.",
];

const PROMISES = [
  "Three outfits each morning, matched to your colors and the weather.",
  "A verdict on anything before you buy it.",
  "The one piece that would add the most outfits to what you own.",
];

/** The everyday problem on the left, Valette's answer on the right. */
export function ProblemPromise() {
  return (
    <Section labelledBy="problem-title">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="space-y-5">
          <EyebrowPill>the problem</EyebrowPill>
          <h2 id="problem-title" className={DISPLAY_H2}>
            a full closet and nothing to wear.
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {PROBLEMS.map((p) => (
              <li key={p} className="py-3.5 text-lg leading-relaxed text-stone-600">
                {p}
              </li>
            ))}
          </ul>
        </div>
        <Card variant="warm" pad="lg" className="space-y-5 sm:p-8">
          <h3 className="font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[30px]">
            your closet, checked against your colors.
          </h3>
          <p className="leading-relaxed text-stone-700">
            Valette starts with the colors that suit you, finds the outfits already hiding in your closet, and checks anything new before it&apos;s yours.
          </p>
          <ul className="space-y-3">
            {PROMISES.map((p) => (
              <li key={p} className="flex gap-3 font-semibold leading-snug text-stone-900">
                <RingTick />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Section>
  );
}
