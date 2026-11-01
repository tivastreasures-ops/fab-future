import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, BookHeart } from 'lucide-react';
import { useLooks, useSettings } from '@/hooks/use-studio';
import { DEFAULT_SETTINGS, TAGLINE } from '@/lib/types';
import { Lipstick, Swatch } from '@/components/atelier/motifs';
import { NamingDialog } from '@/components/atelier/naming-dialog';
import { CatGuide } from '@/components/atelier/cat-guide';
import { SEED } from '@/lib/seed';
import './landing.css';

const RHINE = [[14, 6], [27, 4], [55, 7], [83, 15], [92, 30], [40, 60], [70, 88]];
// Optional owner-supplied art. A clean checkout works without this untracked file.
const studioArt = `${import.meta.env.BASE_URL}studio-illustration.png`;

export default function Landing() {
  const { data } = useSettings();
  const settings = data ?? DEFAULT_SETTINGS;
  const { data: looksData, isLoading: looksLoading } = useLooks();
  const looks = useMemo(() => looksData ?? [], [looksData]);
  const latest = useMemo(
    () => [...looks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [looks],
  );
  const hasLooks = looks.length > 0;
  const [, navigate] = useLocation();
  const [naming, setNaming] = useState<null | string>(null);

  useEffect(() => { document.title = 'Fabulous Future Me'; }, []);

  const start = () => (settings.onboarded ? navigate('/draft') : setNaming('/draft'));
  const openBook = () => (settings.onboarded ? navigate('/wardrobe') : setNaming('/wardrobe'));

  const dests = [
    { href: '/draft', title: 'Imagine', sub: 'The drafting table', body: 'Mix any color, name the mood, pin references.', pos: '18% 62%', size: '330%' },
    { href: '/vanity', title: 'Paint', sub: 'The vanity', body: 'See your lipstick idea, only when you ask.', pos: '88% 42%', size: '330%' },
    { href: '/wardrobe', title: 'Collect', sub: 'The wardrobe', body: 'Every version of you, kept together.', pos: '53% 30%', size: '360%' },
  ];

  return (
    <div>
      <section className="room" aria-labelledby="hero-title">
        <div className="room-stage">
          <img src={studioArt} alt="An illustrated vanity studio at night: drafting table, wardrobe of gowns, lit mirror, and two cats." className="room-art" onError={(event) => { event.currentTarget.hidden = true; }} />
          {RHINE.map(([x, y], i) => (
            <span key={i} aria-hidden="true" className="rhine" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s` }} />
          ))}
          <h2 className="book-hotspot" data-testid="link-collection-title">
            <button type="button" onClick={openBook} aria-label={`Open ${settings.collectionTitle}`} data-testid="button-lookbook-hotspot">
              <BookHeart className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span data-testid="text-collection-title">{settings.collectionTitle}</span>
            </button>
          </h2>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-5 mt-4 sm:-mt-24 relative z-10 grid gap-4 md:grid-cols-[1.4fr_1fr] items-end">
        <div className="plaque p-5 sm:p-7 rise">
          <h1 id="hero-title" className="text-4xl sm:text-6xl leading-[0.95] text-plum">Fabulous Future Me</h1>
          <p className="mt-3 font-display text-xl sm:text-2xl text-plum" data-testid="text-promise">Design the you that you haven't met yet, and keep every version.</p>
          <p className="mt-2 text-base text-[hsl(300_20%_32%)]" data-testid="text-tagline">{TAGLINE}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-couture sheen text-lg px-8 min-h-14" onClick={start} data-testid="button-start-look">
              Start a Look <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="grid gap-3 rise" style={{ animationDelay: '0.12s' }}>
          <CatGuide pose="welcome" />
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-12" aria-labelledby="dest-h">
        <h2 id="dest-h" className="text-3xl text-plum">Walk into the room</h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {dests.map((d, i) => {
            const glow = d.title === 'Paint' && hasLooks;
            return (
              <li key={d.href} className="rise" style={{ animationDelay: `${0.08 * i}s` }}>
                <Link href={d.href} className={`dest plaque h-full ${glow ? 'glow-on' : ''}`} data-testid={`link-dest-${d.title.toLowerCase()}`}>
                  <div className="crop" aria-hidden="true" style={{ backgroundImage: `url(${studioArt})`, backgroundSize: d.size, backgroundPosition: d.pos }} />
                  <div className="p-4 border-t border-gold">
                    <p className="text-sm text-[hsl(36_72%_28%)] font-semibold">{d.sub}</p>
                    <p className="font-display text-3xl text-plum">{d.title}</p>
                    <p className="text-sm text-[hsl(300_20%_30%)] mt-1">{d.body}</p>
                    {glow && <p className="text-sm mt-2 text-plum italic" data-testid="text-paint-glow">The mirror lights are on for you.</p>}
                    {d.title === 'Collect' && (
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-sm text-plum" data-testid="text-look-count">
                          {looksLoading ? 'Counting...' : `${looks.length} saved ${looks.length === 1 ? 'look' : 'looks'}`}
                        </p>
                        <div className="flex h-11 items-end pr-2" aria-hidden="true">
                          {latest.map((l, k) => (
                            <span key={l.id} className="fan-chip -ml-2" style={{ background: l.lipstick.hex, transform: `rotate(${(k - (latest.length - 1) / 2) * 12}deg)` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 pb-16" aria-labelledby="seed-h">
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr] items-center rounded-3xl bg-card gold-frame p-6 sm:p-10">
          <div className="flex items-end justify-center h-60">
            <Lipstick hex={SEED.hex} finish={SEED.finish} className="h-56 w-28" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[hsl(36_72%_28%)]">A look to begin with</p>
            <h2 id="seed-h" className="text-4xl text-plum mt-1">{SEED.name}</h2>
            <p className="italic font-display text-xl text-amethyst mt-1">{SEED.mood}</p>
            <p className="mt-3 text-muted-foreground">{SEED.notes}</p>
            <p className="mt-3 font-mono text-sm">{SEED.hex} · {SEED.finish}</p>
            <div className="mt-4 flex gap-2 flex-wrap">{SEED.colors.map((c) => <Swatch key={c} hex={c} size={36} />)}</div>
            <Link href="/draft?seed=1" className="btn-quiet mt-6" data-testid="link-try-seed">Make it mine</Link>
          </div>
        </div>
      </section>
      <NamingDialog open={naming !== null} settings={settings} onDone={() => { const to = naming ?? '/draft'; setNaming(null); navigate(to); }} />
    </div>
  );
}
