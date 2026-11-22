import { resolveColor } from "@/lib/scorecard/rules";
import type { ItemColor } from "./taxonomy";

// Simple garment silhouettes drawn on a 100x100 canvas. Used wherever an item
// has no photo yet, tinted with the item's first known color.

type Kind =
  | "tee"
  | "polo"
  | "hoodie"
  | "shirt"
  | "jacket"
  | "pants"
  | "shorts"
  | "skirt"
  | "dress"
  | "shoe"
  | "hat"
  | "socks"
  | "belt"
  | "glasses"
  | "bag"
  | "underwear"
  | "generic";

const SHAPES: Record<Exclude<Kind, "glasses" | "generic">, string[]> = {
  tee: ["M30 20 L42 16 Q50 24 58 16 L70 20 L84 36 L74 44 L68 38 L68 84 L32 84 L32 38 L26 44 L16 36 Z"],
  polo: [
    "M30 20 L42 16 L50 30 L58 16 L70 20 L84 36 L74 44 L68 38 L68 84 L32 84 L32 38 L26 44 L16 36 Z",
    "M50 30 L50 52",
  ],
  hoodie: [
    "M32 24 Q50 4 68 24 L86 42 L76 50 L68 44 L68 88 L32 88 L32 44 L24 50 L14 42 Z",
    "M38 26 Q50 40 62 26",
  ],
  shirt: [
    "M30 18 L42 14 L50 26 L58 14 L70 18 L90 62 L80 66 L68 40 L68 88 L32 88 L32 40 L20 66 L10 62 Z",
    "M50 26 L50 88",
  ],
  jacket: [
    "M28 18 L42 12 L50 26 L58 12 L72 18 L92 64 L82 68 L70 42 L70 90 L30 90 L30 42 L18 68 L8 64 Z",
    "M50 26 L50 90",
  ],
  pants: ["M32 12 L68 12 L72 90 L54 90 L50 40 L46 90 L28 90 Z"],
  shorts: ["M30 18 L70 18 L76 62 L54 62 L50 40 L46 62 L24 62 Z"],
  skirt: ["M36 16 L64 16 L82 84 L18 84 Z"],
  dress: ["M38 10 L46 10 L50 22 L54 10 L62 10 L66 38 L84 86 L16 86 L34 38 Z"],
  shoe: ["M10 62 L10 48 Q10 40 20 40 L38 40 L46 52 L66 56 Q90 60 90 72 L90 78 L10 78 Z", "M10 70 L90 70"],
  hat: ["M18 56 Q18 28 50 28 Q82 28 82 56 L96 60 Q96 66 82 66 L18 66 Z"],
  socks: ["M38 10 L62 10 L62 56 L82 70 Q84 84 72 84 L48 84 Q38 84 38 72 Z"],
  belt: ["M8 44 H92 V56 H8 Z", "M44 40 H60 V60 H44 Z"],
  bag: ["M26 38 H74 L80 88 H20 Z", "M38 38 Q38 16 50 16 Q62 16 62 38"],
  underwear: ["M24 30 H76 L70 56 L56 70 L50 56 L44 70 L30 56 Z"],
};

export function placeholderKind(category: string | null | undefined, subcategory: string | null | undefined): Kind {
  const s = `${subcategory ?? ""} ${category ?? ""}`.toLowerCase();
  if (/sunglass|glasses|eyewear/.test(s)) return "glasses";
  if (/hoodie|sweatshirt|quarter-zip|pullover/.test(s)) return "hoodie";
  if (/polo/.test(s)) return "polo";
  if (/dress shirt|button|overshirt|blouse|flannel/.test(s)) return "shirt";
  if (/jacket|blazer|coat|trench|puffer|bomber|vest|outerwear|cardigan/.test(s)) return "jacket";
  if (/tee|tank|cami|henley|top|sweater|turtleneck|bodysuit/.test(s)) return "tee";
  if (/shorts|trunks/.test(s)) return "shorts";
  if (/skirt/.test(s)) return "skirt";
  if (/dress|jumpsuit|romper/.test(s)) return "dress";
  if (/pants|jeans|trouser|chino|jogger|legging|sweatpants|bottom/.test(s)) return "pants";
  if (/sock/.test(s)) return "socks";
  if (/underwear|boxer|brief|undershirt/.test(s)) return "underwear";
  if (/shoe|sneaker|boot|loafer|sandal|slide|heel|flat/.test(s)) return "shoe";
  if (/hat|cap|beanie/.test(s)) return "hat";
  if (/belt/.test(s)) return "belt";
  if (/bag|backpack|tote|clutch/.test(s)) return "bag";
  return "generic";
}

function tintFor(colors: ItemColor[] | null | undefined): string {
  for (const c of colors ?? []) {
    const hex = resolveColor(c);
    if (hex) return hex;
  }
  return "var(--color-stone-300)";
}

/** Pick a stroke that stays visible on both light and dark fills. */
function strokeFor(hex: string): string {
  if (!hex.startsWith("#")) return "rgb(29 27 43 / 0.35)";
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum < 0.35 ? "rgb(251 247 242 / 0.55)" : "rgb(29 27 43 / 0.45)";
}

export default function ItemPlaceholder({
  category,
  subcategory,
  colors,
  label,
  compact = false,
}: {
  category: string | null | undefined;
  subcategory: string | null | undefined;
  colors?: ItemColor[] | null;
  label?: string;
  /** Small thumbnails: a slightly larger silhouette. */
  compact?: boolean;
}) {
  const kind = placeholderKind(category, subcategory);
  const fill = tintFor(colors);
  const stroke = strokeFor(fill);
  // An empty label means a caption nearby already names the piece: hide the drawing from screen readers.
  const name = label === "" ? null : label ?? subcategory ?? category ?? "item";
  return (
    <div className="flex h-full w-full items-center justify-center bg-inset">
      <svg viewBox="0 0 100 100" className={compact ? "h-[72%] w-[72%]" : "h-3/5 w-3/5"} {...(name ? { role: "img", "aria-label": name } : { "aria-hidden": true })}>
        {kind === "glasses" ? (
          <g fill={fill} fillOpacity="0.85" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round">
            <rect x="10" y="38" width="32" height="22" rx="7" />
            <rect x="58" y="38" width="32" height="22" rx="7" />
            <path d="M42 46 Q50 41 58 46" fill="none" />
            <path d="M10 44 L4 40 M90 44 L96 40" fill="none" />
          </g>
        ) : kind === "generic" ? (
          <rect x="22" y="22" width="56" height="56" rx="10" fill={fill} stroke={stroke} strokeWidth="2.5" />
        ) : (
          <g fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
            <path d={SHAPES[kind][0]} />
            {SHAPES[kind].slice(1).map((d, i) => (
              <path key={i} d={d} fill="none" />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
