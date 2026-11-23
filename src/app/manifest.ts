import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "valette",
    short_name: "valette",
    description: "Check it on you before you wear it.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2f7d5b",
    orientation: "portrait",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android: "Share" from a store page lands on /save with the link.
    share_target: { action: "/save", method: "GET", params: { title: "title", text: "text", url: "url" } },
    shortcuts: [
      { name: "Save a product", url: "/save" },
      { name: "Today", url: "/today" },
      { name: "Plan my week", url: "/plan" },
      { name: "Closet", url: "/closet" },
    ],
  };
}
