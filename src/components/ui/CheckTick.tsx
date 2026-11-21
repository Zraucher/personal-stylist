/**
 * The signature moment: the green check disc drawing its tick (300 ms) when a verdict or
 * "wore it" lands. Render it only when the state changes so the animation plays once.
 */
export function CheckTick({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className={"inline-block shrink-0 " + className}>
      <circle cx="18" cy="18" r="18" className="fill-current" />
      <path d="M10 18.5l5.5 5.5L26.5 12.5" pathLength={1} fill="none" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="tick-draw stroke-[var(--color-on-accent)]" />
    </svg>
  );
}
