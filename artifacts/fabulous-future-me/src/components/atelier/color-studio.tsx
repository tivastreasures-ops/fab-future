import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Check } from 'lucide-react';
import { CURATED, hexToHsl, hslToHex, inkOn, normalizeHex } from '@/lib/color';
import { cn } from '@/lib/utils';

interface Props {
  hex: string;
  onChange: (hex: string) => void;
}

export function ColorStudio({ hex, onChange }: Props) {
  const [hsl, setHsl] = useState(() => hexToHsl(hex));
  const [hexText, setHexText] = useState(hex);
  const ringRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setHexText(hex);
    setHsl((cur) => (hslToHex(cur.h, cur.s, cur.l) === hex.toUpperCase() ? cur : hexToHsl(hex)));
  }, [hex]);

  const apply = (h: number, s: number, l: number) => {
    const next = { h: ((Math.round(h) % 360) + 360) % 360, s, l };
    setHsl(next);
    onChangeRef.current(hslToHex(next.h, next.s, next.l));
  };

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = ringRef.current?.getBoundingClientRect();
    if (!r) return;
    const ang = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    apply(ang, hsl.s, hsl.l);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    const map: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: 15, PageDown: -15 };
    if (e.key in map) apply(hsl.h + map[e.key], hsl.s, hsl.l);
    else if (e.key === 'Home') apply(0, hsl.s, hsl.l);
    else if (e.key === 'End') apply(359, hsl.s, hsl.l);
    else return;
    e.preventDefault();
  };

  const rad = (hsl.h * Math.PI) / 180;
  const valid = normalizeHex(hexText);

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr] items-start">
      <div className="mx-auto">
        <div
          ref={ringRef}
          role="slider"
          tabIndex={0}
          aria-label="Hue"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={hsl.h}
          aria-valuetext={`Hue ${hsl.h} degrees`}
          onKeyDown={onKey}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
          onPointerMove={(e) => { if (e.buttons) fromPointer(e); }}
          className="relative h-56 w-56 touch-none cursor-pointer rounded-full"
          data-testid="slider-hue"
        >
          <div className="hue-ring absolute inset-0 rounded-full" />
          <div className="absolute inset-0 rounded-full border-2 border-gold pointer-events-none" />
          <div className="absolute inset-[26%] rounded-full gold-frame flex items-center justify-center font-mono text-sm transition-colors" style={{ background: hex, color: inkOn(hex) }}>
            {hex}
          </div>
          <span className="absolute h-8 w-8 -ml-4 -mt-4 rounded-full border-[3px] border-cream shadow-md pointer-events-none" style={{ left: `${50 + Math.cos(rad) * 39}%`, top: `${50 + Math.sin(rad) * 39}%`, background: hslToHex(hsl.h, 85, 50), outline: '2px solid hsl(var(--plum))' }} />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Drag the ring, or focus it and use arrow keys</p>
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium">
          <span className="flex justify-between"><span>Saturation</span><span className="font-mono">{hsl.s}%</span></span>
          <input type="range" min={0} max={100} value={hsl.s} onChange={(e) => apply(hsl.h, Number(e.target.value), hsl.l)} className="range-couture" style={{ ['--track' as string]: `linear-gradient(90deg, ${hslToHex(hsl.h, 0, hsl.l)}, ${hslToHex(hsl.h, 100, hsl.l)})` }} data-testid="input-saturation" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="flex justify-between"><span>Lightness</span><span className="font-mono">{hsl.l}%</span></span>
          <input type="range" min={0} max={100} value={hsl.l} onChange={(e) => apply(hsl.h, hsl.s, Number(e.target.value))} className="range-couture" style={{ ['--track' as string]: `linear-gradient(90deg, #000, ${hslToHex(hsl.h, hsl.s, 50)}, #fff)` }} data-testid="input-lightness" />
        </label>
        <div className="flex gap-3 items-end">
          <label className="grid gap-1 text-sm font-medium flex-1">
            Any hex
            <input
              className="field font-mono uppercase"
              value={hexText}
              maxLength={7}
              spellCheck={false}
              aria-invalid={!valid}
              aria-describedby="hex-help"
              onChange={(e) => {
                setHexText(e.target.value);
                const n = normalizeHex(e.target.value);
                if (n && e.target.value.replace('#', '').length === 6) onChangeRef.current(n);
              }}
              onBlur={() => { const n = normalizeHex(hexText); setHexText(n ?? hex); if (n) onChangeRef.current(n); }}
              data-testid="input-hex"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Picker
            <input type="color" value={hex.toLowerCase()} onChange={(e) => onChangeRef.current(e.target.value.toUpperCase())} className="h-12 w-14 cursor-pointer rounded-xl border-2 border-gold bg-card p-1" data-testid="input-native-color" />
          </label>
        </div>
        <p id="hex-help" className={cn('text-xs', valid ? 'text-muted-foreground' : 'text-destructive')}>{valid ? 'Six digits, like #8E1F3F. Every colour is welcome.' : 'Keep typing — a hex needs six digits after #.'}</p>
      </div>
      <div className="sm:col-span-2">
        <p className="eyebrow mb-2">Curated swatches</p>
        <ul className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CURATED.map((c) => {
            const on = c.hex === hex.toUpperCase();
            return (
              <li key={c.hex}>
                <button type="button" onClick={() => onChangeRef.current(c.hex)} aria-pressed={on} aria-label={`${c.name} ${c.hex}`} title={c.name}
                  className="group flex w-full flex-col items-center gap-1 min-h-11 rounded-lg p-1" data-testid={`button-swatch-${c.hex.slice(1)}`}>
                  <span className={cn('swatch-chip grid h-11 w-11 place-items-center rounded-full transition-transform group-hover:-translate-y-0.5', on && 'scale-110')} style={{ background: c.hex, color: inkOn(c.hex) }}>
                    {on ? <Check className="h-5 w-5" aria-hidden="true" /> : null}
                  </span>
                  <span className="text-[11px] leading-tight text-center text-muted-foreground">{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
