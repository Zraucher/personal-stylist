import { Chip, OutfitStrip, Thumb, VoteBar, WeatherLine, fieldClass } from "@/components/ui";
import { FeatureRow } from "./FeatureRow";
import { P } from "./mock";
import { Section, SectionIntro } from "./Section";

const meta = "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500";

function TodayFragment() {
  const looks = [
    { name: "Rooftop at 7", items: [P.linenShirt, P.chinos, P.sneakers] },
    { name: "Lunch with Sam", items: [P.dress, P.sandals, P.tote] },
    { name: "Errands", items: [P.tee, P.jeans, P.sneakers] },
  ];
  return (
    <div className="space-y-4">
      <WeatherLine high={84} place="Las Vegas" meta={["low 66°", "UV 8"]} />
      <ul className="divide-y divide-line">
        {looks.map((l) => (
          <li key={l.name} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <p className="text-sm font-semibold">{l.name}</p>
            <OutfitStrip items={l.items} size="sm" link={false} className="shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShopFragment() {
  return (
    <div className="space-y-4">
      <div className={fieldClass + " truncate text-stone-500"}>shop.example.com/linen-blazer-sage</div>
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <Thumb alt="Linen blazer" item={P.blazer} product />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="font-semibold leading-snug">Linen blazer, sage</p>
          <Chip tone="works" size="md">
            <span aria-hidden="true">✓</span> works on you
          </Chip>
          <p className="text-[13px] text-stone-500">Pairs with 9 pieces you own.</p>
        </div>
      </div>
    </div>
  );
}

function GapsFragment() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0">
          <Thumb alt="White sneakers" item={P.sneakers} />
        </div>
        <div>
          <p className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">+11</p>
          <p className="mt-1 text-sm font-semibold">outfits from white sneakers</p>
        </div>
      </div>
      <div className="space-y-2">
        <p className={meta}>Works with</p>
        <OutfitStrip items={[P.chinos, P.jeans, P.skirt, P.linenShirt]} size="sm" link={false} />
      </div>
    </div>
  );
}

function OpinionsFragment() {
  return (
    <div className="space-y-4">
      <OutfitStrip items={[P.knit, P.skirt, P.loafers, P.tote]} link={false} />
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">4 friends voted</p>
          <p className="text-xs tabular-nums text-stone-500">3 works · 1 almost</p>
        </div>
        <VoteBar works={3} almost={1} not={0} />
      </div>
      <p className="rounded-control bg-inset px-3 py-2.5 text-[13px] text-stone-600">“Love the color, swap the shoes.”</p>
    </div>
  );
}

function PlanFragment() {
  const days = [
    { day: "Mon", high: "81°", items: [P.linenShirt, P.chinos, P.loafers] },
    { day: "Tue", high: "86°", items: [P.dress, P.sandals] },
    { day: "Wed", high: "74°", items: [P.jacket, P.tee, P.jeans] },
  ];
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {days.map((d) => (
          <li key={d.day} className="flex items-center gap-3 py-2.5 first:pt-0">
            <p className="w-9 text-sm font-semibold">{d.day}</p>
            <p className="w-9 text-[13px] tabular-nums text-stone-500">{d.high}</p>
            <OutfitStrip items={d.items} size="sm" link={false} className="ml-auto shrink-0" />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 rounded-control bg-inset px-3 py-2.5">
        <p className="text-sm font-semibold">Lisbon, 4 days</p>
        <Chip tone="info">Packing list · 9 pieces</Chip>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    eyebrow: "today",
    title: "three outfits for the weather you'll actually have.",
    body: "Every morning you get three outfits matched to your colors, your plans and the forecast. Wear one, or swap a piece to make it yours.",
    detail: "Uses the forecast for the hours you're outside, not the daily average.",
    visual: <TodayFragment />,
  },
  {
    eyebrow: "shop check",
    title: "know before you buy.",
    body: "Paste a product link or a screenshot and get a verdict in seconds. We also show how many pieces you already own that it goes with.",
    detail: "Reads the real color from the photo, not the name on the label.",
    visual: <ShopFragment />,
  },
  {
    eyebrow: "closet gaps",
    title: "the one piece that unlocks the most.",
    body: "We look at everything you own and find the missing piece that would add the most new outfits. It comes with the number to prove it.",
    detail: "Shopping suggestions only appear within the budget you set.",
    visual: <GapsFragment />,
  },
  {
    eyebrow: "second opinions",
    title: "ask a friend, get a vote.",
    body: "Send a look or a find to friends. They vote works on you, almost or not for you in one tap.",
    detail: "Friends can vote without an account.",
    visual: <OpinionsFragment />,
  },
  {
    eyebrow: "plan and trips",
    title: "your week, and a packing list.",
    body: "Lay out the whole week against the forecast. For every trip, we build a packing list from what you own.",
    detail: "Each day's outfit is checked against that day's forecast.",
    visual: <PlanFragment />,
  },
];

export function Features() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionIntro id="features-title" eyebrow="features" title="a stylist in your pocket." lede="Five things Valette does every day, all built on your colors and your closet." />
      <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-32">
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.eyebrow} {...f} flip={i % 2 === 1} />
        ))}
      </div>
    </Section>
  );
}
