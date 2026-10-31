import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useBlobUrl, useObjectUrl } from '@/hooks/use-studio';

export type RefItem = { id: string; blob?: Blob };

function Thumb({ item, onRemove }: { item: RefItem; onRemove: () => void }) {
  const stored = useBlobUrl(item.blob ? null : item.id);
  const mem = useObjectUrl(item.blob ?? null);
  const url = mem ?? stored;
  return (
    <li className="relative">
      <div className="h-28 w-24 rounded-xl border-2 border-gold bg-muted overflow-hidden">
        {url ? <img src={url} alt="Reference image" className="h-full w-full object-contain" /> : <div className="skeleton-silk h-full w-full" />}
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove reference" className="absolute -top-3 -right-3 grid h-11 w-11 place-items-center rounded-full bg-plum text-cream border-2 border-gold" data-testid={`button-remove-ref-${item.id}`}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

export function ReferencePicker({ items, onAdd, onRemove }: { items: RefItem[]; onAdd: (files: File[]) => void; onRemove: (id: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <ul className="flex flex-wrap gap-4">
        {items.map((it) => <Thumb key={it.id} item={it} onRemove={() => onRemove(it.id)} />)}
        <li>
          <button type="button" onClick={() => input.current?.click()} className="grid h-28 w-24 place-items-center rounded-xl border-2 border-dashed border-gold-ink/60 text-gold-ink hover:bg-secondary" data-testid="button-add-reference">
            <span className="grid place-items-center gap-1 text-xs font-medium"><ImagePlus className="h-6 w-6" aria-hidden="true" />Add</span>
          </button>
        </li>
      </ul>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { onAdd(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <p className="mt-2 text-xs text-muted-foreground">Fabric, a painting, a sunset. Kept only on this device, resized to 1000px, never cropped.</p>
    </div>
  );
}
