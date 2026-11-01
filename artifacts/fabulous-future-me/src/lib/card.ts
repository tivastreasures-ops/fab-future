import { BULLET_SINK, BULLET_WIDTH_IN_OPENING, CARD_ART_FILES, CASE_PROFILES, bulletSourceRect, loadCardArt, tintBullet, tintKiss } from './card-art';
import { TAGLINE, type Look, type StudioSettings } from './types';

const W = 1080;
const H = 1350;
const SERIF = "'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif";
const SANS = "'Avenir Next', 'Segoe UI', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const GOLD = '#D2A85A';
const CREAM = '#FBF3E6';
const MAUVE = '#E4C6D6';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
      if (lines.length >= maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length >= maxLines) break;
  }
  const total = text.split(/\s+/).filter(Boolean).length;
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (used < total && lines.length) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}...`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}...`;
  }
  return lines;
}

function backdrop(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#5A2558');
  g.addColorStop(0.55, '#3B1639');
  g.addColorStop(1, '#22102A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W * 0.2, 0, 10, W * 0.2, 0, W);
  r.addColorStop(0, 'rgba(220,160,200,0.28)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  // velvet nap lines
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 2;
  for (let x = -H; x < W; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + H * 0.47, 0);
    ctx.stroke();
  }
  // gold double frame
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(210,168,90,0.6)';
  ctx.strokeRect(52, 52, W - 104, H - 104);
}

function catMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2 / s;
  ctx.beginPath();
  ctx.moveTo(4, 26);
  ctx.lineTo(8, 6);
  ctx.lineTo(16, 16);
  ctx.quadraticCurveTo(22, 13, 28, 16);
  ctx.lineTo(36, 6);
  ctx.lineTo(40, 26);
  ctx.quadraticCurveTo(22, 44, 4, 26);
  ctx.stroke();
  ctx.restore();
}


function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('The card could not be painted.'))), 'image/png'));
}

function header(ctx: CanvasRenderingContext2D, settings: StudioSettings) {
  catMark(ctx, 96, 92, 1.4);
  ctx.fillStyle = GOLD;
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText('FABULOUS FUTURE ME', 170, 125);
  if (settings.showTitleOnCards) {
    ctx.fillStyle = MAUVE;
    ctx.font = `italic 30px ${SERIF}`;
    const t = settings.displayName ? `${settings.collectionTitle} · ${settings.displayName}` : settings.collectionTitle;
    ctx.fillText(wrap(ctx, t, W - 200, 1)[0] ?? '', 96, 180);
  }
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(210,168,90,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(96, H - 140);
  ctx.lineTo(W - 96, H - 140);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = `italic 34px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(TAGLINE, W / 2, H - 92);
  ctx.textAlign = 'left';
}

export type CardStyle = 'simple' | 'luxe' | 'kiss';
export const CARD_STYLES: { id: CardStyle; label: string; hint: string }[] = [
  { id: 'simple', label: 'Simple', hint: 'Editorial swatch and shade name' },
  { id: 'luxe', label: 'Luxe', hint: 'Ornate gold case, your bullet' },
  { id: 'kiss', label: 'Kiss Mark', hint: 'A kiss in your exact shade' },
];

export interface LookCardSnapshot {
  look: Look;
  settings: StudioSettings;
  style: CardStyle;
}

export interface LookCardResult {
  blob: Blob;
  /** Artwork files that could not be loaded; the card shows a labeled swatch instead. */
  missingArt: string[];
}

const PLUM = '#3B1639';
const DEEP_GOLD = '#9A7232';
const PAPER = '#F5EBDD';

function paperBackdrop(ctx: CanvasRenderingContext2D, blush: boolean) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, H * 0.38, 40, W / 2, H * 0.38, W * 0.8);
  r.addColorStop(0, blush ? 'rgba(228,198,214,0.55)' : 'rgba(255,250,240,0.7)');
  r.addColorStop(1, 'rgba(228,198,214,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = DEEP_GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(154,114,50,0.55)';
  ctx.strokeRect(52, 52, W - 104, H - 104);
}

function catMarkFull(ctx: CanvasRenderingContext2D, cx: number, top: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx - 22 * s, top);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(4, 26);
  ctx.lineTo(8, 6);
  ctx.lineTo(16, 16);
  ctx.quadraticCurveTo(22, 13, 28, 16);
  ctx.lineTo(36, 6);
  ctx.lineTo(40, 26);
  ctx.quadraticCurveTo(22, 44, 4, 26);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(16, 25, 1.6, 0, Math.PI * 2);
  ctx.arc(28, 25, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

interface Ink { main: string; gold: string; soft: string }

/** Centered brand header; returns the y where content may begin. */
function brandHeader(ctx: CanvasRenderingContext2D, settings: StudioSettings, ink: Ink): number {
  catMarkFull(ctx, W / 2, 84, 2.2, ink.gold);
  ctx.textAlign = 'center';
  ctx.fillStyle = ink.gold;
  ctx.font = `600 26px ${SANS}`;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '6px';
  ctx.fillText('FABULOUS FUTURE ME', W / 2, 210);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  let y = 232;
  if (settings.showTitleOnCards && settings.collectionTitle.trim()) {
    ctx.fillStyle = ink.soft;
    ctx.font = `italic 32px ${SERIF}`;
    const t = settings.displayName.trim() ? `${settings.collectionTitle} \u00B7 ${settings.displayName}` : settings.collectionTitle;
    ctx.fillText(wrap(ctx, t, W - 220, 1)[0] ?? '', W / 2, 260);
    y = 284;
  }
  ctx.textAlign = 'left';
  return y;
}

function centeredFooter(ctx: CanvasRenderingContext2D, ink: Ink) {
  ctx.strokeStyle = ink.gold;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 260, H - 150);
  ctx.lineTo(W / 2 + 260, H - 150);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink.gold;
  ctx.font = `italic 36px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(TAGLINE, W / 2, H - 98);
  ctx.textAlign = 'left';
}

interface TextLayout { nameLines: string[]; moodLines: string[]; height: number }

function layoutText(ctx: CanvasRenderingContext2D, look: Look): TextLayout {
  ctx.font = `600 84px ${SERIF}`;
  const nameLines = wrap(ctx, look.name.trim() || 'Untitled shade', W - 220, 2);
  ctx.font = `italic 38px ${SERIF}`;
  const moodLines = look.mood.trim() ? wrap(ctx, look.mood.trim(), W - 260, 2) : [];
  return { nameLines, moodLines, height: nameLines.length * 92 + 56 + (moodLines.length ? moodLines.length * 48 + 10 : 0) };
}

/** Name, hex+finish (hex appears once, here), mood. Drawn from `top`. */
function drawText(ctx: CanvasRenderingContext2D, look: Look, ink: Ink, t: TextLayout, top: number) {
  ctx.textAlign = 'center';
  let y = top;
  ctx.fillStyle = ink.main;
  ctx.font = `600 84px ${SERIF}`;
  for (const l of t.nameLines) {
    y += 84;
    ctx.fillText(l, W / 2, y);
    y += 8;
  }
  y += 50;
  ctx.fillStyle = ink.gold;
  ctx.font = `600 30px ${MONO}`;
  ctx.fillText(`${look.lipstick.hex.toUpperCase()}  \u00B7  ${look.lipstick.finish.toUpperCase()}`, W / 2, y);
  if (t.moodLines.length) {
    y += 10;
    ctx.fillStyle = ink.soft;
    ctx.font = `italic 38px ${SERIF}`;
    for (const l of t.moodLines) {
      y += 48;
      ctx.fillText(l, W / 2, y);
    }
  }
  ctx.textAlign = 'left';
}

type Box = { x: number; y: number; w: number; h: number };

function fitRect(iw: number, ih: number, box: Box) {
  const s = Math.min(box.w / iw, box.h / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/** Labeled swatch used when supplied artwork is absent. Never imitates the artwork. */
function fallbackSwatch(ctx: CanvasRenderingContext2D, hex: string, box: Box, ink: Ink) {
  const r = Math.max(60, Math.min(box.w, box.h - 70) / 2 - 10);
  const cx = box.x + box.w / 2;
  const cy = box.y + (box.h - 60) / 2;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink.gold;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = ink.soft;
  ctx.font = `italic 26px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('Artwork not uploaded - shade swatch shown', cx, cy + r + 50);
  ctx.textAlign = 'left';
}

const SIMPLE_SWATCH = 132; // radius: a modest editorial swatch, not a hero block

function simpleSwatch(ctx: CanvasRenderingContext2D, hex: string, cx: number, cy: number, ink: Ink) {
  const r = SIMPLE_SWATCH;
  ctx.save();
  ctx.shadowColor = 'rgba(59,22,57,0.22)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sheen = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  sheen.addColorStop(0, 'rgba(255,255,255,0.2)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = ink.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
  ctx.stroke();
  // flanking gold rules tie the swatch to the type column
  ctx.beginPath();
  ctx.moveTo(150, cy);
  ctx.lineTo(cx - r - 40, cy);
  ctx.moveTo(cx + r + 40, cy);
  ctx.lineTo(W - 150, cy);
  ctx.stroke();
}

/** Case with the tinted bullet rising from its opening; whole composition fitted into box. */
function drawLuxe(ctx: CanvasRenderingContext2D, bullet: HTMLImageElement, kase: HTMLImageElement, key: 'caseOrnate' | 'caseSimple', hex: string, box: Box) {
  const p = CASE_PROFILES[key];
  const src = bulletSourceRect(bullet);
  // Work in case-pixel units (natural size), then scale the union to the box.
  const cw = kase.naturalWidth;
  const ch = kase.naturalHeight;
  const bw = p.openW * cw * BULLET_WIDTH_IN_OPENING;
  const bh = bw * (src.sh / src.sw);
  const bx = p.openCx * cw - bw / 2;
  const by = p.openY * ch + bh * BULLET_SINK - bh;
  const minY = Math.min(0, by);
  const unionH = ch - minY;
  const f = fitRect(cw, unionH, box);
  const s = f.w / cw;
  const ox = f.x;
  const oy = f.y - minY * s;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(kase, ox, oy, cw * s, ch * s);
  // Match the in-app illustration: bullet in front of the opaque case opening.
  ctx.drawImage(tintBullet(bullet, hex), src.sx, src.sy, src.sw, src.sh, ox + bx * s, oy + by * s, bw * s, bh * s);
  ctx.restore();
}

export async function renderLookCard(snap: LookCardSnapshot): Promise<LookCardResult> {
  const { look, settings, style } = snap;
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const missingArt: string[] = [];
  let bullet: HTMLImageElement | null = null;
  let kase: HTMLImageElement | null = null;
  let caseKey: 'caseOrnate' | 'caseSimple' = 'caseOrnate';
  let kiss: HTMLImageElement | null = null;
  if (style === 'luxe') {
    const [b, ornate] = await Promise.all([loadCardArt('bullet'), loadCardArt('caseOrnate'), fontsReady]);
    bullet = b;
    kase = ornate;
    if (!kase) {
      kase = await loadCardArt('caseSimple');
      caseKey = 'caseSimple';
    }
    if (!bullet) missingArt.push(CARD_ART_FILES.bullet);
    if (!kase) missingArt.push(`${CARD_ART_FILES.caseOrnate} (or ${CARD_ART_FILES.caseSimple})`);
  } else if (style === 'kiss') {
    const [k] = await Promise.all([loadCardArt('kiss'), fontsReady]);
    kiss = k;
    if (!kiss) missingArt.push(CARD_ART_FILES.kiss);
  } else {
    await fontsReady;
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable on this device.');

  const ink: Ink = style === 'luxe' ? { main: CREAM, gold: GOLD, soft: MAUVE } : { main: PLUM, gold: DEEP_GOLD, soft: '#7A4A72' };
  if (style === 'luxe') backdrop(ctx);
  else paperBackdrop(ctx, style === 'kiss');

  const contentTop = brandHeader(ctx, settings, ink) + 30;
  const contentBottom = H - 196;
  const text = layoutText(ctx, look);
  const hex = look.lipstick.hex;

  if (style === 'simple') {
    // Editorial group: small swatch + name/meta/mood, centered together in the open space.
    const swatchH = (SIMPLE_SWATCH + 16) * 2;
    const gap = 44;
    const group = swatchH + gap + text.height;
    const top = contentTop + Math.max(0, (contentBottom - contentTop - group) / 2);
    simpleSwatch(ctx, hex, W / 2, top + swatchH / 2, ink);
    drawText(ctx, look, ink, text, top + swatchH + gap);
  } else {
    const textTop = contentBottom - text.height;
    drawText(ctx, look, ink, text, textTop);
    const box = { x: 110, y: contentTop, w: W - 220, h: Math.max(220, textTop - 40 - contentTop) };
    if (style === 'luxe') {
      if (bullet && kase) drawLuxe(ctx, bullet, kase, caseKey, hex, box);
      else fallbackSwatch(ctx, hex, box, ink);
    } else if (kiss) {
      const r = fitRect(kiss.naturalWidth, kiss.naturalHeight, { x: box.x + 20, y: box.y, w: box.w - 40, h: box.h });
      ctx.drawImage(tintKiss(kiss, hex), r.x, r.y, r.w, r.h);
    } else fallbackSwatch(ctx, hex, box, ink);
  }

  centeredFooter(ctx, ink);
  return { blob: await toBlob(canvas), missingArt };
}

export async function renderBoardCard(settings: StudioSettings, looks: Look[]): Promise<Blob> {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable on this device.');
  backdrop(ctx);
  header(ctx, settings);
  ctx.fillStyle = CREAM;
  ctx.font = `600 58px ${SERIF}`;
  ctx.fillText('Vision Board', 96, settings.showTitleOnCards ? 260 : 220);
  const items = looks.slice(0, 12);
  const cols = 3;
  const gap = 28;
  const cw = (W - 192 - gap * (cols - 1)) / cols;
  const ch = 230;
  const startY = settings.showTitleOnCards ? 300 : 260;
  items.forEach((look, i) => {
    const x = 96 + (i % cols) * (cw + gap);
    const y = startY + Math.floor(i / cols) * (ch + gap);
    ctx.fillStyle = look.lipstick.hex;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch - 80, 18);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    const colors = look.colors.slice(0, 5);
    colors.forEach((c, j) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + 22 + j * 30, y + ch - 100, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    ctx.fillStyle = CREAM;
    ctx.font = `600 26px ${SERIF}`;
    ctx.fillText(wrap(ctx, look.name || 'Untitled', cw, 1)[0] ?? '', x, y + ch - 46);
    ctx.fillStyle = GOLD;
    ctx.font = `500 18px ${MONO}`;
    ctx.fillText(`${look.lipstick.hex.toUpperCase()} ${look.lipstick.finish}`, x, y + ch - 18);
  });
  if (!items.length) {
    ctx.fillStyle = MAUVE;
    ctx.font = `italic 34px ${SERIF}`;
    ctx.fillText('A blank page, waiting for you.', 96, 420);
  }
  footer(ctx);
  return toBlob(canvas);
}
