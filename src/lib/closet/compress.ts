/**
 * Browser-side resize before upload. Phone photos are 3-12 MB; the tagger
 * and the grid need nothing past ~1600px. Falls back to the original file
 * when the browser cannot decode it (some HEIC cases).
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<{ blob: Blob; type: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("toBlob failed");
    return { blob, type: "image/jpeg" };
  } catch {
    return { blob: file, type: file.type || "image/jpeg" };
  }
}
