/**
 * Share-card artwork loading and tinting. Artwork is supplied by the owner in
 * public/card-art/ (see public/card-art/README.md). Nothing here invents art:
 * if a file is missing the renderer paints a clearly labeled swatch instead.
 */

export const CARD_ART_FILES = {
  bullet: 'lipstick-bullet.png',
  kiss: 'kiss-mark.png',
  caseOrnate: 'lipstick-case-ornate.png',
  caseSimple: 'lipstick-case-simple.png',
} as const;
export type CardArtKey = keyof typeof CARD_ART_FILES;

/** Bounded wait per asset so a slow network never hangs the preview. */
export const ART_TIMEOUT_MS = 6000;

/**
 * Case / bullet alignment, profiled from the actual supplied artwork (files differ
 * in size, so no shared-canvas assumption). All case values are normalized to the
 * case image: openCx = horizontal center of the opening, openY = vertical position
 * of the opening rim, openW = opening width. The bullet is drawn BEHIND the case;
 * its base sinks slightly into the opening (the opaque dark interior hides it) and
 * the tinted body protrudes upward.
 */
export interface CaseProfile { width: number; height: number; openCx: number; openY: number; openW: number }
export const CASE_PROFILES: Record<'caseOrnate' | 'caseSimple', CaseProfile> = {
  caseOrnate: { width: 1148, height: 1370, openCx: 0.724, openY: 0.175, openW: 0.235 },
  caseSimple: { width: 1199, height: 1312, openCx: 0.61, openY: 0.29, openW: 0.225 },
};

/** Opaque bounding box of lipstick-bullet.png (1024x1536); transparent margins are cropped at draw time. */
export const BULLET_SOURCE = { width: 1024, height: 1536, sx: 224, sy: 178, sw: 568, sh: 1188 } as const;
/** Bullet width relative to the opening width (sits just inside the rim). */
export const BULLET_WIDTH_IN_OPENING = 0.9;
/** How far the bullet base sinks below the rim, as a fraction of the drawn bullet height. */
export const BULLET_SINK = 0.05;

/** Source rect for the bullet: the profiled crop if the file matches, else the whole image. */
export function bulletSourceRect(img: HTMLImageElement) {
  const b = BULLET_SOURCE;
  if (img.naturalWidth === b.width && img.naturalHeight === b.height) return { sx: b.sx, sy: b.sy, sw: b.sw, sh: b.sh };
  return { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
}

export function cardArtUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}card-art/${file}`;
}

const cache = new Map<CardArtKey, Promise<HTMLImageElement | null>>();

function loadOnce(key: CardArtKey): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (v: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve(v);
    };
    const t = setTimeout(() => finish(null), ART_TIMEOUT_MS);
    img.onload = () => {
      if (!img.naturalWidth) return finish(null);
      (img.decode ? img.decode().catch(() => undefined) : Promise.resolve()).then(() => finish(img));
    };
    img.onerror = () => finish(null);
    img.src = cardArtUrl(CARD_ART_FILES[key]);
  });
}

/** Loads (and caches successes of) one artwork file; resolves null when absent or too slow. */
export function loadCardArt(key: CardArtKey): Promise<HTMLImageElement | null> {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = loadOnce(key).then((img) => {
    if (!img) cache.delete(key); // allow a retry after the owner uploads the file
    return img;
  });
  cache.set(key, p);
  return p;
}

function offscreen(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable on this device.');
  return { c, ctx };
}

/** White, softly shaded bullet multiplied by the shade: keeps grayscale shading and alpha. */
export function tintBullet(img: HTMLImageElement, hex: string): HTMLCanvasElement {
  const { c, ctx } = offscreen(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0);
  return c;
}

/** White textured kiss used as an alpha mask: the shade fills it, edges and texture come from alpha. */
export function tintKiss(img: HTMLImageElement, hex: string): HTMLCanvasElement {
  const { c, ctx } = offscreen(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}
