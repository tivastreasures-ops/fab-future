import { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/** Shows a finished PNG Blob: long-press preview, explicit Download link, and a separate Share gesture. */
export function CardViewer({ blob, fileName, title }: { blob: Blob; fileName: string; title: string }) {
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    try {
      const f = new File([blob], fileName, { type: 'image/png' });
      setCanShareFiles(!!navigator.canShare && navigator.canShare({ files: [f] }));
    } catch {
      setCanShareFiles(false);
    }
    return () => URL.revokeObjectURL(u);
  }, [blob, fileName]);

  const share = async () => {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      await navigator.share({ files: [file], title });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      toast({ title: 'Sharing was not available', description: 'Use Download, or long-press the card to save it.' });
    }
  };

  if (!url) return <div className="skeleton-silk aspect-[4/5] w-full rounded-xl" />;
  return (
    <div className="grid gap-3">
      <img src={url} alt={`${title} card preview. Long-press or right-click to save.`} className="w-full rounded-xl border-2 border-gold" style={{ WebkitTouchCallout: 'default' }} data-testid="img-card-preview" />
      <p className="text-xs text-muted-foreground text-center">Long-press the card to save it to your photos.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <a href={url} download={fileName} className="btn-gold" data-testid="link-download-card"><Download className="h-4 w-4" aria-hidden="true" />Download PNG</a>
        {canShareFiles ? (
          <button type="button" className="btn-quiet" onClick={share} data-testid="button-share-card"><Share2 className="h-4 w-4" aria-hidden="true" />Share</button>
        ) : null}
      </div>
    </div>
  );
}
