"use client";

import { useState } from "react";
import ItemPlaceholder from "@/lib/closet/placeholder";
import { layout, type MockupMode } from "@/lib/outfit/mockup";
import { Segmented } from "./Segmented";
import { cx } from "./cx";
import type { StripItem } from "./Outfit";

/**
 * The whole look as one picture: a flat lay on a board, or a ghost model (pieces stacked as if worn).
 * shortcut: store photos on white blend into the canvas; a person's own photos keep their background. Cut-outs need a background-removal step.
 */
export function OutfitMockup({ items, className }: { items: StripItem[]; className?: string }) {
  const [mode, setMode] = useState<MockupMode>("flatlay");
  const boxes = layout(items, mode);
  const left = boxes.filter((b) => !b).length;
  return (
    <div className={cx("space-y-2", className)}>
      <Segmented
        label="Mockup"
        value={mode}
        onChange={setMode}
        options={[
          { value: "flatlay", label: "Flat lay" },
          { value: "ghost", label: "Ghost model" },
        ]}
      />
      <div
        role="img"
        aria-label={`${mode === "ghost" ? "Ghost model" : "Flat lay"} of ${items.map((i) => i.name).join(", ")}`}
        className={cx("relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-card ring-1 ring-line", mode === "ghost" ? "bg-[#ffffff]" : "bg-[#f1ebe1]")}
      >
        {items.map((it, i) => {
          const b = boxes[i];
          if (!b) return null;
          return (
            <div
              key={it.id + i}
              aria-hidden="true"
              className="absolute transition-all duration-300 ease-soft motion-reduce:transition-none"
              style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: b.z, transform: `rotate(${b.rotate}deg)` }}
            >
              {it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.url}
                  alt=""
                  referrerPolicy={it.product ? "no-referrer" : undefined}
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              ) : (
                // No photo: the silhouette alone, sized to its spot, without the thumbnail's background.
                <div className="h-full w-full [&>div]:bg-transparent [&_svg]:h-full [&_svg]:w-full">
                  <ItemPlaceholder category={it.category} subcategory={it.subcategory} colors={it.colors} label="" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {left > 0 && <p className="text-center text-xs text-stone-500">{left === 1 ? "One more piece" : `${left} more pieces`} didn&apos;t fit in the picture.</p>}
    </div>
  );
}
