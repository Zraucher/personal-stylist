import type { ReactNode } from "react";
import { cx } from "@/components/ui";
import { Bezel, EyebrowPill } from "./Section";

/** One feature: copy on one side, a framed UI fragment on the other. Rows alternate on wide screens; copy leads on phones. */
export function FeatureRow({
  eyebrow,
  title,
  body,
  detail,
  visual,
  flip = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  detail: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <article className="grid items-center gap-10 md:grid-cols-2 md:gap-16 lg:gap-24">
      <div className={cx("space-y-4", flip && "md:order-2")}>
        <EyebrowPill>{eyebrow}</EyebrowPill>
        <h3 className="text-balance font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[36px]">{title}</h3>
        <p className="max-w-md text-pretty text-lg leading-relaxed text-stone-600">{body}</p>
        <p className="flex max-w-md items-start gap-3 border-t border-line pt-4 text-[15px] font-semibold leading-snug text-stone-800">
          <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-stone-900" />
          {detail}
        </p>
      </div>
      <div className={cx("mx-auto w-full max-w-md", flip && "md:order-1")}>
        <Bezel>{visual}</Bezel>
      </div>
    </article>
  );
}
