import type { Composition, Overall } from "@/lib/outfit/composition";
import type { Status } from "@/lib/scorecard/rules";
import { Card, Chip, type ChipTone } from "@/components/ui";

const OVERALL: Record<Overall, { label: string; tone: ChipTone }> = {
  strong: { label: "Strong", tone: "works" },
  workable: { label: "Workable", tone: "almost" },
  rework: { label: "Rework", tone: "not" },
  incomplete: { label: "Incomplete", tone: "neutral" },
};

// Shape + colour, so a check's status never rests on colour alone.
const MARK: Record<Status, { symbol: string; word: string; className: string }> = {
  good: { symbol: "✓", word: "good", className: "text-emerald-700" },
  ok: { symbol: "○", word: "okay", className: "text-stone-600" },
  unknown: { symbol: "–", word: "not checked", className: "text-stone-500" },
  caution: { symbol: "◐", word: "caution", className: "text-amber-700" },
  fail: { symbol: "✕", word: "fails", className: "text-red-700" },
};

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
        <p className="text-sm text-stone-700">
          {composition.headline}
        </p>
      </div>
      {composition.overall !== "incomplete" && (
        <ul className="space-y-2.5">
          {composition.checks.map((c) => (
            <li key={c.id} className="flex gap-2.5 text-sm">
              <span className={"w-4 shrink-0 text-center font-semibold " + MARK[c.status].className} aria-hidden="true">
                {MARK[c.status].symbol}
              </span>
              <div>
                <p>
                  <span className="font-medium">{c.label}.</span>
                  <span className="sr-only"> {MARK[c.status].word}.</span> <span className="text-stone-600">{c.reason}</span>
                </p>
                {c.fix && c.status !== "good" && c.status !== "ok" && <p className="mt-0.5 text-stone-500">Try: {c.fix}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
