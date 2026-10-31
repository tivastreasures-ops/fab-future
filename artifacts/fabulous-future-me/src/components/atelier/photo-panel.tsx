import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { useObjectUrl } from '@/hooks/use-studio';
import { DottedFace } from './motifs';

export function PhotoPanel({ photo, onPick, onClear, disabled }: { photo: Blob | null; onPick: (f: File) => void; onClear: () => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const url = useObjectUrl(photo);
  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-gold bg-plum-deep/90 grid place-items-center">
        {url ? (
          <img src={url} alt="Your photo, shown uncropped" className="h-full w-full object-contain" data-testid="img-photo-preview" />
        ) : (
          <DottedFace className="h-3/4 text-gold/80" />
        )}
        {photo ? (
          <button type="button" onClick={onClear} disabled={disabled} aria-label="Remove photo" className="absolute top-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-plum text-cream border-2 border-gold" data-testid="button-clear-photo"><X className="h-4 w-4" aria-hidden="true" /></button>
        ) : null}
      </div>
      <button type="button" className="btn-quiet" onClick={() => input.current?.click()} disabled={disabled} data-testid="button-pick-photo">
        <Camera className="h-4 w-4" aria-hidden="true" />{photo ? 'Choose a different photo' : 'Add a photo (optional)'}
      </button>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      <ul className="text-xs text-muted-foreground grid gap-0.5">
        <li>Good, even light — a window works beautifully.</li>
        <li>Face centered, looking at the camera.</li>
        <li>Your photo stays in memory only and disappears when you leave.</li>
      </ul>
    </div>
  );
}
