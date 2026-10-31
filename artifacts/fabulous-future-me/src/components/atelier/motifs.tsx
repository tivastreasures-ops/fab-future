import { cn } from '@/lib/utils';
import { inkOn } from '@/lib/color';
import type { Finish } from '@/lib/types';

export function CatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 40" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M4 26 L8 6 L16 16 Q22 13 28 16 L36 6 L40 26 Q22 44 4 26 Z" />
      <circle cx="16" cy="25" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="28" cy="25" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SleepingCat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 78 Q18 40 60 38 Q100 34 118 56 Q130 72 112 80 Z" />
      <path d="M100 40 L104 24 L114 36 L124 26 L124 46" />
      <path d="M108 52 q4 3 8 0" />
      <g className="tail-sway"><path d="M20 76 Q4 70 10 54 Q16 44 26 50" /></g>
      <path d="M40 80 h12 M70 80 h12" />
    </svg>
  );
}

export function Sparkle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} aria-hidden="true">
      <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill="currentColor" />
    </svg>
  );
}

const FINISH_OVERLAY: Record<Finish, string> = {
  matte: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.18))',
  satin: 'linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.22) 48%, rgba(255,255,255,0) 66%)',
  gloss: 'radial-gradient(40% 30% at 35% 28%, rgba(255,255,255,0.75), rgba(255,255,255,0) 70%), linear-gradient(100deg, transparent 50%, rgba(255,255,255,0.18) 60%, transparent 70%)',
  sheer: 'linear-gradient(180deg, rgba(255,240,240,0.35), rgba(255,240,240,0.15))',
  shimmer: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0 1px, transparent 2px), radial-gradient(circle at 60% 60%, rgba(255,255,255,0.7) 0 1px, transparent 2px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.7) 0 1px, transparent 2px), radial-gradient(circle at 75% 25%, rgba(255,255,255,0.8) 0 1px, transparent 2px)',
  metallic: 'linear-gradient(100deg, rgba(0,0,0,0.25), rgba(255,255,255,0.45) 40%, rgba(0,0,0,0.2) 60%, rgba(255,255,255,0.35) 85%)',
  holographic: 'conic-gradient(from 200deg, rgba(255,120,200,0.4), rgba(120,220,255,0.4), rgba(180,255,170,0.35), rgba(255,230,120,0.4), rgba(255,120,200,0.4))',
};

export function finishOverlay(f: Finish) {
  return FINISH_OVERLAY[f];
}

/** A CSS-built lipstick bullet in a gold case. */
export function Lipstick({ hex, finish, className }: { hex: string; finish: Finish; className?: string }) {
  return (
    <div className={cn('relative flex flex-col items-center', className)} aria-hidden="true">
      <div className="relative w-[46%] aspect-[1/1.45] overflow-hidden" style={{ background: hex, borderRadius: '50% 50% 6px 6px / 70% 30% 6px 6px', clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0 100%)', transition: 'background 0.35s ease' }}>
        <div className="absolute inset-0" style={{ background: FINISH_OVERLAY[finish] }} />
      </div>
      <div className="w-[56%] h-[14%] rounded-sm" style={{ background: 'linear-gradient(90deg,#8a6526,#e9c77b 35%,#b8893a 60%,#f2d79a 80%,#8a6526)' }} />
      <div className="w-[64%] h-[40%] rounded-b-md" style={{ background: 'linear-gradient(90deg,#2b0f2a,#5a2558 40%,#3b1639 70%,#1f0b1e)', borderTop: '2px solid #d2a85a' }} />
    </div>
  );
}

export function Swatch({ hex, size = 44, label, className }: { hex: string; size?: number; label?: boolean; className?: string }) {
  return (
    <span className={cn('swatch-chip inline-flex items-end justify-center rounded-full font-mono text-[10px]', className)} style={{ background: hex, width: size, height: size, color: inkOn(hex) }}>
      {label ? <span className="mb-1">{hex}</span> : null}
    </span>
  );
}

export function DottedFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label="Empty portrait frame with a dotted face outline" fill="none" stroke="currentColor" strokeWidth="3">
      <ellipse className="dotted-face" cx="100" cy="112" rx="62" ry="80" />
      <path className="dotted-face" d="M80 100 h10 M110 100 h10 M100 110 v20 M84 150 q16 10 32 0" />
      <path className="dotted-face" d="M40 236 q60 -50 120 0" />
    </svg>
  );
}
