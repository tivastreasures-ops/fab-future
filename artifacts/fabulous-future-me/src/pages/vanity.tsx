import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Check, FlaskConical, RotateCcw, Sparkles } from 'lucide-react';
import { getGetStudioConfigQueryKey, useGetStudioConfig } from '@workspace/api-client-react';
import { useLooks } from '@/hooks/use-studio';
import { useRenderFlow, type Mode } from '@/hooks/use-render-flow';
import { useToast } from '@/hooks/use-toast';
import { downscaleImage } from '@/lib/image';
import { inkOn } from '@/lib/color';
import { cn } from '@/lib/utils';
import { PageHeading } from '@/components/atelier/shell';
import { PhotoPanel } from '@/components/atelier/photo-panel';
import { PayloadDialog } from '@/components/atelier/payload-dialog';
import { Lipstick, SleepingCat } from '@/components/atelier/motifs';
import { useObjectUrl } from '@/hooks/use-studio';
import { CatGuide } from '@/components/atelier/cat-guide';

const PREVIEW_NOTE = "This preview is YouCam's rendering and may vary from the real product.";

export default function Vanity() {
  const params = new URLSearchParams(useSearch());
  const [, navigate] = useLocation();
  const { data: looks, isLoading, isError, refetch } = useLooks();
  const config = useGetStudioConfig({ query: { queryKey: getGetStudioConfigQueryKey(), retry: false, staleTime: 60_000 } });
  const liveAvailable = !!config.data?.liveAllowed && !!config.data?.configured;
  const { toast } = useToast();

  const [selected, setSelected] = useState<string | null>(params.get('id'));
  const [mode, setMode] = useState<Mode>('dry');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [view, setView] = useState<'after' | 'before' | 'side'>('after');
  const [kept, setKept] = useState(false);

  useEffect(() => {
    if (!selected && looks?.length) setSelected(looks[0].id);
  }, [looks, selected]);
  useEffect(() => {
    if (!liveAvailable && mode === 'live') setMode('dry');
  }, [liveAvailable, mode]);

  const look = looks?.find((l) => l.id === selected) ?? null;
  const flow = useRenderFlow(look, photo, mode);
  const resultUrl = useObjectUrl(flow.result);
  const photoUrl = useObjectUrl(photo);
  const locked = !['idle', 'done', 'failed', 'expired'].includes(flow.phase);

  const pickPhoto = async (f: File) => {
    try {
      setPhoto(await downscaleImage(f, 1000, 'image/jpeg'));
    } catch {
      toast({ title: 'That photo could not be opened', description: 'Try a JPEG or PNG from your camera roll.' });
    }
  };

  if (isLoading) return <div className="mx-auto max-w-6xl px-5 py-10 grid gap-4"><div className="skeleton-silk h-12 w-60 rounded-xl" /><div className="skeleton-silk h-[480px] rounded-3xl" /></div>;
  if (isError) return <div className="mx-auto max-w-xl px-5 py-16 text-center"><h1 className="text-3xl text-plum">The vanity drawer is stuck</h1><p className="text-muted-foreground mt-2">Local storage did not open.</p><button type="button" className="btn-couture mt-6" onClick={() => refetch()}>Try again</button></div>;
  if (!looks?.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <SleepingCat className="mx-auto h-24 text-gold-ink" />
        <h1 className="text-3xl text-plum mt-4">The vanity is waiting for a look</h1>
        <p className="text-muted-foreground mt-2">Start with a lipstick color in Imagine, then bring it here to Paint.</p>
        <Link href="/draft" className="btn-couture mt-6" data-testid="link-empty-draft">Go to the drafting table</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <PageHeading eyebrow="The vanity" title="Paint">Lipstick only. Your color and finish travel exactly as you chose them.</PageHeading>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-3xl bg-card gold-frame p-5 sm:p-6 grid gap-5" aria-labelledby="pick-h">
          <CatGuide pose="painting" />
          <div>
            <h2 id="pick-h" className="text-2xl text-plum">Which look?</h2>
            <ul className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x">
              {looks.map((l) => (
                <li key={l.id} className="snap-start">
                  <button type="button" disabled={locked} aria-pressed={l.id === selected} onClick={() => { setSelected(l.id); flow.reset(); setKept(false); }}
                    className={cn('flex w-36 flex-col items-start gap-2 rounded-2xl border-2 p-3 text-left min-h-11', l.id === selected ? 'border-plum bg-secondary' : 'border-gold/50')} data-testid={`button-select-look-${l.id}`}>
                    <span className="swatch-chip h-10 w-10 rounded-full" style={{ background: l.lipstick.hex }} />
                    <span className="font-display leading-tight line-clamp-2">{l.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{l.lipstick.hex} · {l.lipstick.finish}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <fieldset>
            <legend className="text-2xl text-plum font-display">Preview mode</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={cn('flex gap-3 rounded-2xl border-2 p-4 cursor-pointer', mode === 'dry' ? 'border-teal bg-teal/5' : 'border-gold/50')}>
                <input type="radio" name="mode" className="mt-1 h-5 w-5 accent-[hsl(var(--teal))]" checked={mode === 'dry'} onChange={() => setMode('dry')} disabled={locked} data-testid="radio-mode-dry" />
                <span><span className="flex items-center gap-2 font-semibold"><FlaskConical className="h-4 w-4" aria-hidden="true" />Dry run</span><span className="text-sm text-muted-foreground">Checks the recipe. No photo, no render, no units.</span></span>
              </label>
              <label className={cn('flex gap-3 rounded-2xl border-2 p-4', liveAvailable ? 'cursor-pointer' : 'opacity-60', mode === 'live' ? 'border-plum bg-secondary' : 'border-gold/50')}>
                <input type="radio" name="mode" className="mt-1 h-5 w-5 accent-[hsl(var(--plum))]" checked={mode === 'live'} onChange={() => setMode('live')} disabled={!liveAvailable || locked} data-testid="radio-mode-live" />
                <span><span className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" aria-hidden="true" />Live preview</span>
                  <span className="text-sm text-muted-foreground">{liveAvailable ? 'Renders on your photo. Uses 1 unit after two confirmations.' : config.isLoading ? 'Checking the studio...' : 'Not available right now — the studio is offline or not set up.'}</span></span>
              </label>
            </div>
          </fieldset>
          {mode === 'live' ? <PhotoPanel photo={photo} onPick={pickPhoto} onClear={() => setPhoto(null)} disabled={locked} /> : null}
          {mode === 'live' ? <p className="text-sm rounded-xl bg-muted p-3" data-testid="text-privacy-note">Your photo is sent to YouCam to render this look. We don't keep it on our server.</p> : null}
          <button type="button" className={mode === 'live' ? 'btn-couture' : 'btn-gold'} onClick={() => { setKept(false); void flow.begin(); }} disabled={!look || locked || (mode === 'live' && !photo)} data-testid="button-begin-render">
            {flow.phase === 'validating' ? 'Validating...' : mode === 'dry' ? 'Validate and simulate' : 'Prepare live preview'}
          </button>
        </section>

        <section className="velvet on-dark gold-frame-dark rounded-3xl p-5 sm:p-6 grid gap-4 content-start" aria-labelledby="mirror-h" aria-live="polite">
          <div className="vanity-bulbs -mx-2" aria-hidden="true" />
          <h2 id="mirror-h" className="text-2xl">The mirror</h2>
          {look ? (
            <div className="flex items-center gap-4">
              <Lipstick hex={look.lipstick.hex} finish={look.lipstick.finish} className="h-28 w-14" />
              <div>
                <p className="font-display text-2xl">{look.name}</p>
                <p className="inline-block mt-1 rounded-full px-3 py-0.5 font-mono text-sm" style={{ background: look.lipstick.hex, color: inkOn(look.lipstick.hex) }}>{look.lipstick.hex} · {look.lipstick.finish}</p>
              </div>
            </div>
          ) : null}

          {flow.phase === 'uploading' || flow.phase === 'submitting' || flow.phase === 'polling' ? (
            <div className="grid gap-2" role="status">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-1/3 bg-gold skeleton-silk" /></div>
              <p>{flow.phase === 'uploading' ? 'Sending your photo securely...' : flow.phase === 'submitting' ? 'Submitting your request...' : 'Your preview is rendering. We will check for about 90 seconds.'}</p>
            </div>
          ) : null}

          {flow.phase === 'done' && flow.dryJob ? (
            <div className="rounded-2xl bg-white/5 border border-gold/60 p-4" data-testid="status-dry-run">
              <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-gold" aria-hidden="true" />Simulation complete — no render, no units used</p>
              <pre className="mt-3 max-h-52 overflow-auto text-xs font-mono whitespace-pre-wrap break-all" tabIndex={0}>{JSON.stringify(flow.dryJob, null, 2)}</pre>
            </div>
          ) : null}

          {flow.phase === 'done' && resultUrl ? (
            <div className="grid gap-3" data-testid="status-render-success">
              <div role="tablist" aria-label="Compare" className="flex gap-2">
                {(['after', 'before', 'side'] as const).map((v) => (
                  <button key={v} role="tab" type="button" aria-selected={view === v} disabled={v !== 'after' && !photoUrl} onClick={() => setView(v)} className={cn('min-h-11 px-4 rounded-full text-sm border', view === v ? 'bg-gold text-plum-deep border-gold' : 'border-gold/60 text-cream disabled:opacity-40')} data-testid={`tab-view-${v}`}>
                    {v === 'after' ? 'Rendering' : v === 'before' ? 'Original' : 'Side by side'}
                  </button>
                ))}
              </div>
              <div className={cn('grid gap-2', view === 'side' && 'grid-cols-2')}>
                {view !== 'after' && photoUrl ? <img src={photoUrl} alt="Your original photo" className="w-full max-h-[60dvh] object-contain rounded-xl border border-gold/60" /> : null}
                {view !== 'before' ? <img src={resultUrl} alt="YouCam rendering of your look" className="w-full max-h-[60dvh] object-contain rounded-xl border border-gold/60" data-testid="img-render-result" /> : null}
              </div>
              <p className="text-sm text-mauve" data-testid="text-preview-disclaimer">{PREVIEW_NOTE}</p>
              {flow.message ? <p className="rounded-xl border border-gold/60 bg-white/5 p-3 text-sm text-cream" role="status" data-testid="status-result-save-note">{flow.message}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-gold" disabled={kept} onClick={async () => { if (await flow.keepResult()) { setKept(true); toast({ title: 'Kept in your wardrobe', description: 'Saved on this device only.' }); } }} data-testid="button-keep-result">{kept ? 'Kept on this device' : 'Keep this rendering'}</button>
                {look ? <button type="button" className="btn-quiet" onClick={() => navigate('/wardrobe')} data-testid="button-go-wardrobe">Open Collect</button> : null}
              </div>
            </div>
          ) : null}

          {flow.phase === 'failed' || flow.phase === 'expired' ? (
            <div className="rounded-2xl bg-white/5 border border-gold/60 p-4" role="alert" data-testid="status-render-error">
              <p className="font-semibold">{flow.phase === 'expired' ? 'This preview needs more time.' : 'That did not come through.'}</p>
              <p className="text-sm text-mauve mt-1">{flow.message ?? 'Your look is safe in the wardrobe.'} Your look is saved either way.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {flow.phase === 'expired'
                  ? <button type="button" className="btn-gold" onClick={flow.keepWaiting} data-testid="button-keep-waiting">Check this same preview</button>
                  : <button type="button" className="btn-quiet" onClick={flow.reset} data-testid="button-retry-render"><RotateCcw className="h-4 w-4" aria-hidden="true" />Try again</button>}
              </div>
            </div>
          ) : null}

          {flow.phase === 'idle' ? <p className="text-cream/80">Nothing is sent until you review and confirm.{flow.message ? ` ${flow.message}` : ''}</p> : null}
        </section>
      </div>

      {look ? (
        <PayloadDialog
          open={flow.phase === 'confirm1' || flow.phase === 'confirm2' || flow.phase === 'uploading'}
          step={flow.phase === 'confirm2' ? 2 : 1}
          mode={mode}
          hex={look.lipstick.hex}
          finish={look.lipstick.finish}
          payload={flow.payload}
          busy={flow.phase === 'uploading'}
          onConfirm={flow.phase === 'confirm2' ? flow.confirmFinal : () => void flow.confirmFirst()}
          onCancel={flow.cancel}
        />
      ) : null}
    </div>
  );
}
