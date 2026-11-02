import { createContext, useContext, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CatMark } from './motifs';

export const TOUR_COMPLETED_KEY = 'ffm.guided-tour.completed';

export const TOUR_STEPS = [
  { title: 'Welcome to your creative space', text: 'Come in, make yourself at home. This is your place to imagine every version of you. Your skin. Your colors. Your rules.' },
  { title: 'Imagine', text: 'Choose a shade, a finish, a name, and a mood. Subtle or unexpected, every color is welcome here.' },
  { title: 'Paint', text: 'Curious how it might look? A photo preview is optional. Nothing is sent to YouCam without your confirmation.' },
  { title: 'Collect', text: 'Keep every version. Save looks and export share cards without using YouCam or any rendering units.' },
  { title: 'Studio', text: 'Name your collection and choose whether your collection title and display name appear on exported cards. They stay off cards unless you turn that on.' },
] as const;

const TourContext = createContext({ afterNaming: () => {}, replay: () => {} });
export const useGuidedTour = () => useContext(TourContext);

export function GuidedTourDialog({ step, onStep, onFinish }: {
  step: number | null;
  onStep: (step: number) => void;
  onFinish: () => void;
}) {
  const current = TOUR_STEPS[step ?? 0];
  return (
    <Dialog open={step !== null} onOpenChange={(open) => { if (!open) onFinish(); }}>
      <DialogContent className="w-[calc(100%_-_2rem)] max-h-[85dvh] rounded-2xl border-2 border-gold bg-card sm:max-w-md motion-reduce:animate-none">
        <CatMark className="mx-auto h-12 w-12 text-gold-ink" />
        <DialogHeader aria-live="polite" aria-atomic="true">
          <p className="text-sm text-muted-foreground">Your guided tour · {(step ?? 0) + 1} of {TOUR_STEPS.length}</p>
          <DialogTitle className="font-display text-2xl text-plum">{current.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">{current.text}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn-quiet min-h-11" onClick={onFinish} data-testid="button-skip-tour">Skip</button>
          <div className="flex gap-2">
            <button type="button" className="btn-quiet min-h-11" disabled={step === 0} onClick={() => onStep(Math.max(0, (step ?? 0) - 1))} data-testid="button-tour-back">Back</button>
            <button type="button" className="btn-couture min-h-11" onClick={() => step === TOUR_STEPS.length - 1 ? onFinish() : onStep((step ?? 0) + 1)} data-testid="button-tour-next">{step === TOUR_STEPS.length - 1 ? 'Make it mine' : 'Next'}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<number | null>(null);
  const [finished, setFinished] = useState(() => {
    try { return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true'; }
    catch { return false; }
  });
  const finish = () => {
    setStep(null);
    setFinished(true);
    // A blocked storage permission must never prevent dismissing the tour.
    try { localStorage.setItem(TOUR_COMPLETED_KEY, 'true'); } catch { /* Session-only completion. */ }
  };
  return (
    <TourContext.Provider value={{ afterNaming: () => { if (!finished) setStep(0); }, replay: () => setStep(0) }}>
      {children}
      <GuidedTourDialog step={step} onStep={setStep} onFinish={finish} />
    </TourContext.Provider>
  );
}
