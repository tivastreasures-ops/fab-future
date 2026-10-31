import { inkOn } from './color';
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

function drawContain(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y, w, h);
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function swatchRow(ctx: CanvasRenderingContext2D, colors: string[], x: number, y: number, maxW: number) {
  const n = Math.min(colors.length, 8);
  if (!n) return;
  const size = Math.min(96, (maxW - (n - 1) * 18) / n);
  colors.slice(0, 8).forEach((c, i) => {
    const cx = x + i * (size + 18);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(cx, y, size, size, 16);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.font = `500 ${Math.round(size * 0.2)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(c.toUpperCase(), cx + size / 2, y + size + 30);
  });
  ctx.textAlign = 'left';
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

export interface LookCardSnapshot {
  look: Look;
  settings: StudioSettings;
}

export async function renderLookCard(snap: LookCardSnapshot, image: Blob | null): Promise<Blob> {
  const { look, settings } = snap;
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable on this device.');
  backdrop(ctx);
  header(ctx, settings);

  const top = settings.showTitleOnCards ? 230 : 190;
  let bmp: ImageBitmap | null = null;
  if (image) {
    try {
      bmp = await createImageBitmap(image);
    } catch {
      bmp = null;
    }
  }

  // Lipstick swatch medallion
  const mx = bmp ? 230 : W / 2;
  const my = top + 170;
  ctx.fillStyle = look.lipstick.hex;
  ctx.beginPath();
  ctx.arc(mx, my, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx, my, 158, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = inkOn(look.lipstick.hex);
  ctx.textAlign = 'center';
  ctx.font = `600 36px ${MONO}`;
  ctx.fillText(look.lipstick.hex.toUpperCase(), mx, my + 6);
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText(look.lipstick.finish.toUpperCase(), mx, my + 44);
  ctx.textAlign = 'left';

  if (bmp) {
    drawContain(ctx, bmp, 440, top, 544, 360);
    bmp.close();
  }

  let y = top + 400;
  ctx.fillStyle = CREAM;
  ctx.font = `600 64px ${SERIF}`;
  for (const l of wrap(ctx, look.name || 'Untitled look', W - 192, 2)) {
    y += 70;
    ctx.fillText(l, 96, y);
  }
  ctx.fillStyle = GOLD;
  ctx.font = `600 22px ${SANS}`;
  y += 48;
  ctx.fillText(`LIPSTICK  ·  ${look.lipstick.hex.toUpperCase()}  ·  ${look.lipstick.finish.toUpperCase()}`, 96, y);
  if (look.mood) {
    ctx.fillStyle = MAUVE;
    ctx.font = `italic 36px ${SERIF}`;
    for (const l of wrap(ctx, `Mood: ${look.mood}`, W - 192, 2)) {
      y += 50;
      ctx.fillText(l, 96, y);
    }
  }
  if (look.notes) {
    ctx.fillStyle = CREAM;
    ctx.font = `400 28px ${SANS}`;
    y += 14;
    for (const l of wrap(ctx, look.notes, W - 192, look.colors.length ? 4 : 7)) {
      y += 40;
      ctx.fillText(l, 96, y);
    }
  }
  if (look.colors.length) {
    const sy = Math.min(y + 40, H - 320);
    swatchRow(ctx, look.colors, 96, sy, W - 192);
  }
  footer(ctx);
  return toBlob(canvas);
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
