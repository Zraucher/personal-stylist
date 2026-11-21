import type { Composition, Overall } from "@/lib/outfit/composition";
import type { Status } from "@/lib/scorecard/rules";
import { Card, Chip, type ChipTone } from "@/components/ui";

const OVERALL: Record<Overall, { label: string; tone: ChipTone }> = {
  strong: { label: "Strong", tone: "works" },
  workable: { label: "Workable", tone: "almost" },
  rework: { label: "Rework", tone: "not" },
  incomplete: { label: "Incomplete", tone: "neutral" },
};

const DOT: Record<Status, string> = {
  good: "bg-emerald-600",
  ok: "bg-stone-400",
  unknown: "bg-stone-300",
  caution: "bg-amber-500",
  fail: "bg-red-600",
};

export function OverallChip({ overall }: { overall: Overall }) {
  const o = OVERALL[overall];
  return (
    <Chip tone={o.tone} className="shrink-0">
      {o.label}
    </Chip>
  );
}

export default function CompositionPanel({ composition }: { composition: Composition }) {
  return (
    <Card className="space-y-3" pad="sm">
      <div className="flex items-start gap-2">
        <OverallChip overall={composition.overall} />
        <p role="status" aria-live="polite" className="text-sm text-stone-700">
          {composition.headline}
        </p>
      </div>
      {composition.overall !== "incomplete" && (
        <ul className="space-y-2.5">
          {composition.checks.map((c) => (
            <li key={c.id} className="flex gap-2.5 text-sm">
              <span className={"mt-1.5 size-2 shrink-0 rounded-full " + DOT[c.status]} aria-hidden="true" />
              <div>
                <p>
                  <span className="font-medium">{c.label}.</span> <span className="text-stone-600">{c.reason}</span>
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
