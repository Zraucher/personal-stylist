import { Card } from "@/components/ui";
import { Cta } from "./Cta";
import { RingTick, Section, SectionIntro } from "./Section";

const INCLUDED = [
  "Three outfits every morning, matched to the forecast",
  "Shop check on any product link or screenshot",
  "Closet gaps and closet insights",
  "Second opinions from friends",
  "Week plans and packing lists",
  "Price watch on saved finds",
];

/** One card: free during early access. No prices or plans that don't exist. */
export function Pricing({ signedIn }: { signedIn: boolean }) {
  return (
    <Section id="pricing" tone="card" labelledBy="pricing-title">
      <SectionIntro id="pricing-title" eyebrow="pricing" title="free during early access." lede="We'll tell you well ahead of any change." center />
      <Card variant="active" pad="lg" className="mx-auto mt-14 max-w-lg space-y-6 sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Early access</p>
            <p className="mt-2 font-display text-[56px] font-extrabold leading-none tracking-[-0.045em]">free</p>
          </div>
          <p className="pb-1.5 text-sm text-stone-500">Invite only</p>
        </div>
        <ul className="space-y-3 border-t border-line pt-6">
          {INCLUDED.map((t) => (
            <li key={t} className="flex gap-3 leading-snug text-stone-800">
              <RingTick />
              {t}
            </li>
          ))}
        </ul>
        <div className="border-t border-line pt-6">
          <Cta signedIn={signedIn} source="pricing" />
        </div>
      </Card>
    </Section>
  );
}
