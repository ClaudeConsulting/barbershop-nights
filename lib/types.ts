export const VOICES = ['Tenor', 'Lead', 'Bari', 'Bass'] as const;
export type Voice = (typeof VOICES)[number];

export type Phase = 'lobby' | 'voting' | 'assignment' | 'singing';

export type Participant = {
  id: string;
  name: string;
  voices: Voice[];
  vote: number | null;
  assignedVoice: Voice | null;
  joinedAt: number;
};

export type Tag = {
  id: number;
  title: string;
  altTitle: string;
  arranger: string;
  parts: number;
  type: string;
  writKey: string;
  rating: number;
  ratingCount: number;
  downloaded: number;
  notes: string;
  lyrics: string;
  sheetMusic: string | null;
  sheetMusicType: string | null;
  sheetMusicAlt: string | null;
  voiceTracks: Partial<Record<Voice, string>>;
  allParts: string | null;
  notation: string | null;
  notationAlt: string | null;
  videoCode: string | null;
};

export type Session = {
  code: string;
  hostId: string;
  phase: Phase;
  participants: Participant[];
  candidateTags: Tag[];
  currentTag: Tag | null;
  history: number[];
  createdAt: number;
  updatedAt: number;
};

export type PublicSession = Omit<Session, 'candidateTags'> & {
  candidateTags: Tag[];
};
