import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HardDrive, ShieldCheck, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSaveSettings, useSettings } from '@/hooks/use-studio';
import { useToast } from '@/hooks/use-toast';
import { db, friendlyStorageError, requestPersistence } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { PageHeading } from '@/components/atelier/shell';
import { CatMark } from '@/components/atelier/motifs';

function fmt(n: number) {
  return n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${(n / 1e6).toFixed(1)} MB`;
}

export default function Settings() {
  const { data } = useSettings();
  const s = data ?? DEFAULT_SETTINGS;
  const save = useSaveSettings();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(s.displayName);
  const [title, setTitle] = useState(s.collectionTitle);
  const [showTitle, setShowTitle] = useState(s.showTitleOnCards);
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);

  useEffect(() => {
    setName(s.displayName);
    setTitle(s.collectionTitle);
    setShowTitle(s.showTitleOnCards);
  }, [s.displayName, s.collectionTitle, s.showTitleOnCards]);

  const refreshStorage = () => {
    navigator.storage?.estimate?.().then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => undefined);
    navigator.storage?.persisted?.().then(setPersisted).catch(() => undefined);
  };
  useEffect(refreshStorage, []);

  const onSave = () => {
    save.mutate({ ...s, displayName: name.trim(), collectionTitle: title.trim() || 'My Lookbook', showTitleOnCards: showTitle, onboarded: true }, {
      onSuccess: () => toast({ title: 'Studio details saved' }),
      onError: (e) => toast({ title: 'Not saved', description: friendlyStorageError(e) }),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <PageHeading eyebrow="Studio" title="Your creative space">Names and preferences live only in this browser.</PageHeading>
      <div className="grid gap-6">
        <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7 grid gap-4" aria-labelledby="name-h">
          <h2 id="name-h" className="text-2xl text-plum">Naming</h2>
          <div className="velvet on-dark gold-frame-dark rounded-2xl p-5 text-center" aria-live="polite">
            <CatMark className="mx-auto h-6 w-6 text-gold" />
            <p className="font-display text-3xl mt-2 break-words" data-testid="text-settings-title-preview">{title.trim() || 'My Lookbook'}</p>
            <p className="text-mauve text-sm">{name.trim() ? `made by ${name.trim()}` : 'made by me'}</p>
          </div>
          <label className="grid gap-1 text-sm font-medium">Display name
            <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Optional" data-testid="input-display-name" />
          </label>
          <label className="grid gap-1 text-sm font-medium">Collection title
            <input className="field" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="My Lookbook" data-testid="input-collection-title" />
          </label>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-gold/60 p-4">
            <label htmlFor="show-title" className="text-sm"><span className="font-semibold block">Put my title on exported cards</span><span className="text-muted-foreground">Off by default. When on, your collection title and name appear on PNGs.</span></label>
            <Switch id="show-title" checked={showTitle} onCheckedChange={setShowTitle} data-testid="switch-show-title" />
          </div>
          <button type="button" className="btn-couture justify-self-start" onClick={onSave} disabled={save.isPending} data-testid="button-save-settings">{save.isPending ? 'Saving...' : 'Save my changes'}</button>
        </section>

        <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7 grid gap-3" aria-labelledby="priv-h">
          <h2 id="priv-h" className="text-2xl text-plum flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-teal" aria-hidden="true" />Privacy and exports</h2>
          <ul className="grid gap-2 text-sm">
            <li>Looks, references, cards and kept renderings are stored in this browser's IndexedDB. No account, no cloud copy.</li>
            <li>Portrait photos stay in memory and vanish when you leave the vanity, unless you choose to keep a rendering.</li>
            <li>Your photo is sent to YouCam to render this look. We don't keep it on our server.</li>
            <li>Exported cards are painted on your device as PNG files. Sharing happens only when you press Share.</li>
          </ul>
        </section>

        <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7 grid gap-3" aria-labelledby="store-h">
          <h2 id="store-h" className="text-2xl text-plum flex items-center gap-2"><HardDrive className="h-6 w-6 text-teal" aria-hidden="true" />Storage</h2>
          {est ? (
            <div>
              <div className="h-3 rounded-full bg-muted overflow-hidden border border-gold/60"><div className="h-full bg-plum" style={{ width: `${Math.max(1, Math.min(100, (est.usage / Math.max(1, est.quota)) * 100))}%` }} /></div>
              <p className="text-sm mt-1" data-testid="text-storage-usage">{fmt(est.usage)} used of about {fmt(est.quota)} available</p>
            </div>
          ) : <p className="text-sm text-muted-foreground">Storage estimate unavailable in this browser.</p>}
          <p className="text-sm">{persisted ? 'This browser has promised to keep your studio safe from automatic cleanup.' : 'Your browser may clear studio data when space runs low. You can ask it to keep everything.'}</p>
          {!persisted ? <button type="button" className="btn-quiet justify-self-start" onClick={async () => { const r = await requestPersistence(); setPersisted(!!r); toast({ title: r ? 'Storage protected' : 'The browser declined for now', description: r ? undefined : 'It may grant this later as you use the studio.' }); }} data-testid="button-request-persist">Protect my creations</button> : null}
          <button type="button" className="btn-quiet justify-self-start text-destructive" onClick={() => setWipeOpen(true)} data-testid="button-wipe"><Trash2 className="h-4 w-4" aria-hidden="true" />Erase everything on this device</button>
        </section>
      </div>

      <AlertDialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <AlertDialogContent className="bg-card border-2 border-gold">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl text-plum">Erase everything on this device?</AlertDialogTitle>
            <AlertDialogDescription>Every look, reference, card and setting on this device will be removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Keep everything</AlertDialogCancel>
            <AlertDialogAction className="min-h-11 bg-destructive text-destructive-foreground" data-testid="button-confirm-wipe"
              onClick={async () => { try { await db.wipe(); qc.invalidateQueries({ queryKey: ['idb'] }); toast({ title: 'Your space is clear and ready' }); refreshStorage(); } catch (e) { toast({ title: 'Could not erase', description: friendlyStorageError(e) }); } }}>Erase</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
