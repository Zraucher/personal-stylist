import type { ReactNode } from "react";
import { Section } from "./Section";

const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Factual points only: no logos, quotes, user counts or ratings.
const POINTS: Array<{ text: string; icon: ReactNode }> = [
  {
    text: "Works with the closet you already own",
    icon: <path {...line} d="M10 5.5a2 2 0 1 1 2 2v1.5l8.4 6.2a1 1 0 0 1-.6 1.8H4.2a1 1 0 0 1-.6-1.8L12 9" />,
  },
  {
    text: "Reads color from the photo, not the label",
    icon: (
      <g {...line}>
        <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.5-.7 1.5-1.5 0-1.1-1-1.5-1-2.5 0-1 .8-1.7 1.7-1.7H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.8 16.7 3.5 12 3.5z" />
        <circle cx="7.5" cy="11" r="1" />
        <circle cx="10.5" cy="7.5" r="1" />
        <circle cx="15" cy="7.5" r="1" />
      </g>
    ),
  },
  {
    text: "Menswear, womenswear or both",
    icon: (
      <g {...line}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
        <path d="M15.5 5.2a3 3 0 0 1 0 5.6M17 14.6a5.5 5.5 0 0 1 3.5 4.9" />
      </g>
    ),
  },
  {
    text: "Your photos stay private",
    icon: (
      <g {...line}>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      </g>
    ),
  },
];

export function ProofStrip() {
  return (
    <Section tone="card" pad="sm" labelledBy="proof-title">
      <h2 id="proof-title" className="sr-only">
        Why Valette
      </h2>
      <ul className="grid gap-x-8 gap-y-5 min-[520px]:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p) => (
          <li key={p.text} className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-inset text-stone-700">
              <svg width="20" height="20" viewBox="0 0 24 24">
                {p.icon}
              </svg>
            </span>
            <span className="text-[15px] font-semibold leading-snug text-stone-800">{p.text}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
