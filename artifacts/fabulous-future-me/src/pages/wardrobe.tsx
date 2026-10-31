import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Image as ImageIcon, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { keys, useBlobUrl, useCards, useDeleteLook, useLooks, useSettings } from '@/hooks/use-studio';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { inkOn } from '@/lib/color';
import { DEFAULT_SETTINGS, type Look, type SavedCard } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PageHeading } from '@/components/atelier/shell';
import { ExportDialog } from '@/components/atelier/export-dialog';
import { CardViewer } from '@/components/atelier/card-viewer';
import { SleepingCat, Swatch, finishOverlay } from '@/components/atelier/motifs';

const STATUS: Record<string, string> = { saved: 'Saved', dry_run: 'Simulated', pending: 'Rendering', success: 'Rendered', error: 'Render failed', timeout: 'Timed out' };

function LookCard({ look, onExport, onDelete }: { look: Look; onExport: () => void; onDelete: () => void }) {
  const [, navigate] = useLocation();
  const thumb = useBlobUrl(look.render?.resultImageId ?? look.referenceImageIds[0]);
  return (
    <li className="rise rounded-3xl bg-card gold-frame overflow-hidden flex flex-col" data-testid={`card-look-${look.id}`}>
      <div className="relative h-36" style={{ background: look.lipstick.hex }}>
        <div className="absolute inset-0" style={{ background: finishOverlay(look.lipstick.finish) }} />
        {thumb ? <img src={thumb} alt="" className="absolute right-3 top-3 h-28 w-24 object-contain rounded-lg border-2 border-gold bg-plum-deep" /> : null}
        <span className="absolute left-4 bottom-3 font-mono text-sm" style={{ color: inkOn(look.lipstick.hex) }}>{look.lipstick.hex} · {look.lipstick.finish}</span>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-2xl text-plum leading-tight break-words">{look.name}</h3>
          {look.render ? <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{STATUS[look.render.status] ?? look.render.status}</span> : null}
        </div>
        {look.mood ? <p className="italic font-display text-amethyst">{look.mood}</p> : null}
        {look.notes ? <p className="text-sm text-muted-foreground line-clamp-3">{look.notes}</p> : null}
        {look.colors.length ? <div className="flex flex-wrap gap-1.5">{look.colors.map((c, i) => <Swatch key={`${c}${i}`} hex={c} size={24} />)}</div> : null}
        <div className="mt-auto pt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn-quiet text-sm" onClick={() => navigate(`/draft?id=${look.id}`)} data-testid={`button-edit-${look.id}`}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
          <button type="button" className="btn-quiet text-sm" onClick={() => navigate(`/vanity?id=${look.id}`)} data-testid={`button-tryon-${look.id}`}><Sparkles className="h-4 w-4" aria-hidden="true" />Try on</button>
          <button type="button" className="btn-quiet text-sm" onClick={onExport} data-testid={`button-export-${look.id}`}><Download className="h-4 w-4" aria-hidden="true" />Card</button>
          <button type="button" className="btn-quiet text-sm text-destructive" onClick={onDelete} data-testid={`button-delete-${look.id}`}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
        </div>
      </div>
    </li>
  );
}

function SavedCardTile({ card, onOpen }: { card: SavedCard; onOpen: () => void }) {
  const url = useBlobUrl(card.id);
  return (
    <li>
      <button type="button" onClick={onOpen} className="block w-full rounded-2xl overflow-hidden border-2 border-gold bg-plum-deep transition-transform hover:-translate-y-1" data-testid={`button-open-card-${card.id}`}>
        {url ? <img src={url} alt={`${card.label} card`} className="aspect-[4/5] w-full object-cover" /> : <div className="skeleton-silk aspect-[4/5]" />}
      </button>
      <p className="mt-1 text-sm font-medium truncate">{card.label}</p>
      <p className="text-xs text-muted-foreground">{new Date(card.createdAt).toLocaleString()}</p>
    </li>
  );
}

export default function Wardrobe() {
  const { data: looks, isLoading, isError, refetch } = useLooks();
  const { data: cards } = useCards();
  const { data: s } = useSettings();
  const settings = s ?? DEFAULT_SETTINGS;
  const del = useDeleteLook();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'looks' | 'board'>('looks');
  const [exportTarget, setExportTarget] = useState<{ kind: 'look'; look: Look } | { kind: 'board'; looks: Look[] } | null>(null);
  const [toDelete, setToDelete] = useState<Look | null>(null);
  const [openCard, setOpenCard] = useState<{ card: SavedCard; blob: Blob } | null>(null);
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null);

  const reopen = async (card: SavedCard) => {
    const rec = await db.getBlob(card.id).catch(() => undefined);
    if (rec) setOpenCard({ card, blob: rec.blob });
    else toast({ title: 'That card could not be found on this device' });
  };

  const allColors = Array.from(new Set((looks ?? []).flatMap((l) => [l.lipstick.hex, ...l.colors])));

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <PageHeading eyebrow="The wardrobe" title={settings.collectionTitle}>
        {settings.displayName ? `Curated by ${settings.displayName}. ` : ''}Every look you saved, kept only on this device.
      </PageHeading>
      <div role="tablist" aria-label="Wardrobe" className="mb-6 inline-flex rounded-full border-2 border-gold p-1 bg-card">
        {(['looks', 'board'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn('min-h-11 px-5 rounded-full font-medium', tab === t ? 'bg-plum text-cream' : 'text-foreground')} data-testid={`tab-${t}`}>
            {t === 'looks' ? 'Collection' : 'Vision board'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <li key={i} className="skeleton-silk h-80 rounded-3xl" />)}</ul>
      ) : isError ? (
        <div className="text-center py-12"><p className="text-plum font-display text-2xl">The wardrobe would not open.</p><button type="button" className="btn-couture mt-4" onClick={() => refetch()}>Try again</button></div>
      ) : tab === 'looks' ? (
        looks?.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {looks.map((l) => <LookCard key={l.id} look={l} onExport={() => setExportTarget({ kind: 'look', look: l })} onDelete={() => setToDelete(l)} />)}
          </ul>
        ) : (
          <div className="rounded-3xl bg-card gold-frame p-10 text-center">
            <SleepingCat className="mx-auto h-24 text-gold-ink" />
            <h2 className="text-3xl text-plum mt-4">An empty rail, full of possibility</h2>
            <p className="text-muted-foreground mt-2">Your first look will hang right here.</p>
            <Link href="/draft" className="btn-couture mt-6" data-testid="link-empty-start">Start a Look</Link>
          </div>
        )
      ) : (
        <div className="grid gap-8">
          <section className="velvet on-dark gold-frame-dark rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl">Palette wall</h2>
              <button type="button" className="btn-gold" onClick={() => setExportTarget({ kind: 'board', looks: looks ?? [] })} disabled={!looks?.length} data-testid="button-export-board"><ImageIcon className="h-4 w-4" aria-hidden="true" />Export vision board</button>
            </div>
            {allColors.length ? (
              <ul className="mt-5 grid grid-cols-4 sm:grid-cols-8 gap-3">
                {allColors.map((c) => <li key={c} className="aspect-square rounded-2xl border border-gold flex items-end p-1.5 font-mono text-[10px]" style={{ background: c, color: inkOn(c) }}>{c}</li>)}
              </ul>
            ) : <p className="mt-4 text-mauve">Colours from your looks will gather here.</p>}
          </section>
          <section>
            <h2 className="text-2xl text-plum mb-3">Saved cards</h2>
            {cards?.length ? (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{cards.map((c) => <SavedCardTile key={c.id} card={c} onOpen={() => void reopen(c)} />)}</ul>
            ) : <p className="text-muted-foreground">Cards you paint are saved here, ready to download again.</p>}
          </section>
        </div>
      )}

      <ExportDialog open={!!exportTarget} onOpenChange={(o) => { if (!o) setExportTarget(null); }} target={exportTarget} settings={settings} />

      <Dialog open={!!openCard} onOpenChange={(o) => { if (!o) setOpenCard(null); }}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto bg-card border-2 border-gold sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-plum">{openCard?.card.label}</DialogTitle>
            <DialogDescription>Painted {openCard ? new Date(openCard.card.createdAt).toLocaleString() : ''}</DialogDescription>
          </DialogHeader>
          {openCard ? <CardViewer blob={openCard.blob} fileName={`${openCard.card.id}.png`} title={openCard.card.label} /> : null}
          <button type="button" className="btn-quiet text-destructive" onClick={() => { if (openCard) setCardToDelete(openCard.card); }} data-testid="button-delete-card"><Trash2 className="h-4 w-4" aria-hidden="true" />Remove this card</button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent className="bg-card border-2 border-gold">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl text-plum">Let "{toDelete?.name}" go?</AlertDialogTitle>
            <AlertDialogDescription>This removes the look, its references, any kept rendering and its cards from this device. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" data-testid="button-cancel-delete">Keep it</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground" data-testid="button-confirm-delete"
              onClick={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast({ title: 'Look removed' }), onError: () => toast({ title: 'Could not delete just now', description: 'Please try again.' }) }); setToDelete(null); }}>Delete look</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cardToDelete} onOpenChange={(o) => { if (!o) setCardToDelete(null); }}>
        <AlertDialogContent className="bg-card border-2 border-gold">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl text-plum">Remove this card?</AlertDialogTitle>
            <AlertDialogDescription>The look itself stays. You can paint a new card any time.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground" data-testid="button-confirm-delete-card"
              onClick={async () => { if (cardToDelete) { await db.deleteCard(cardToDelete.id).catch(() => undefined); qc.invalidateQueries({ queryKey: keys.cards }); setOpenCard(null); } setCardToDelete(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
