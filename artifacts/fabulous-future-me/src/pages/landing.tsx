import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, BookHeart, Palette, Sparkles } from 'lucide-react';
import { useSettings } from '@/hooks/use-studio';
import { DEFAULT_SETTINGS, TAGLINE } from '@/lib/types';
import { CatMark, Lipstick, Sparkle, Swatch } from '@/components/atelier/motifs';
import { NamingDialog } from '@/components/atelier/naming-dialog';
import studioArt from '@assets/Fabulous_Future_Me_Vanity_Studio_1793474578103.png';
import { SEED } from '@/lib/seed';

const DESTS = [
  { href: '/draft', title: 'Imagine', sub: 'The drafting table', body: 'Mix any colour, name the mood, pin references.', icon: Palette, cls: 'velvet' },
  { href: '/vanity', title: 'Try On', sub: 'The vanity', body: 'A lipstick preview, only when you ask for it.', icon: Sparkles, cls: 'velvet-teal' },
  { href: '/wardrobe', title: 'Collect', sub: 'The wardrobe', body: 'Your looks, your vision board, your cards.', icon: BookHeart, cls: 'velvet' },
];

export default function Landing() {
  const { data } = useSettings();
  const settings = data ?? DEFAULT_SETTINGS;
  const [, navigate] = useLocation();
  const [naming, setNaming] = useState(false);

  useEffect(() => {
    document.title = 'Fabulous Future Me';
  }, [settings.collectionTitle]);

  const start = () => (settings.onboarded ? navigate('/draft') : setNaming(true));

  return (
    <div>
      <section className="relative overflow-hidden on-dark text-cream" style={{ background: 'linear-gradient(160deg, hsl(298 42% 28%), hsl(300 45% 12%))' }}>
        <img src={studioArt} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-35" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#281229]/95 via-[#351934]/80 to-[#281229]/55" />
        {[[8, 18], [86, 30], [70, 72], [20, 80], [48, 12]].map(([x, y], i) => (
          <Sparkle key={i} className="twinkle absolute h-4 w-4 text-gold" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }} />
        ))}
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-24 grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
          <div className="rise">
            <p className="eyebrow">A private couture atelier</p>
            <h1 className="mt-3 text-5xl sm:text-7xl leading-[0.95]">Fabulous <em className="gold-text not-italic">Future</em> Me</h1>
            <p className="mt-5 font-display italic text-2xl sm:text-3xl text-mauve" data-testid="text-tagline">{TAGLINE}</p>
            <p className="mt-4 max-w-md text-cream/85">Imagine possible selves in colour. Nothing here corrects you. Drafts stay here; an optional live preview sends your photo to YouCam.</p>
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <button type="button" className="btn-gold sheen text-lg px-8 min-h-14" onClick={start} data-testid="button-start-look">
                Start a Look <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link href="/wardrobe" className="inline-flex items-center min-h-11 px-2 underline underline-offset-4 decoration-gold" data-testid="link-open-collection">Open my collection</Link>
            </div>
          </div>
          <Link href="/wardrobe" className="rise block rounded-3xl gold-frame-dark p-6 sm:p-8 bg-white/5 backdrop-blur-sm" style={{ animationDelay: '0.15s' }} data-testid="link-collection-title">
            <div className="flex items-center gap-2 text-gold"><CatMark className="h-6 w-6" /><span className="eyebrow">Your collection</span></div>
            <p className="font-display text-4xl sm:text-5xl mt-3 break-words" data-testid="text-collection-title">{settings.collectionTitle}</p>
            {settings.displayName ? <p className="text-mauve mt-1">curated by {settings.displayName}</p> : <p className="text-mauve mt-1">Rename it any time in Studio</p>}
          </Link>
        </div>
        <div className="vanity-bulbs" aria-hidden="true" />
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12" aria-labelledby="dest-h">
        <h2 id="dest-h" className="text-3xl text-plum">Three rooms, one atelier</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr_1fr]">
          {DESTS.map((d, i) => (
            <li key={d.href} className="rise" style={{ animationDelay: `${0.1 * i}s` }}>
              <Link href={d.href} className={`${d.cls} on-dark gold-frame-dark group flex h-full min-h-44 flex-col justify-between rounded-3xl p-6 transition-transform hover:-translate-y-1`} data-testid={`link-dest-${d.title.toLowerCase().replace(' ', '-')}`}>
                <d.icon className="h-7 w-7 text-gold" aria-hidden="true" />
                <div>
                  <p className="eyebrow">{d.sub}</p>
                  <p className="font-display text-3xl">{d.title}</p>
                  <p className="text-sm text-cream/85 mt-1">{d.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16" aria-labelledby="seed-h">
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] items-center rounded-3xl bg-card gold-frame p-6 sm:p-10">
          <div className="flex items-end justify-center gap-6 h-60">
            <Lipstick hex={SEED.hex} finish={SEED.finish} className="h-56 w-28" />
          </div>
          <div>
            <p className="eyebrow">A look to begin with</p>
            <h2 id="seed-h" className="text-4xl text-plum mt-1">{SEED.name}</h2>
            <p className="italic font-display text-xl text-amethyst mt-1">{SEED.mood}</p>
            <p className="mt-3 text-muted-foreground">{SEED.notes}</p>
            <p className="mt-3 font-mono text-sm">{SEED.hex} · {SEED.finish}</p>
            <div className="mt-4 flex gap-2 flex-wrap">{SEED.colors.map((c) => <Swatch key={c} hex={c} size={36} />)}</div>
            <Link href={`/draft?seed=1`} className="btn-couture mt-6" data-testid="link-try-seed">Make it mine</Link>
          </div>
        </div>
      </section>
      <NamingDialog open={naming} settings={settings} onDone={() => { setNaming(false); navigate('/draft'); }} />
    </div>
  );
}

