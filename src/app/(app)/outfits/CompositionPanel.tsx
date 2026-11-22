import type { Composition, Overall } from "@/lib/outfit/composition";
import { CHECK_MARK, cleanHeadline } from "@/lib/verdict";
import { Card, Chip, type ChipTone } from "@/components/ui";

const OVERALL: Record<Overall, { label: string; tone: ChipTone }> = {
  strong: { label: "✓ works", tone: "works" },
  workable: { label: "◐ almost", tone: "almost" },
  rework: { label: "✕ not yet", tone: "not" },
  incomplete: { label: "needs pieces", tone: "neutral" },
};

/** Outfits saved before the copy pass start with "Rework:" and friends; the chip already says it. */
export { cleanHeadline };

export function OverallChip({ overall }: { overall: Overall }) {
  const o = OVERALL[overall];
  return (
    <Chip tone={o.tone} className="shrink-0">
      {o.label}
    </Chip>
  );
}

/** The full read-out: overall, headline and every check. Builder announces changes from its tray, so this panel is not a live region. */
export default function CompositionPanel({ composition }: { composition: Composition }) {
  return (
    <Card className="space-y-3" pad="sm">
      <div className="flex items-start gap-2">
        <OverallChip overall={composition.overall} />
        <p className="text-sm text-stone-700">{cleanHeadline(composition.headline)}</p>
      </div>
      {composition.overall !== "incomplete" && (
        <ul className="space-y-2.5">
          {composition.checks.map((c) => (
            <li key={c.id} className="flex gap-2.5 text-sm">
              <span className={"w-4 shrink-0 text-center font-semibold " + CHECK_MARK[c.status].className} aria-hidden="true">
                {CHECK_MARK[c.status].glyph}
              </span>
              <div>
                <p>
                  <span className="font-medium">{c.label}.</span>
                  <span className="sr-only"> {CHECK_MARK[c.status].word}.</span> <span className="text-stone-600">{c.reason}</span>
                </p>
                {c.fix && c.status !== "good" && c.status !== "ok" && <p className="mt-0.5 text-stone-500">{c.fix}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
