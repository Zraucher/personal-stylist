/** The Second Look wordmark: lowercase "valette" with the green check disc. */
export default function Wordmark({ size = 22, className = "" }: { size?: number; className?: string }) {
  const disc = Math.round(size * 0.62);
  return (
    <span className={"inline-flex items-start gap-[0.12em] font-display font-extrabold leading-none text-stone-900 " + className} style={{ fontSize: size }}>
      valette
      <svg width={disc} height={disc} viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
        <circle cx="18" cy="18" r="18" className="fill-emerald-700" />
        <path d="M10 18.5l5.5 5.5L26.5 12.5" fill="none" stroke="var(--color-on-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** The green check disc on its own, used as the verdict stamp. */
export function CheckDisc({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true" className="inline-block shrink-0">
      <circle cx="18" cy="18" r="18" className="fill-current" />
      <path d="M10 18.5l5.5 5.5L26.5 12.5" fill="none" stroke="var(--color-on-accent)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
