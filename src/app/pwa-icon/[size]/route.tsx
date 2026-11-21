import { ImageResponse } from "next/og";

// App icons for the install manifest. "maskable" keeps the mark inside the safe zone
// so Android can crop it to a circle or squircle.
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const maskable = raw === "maskable";
  const size = maskable ? 512 : raw === "192" ? 192 : 512;
  const scale = (maskable ? 0.72 : 1) * (size / 180);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#2f7d5b", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ fontSize: 132 * scale, fontWeight: 800, color: "#fbf7f2", lineHeight: 1, marginTop: -18 * scale, marginLeft: -8 * scale, fontFamily: "sans-serif" }}>v</div>
        <div
          style={{
            position: "absolute",
            top: size / 2 - 56 * scale,
            left: size / 2 + 22 * scale,
            width: 32 * scale,
            height: 32 * scale,
            borderRadius: 16 * scale,
            background: "#f2c14e",
          }}
        />
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=604800, immutable" } }
  );
}
