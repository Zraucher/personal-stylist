import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

/** Input styling: 44px tall, 16px text (no iOS zoom), visible 3:1 border. */
export const fieldClass =
  "block w-full min-h-11 rounded-control border border-stone-400/70 bg-inset px-3.5 py-2.5 text-base text-stone-900 placeholder:text-stone-500 transition-colors duration-200 ease-soft focus-visible:border-stone-900 disabled:opacity-60 aria-[invalid=true]:border-red-700";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(fieldClass, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cx(fieldClass, "appearance-none bg-[length:16px] bg-[right_0.85rem_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6577' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldClass, "min-h-24", className)} {...rest} />;
}

/** Label + control + optional hint and error. Every input gets a label (use `srOnly` to hide it visually). */
export function Field({ label, hint, error, srOnly = false, className, children }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; srOnly?: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={cx("block space-y-1.5", className)}>
      <span className={srOnly ? "sr-only" : "block text-sm font-medium text-stone-700"}>{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-stone-500">{hint}</span>}
      {error && (
        <span role="alert" className="block text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

/** A checkbox with a comfortable tap area. */
export function Checkbox({ label, className, ...rest }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cx("tap inline-flex cursor-pointer items-center gap-2.5 text-sm", className)}>
      <input type="checkbox" className="size-[18px] accent-emerald-700" {...rest} />
      {label}
    </label>
  );
}
