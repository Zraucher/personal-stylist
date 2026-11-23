"use client";

import { cx } from "./cx";

/**
 * Two to four mutually exclusive views (Looks / Packing list). The chosen one is Night.
 * For real tab panels pass `tabs` with panel ids; otherwise it renders pressed buttons.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  tabs,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Map of option value to the id of the panel it controls. */
  tabs?: Partial<Record<T, string>>;
  className?: string;
}) {
  const move = (dir: number) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    if (typeof document !== "undefined") requestAnimationFrame(() => document.getElementById(`seg-${label}-${next.value}`)?.focus());
  };
  return (
    <div role={tabs ? "tablist" : "group"} aria-label={label} className={cx("inline-flex rounded-full bg-inset p-1 ring-1 ring-line", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            id={`seg-${label}-${o.value}`}
            type="button"
            {...(tabs
              ? { role: "tab", "aria-selected": on, "aria-controls": tabs[o.value], tabIndex: on ? 0 : -1 }
              : { "aria-pressed": on })}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (!tabs) return;
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              move(e.key === "ArrowRight" ? 1 : -1);
            }}
            className={cx(
              "tap inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 ease-soft",
              on ? "bg-raised text-stone-900 shadow-active ring-1 ring-line" : "text-stone-600 hover:text-stone-900"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
