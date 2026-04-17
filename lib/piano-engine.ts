export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const BLACK_INDICES = new Set([1, 3, 6, 8, 10]);

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export type PianoKey = {
  midi: number;
  noteName: string;
  octave: number;
  isBlack: boolean;
};

export function generateKeys(startMidi: number, endMidi: number): PianoKey[] {
  const keys: PianoKey[] = [];
  for (let midi = startMidi; midi <= endMidi; midi++) {
    const noteIndex = (midi - 12) % 12;
    const octave = Math.floor((midi - 12) / 12);
    keys.push({
      midi,
      noteName: NOTE_NAMES[noteIndex],
      octave,
      isBlack: BLACK_INDICES.has(noteIndex),
    });
  }
  return keys;
}

export function midiToPitchClass(midi: number): number {
  return (midi - 12) % 12;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function scalePitchClasses(
  rootSemitone: number,
  intervals: number[],
): Set<number> {
  return new Set(intervals.map((i) => (rootSemitone + i) % 12));
}

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export type ParsedKey = {
  rootSemitone: number;
  rootLabel: string;
  scaleName: 'Major' | 'Minor';
  intervals: number[];
};

export function parseWritKey(writKey: string): ParsedKey | null {
  if (!writKey) return null;
  const parts = writKey.split(':');
  if (parts.length !== 2) return null;
  const [scaleRaw, rootRaw] = parts.map((s) => s.trim());
  const rootSemitone = NOTE_TO_SEMITONE[rootRaw];
  if (rootSemitone == null) return null;
  const isMinor = scaleRaw.toLowerCase().includes('minor');
  return {
    rootSemitone,
    rootLabel: FLAT_TO_SHARP[rootRaw] ? rootRaw : rootRaw,
    scaleName: isMinor ? 'Minor' : 'Major',
    intervals: isMinor ? MINOR_INTERVALS : MAJOR_INTERVALS,
  };
}

export function pitchClassLabel(pc: number, preferFlats: boolean): string {
  const sharp = NOTE_NAMES[pc];
  if (!BLACK_INDICES.has(pc)) return sharp;
  if (!preferFlats) return sharp;
  const flatMap: Record<string, string> = {
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
    'A#': 'Bb',
  };
  return flatMap[sharp] ?? sharp;
}
