import type { ReactNode } from "react";
import ItemPlaceholder from "@/lib/closet/placeholder";
import { cx } from "./cx";

type ThumbItem = { category?: string | null; subcategory?: string | null; colors?: Array<{ name: string; hex?: string }> | null };

const SIZE = {
  xs: "w-11 rounded-[10px]",
  sm: "w-14 rounded-[10px]",
  md: "w-20 rounded-thumb",
  fill: "w-full rounded-thumb",
} as const;

/**
 * Every garment image in the app: a 4:5 frame on the inset surface with a hairline.
 * Own photos fill the frame; retailer photos (`product`) sit inside a white well in both themes; no photo shows the garment silhouette.
 * Pass alt="" when a visible caption already names the piece, so screen readers don't hear it twice.
 */
export function Thumb({
  src,
  alt,
  item,
  size = "fill",
  product = false,
  badge,
  className,
}: {
  src?: string | null;
  alt: string;
  item?: ThumbItem;
  size?: keyof typeof SIZE;
  product?: boolean;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("relative aspect-[4/5] max-w-full shrink-0 overflow-hidden", product ? "bg-[#ffffff]" : "bg-inset", SIZE[size], className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          referrerPolicy={product ? "no-referrer" : undefined}
          className={product ? "h-full w-full object-contain p-[6%] mix-blend-multiply" : "h-full w-full object-cover"}
        />
      ) : (
        <ItemPlaceholder category={item?.category} subcategory={item?.subcategory} colors={item?.colors} label={alt} compact={size !== "fill"} />
      )}
      {badge}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-line" />
    </div>
  );
}

/** A small color dot. */
export function Swatch({ hex, name, className }: { hex?: string | null; name?: string; className?: string }) {
  return <span title={name} className={cx("inline-block size-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10", className)} style={{ background: hex ?? "var(--color-stone-300)" }} />;
}
