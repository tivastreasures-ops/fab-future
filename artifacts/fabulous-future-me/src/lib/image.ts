/** Downscale a photo so its longest edge is at most `maxEdge`, preserving the full uncropped frame.
 * No filters, no beautification — a plain resample only. */
export async function downscaleImage(file: Blob, maxEdge = 1000, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.filter = 'none';
    ctx.drawImage(bmp, 0, 0, w, h);
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.92));
    if (!out) throw new Error('Could not prepare the image');
    return out;
  } finally {
    bmp.close();
  }
}
