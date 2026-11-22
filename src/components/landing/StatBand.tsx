import { Section } from "./Section";

const POINTS = ["More outfits. Fewer second guesses.", "Only buy what works on you.", "Every skin tone, every gender, every budget."];

/** The Night band. Text is fixed Linen so it never inverts with the stone scale. */
export function StatBand() {
  return (
    <Section tone="night" labelledBy="stat-title">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="space-y-5">
          <p className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fbf7f2]/80 ring-1 ring-inset ring-[#fbf7f2]/25">
            more from what you own
          </p>
          <h2 id="stat-title" className="font-display text-[56px] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-[80px]">
            23 pieces <br />= 30 outfits
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-[#fbf7f2]/80">
            From one real closet, across five typical days. Most people own far more outfits than they wear. Valette finds them, checks each one against your colors, and rotates them so nothing gets forgotten.
          </p>
        </div>
        <ul className="grid gap-3">
          {POINTS.map((t) => (
            <li key={t} className="flex items-center gap-4 rounded-card bg-[#fbf7f2]/[0.07] px-5 py-5 text-lg font-semibold ring-1 ring-inset ring-[#fbf7f2]/10">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full ring-[1.5px] ring-[#fbf7f2]/70">
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
