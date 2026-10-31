export const FINISHES = ['matte', 'satin', 'gloss', 'sheer', 'shimmer', 'metallic', 'holographic'] as const;
export type Finish = (typeof FINISHES)[number];

export const FINISH_NOTES: Record<Finish, string> = {
  matte: 'Velvet-flat, no shine',
  satin: 'Soft silk glow',
  gloss: 'Wet, mirror sheen',
  sheer: 'A whisper of colour',
  shimmer: 'Fine scattered light',
  metallic: 'Molten foil',
  holographic: 'Prismatic shift',
};

export type RenderStatus = 'saved' | 'dry_run' | 'pending' | 'success' | 'error' | 'timeout';

export interface RenderRecord {
  mode: 'dry' | 'live';
  originalSelections: { hex: string; finish: Finish; name: string; mood: string };
  submittedPayload: Record<string, unknown> | null;
  status: RenderStatus;
  resultImageId?: string;
  jobId?: string;
  timestamp: string;
  error?: string;
}

export interface Look {
  id: string;
  name: string;
  mood: string;
  notes: string;
  colors: string[];
  referenceImageIds: string[];
  createdAt: string;
  updatedAt: string;
  lipstick: { hex: string; finish: Finish };
  render?: RenderRecord;
}

export interface StudioSettings {
  displayName: string;
  collectionTitle: string;
  showTitleOnCards: boolean;
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  displayName: '',
  collectionTitle: 'My Lookbook',
  showTitleOnCards: false,
  onboarded: false,
};

export interface SavedCard {
  id: string;
  lookId: string;
  label: string;
  createdAt: string;
}

export const TAGLINE = 'Your skin. Your colors. Your rules.';
