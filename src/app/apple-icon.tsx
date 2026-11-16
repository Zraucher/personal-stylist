import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the lowercase v on Go Green with the marigold dot.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#2f7d5b", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ fontSize: 132, fontWeight: 800, color: "#fbf7f2", lineHeight: 1, marginTop: -18, marginLeft: -8, fontFamily: "sans-serif" }}>v</div>
        <div style={{ position: "absolute", top: 34, right: 34, width: 32, height: 32, borderRadius: 16, background: "#f2c14e" }} />
      </div>
    ),
    size
  );
}
