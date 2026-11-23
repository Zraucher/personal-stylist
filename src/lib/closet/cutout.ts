// Pure: lift a garment off a plain background (bed, floor, wall, store white). Plain Node can test it.
// shortcut: flood-fills from the photo's edges, so busy or patterned backgrounds stay; a segmentation model is the upgrade.

const STEP = 22; // how far one pixel may differ from its neighbour and still be the same background
const FAR = 70; // how far the background may drift from its edge colour (shadows, folds in a sheet)

const dist = (p: Uint8ClampedArray, i: number, q: Uint8ClampedArray, j: number) => {
  const r = p[i] - q[j], g = p[i + 1] - q[j + 1], b = p[i + 2] - q[j + 2];
  return Math.sqrt(r * r + g * g + b * b);
};

export type Cutout = { removed: number; box: { x: number; y: number; w: number; h: number } | null };

/** Makes the background transparent in place (RGBA pixels) and returns how much went and where the garment is. */
export function cutout(px: Uint8ClampedArray, w: number, h: number): Cutout {
  const n = w * h;
  const edge: number[] = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);

  // The usual edge colour: per-channel median. Edge pixels far from it are the garment touching the frame.
  const ref = new Uint8ClampedArray(3);
  for (let c = 0; c < 3; c++) {
    const vals = edge.map((k) => px[k * 4 + c]).sort((a, b) => a - b);
    ref[c] = vals[vals.length >> 1];
  }

  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  for (const k of edge) {
    if (!bg[k] && dist(px, k * 4, ref, 0) < FAR) {
      bg[k] = 1;
      queue[tail++] = k;
    }
  }
  while (head < tail) {
    const k = queue[head++];
    const x = k % w;
    for (const j of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, k - w, k + w]) {
      if (j < 0 || j >= n || bg[j]) continue;
      if (dist(px, j * 4, px, k * 4) < STEP && dist(px, j * 4, ref, 0) < FAR) {
        bg[j] = 1;
        queue[tail++] = j;
      }
    }
  }

  // Soft edge: alpha from the share of garment in each 3x3 neighbourhood, so outlines don't look cut with scissors.
  let removed = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let keep = 0, all = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
          all++;
          if (!bg[yy * w + xx]) keep++;
        }
      }
      const k = y * w + x;
      const a = bg[k] ? 0 : Math.round((255 * keep) / all);
      px[k * 4 + 3] = Math.min(px[k * 4 + 3], a);
      if (bg[k]) removed++;
      else {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { removed: removed / n, box: x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}

/** A cut-out sits next to its original as `<original>.cutout.<ext>`, so the original can come back. */
export const CUTOUT = /\.cutout\.(?:png|webp)$/;
export const originalOf = (path: string) => (CUTOUT.test(path) ? path.replace(CUTOUT, "") : null);
/** Every stored file behind one image_path: the photo, plus the original when it's a cut-out. */
export const photoFiles = (path: string | null | undefined) => (path ? [path, ...(originalOf(path) ? [originalOf(path) as string] : [])] : []);
