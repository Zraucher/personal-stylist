import type { Composition, Overall } from "@/lib/outfit/composition";
import type { Status } from "@/lib/scorecard/rules";

const OVERALL: Record<Overall, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "bg-emerald-700 text-white" },
  workable: { label: "Workable", cls: "bg-amber-600 text-white" },
  rework: { label: "Rework", cls: "bg-red-700 text-white" },
  incomplete: { label: "Incomplete", cls: "bg-stone-300 text-stone-800" },
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
  return <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + o.cls}>{o.label}</span>;
}

export default function CompositionPanel({ composition }: { composition: Composition }) {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-2">
        <OverallChip overall={composition.overall} />
        <p className="text-sm text-stone-700">{composition.headline}</p>
      </div>
      {composition.overall !== "incomplete" && (
        <ul className="space-y-2.5">
          {composition.checks.map((c) => (
            <li key={c.id} className="flex gap-2.5 text-sm">
              <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + DOT[c.status]} aria-hidden />
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
    </div>
  );
}
