import type { Category, ItemColor } from "./taxonomy";

/**
 * Generic wardrobe staples. Ticking one creates a closet item with
 * generic_id set, so the recommender has something to work with before
 * the photo work is done. Photos can be attached to these later.
 */
export type Basic = {
  id: string;
  name: string;
  category: Category;
  subcategory: string;
  colors: ItemColor[];
  formality: number;
  warmth: number;
  seasons: string[];
  construction?: string[];
};

export type Presentation = "womens" | "mens";

const ALL = ["all"];
const WARM = ["spring", "summer", "fall"];
const COOL = ["fall", "winter", "spring"];

export const BASICS: Record<Presentation, Basic[]> = {
  womens: [
    { id: "w-white-tee", name: "White tee", category: "top", subcategory: "tee", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 2, warmth: 1, seasons: ALL },
    { id: "w-black-tee", name: "Black tee", category: "top", subcategory: "tee", colors: [{ name: "black", hex: "#121212" }], formality: 2, warmth: 1, seasons: ALL },
    { id: "w-striped-tee", name: "Striped tee", category: "top", subcategory: "tee", colors: [{ name: "navy", hex: "#1f2a44" }, { name: "white", hex: "#f5f5f0" }], formality: 2, warmth: 1, seasons: ALL },
    { id: "w-white-tank", name: "Fitted ribbed tank", category: "top", subcategory: "tank", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 2, warmth: 1, seasons: WARM, construction: ["ribbed"] },
    { id: "w-black-cami", name: "Black cami", category: "top", subcategory: "cami", colors: [{ name: "black", hex: "#121212" }], formality: 3, warmth: 1, seasons: WARM },
    { id: "w-silk-blouse", name: "Silk blouse", category: "top", subcategory: "blouse", colors: [], formality: 3, warmth: 1, seasons: ALL },
    { id: "w-white-button-up", name: "White button-up shirt", category: "top", subcategory: "button-up shirt", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 3, warmth: 2, seasons: ALL, construction: ["collar", "button-front"] },
    { id: "w-turtleneck", name: "Black turtleneck", category: "top", subcategory: "turtleneck", colors: [{ name: "black", hex: "#121212" }], formality: 3, warmth: 4, seasons: COOL },
    { id: "w-knit-sweater", name: "Crewneck knit sweater", category: "top", subcategory: "sweater", colors: [], formality: 2, warmth: 4, seasons: COOL, construction: ["crew neck"] },
    { id: "w-cardigan", name: "Cardigan", category: "top", subcategory: "cardigan", colors: [], formality: 2, warmth: 3, seasons: COOL, construction: ["button-front"] },
    { id: "w-blazer", name: "Blazer", category: "outerwear", subcategory: "blazer", colors: [], formality: 4, warmth: 3, seasons: ALL, construction: ["collar"] },
    { id: "w-denim-jacket", name: "Denim jacket", category: "outerwear", subcategory: "denim jacket", colors: [{ name: "mid blue", hex: "#5b7fa6" }], formality: 2, warmth: 3, seasons: COOL, construction: ["collar", "button-front"] },
    { id: "w-leather-jacket", name: "Leather jacket", category: "outerwear", subcategory: "leather jacket", colors: [{ name: "black", hex: "#121212" }], formality: 3, warmth: 3, seasons: COOL, construction: ["zipper"] },
    { id: "w-trench", name: "Trench coat", category: "outerwear", subcategory: "trench", colors: [{ name: "camel", hex: "#b78f5a" }], formality: 4, warmth: 3, seasons: COOL, construction: ["belted", "collar"] },
    { id: "w-puffer", name: "Puffer", category: "outerwear", subcategory: "puffer", colors: [], formality: 1, warmth: 5, seasons: ["winter"], construction: ["quilted", "zipper"] },
    { id: "w-blue-jeans", name: "Blue straight jeans", category: "bottom", subcategory: "jeans", colors: [{ name: "mid blue", hex: "#5b7fa6" }], formality: 2, warmth: 3, seasons: ALL, construction: ["high-waisted"] },
    { id: "w-black-jeans", name: "Black jeans", category: "bottom", subcategory: "jeans", colors: [{ name: "black", hex: "#121212" }], formality: 2, warmth: 3, seasons: ALL },
    { id: "w-wide-leg", name: "Wide-leg trousers", category: "bottom", subcategory: "wide-leg pants", colors: [], formality: 3, warmth: 2, seasons: ALL, construction: ["wide-leg", "high-waisted"] },
    { id: "w-black-trousers", name: "Black tailored trousers", category: "bottom", subcategory: "trousers", colors: [{ name: "black", hex: "#121212" }], formality: 4, warmth: 2, seasons: ALL },
    { id: "w-midi-skirt", name: "Midi skirt", category: "bottom", subcategory: "midi skirt", colors: [], formality: 3, warmth: 2, seasons: ALL },
    { id: "w-maxi-skirt", name: "Maxi skirt", category: "bottom", subcategory: "maxi skirt", colors: [], formality: 3, warmth: 2, seasons: WARM },
    { id: "w-slip-dress", name: "Slip dress", category: "dress", subcategory: "slip dress", colors: [], formality: 4, warmth: 1, seasons: WARM },
    { id: "w-lbd", name: "Little black dress", category: "dress", subcategory: "mini dress", colors: [{ name: "black", hex: "#121212" }], formality: 4, warmth: 1, seasons: ALL },
    { id: "w-wrap-dress", name: "Wrap dress", category: "dress", subcategory: "wrap dress", colors: [], formality: 3, warmth: 2, seasons: WARM, construction: ["tie-waist", "v-neck"] },
    { id: "w-jumpsuit", name: "Jumpsuit", category: "dress", subcategory: "jumpsuit", colors: [], formality: 3, warmth: 2, seasons: ALL },
    { id: "w-white-sneakers", name: "White sneakers", category: "shoes", subcategory: "sneakers", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 2, warmth: 2, seasons: ALL },
    { id: "w-ankle-boots", name: "Black ankle boots", category: "shoes", subcategory: "boots", colors: [{ name: "black", hex: "#121212" }], formality: 3, warmth: 4, seasons: COOL },
    { id: "w-loafers", name: "Loafers", category: "shoes", subcategory: "loafers", colors: [], formality: 3, warmth: 2, seasons: ALL },
    { id: "w-heels", name: "Strappy heels", category: "shoes", subcategory: "heels", colors: [], formality: 4, warmth: 1, seasons: ALL },
    { id: "w-sandals", name: "Flat sandals", category: "shoes", subcategory: "sandals", colors: [], formality: 2, warmth: 1, seasons: ["summer"] },
    { id: "w-tote", name: "Everyday tote", category: "bag", subcategory: "tote", colors: [], formality: 3, warmth: 1, seasons: ALL },
    { id: "w-crossbody", name: "Crossbody bag", category: "bag", subcategory: "crossbody", colors: [], formality: 3, warmth: 1, seasons: ALL },
    { id: "w-belt", name: "Leather belt", category: "accessory", subcategory: "belt", colors: [], formality: 3, warmth: 1, seasons: ALL },
    { id: "w-sunglasses", name: "Sunglasses", category: "accessory", subcategory: "sunglasses", colors: [], formality: 2, warmth: 1, seasons: ALL },
    { id: "w-hoops", name: "Everyday hoops", category: "jewelry", subcategory: "earrings", colors: [], formality: 3, warmth: 1, seasons: ALL },
    { id: "w-leggings", name: "Workout leggings", category: "activewear", subcategory: "leggings", colors: [{ name: "black", hex: "#121212" }], formality: 1, warmth: 2, seasons: ALL },
    { id: "w-sports-bra", name: "Sports bra", category: "activewear", subcategory: "sports bra", colors: [], formality: 1, warmth: 1, seasons: ALL },
  ],
  mens: [
    { id: "m-white-tee", name: "White tee", category: "top", subcategory: "tee", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 2, warmth: 1, seasons: ALL },
    { id: "m-black-tee", name: "Black tee", category: "top", subcategory: "tee", colors: [{ name: "black", hex: "#121212" }], formality: 2, warmth: 1, seasons: ALL },
    { id: "m-grey-tee", name: "Heather grey tee", category: "top", subcategory: "tee", colors: [{ name: "heather grey", hex: "#8a8a8a" }], formality: 2, warmth: 1, seasons: ALL },
    { id: "m-henley", name: "Henley", category: "top", subcategory: "henley", colors: [], formality: 2, warmth: 2, seasons: COOL, construction: ["button-front"] },
    { id: "m-white-oxford", name: "White oxford shirt", category: "top", subcategory: "button-up shirt", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 3, warmth: 2, seasons: ALL, construction: ["collar", "button-front"] },
    { id: "m-blue-oxford", name: "Light blue oxford shirt", category: "top", subcategory: "button-up shirt", colors: [{ name: "light blue", hex: "#a9c4e0" }], formality: 3, warmth: 2, seasons: ALL, construction: ["collar", "button-front"] },
    { id: "m-white-dress-shirt", name: "White dress shirt", category: "top", subcategory: "dress shirt", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 4, warmth: 2, seasons: ALL, construction: ["collar", "button-front"] },
    { id: "m-blue-dress-shirt", name: "Blue dress shirt", category: "top", subcategory: "dress shirt", colors: [{ name: "blue", hex: "#3b6ea8" }], formality: 4, warmth: 2, seasons: ALL, construction: ["collar", "button-front"] },
    { id: "m-polo", name: "Polo", category: "top", subcategory: "polo", colors: [], formality: 3, warmth: 1, seasons: WARM, construction: ["polo collar"] },
    { id: "m-performance-polo", name: "Performance polo", category: "top", subcategory: "polo", colors: [], formality: 3, warmth: 1, seasons: WARM, construction: ["polo collar", "stretch"] },
    { id: "m-crewneck-sweater", name: "Crewneck sweater", category: "top", subcategory: "sweater", colors: [], formality: 3, warmth: 4, seasons: COOL, construction: ["crew neck"] },
    { id: "m-quarter-zip", name: "Quarter-zip", category: "top", subcategory: "quarter-zip", colors: [], formality: 3, warmth: 3, seasons: COOL, construction: ["zipper", "mock neck"] },
    { id: "m-hoodie", name: "Hoodie", category: "top", subcategory: "hoodie", colors: [], formality: 1, warmth: 3, seasons: COOL, construction: ["hood", "drawstring"] },
    { id: "m-overshirt", name: "Overshirt", category: "top", subcategory: "overshirt", colors: [], formality: 2, warmth: 3, seasons: COOL, construction: ["collar", "button-front", "pockets"] },
    { id: "m-chore-coat", name: "Chore coat", category: "outerwear", subcategory: "chore coat", colors: [], formality: 2, warmth: 3, seasons: COOL, construction: ["collar", "button-front", "pockets"] },
    { id: "m-navy-blazer", name: "Navy blazer", category: "outerwear", subcategory: "blazer", colors: [{ name: "navy", hex: "#1f2a44" }], formality: 4, warmth: 3, seasons: ALL, construction: ["collar"] },
    { id: "m-denim-jacket", name: "Denim jacket", category: "outerwear", subcategory: "denim jacket", colors: [{ name: "mid blue", hex: "#5b7fa6" }], formality: 2, warmth: 3, seasons: COOL, construction: ["collar", "button-front"] },
    { id: "m-rain-jacket", name: "Rain jacket", category: "outerwear", subcategory: "rain jacket", colors: [], formality: 1, warmth: 3, seasons: COOL, construction: ["hood", "zipper"] },
    { id: "m-puffer", name: "Puffer", category: "outerwear", subcategory: "puffer", colors: [], formality: 1, warmth: 5, seasons: ["winter"], construction: ["quilted", "zipper"] },
    { id: "m-topcoat", name: "Wool topcoat", category: "outerwear", subcategory: "coat", colors: [], formality: 4, warmth: 5, seasons: ["winter"], construction: ["collar", "button-front"] },
    { id: "m-khaki-chinos", name: "Khaki chinos", category: "bottom", subcategory: "chinos", colors: [{ name: "khaki", hex: "#b9a680" }], formality: 3, warmth: 2, seasons: ALL },
    { id: "m-navy-chinos", name: "Navy chinos", category: "bottom", subcategory: "chinos", colors: [{ name: "navy", hex: "#1f2a44" }], formality: 3, warmth: 2, seasons: ALL },
    { id: "m-dark-denim", name: "Dark indigo jeans", category: "bottom", subcategory: "jeans", colors: [{ name: "indigo", hex: "#2b3a5c" }], formality: 2, warmth: 3, seasons: ALL },
    { id: "m-black-jeans", name: "Black jeans", category: "bottom", subcategory: "jeans", colors: [{ name: "black", hex: "#121212" }], formality: 2, warmth: 3, seasons: ALL },
    { id: "m-dress-trousers", name: "Dress trousers", category: "bottom", subcategory: "trousers", colors: [], formality: 4, warmth: 2, seasons: ALL },
    { id: "m-joggers", name: "Joggers", category: "bottom", subcategory: "joggers", colors: [], formality: 1, warmth: 2, seasons: ALL, construction: ["drawstring", "tapered"] },
    { id: "m-shorts", name: "Everyday shorts", category: "bottom", subcategory: "shorts", colors: [], formality: 2, warmth: 1, seasons: ["summer"] },
    { id: "m-suit", name: "Suit (navy or charcoal)", category: "dress", subcategory: "suit", colors: [], formality: 5, warmth: 3, seasons: ALL, construction: ["collar", "button-front"] },
    { id: "m-white-sneakers", name: "White sneakers", category: "shoes", subcategory: "sneakers", colors: [{ name: "white", hex: "#f5f5f0" }], formality: 2, warmth: 2, seasons: ALL },
    { id: "m-loafers", name: "Loafers", category: "shoes", subcategory: "loafers", colors: [], formality: 3, warmth: 2, seasons: ALL },
    { id: "m-chelsea-boots", name: "Chelsea boots", category: "shoes", subcategory: "chelsea boots", colors: [], formality: 3, warmth: 4, seasons: COOL },
    { id: "m-dress-shoes", name: "Black dress shoes", category: "shoes", subcategory: "dress shoes", colors: [{ name: "black", hex: "#121212" }], formality: 5, warmth: 2, seasons: ALL },
    { id: "m-brown-belt", name: "Brown leather belt", category: "accessory", subcategory: "belt", colors: [{ name: "brown", hex: "#6b4a2b" }], formality: 3, warmth: 1, seasons: ALL },
    { id: "m-black-belt", name: "Black leather belt", category: "accessory", subcategory: "belt", colors: [{ name: "black", hex: "#121212" }], formality: 4, warmth: 1, seasons: ALL },
    { id: "m-watch", name: "Everyday watch", category: "accessory", subcategory: "watch", colors: [], formality: 3, warmth: 1, seasons: ALL },
    { id: "m-sunglasses", name: "Sunglasses", category: "accessory", subcategory: "sunglasses", colors: [], formality: 2, warmth: 1, seasons: ALL },
    { id: "m-cap", name: "Cap", category: "accessory", subcategory: "cap", colors: [], formality: 1, warmth: 1, seasons: ALL },
    { id: "m-golf-polo", name: "Golf polo", category: "activewear", subcategory: "golf polo", colors: [], formality: 2, warmth: 1, seasons: WARM, construction: ["polo collar", "stretch"] },
    { id: "m-athletic-shorts", name: "Athletic shorts", category: "activewear", subcategory: "athletic shorts", colors: [], formality: 1, warmth: 1, seasons: ALL },
  ],
};

export function findBasic(id: string): Basic | undefined {
  return BASICS.womens.find((b) => b.id === id) ?? BASICS.mens.find((b) => b.id === id);
}
