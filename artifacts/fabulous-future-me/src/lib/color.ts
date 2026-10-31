export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeHex(input: string): string | null {
  let v = input.trim();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX_RE.test(v) ? v.toUpperCase() : null;
}

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function lum(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ink color that reads on top of any user swatch. */
export function inkOn(hex: string): string {
  return lum(hex) > 0.32 ? '#2A1129' : '#FBF3E6';
}

export const CURATED: { name: string; hex: string }[] = [
  { name: 'Opera Box', hex: '#8E1F3F' },
  { name: 'Velvet Plum', hex: '#5B1E4D' },
  { name: 'Fig Jam', hex: '#7A2E4A' },
  { name: 'Rosewood Letter', hex: '#A25566' },
  { name: 'Ballet Slipper', hex: '#D99AA6' },
  { name: 'Peony Hour', hex: '#E0607E' },
  { name: 'Tangerine Silk', hex: '#E2683C' },
  { name: 'Terracotta Tea', hex: '#B5543C' },
  { name: 'Nude Linen', hex: '#C48E7A' },
  { name: 'Cocoa Satin', hex: '#6E3B2E' },
  { name: 'Classic Scarlet', hex: '#C21E2B' },
  { name: 'Black Cherry', hex: '#3E0E1E' },
  { name: 'Jewel Teal', hex: '#0F6B6B' },
  { name: 'Amethyst Ink', hex: '#6A3C8F' },
  { name: 'Midnight Blue', hex: '#1F2A5C' },
  { name: 'Antique Gold', hex: '#B8893A' },
];

export const MOODS = ['Opening night', 'Quiet confidence', 'Sunday soft', 'Midnight mischief', 'Gallery muse', 'Rooftop golden hour', 'Cozy library', 'Main character'];
