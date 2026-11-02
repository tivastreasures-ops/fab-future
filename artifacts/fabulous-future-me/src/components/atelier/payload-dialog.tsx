import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Finish } from '@/lib/types';
import { inkOn } from '@/lib/color';

interface Props {
  open: boolean;
  step: 1 | 2;
  mode: 'dry' | 'live';
  hex: string;
  finish: Finish;
  payload: Record<string, unknown> | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const FACTS = ['Lipstick only, full style', 'Intensity 80 (fixed)', 'Skin smoothing 0', 'Shape kept original — no geometry edits', '1 unit per render'];

export function PayloadDialog({ open, step, mode, hex, finish, payload, busy, onConfirm, onCancel }: Props) {
  const live = mode === 'live';
  const title = !live ? 'Review the simulation' : step === 1 ? 'Before your photo leaves this device' : 'Final review: your lipstick preview';
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto bg-card border-2 border-gold sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-plum">{title}</DialogTitle>
          <DialogDescription>
            {!live
              ? 'Dry run: no photo, no rendering, no units used. This checks the recipe the studio would send.'
              : step === 1
                ? 'Your photo and lipstick settings are sent to YouCam to render this look. We don\'t keep your photo on our server.'
                : 'YouCam will use your photo and the lipstick settings below to render this look. We don\'t keep your photo on our server.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-2xl border border-gold/60 p-3">
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-gold font-mono text-[10px]" style={{ background: hex, color: inkOn(hex) }}>{finish}</span>
          <div>
            <p className="font-mono font-semibold" data-testid="text-confirm-hex">{hex}</p>
            <p className="capitalize text-sm text-muted-foreground">{finish} finish — your choice, unchanged</p>
          </div>
        </div>
        <ul className="grid gap-1 text-sm">
          {FACTS.map((f) => <li key={f} className="flex gap-2"><span aria-hidden="true" className="text-gold-ink">&#9670;</span>{f}{!live && f.startsWith('1 unit') ? ' (not used in dry run)' : ''}</li>)}
        </ul>
        <details key={`${mode}-${step}-${open}`} className="rounded-xl border border-gold/60">
          <summary className="min-h-11 cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold text-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum">Technical details</summary>
          <pre className="max-h-64 overflow-auto rounded-xl bg-plum-deep p-3 text-xs text-cream font-mono whitespace-pre-wrap break-all" data-testid="text-payload-json" tabIndex={0}>{payload ? JSON.stringify(payload, null, 2) : 'Waiting for validation...'}</pre>
        </details>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={onCancel} disabled={busy} data-testid="button-cancel-render">Not now</button>
          <button type="button" className={live ? 'btn-couture' : 'btn-gold'} onClick={onConfirm} disabled={busy || !payload} data-testid={`button-confirm-step-${step}`}>
            {busy ? 'Working...' : !live ? 'Run simulation (no units)' : step === 1 ? 'I agree — upload my photo' : 'Render now — uses 1 unit'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
