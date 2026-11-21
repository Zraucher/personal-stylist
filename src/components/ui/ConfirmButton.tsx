"use client";

import { useId, useRef, type ReactNode } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./Button";

/**
 * Replaces window.confirm(): a branded dialog with a focus trap and Esc (native <dialog>).
 * `onConfirm` runs only after the person confirms.
 */
export function ConfirmButton({
  children,
  title,
  body,
  confirmLabel = "Delete",
  cancelLabel = "Keep it",
  onConfirm,
  variant = "danger",
  size = "sm",
  disabled,
  className,
}: {
  children: ReactNode;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => ref.current?.showModal()} className={(buttonClass(variant, size) + " " + (className ?? "")).trim()}>
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-t`}
        className="m-auto w-[min(92vw,380px)] rounded-sheet bg-card p-6 text-stone-900 shadow-sheet ring-1 ring-line backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <p id={`${id}-t`} className="font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">
          {title}
        </p>
        {body && <p className="mt-2 text-sm leading-relaxed text-stone-600">{body}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus onClick={() => ref.current?.close()} className={buttonClass("secondary", "sm")}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              ref.current?.close();
              onConfirm();
            }}
            className={buttonClass("primary", "sm") + " bg-red-700 hover:bg-red-700/90"}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
