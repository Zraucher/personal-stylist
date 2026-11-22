/**
 * The signature moment: the green check disc drawing its tick (300 ms) when a verdict or
 * "wore it" lands. Pass `animate` only when the person just did the thing in this session;
 * state loaded from the server shows the finished tick without replaying the draw.
 */
export function CheckTick({ size = 16, animate = false, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className={"inline-block shrink-0 " + className}>
      <circle cx="18" cy="18" r="18" className="fill-current" />
      <path
        d="M10 18.5l5.5 5.5L26.5 12.5"
        pathLength={1}
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={(animate ? "tick-draw " : "") + "stroke-[var(--color-on-accent)]"}
      />
    </svg>
  );
}
