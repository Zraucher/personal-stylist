import { ButtonLink, Card, CheckTick } from "@/components/ui";
import type { SetupStep } from "@/lib/profile/setup";

/** First-run checklist on Today. Disappears once every step is done. */
export default function SetupCard({ steps }: { steps: SetupStep[] }) {
  const left = steps.filter((s) => !s.done).length;
  return (
    <Card as="section" variant="warm" aria-label="Get set up" className="space-y-3">
      <p className="font-display text-lg font-bold leading-snug">Get set up: {left} {left === 1 ? "step" : "steps"} left</p>
      <ul className="space-y-1">
        {steps.map((s) => (
          <li key={s.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span className={"flex items-center gap-2 " + (s.done ? "text-stone-500 line-through" : "text-stone-900")}>
              {s.done && <CheckTick size={16} className="text-emerald-700" />}
              {s.label}
            </span>
            {!s.done && (
              <ButtonLink href={s.href} variant="secondary" size="sm">
                Do it
              </ButtonLink>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
