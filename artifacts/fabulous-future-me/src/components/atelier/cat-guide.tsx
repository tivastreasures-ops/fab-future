import { useState } from 'react';
import { cn } from '@/lib/utils';

export type CatPose = 'welcome' | 'helping' | 'painting' | 'celebrating' | 'sleeping';

const GUIDE: Record<CatPose, { file: string; alt: string; line: string }> = {
  welcome: {
    file: 'cat-welcome.png',
    alt: 'Black cat guide in a plum and gold robe, waving hello.',
    line: "Come in, the light's good today.",
  },
  helping: {
    file: 'cat-helping.png',
    alt: 'Black cat guide in a plum and gold robe, pointing with a pencil.',
    line: 'Pick a color that feels like you today.',
  },
  painting: {
    file: 'cat-paint.png',
    alt: 'Black cat guide holding lipstick and a hand mirror.',
    line: 'Your lipstick idea, just as you chose it.',
  },
  celebrating: {
    file: 'cat-celebrate.png',
    alt: 'Black cat guide in a plum and gold robe, raising both paws to celebrate.',
    line: 'A new possibility is on its way to Collect.',
  },
  sleeping: {
    file: 'cat-sleep.png',
    alt: 'Black cat guide asleep on a plum cushion.',
    line: 'Nothing here yet. Your first look will wake me up.',
  },
};

export function CatGuide({ pose, className }: { pose: CatPose; className?: string }) {
  const guide = GUIDE[pose];
  const src = `${import.meta.env.BASE_URL}${guide.file}`;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <figure className={cn('flex items-center gap-3 rounded-2xl border border-gold/80 bg-card p-2.5 shadow-sm', className)}>
      <div className="grid h-24 w-20 shrink-0 place-items-center">
        {failedSrc === src ? (
          <span
            role="img"
            aria-label="Cat guide placeholder"
            className="grid h-16 w-16 place-items-center rounded-full border-2 border-dotted border-gold-ink bg-cream font-display text-plum"
          >
            cat
          </span>
        ) : (
          <img
            src={src}
            alt={guide.alt}
            className="max-h-24 max-w-20 object-contain"
            onError={() => setFailedSrc(src)}
          />
        )}
      </div>
      <figcaption className="font-display italic leading-snug text-plum">{guide.line}</figcaption>
    </figure>
  );
}
