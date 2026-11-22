import type { ReactNode } from "react";
import { Chip, OutfitStrip, Swatch } from "@/components/ui";
import { P } from "./mock";
import { Bezel, Section, SectionIntro } from "./Section";

const PALETTE = [
  { name: "olive", hex: "#6b7a4b" },
  { name: "rust", hex: "#b5532f" },
  { name: "cream", hex: "#efe6d2" },
  { name: "navy", hex: "#2c3e63" },
  { name: "sage", hex: "#9db08f" },
  { name: "camel", hex: "#c49a6c" },
];

function ColorsFragment() {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Your palette</p>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((c) => (
          <Swatch key={c.name} hex={c.hex} name={c.name} className="!size-9" />
        ))}
      </div>
      <p className="text-[13px] text-stone-500">Warm and soft. Best near your face: olive, rust, cream.</p>
    </div>
  );
}

function ClosetFragment() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Your closet</p>
        <Chip tone="outline">12 pieces</Chip>
      </div>
      <OutfitStrip items={[P.tee, P.jeans, P.dress, P.loafers]} link={false} />
      <p className="text-[13px] text-stone-500">Basics ticked, the rest snapped.</p>
    </div>
  );
}

function CheckFragment() {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Where to?</p>
      <p className="font-display text-xl font-bold leading-tight">Dinner downtown, 7 pm</p>
      <div className="flex flex-wrap gap-2">
        <Chip tone="works">
          <span aria-hidden="true">✓</span> works on you
        </Chip>
        <Chip tone="neutral">3 outfits ready</Chip>
      </div>
    </div>
  );
}

const STEPS: Array<{ title: string; body: string; fragment: ReactNode }> = [
  {
    title: "Tell us your colors",
    body: "Answer a few questions or let us read your past favorites. We build your palette, so you know the colors that light you up and the ones that fight you.",
    fragment: <ColorsFragment />,
  },
  {
    title: "Add what you own",
    body: "Tick the basics in a minute, snap the pieces that matter, or let us find product photos for things you already bought.",
    fragment: <ClosetFragment />,
  },
  {
    title: "Check before you go",
    body: "Pick where you're headed. We check the weather and your closet and hand you three outfits that work on you.",
    fragment: <CheckFragment />,
  },
];

export function HowItWorks() {
  return (
    <Section id="how" tone="card" labelledBy="how-title">
      <SectionIntro id="how-title" eyebrow="how it works" title="three steps, then get dressed." lede="Everything starts with your colors, so every suggestion is made for you." />
      <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-6 lg:gap-8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-col">
            <Bezel className="md:min-h-[212px]">{s.fragment}</Bezel>
            <div className="mt-6 space-y-2 px-1">
              <p className="text-xs font-semibold tabular-nums text-stone-500">Step {i + 1}</p>
              <h3 className="font-display text-xl font-bold leading-tight">{s.title}</h3>
              <p className="leading-relaxed text-stone-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
