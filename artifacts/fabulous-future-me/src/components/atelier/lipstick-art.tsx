import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Finish } from '@/lib/types';
import {
  BULLET_SINK, BULLET_WIDTH_IN_OPENING, CASE_PROFILES,
  bulletSourceRect, loadCardArt, tintBullet,
} from '@/lib/card-art';

/** In-app illustration only. Share-card layouts and export stay independent. */
export function Lipstick({ hex, finish, className }: { hex: string; finish: Finish; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [readyHex, setReadyHex] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    async function draw() {
      try {
        const [bullet, kase] = await Promise.all([loadCardArt('bullet'), loadCardArt('caseSimple')]);
        if (cancelled) return;
        if (!bullet || !kase) throw new Error('Lipstick artwork unavailable');
        const target = canvas.current;
        const ctx = target?.getContext('2d');
        if (!target || !ctx) throw new Error('Canvas unavailable');
        const p = CASE_PROFILES.caseSimple;
        const src = bulletSourceRect(bullet);
        const cw = kase.naturalWidth;
        const ch = kase.naturalHeight;
        const bw = p.openW * cw * BULLET_WIDTH_IN_OPENING;
        const bh = bw * src.sh / src.sw;
        const bx = p.openCx * cw - bw / 2;
        const by = p.openY * ch - bh * (1 - BULLET_SINK);
        const minY = Math.min(0, by);
        const scale = Math.min(target.width / cw, target.height / (ch - minY));
        const ox = (target.width - cw * scale) / 2;
        const oy = (target.height - (ch - minY) * scale) / 2 - minY * scale;
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(kase, ox, oy, cw * scale, ch * scale);
        // The supplied case has an opaque opening: the bullet must sit in front.
        ctx.drawImage(tintBullet(bullet, hex), src.sx, src.sy, src.sw, src.sh,
          ox + bx * scale, oy + by * scale, bw * scale, bh * scale);
        setReadyHex(hex);
      } catch {
        if (!cancelled) {
          setReadyHex(null);
          setFailed(true);
        }
      }
    }
    void draw();
    return () => { cancelled = true; };
  }, [hex]);

  const ready = readyHex === hex && !failed;
  return (
    <div className={cn('relative shrink-0', className)} role="img"
      aria-label={`Gold cat-logo lipstick case with ${hex} lipstick, ${finish} finish`}>
      <canvas ref={canvas} width={600} height={800}
        className={cn('absolute inset-0 h-full w-full object-contain', !ready && 'invisible')}
        aria-hidden="true" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" aria-hidden="true">
          <span className="h-10 w-10 rounded-full border-2 border-[#d2a85a]" style={{ background: hex }} />
          <span className="text-center text-[10px] leading-tight">{failed ? 'Artwork unavailable' : 'Loading artwork'}</span>
        </div>
      )}
    </div>
  );
}
