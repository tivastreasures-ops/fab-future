import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, friendlyStorageError, newId } from '@/lib/db';
import { renderBoardCard, renderLookCard } from '@/lib/card';
import type { Look, StudioSettings } from '@/lib/types';
import { keys } from '@/hooks/use-studio';
import { CardViewer } from './card-viewer';

type Target = { kind: 'look'; look: Look } | { kind: 'board'; looks: Look[] };

export function ExportDialog({ open, onOpenChange, target, settings }: { open: boolean; onOpenChange: (o: boolean) => void; target: Target | null; settings: StudioSettings }) {
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string; title: string; savedNote: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const generate = async () => {
    if (!target || busy.current) return;
    // Immutable snapshot BEFORE any async work; the on-screen look is never touched.
    const snap = structuredClone({ target, settings });
    busy.current = true;
    setExporting(true);
    setError(null);
    try {
      const stamp = Date.now();
      let blob: Blob;
      let lookId: string;
      let title: string;
      if (snap.target.kind === 'look') {
        const look = snap.target.look;
        const imgId = look.render?.resultImageId ?? look.referenceImageIds[0];
        const img = imgId ? (await db.getBlob(imgId))?.blob ?? null : null;
        blob = await renderLookCard({ look, settings: snap.settings }, img);
        lookId = look.id;
        title = look.name || 'Untitled look';
      } else {
        blob = await renderBoardCard(snap.settings, snap.target.looks);
        lookId = 'board';
        title = 'Vision Board';
      }
      const id = `card-${lookId}-${stamp}`;
      const fileName = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'look'}-${stamp}.png`;
      let savedNote = 'Saved to your wardrobe on this device.';
      try {
        await db.saveCard({ id, lookId, label: title, createdAt: new Date(stamp).toISOString() }, blob);
        qc.invalidateQueries({ queryKey: keys.cards });
      } catch (e) {
        savedNote = friendlyStorageError(e);
      }
      setResult({ blob, name: fileName, title, savedNote });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The card could not be painted.');
    } finally {
      busy.current = false;
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setResult(null); setError(null); } onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto bg-card border-2 border-gold sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-plum">{target?.kind === 'board' ? 'Vision board card' : 'Look card'}</DialogTitle>
          <DialogDescription>
            A 1080 by 1350 PNG painted on your device. {settings.showTitleOnCards ? 'Your collection title is included.' : 'Your name and collection title stay off the card (change in Studio).'}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid gap-2">
            <CardViewer blob={result.blob} fileName={result.name} title={result.title} />
            <p className="text-xs text-center text-muted-foreground" role="status">{result.savedNote}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {exporting ? <div className="skeleton-silk aspect-[4/5] w-full rounded-xl" aria-label="Painting your card" /> : null}
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <button type="button" className="btn-couture" onClick={generate} disabled={exporting || !target} data-testid="button-generate-card">
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              {exporting ? 'Painting...' : error ? 'Try again' : 'Paint the card'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
