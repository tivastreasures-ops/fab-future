import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BookHeart, Palette, Settings2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatMark } from './motifs';

const NAV = [
  { href: '/draft', label: 'Imagine', icon: Palette },
  { href: '/vanity', label: 'Paint', icon: Sparkles },
  { href: '/wardrobe', label: 'Collect', icon: BookHeart },
  { href: '/settings', label: 'Studio', icon: Settings2 },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] btn-couture">Skip to studio</a>
      <header className="velvet on-dark sticky top-0 z-40 border-b-2 border-gold">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 h-16">
          <Link href="/" className="flex items-center gap-2 min-h-11 rounded-md" data-testid="link-home">
            <CatMark className="h-7 w-7 text-gold" />
            <span className="font-display text-lg tracking-wide text-cream">Fabulous <span className="italic text-gold">Future</span> Me</span>
          </Link>
          <nav aria-label="Studio" className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = loc.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined} data-testid={`link-nav-${n.label.toLowerCase().replace(' ', '-')}`}
                  className={cn('flex items-center gap-2 min-h-11 px-4 rounded-full text-sm font-medium transition-colors', active ? 'bg-gold text-plum-deep' : 'text-cream hover:bg-white/10')}>
                  <n.icon className="h-4 w-4" aria-hidden="true" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="vanity-bulbs opacity-70" aria-hidden="true" />
      </header>
      <main id="main" className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
      <nav aria-label="Studio" className="md:hidden fixed bottom-0 inset-x-0 z-40 velvet on-dark border-t-2 border-gold pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {NAV.map((n) => {
            const active = loc.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? 'page' : undefined} data-testid={`link-tab-${n.label.toLowerCase().replace(' ', '-')}`}
                  className={cn('flex flex-col items-center justify-center gap-1 min-h-16 text-xs font-medium', active ? 'text-gold' : 'text-cream')}>
                  <n.icon className="h-5 w-5" aria-hidden="true" />
                  {n.label}
                  <span className={cn('h-0.5 w-6 rounded-full transition-opacity', active ? 'bg-gold opacity-100' : 'opacity-0')} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="rise mb-6">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-3xl sm:text-5xl text-plum mt-1">{title}</h1>
      {children ? <div className="mt-2 text-muted-foreground max-w-2xl">{children}</div> : null}
    </div>
  );
}
