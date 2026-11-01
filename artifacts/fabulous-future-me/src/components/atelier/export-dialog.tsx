import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Save, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db, friendlyStorageError } from '@/lib/db';
import { CARD_STYLES, renderBoardCard, renderLookCard, type CardStyle } from '@/lib/card';
import type { Look, StudioSettings } from '@/lib/types';
import { keys } from '@/hooks/use-studio';
import { cn } from '@/lib/utils';
import { CardViewer } from './card-viewer';

type Target = { kind: 'look'; look: Look } | { kind: 'board'; looks: Look[] };
type Result = { blob: Blob; name: string; title: string; savedNote: string };

function fileSafe(title: string) {
  return title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'look';
}

/** Stable object URL for a Blob, revoked on change/unmount. */
function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

type Rendered = { blob: Blob; missingArt: string[] } | { error: string };

function StyleThumb({ id, label, rendered, active, onSelect, disabled }: { id: CardStyle; label: string; rendered: Rendered | undefined; active: boolean; onSelect: () => void; disabled: boolean }) {
  const url = useObjectUrl(rendered && 'blob' in rendered ? rendered.blob : null);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={cn('group grid gap-1 rounded-lg border-2 p-1.5 text-center transition-transform active:scale-[0.98]', active ? 'border-gold bg-secondary' : 'border-border bg-card hover:border-gold/60')}
      data-testid={`button-card-style-${id}`}
    >
      {url ? (
        <img src={url} alt="" aria-hidden="true" className="aspect-[4/5] w-full rounded-md object-cover" />
      ) : rendered && 'error' in rendered ? (
        <span className="grid aspect-[4/5] w-full place-items-center rounded-md bg-muted text-[10px] text-destructive">Could not paint</span>
      ) : (
        <span className="skeleton-silk block aspect-[4/5] w-full rounded-md" />
      )}
      <span className={cn('font-display text-sm leading-tight', active ? 'text-plum' : 'text-foreground')}>{label}</span>
    </button>
  );
}

export function ExportDialog({ open, onOpenChange, target, settings }: { open: boolean; onOpenChange: (o: boolean) => void; target: Target | null; settings: StudioSettings }) {
  const qc = useQueryClient();
  const [style, setStyle] = useState<CardStyle>('simple');
  // All three styles rendered once per snapshot; switching styles only selects.
  const [renders, setRenders] = useState<{ look: Look; byStyle: Partial<Record<CardStyle, Rendered>> } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const busy = useRef(false);
  const reqId = useRef(0);
  const styleRef = useRef(style);
  styleRef.current = style;

  const latest = useRef({ target, settings });
  latest.current = { target, settings };

  const kind = target?.kind ?? 'none';
  const look = target?.kind === 'look' ? target.look : null;
  const lookKey = look ? `${look.id}|${look.updatedAt}` : '';
  const settingsKey = `${settings.showTitleOnCards}|${settings.collectionTitle}|${settings.displayName}`;

  useEffect(() => {
    // Any change (close, board switch, new look/settings) invalidates in-flight work.
    const id = ++reqId.current;
    setRenders(null);
    setResult(null);
    setError(null);
    const t = latest.current.target;
    if (!open || !t || t.kind !== 'look') return;
    const snap = structuredClone({ look: t.look, settings: latest.current.settings });
    setRenders({ look: snap.look, byStyle: {} });
    const first = styleRef.current;
    const order: CardStyle[] = [first, ...CARD_STYLES.map((s) => s.id).filter((s) => s !== first)];
    (async () => {
      for (const st of order) {
        let r: Rendered;
        try {
          r = await renderLookCard({ look: snap.look, settings: snap.settings, style: st });
        } catch (e) {
          r = { error: e instanceof Error ? e.message : 'The card could not be painted.' };
        }
        if (id !== reqId.current) return;
        setRenders((prev) => (prev ? { ...prev, byStyle: { ...prev.byStyle, [st]: r } } : prev));
      }
    })();
  }, [open, kind, lookKey, settingsKey, retry]);

  useEffect(() => {
    if (!open) setStyle('simple');
  }, [open]);

  const current = renders?.byStyle[style];
  const currentBlob = current && 'blob' in current ? current.blob : null;
  const previewUrl = useObjectUrl(currentBlob);

  const persist = async (blob: Blob, lookId: string, title: string, suffix: string) => {
    const stamp = Date.now();
    const id = `card-${lookId}-${stamp}`;
    const fileName = `${fileSafe(title)}${suffix}-${stamp}.png`;
    let savedNote = 'Saved to your wardrobe on this device.';
    try {
      await db.saveCard({ id, lookId, label: title, createdAt: new Date(stamp).toISOString() }, blob);
      qc.invalidateQueries({ queryKey: keys.cards });
    } catch (e) {
      savedNote = friendlyStorageError(e);
    }
    return { blob, name: fileName, title, savedNote };
  };

  const saveLook = async () => {
    if (busy.current || !renders) return;
    const r = renders.byStyle[style];
    if (!r || !('blob' in r)) return; // still painting or failed: nothing to save
    const id = reqId.current;
    const lk = renders.look;
    const st = style;
    busy.current = true;
    setExporting(true);
    setError(null);
    try {
      const title = lk.name || 'Untitled look';
      const label = CARD_STYLES.find((s) => s.id === st)?.label ?? '';
      const out = await persist(r.blob, lk.id, title, `-${fileSafe(label)}`);
      if (id === reqId.current) setResult(out);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'The card could not be saved.');
    } finally {
      busy.current = false;
      setExporting(false);
    }
  };

  const generateBoard = async () => {
    const t = latest.current.target;
    if (!t || t.kind !== 'board' || busy.current) return;
    const snap = structuredClone({ looks: t.looks, settings: latest.current.settings });
    const id = reqId.current;
    busy.current = true;
    setExporting(true);
    setError(null);
    try {
      const blob = await renderBoardCard(snap.settings, snap.looks);
      const out = await persist(blob, 'board', 'Vision Board', '');
      if (id === reqId.current) setResult(out);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'The card could not be painted.');
    } finally {
      busy.current = false;
      setExporting(false);
    }
  };

  const description = `A 1080 by 1350 PNG painted on your device. ${settings.showTitleOnCards ? 'Your collection title is included.' : 'Your name and collection title stay off the card (change in Studio).'}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto bg-card border-2 border-gold sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-plum">{target?.kind === 'board' ? 'Vision board card' : 'Look card'}</DialogTitle>
          <DialogDescription>{description} Photos are never placed on the card.</DialogDescription>
        </DialogHeader>

        {target?.kind === 'board' ? (
          result ? (
            <div className="grid gap-2">
              <CardViewer blob={result.blob} fileName={result.name} title={result.title} />
              <p className="text-xs text-center text-muted-foreground" role="status">{result.savedNote}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {exporting ? <div className="skeleton-silk aspect-[4/5] w-full rounded-xl" aria-label="Painting your card" /> : null}
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <button type="button" className="btn-couture" onClick={generateBoard} disabled={exporting} data-testid="button-generate-card">
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                {exporting ? 'Painting...' : error ? 'Try again' : 'Paint the card'}
              </button>
            </div>
          )
        ) : target?.kind === 'look' ? (
          <div className="grid gap-3">
            <div role="radiogroup" aria-label="Card style" className="grid grid-cols-3 gap-2">
              {CARD_STYLES.map((s) => (
                <StyleThumb key={s.id} id={s.id} label={s.label} rendered={renders?.byStyle[s.id]} active={s.id === style} disabled={exporting} onSelect={() => { if (!busy.current) { setStyle(s.id); setResult(null); } }} />
              ))}
            </div>

            {result ? (
              <div className="grid gap-2">
                <CardViewer blob={result.blob} fileName={result.name} title={result.title} />
                <p className="text-xs text-center text-muted-foreground" role="status">{result.savedNote} Pick another style to make a second card.</p>
              </div>
            ) : (
              <>
                {previewUrl ? (
                  <img src={previewUrl} alt={`${renders?.look.name || 'Look'} card preview, ${CARD_STYLES.find((s) => s.id === style)?.label} style`} className="w-full rounded-xl border-2 border-gold" data-testid="img-card-style-preview" />
                ) : current && 'error' in current ? null : (
                  <div className="skeleton-silk aspect-[4/5] w-full rounded-xl" aria-label="Painting the preview" />
                )}

                {current && 'blob' in current && current.missingArt.length ? (
                  <p className="rounded-lg border border-gold/60 bg-secondary px-3 py-2 text-xs text-foreground" role="status" data-testid="status-missing-art">
                    Artwork not found: {current.missingArt.join(', ')}. Add it to public/card-art/ to see this style in full; for now the card shows a labeled shade swatch.
                  </p>
                ) : null}
                {current && 'error' in current ? (
                  <div className="flex items-center justify-between gap-2" role="alert">
                    <p className="text-sm text-destructive">{current.error}</p>
                    <button type="button" className="btn-quiet" onClick={() => setRetry((n) => n + 1)} data-testid="button-retry-preview">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />Retry
                    </button>
                  </div>
                ) : null}
                {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

                <button type="button" className="btn-couture" onClick={saveLook} disabled={!currentBlob || exporting} data-testid="button-generate-card">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {exporting ? 'Saving...' : currentBlob ? 'Save this card' : 'Painting preview...'}
                </button>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
