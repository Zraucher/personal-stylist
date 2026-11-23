import { EyebrowPill, Section } from "./Section";

const POINTS = ["More outfits. Fewer second guesses.", "Only buy what works on you.", "Every skin tone, every gender, every budget."];

/** The stat band, in the Verdicts colorway: card ground, Linen tiles, stone text. */
export function StatBand() {
  return (
    <Section tone="card" labelledBy="stat-title">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="space-y-5">
          <EyebrowPill>more from what you own</EyebrowPill>
          <h2 id="stat-title" className="font-display text-[56px] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-[80px]">
            23 pieces <br />= 30 outfits
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-stone-600">
            From one real closet, across five typical days. Most people own far more outfits than they wear. Valette finds them, checks each one against your colors, and rotates them so nothing gets forgotten.
          </p>
        </div>
        <ul className="grid gap-3">
          {POINTS.map((t) => (
            <li key={t} className="flex items-center gap-4 rounded-card bg-ground px-5 py-5 text-lg font-semibold ring-1 ring-line">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full text-stone-900 ring-[1.5px] ring-current">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
