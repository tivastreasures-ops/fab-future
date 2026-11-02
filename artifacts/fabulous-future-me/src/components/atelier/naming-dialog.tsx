import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSaveSettings } from '@/hooks/use-studio';
import type { StudioSettings } from '@/lib/types';
import { CatMark } from './motifs';
import { useGuidedTour } from './guided-tour';

export function NamingDialog({ open, settings, onDone }: { open: boolean; settings: StudioSettings; onDone: () => void }) {
  const save = useSaveSettings();
  const tour = useGuidedTour();
  const [name, setName] = useState(settings.displayName);
  const [title, setTitle] = useState(settings.collectionTitle);
  useEffect(() => {
    if (open) {
      setName(settings.displayName);
      setTitle(settings.collectionTitle);
    }
  }, [open, settings.displayName, settings.collectionTitle]);

  const finish = (keep: boolean) => {
    const next = keep ? { ...settings, displayName: name.trim(), collectionTitle: title.trim() || 'My Lookbook', onboarded: true } : { ...settings, onboarded: true };
    save.mutate(next, { onSettled: () => { onDone(); tour.afterNaming(); } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(false); }}>
      <DialogContent className="bg-card border-2 border-gold sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-plum">Name your collection</DialogTitle>
          <DialogDescription>Optional, and only kept on this device. You can change it any time in Studio.</DialogDescription>
        </DialogHeader>
        <div className="velvet on-dark gold-frame-dark rounded-2xl p-5 text-center" aria-live="polite">
          <CatMark className="mx-auto h-6 w-6 text-gold" />
          <p className="font-display text-2xl mt-2 break-words" data-testid="text-title-preview">{title.trim() || 'My Lookbook'}</p>
          <p className="text-sm text-mauve mt-1">{name.trim() ? `made by ${name.trim()}` : 'made by me'}</p>
        </div>
        <label className="grid gap-1 text-sm font-medium">Your name (optional)
          <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="What should the studio call you?" data-testid="input-onboard-name" />
        </label>
        <label className="grid gap-1 text-sm font-medium">Collection title
          <input className="field" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="My Lookbook" data-testid="input-onboard-title" />
        </label>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={() => finish(false)} data-testid="button-skip-naming">Skip for now</button>
          <button type="button" className="btn-couture" onClick={() => finish(true)} data-testid="button-save-naming">Start creating</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
