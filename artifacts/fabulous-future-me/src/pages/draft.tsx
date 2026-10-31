import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Plus, Save, Sparkles, X } from 'lucide-react';
import { useLook, useSaveLook } from '@/hooks/use-studio';
import { useToast } from '@/hooks/use-toast';
import { db, friendlyStorageError, newId } from '@/lib/db';
import { downscaleImage } from '@/lib/image';
import { MOODS, inkOn } from '@/lib/color';
import { FINISHES, FINISH_NOTES, type Finish, type Look } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PageHeading } from '@/components/atelier/shell';
import { ColorStudio } from '@/components/atelier/color-studio';
import { Lipstick, finishOverlay } from '@/components/atelier/motifs';
import { ReferencePicker, type RefItem } from '@/components/atelier/reference-picker';
import { SEED } from '@/lib/seed';

export default function Draft() {
  const params = new URLSearchParams(useSearch());
  const editId = params.get('id');
  const seed = params.get('seed') === '1';
  const { data: existing, isLoading } = useLook(editId);
  const saveLook = useSaveLook();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [id, setId] = useState<string>(() => editId ?? newId());
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [render, setRender] = useState<Look['render']>();
  const [name, setName] = useState(seed ? SEED.name : '');
  const [mood, setMood] = useState(seed ? SEED.mood : '');
  const [notes, setNotes] = useState(seed ? SEED.notes : '');
  const [hex, setHex] = useState(seed ? SEED.hex : '#A25566');
  const [finish, setFinish] = useState<Finish>(seed ? SEED.finish : 'satin');
  const [colors, setColors] = useState<string[]>(seed ? SEED.colors : []);
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);
  const initFor = useRef<string | null>(null);

  useEffect(() => {
    if (existing && initFor.current !== existing.id) {
      initFor.current = existing.id;
      setId(existing.id);
      setCreatedAt(existing.createdAt);
      setRender(existing.render);
      setName(existing.name);
      setMood(existing.mood);
      setNotes(existing.notes);
      setHex(existing.lipstick.hex);
      setFinish(existing.lipstick.finish);
      setColors(existing.colors);
      setRefs(existing.referenceImageIds.map((r) => ({ id: r })));
      setSavedOnce(true);
    }
  }, [existing]);

  const addRefs = async (files: File[]) => {
    for (const f of files) {
      try {
        const blob = await downscaleImage(f, 1000);
        setRefs((r) => [...r, { id: newId('ref'), blob }]);
      } catch {
        toast({ title: 'That image could not be opened', description: 'Try a JPEG or PNG.' });
      }
    }
  };

  const save = async (then?: 'vanity') => {
    setSaveError(null);
    const look: Look = {
      id,
      name: name.trim() || 'Untitled look',
      mood: mood.trim(),
      notes: notes.trim(),
      colors,
      referenceImageIds: refs.map((r) => r.id),
      createdAt,
      updatedAt: new Date().toISOString(),
      lipstick: { hex, finish },
      render,
    };
    try {
      for (const r of refs) if (r.blob) await db.putBlob({ id: r.id, blob: r.blob, kind: 'reference', lookId: id, createdAt: look.updatedAt });
      await saveLook.mutateAsync(look);
      for (const rid of removed) await db.deleteBlob(rid).catch(() => undefined);
      setRemoved([]);
      setRefs((rs) => rs.map((r) => ({ id: r.id })));
      setSavedOnce(true);
      toast({ title: 'Tucked into your wardrobe', description: `"${look.name}" is saved on this device.` });
      if (then) navigate(`/vanity?id=${id}`);
      else if (!editId) navigate(`/draft?id=${id}`, { replace: true });
    } catch (e) {
      setSaveError(friendlyStorageError(e));
    }
  };

  if (editId && isLoading) return <div className="mx-auto max-w-6xl px-5 py-10 grid gap-4"><div className="skeleton-silk h-12 w-64 rounded-xl" /><div className="skeleton-silk h-96 rounded-3xl" /></div>;
  if (editId && !isLoading && existing === null) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-3xl text-plum">This look has left the wardrobe</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted on this device.</p>
        <Link href="/draft" className="btn-couture mt-6">Start a fresh look</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <PageHeading eyebrow="The drafting table" title={editId ? 'Refine this look' : 'Imagine'}>
        Pick a lipstick color and finish, then dress it with a mood. There are no wrong answers.
      </PageHeading>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="grid gap-6">
          <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7" aria-labelledby="col-h">
            <h2 id="col-h" className="text-2xl text-plum mb-4">Lipstick color</h2>
            <ColorStudio hex={hex} onChange={setHex} />
          </section>
          <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7" aria-labelledby="fin-h">
            <h2 id="fin-h" className="text-2xl text-plum mb-1">Finish</h2>
            <p className="text-sm text-muted-foreground mb-4">One color, one finish. Lipstick only.</p>
            <div role="radiogroup" aria-labelledby="fin-h" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FINISHES.map((f) => (
                <button key={f} type="button" role="radio" aria-checked={finish === f} onClick={() => setFinish(f)}
                  className={cn('flex items-center gap-3 rounded-2xl border-2 p-3 min-h-14 text-left transition-colors', finish === f ? 'border-plum bg-secondary' : 'border-gold/50 hover:bg-muted')} data-testid={`button-finish-${f}`}>
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gold" style={{ background: hex }}><span className="absolute inset-0" style={{ background: finishOverlay(f) }} /></span>
                  <span><span className="block font-semibold capitalize">{f}</span><span className="block text-xs text-muted-foreground">{FINISH_NOTES[f]}</span></span>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7 grid gap-4" aria-labelledby="story-h">
            <h2 id="story-h" className="text-2xl text-plum">The story</h2>
            <label className="grid gap-1 text-sm font-medium">Name
              <input className="field font-display text-lg" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="The Velvet Hour" data-testid="input-look-name" />
            </label>
            <label className="grid gap-1 text-sm font-medium">Mood
              <input className="field" value={mood} maxLength={80} onChange={(e) => setMood(e.target.value)} placeholder="How does this self feel?" data-testid="input-look-mood" />
            </label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => <button key={m} type="button" onClick={() => setMood(m)} className={cn('btn-quiet text-sm', mood === m && 'bg-secondary border-plum')} data-testid={`button-mood-${m.replace(/\s+/g, '-').toLowerCase()}`}>{m}</button>)}
            </div>
            <label className="grid gap-1 text-sm font-medium">Notes
              <textarea className="field py-3 min-h-28" value={notes} maxLength={600} onChange={(e) => setNotes(e.target.value)} placeholder="Where would you wear it? What else are you wearing?" data-testid="input-look-notes" />
            </label>
            <div>
              <p className="text-sm font-medium mb-2">Palette companions <span className="text-muted-foreground font-normal">({colors.length}/8)</span></p>
              <ul className="flex flex-wrap gap-3 items-center">
                {colors.map((c, i) => (
                  <li key={`${c}-${i}`} className="relative">
                    <button type="button" onClick={() => setHex(c)} aria-label={`Use ${c} as lipstick`} className="swatch-chip h-11 w-11 rounded-full" style={{ background: c }} data-testid={`button-palette-${i}`} />
                    <button type="button" onClick={() => setColors((cs) => cs.filter((_, j) => j !== i))} aria-label={`Remove ${c}`} className="absolute -top-2 -right-3 grid h-7 w-7 place-items-center rounded-full bg-plum text-cream border border-gold after:absolute after:-inset-2 after:content-['']" data-testid={`button-remove-palette-${i}`}><X className="h-3 w-3" aria-hidden="true" /></button>
                  </li>
                ))}
                <li><button type="button" disabled={colors.length >= 8} onClick={() => setColors((cs) => [...cs, hex])} className="btn-quiet text-sm" data-testid="button-add-palette"><Plus className="h-4 w-4" aria-hidden="true" />Add {hex}</button></li>
              </ul>
            </div>
          </section>
          <section className="rounded-3xl bg-card gold-frame p-5 sm:p-7" aria-labelledby="ref-h">
            <h2 id="ref-h" className="text-2xl text-plum mb-3">References <span className="text-base text-muted-foreground font-sans">optional</span></h2>
            <ReferencePicker items={refs} onAdd={addRefs} onRemove={(rid) => { setRefs((r) => r.filter((x) => x.id !== rid)); if (!refs.find((x) => x.id === rid)?.blob) setRemoved((r) => [...r, rid]); }} />
          </section>
        </div>
        <aside className="lg:sticky lg:top-24 grid gap-4">
          <div className="velvet on-dark gold-frame-dark rounded-3xl p-6 text-center">
            <p className="eyebrow">On the vanity</p>
            <Lipstick hex={hex} finish={finish} className="mx-auto mt-4 h-48 w-24" />
            <p className="font-display text-2xl mt-4 break-words" data-testid="text-preview-name">{name || 'Untitled look'}</p>
            <p className="italic text-mauve">{mood || 'mood to be decided'}</p>
            <p className="mt-2 inline-block rounded-full px-3 py-1 font-mono text-sm" style={{ background: hex, color: inkOn(hex) }} data-testid="text-preview-hex">{hex} · {finish}</p>
          </div>
          {saveError ? <p role="alert" className="rounded-2xl border-2 border-destructive bg-card p-4 text-sm text-destructive" data-testid="status-save-error">{saveError}</p> : null}
          <button type="button" className="btn-couture" onClick={() => save()} disabled={saveLook.isPending} data-testid="button-save-look"><Save className="h-4 w-4" aria-hidden="true" />{saveLook.isPending ? 'Saving...' : savedOnce ? 'Save changes' : 'Save look'}</button>
          <button type="button" className="btn-gold" onClick={() => save('vanity')} disabled={saveLook.isPending} data-testid="button-save-tryon"><Sparkles className="h-4 w-4" aria-hidden="true" />Save and go to the vanity</button>
          <p className="text-xs text-center text-muted-foreground">Saved privately in this browser. No account, no cloud.</p>
        </aside>
      </div>
    </div>
  );
}
