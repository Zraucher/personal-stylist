import type { StripItem } from "@/components/ui";

// Garment silhouettes for the product fragments on the landing page. No photos on the public page:
// every piece renders through Thumb's silhouette, tinted with its colour.

const piece = (id: string, name: string, subcategory: string, color: string, hex: string): StripItem => ({
  id,
  name,
  subcategory,
  colors: [{ name: color, hex }],
});

export const P = {
  linenShirt: piece("lp-1", "Linen shirt", "button-down shirt", "sky", "#9cc3e4"),
  chinos: piece("lp-2", "Olive chinos", "chinos", "olive", "#6b7a4b"),
  sneakers: piece("lp-3", "White sneakers", "sneakers", "white", "#f4f1ec"),
  belt: piece("lp-4", "Tan belt", "belt", "tan", "#b58a5a"),
  tee: piece("lp-5", "Cream tee", "tee", "cream", "#efe6d2"),
  jeans: piece("lp-6", "Dark jeans", "jeans", "indigo", "#2f3a5a"),
  blazer: piece("lp-7", "Linen blazer", "blazer", "sage", "#9db08f"),
  loafers: piece("lp-8", "Brown loafers", "loafers", "brown", "#6b4a32"),
  dress: piece("lp-9", "Rust dress", "dress", "rust", "#b5532f"),
  sandals: piece("lp-10", "Tan sandals", "sandals", "tan", "#c49a6c"),
  skirt: piece("lp-11", "Navy skirt", "skirt", "navy", "#2c3e63"),
  tote: piece("lp-12", "Canvas tote", "tote", "natural", "#d9c9a8"),
  knit: piece("lp-13", "Rust sweater", "sweater", "rust", "#a8512f"),
  jacket: piece("lp-14", "Denim jacket", "jacket", "denim", "#5b7fa6"),
};
