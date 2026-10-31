import { Link } from 'wouter';
import { SleepingCat } from '@/components/atelier/motifs';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <SleepingCat className="mx-auto h-24 text-gold-ink" />
      <h1 className="text-4xl text-plum mt-4">This room is still being sewn</h1>
      <p className="text-muted-foreground mt-2">The door you tried leads nowhere yet.</p>
      <Link href="/" className="btn-couture mt-6" data-testid="link-404-home">Back to your space</Link>
    </div>
  );
}
