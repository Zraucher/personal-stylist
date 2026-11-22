import { Chip } from "@/components/ui";
import { Section, SectionIntro } from "./Section";

const VERDICTS = [
  { glyph: "✓", word: "works on you", tone: "works" as const, body: "The colors, fabric and shape all suit you. Wear it with confidence." },
  { glyph: "◐", word: "almost", tone: "almost" as const, body: "Close. We tell you the one change that turns it into a yes." },
  { glyph: "✕", word: "not for you", tone: "not" as const, body: "It fights your coloring or your style, and we show you better options you already own." },
];

/** The three verdicts and what each one means. */
export function Verdicts() {
  return (
    <Section tone="card" labelledBy="verdicts-title">
      <SectionIntro id="verdicts-title" eyebrow="the verdict" title="three answers, each one you can act on." lede="Every outfit and every product you check gets one of these." />
      <ul className="mt-14 grid gap-4 md:grid-cols-3">
        {VERDICTS.map((v) => (
          <li key={v.word} className="space-y-4 rounded-card bg-ground p-6 ring-1 ring-line sm:p-7">
            <h3>
              <Chip tone={v.tone} size="md">
                <span aria-hidden="true">{v.glyph}</span> {v.word}
              </Chip>
            </h3>
            <p className="text-lg leading-relaxed text-stone-600">{v.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
