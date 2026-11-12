// Shared vocabulary for closet items. The vision tagger, the forms and the
// scorecard all speak this. Keep values lowercase and stable: they are stored.

export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "bag",
  "accessory",
  "jewelry",
  "activewear",
  "swim",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  top: "Tops",
  bottom: "Bottoms",
  dress: "Dresses & one-pieces",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bag: "Bags",
  accessory: "Accessories",
  jewelry: "Jewelry",
  activewear: "Activewear",
  swim: "Swim",
};

export const SUBCATEGORIES: Record<Category, string[]> = {
  top: [
    "tee",
    "tank",
    "cami",
    "blouse",
    "button-up shirt",
    "dress shirt",
    "polo",
    "henley",
    "sweater",
    "cardigan",
    "turtleneck",
    "hoodie",
    "sweatshirt",
    "quarter-zip",
    "bodysuit",
    "overshirt",
    "vest",
  ],
  bottom: [
    "jeans",
    "trousers",
    "chinos",
    "shorts",
    "skirt",
    "mini skirt",
    "midi skirt",
    "maxi skirt",
    "wide-leg pants",
    "leggings",
    "joggers",
  ],
  dress: [
    "mini dress",
    "midi dress",
    "maxi dress",
    "slip dress",
    "wrap dress",
    "shirt dress",
    "jumpsuit",
    "romper",
    "suit",
  ],
  outerwear: [
    "blazer",
    "jacket",
    "denim jacket",
    "leather jacket",
    "bomber",
    "trench",
    "coat",
    "puffer",
    "chore coat",
    "rain jacket",
    "vest",
  ],
  shoes: ["sneakers", "loafers", "boots", "chelsea boots", "heels", "sandals", "flats", "dress shoes", "slides"],
  bag: ["tote", "crossbody", "shoulder bag", "clutch", "backpack", "belt bag", "briefcase"],
  accessory: ["belt", "hat", "cap", "scarf", "sunglasses", "watch", "tie", "gloves"],
  jewelry: ["necklace", "earrings", "bracelet", "ring"],
  activewear: ["sports bra", "leggings", "performance top", "athletic shorts", "golf polo", "track jacket"],
  swim: ["swimsuit", "bikini", "trunks", "cover-up"],
};

// Visible construction details. The dislikes list in style_prefs fires on these.
export const CONSTRUCTION = [
  "collar",
  "polo collar",
  "button-front",
  "zipper",
  "pockets",
  "hood",
  "drawstring",
  "belted",
  "tie-waist",
  "elastic waist",
  "high-waisted",
  "cropped",
  "wide-leg",
  "slim",
  "relaxed",
  "tapered",
  "pleats",
  "ruffles",
  "tiered hem",
  "smocking",
  "peplum",
  "puff sleeve",
  "drop shoulder",
  "off-shoulder",
  "strapless",
  "halter",
  "v-neck",
  "crew neck",
  "scoop neck",
  "square neck",
  "mock neck",
  "slit",
  "sheer",
  "lined",
  "stretch",
  "ribbed",
  "cable knit",
  "quilted",
  "contrast trim",
  "logo",
] as const;
export type Construction = (typeof CONSTRUCTION)[number];

export const SEASONS = ["spring", "summer", "fall", "winter", "all"] as const;
export type Season = (typeof SEASONS)[number];

export const STATUSES = ["available", "laundry", "stored", "tailoring", "gone"] as const;
export type ItemStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  available: "In closet",
  laundry: "In laundry",
  stored: "Stored",
  tailoring: "At the tailor",
  gone: "Gone",
};

export const FORMALITY_LABELS: Record<number, string> = {
  1: "Lounge",
  2: "Casual",
  3: "Smart casual",
  4: "Business",
  5: "Formal",
};

export const WARMTH_LABELS: Record<number, string> = {
  1: "Hot weather",
  2: "Warm",
  3: "Mild",
  4: "Cool",
  5: "Cold",
};

export type ItemColor = { name: string; hex?: string; note?: string };

/** A closet_items row as the app reads it. */
export type ClosetItem = {
  id: string;
  user_id: string;
  image_path: string | null;
  source_image_url?: string | null;
  source_page_url?: string | null;
  generic_id: string | null;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  colors: ItemColor[];
  pattern: string | null;
  material: string | null;
  construction: string[];
  formality: number | null;
  warmth: number | null;
  seasons: string[];
  brand: string | null;
  price: number | null;
  size: string | null;
  status: ItemStatus;
  tailoring_note: string | null;
  last_worn: string | null;
  affinity: number;
  consent_version: number;
  created_at: string;
  updated_at: string;
};
