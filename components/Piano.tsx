'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  generateKeys,
  midiToPitchClass,
  scalePitchClasses,
  parseWritKey,
  pitchClassLabel,
  type PianoKey,
} from '@/lib/piano-engine';
import { loadPianoSampler, playPianoNote } from '@/lib/piano-audio';

const START_MIDI = 48; // C3
const END_MIDI = 71; // B4 — 2 octaves

export function Piano({ writKey }: { writKey: string }) {
  const parsed = useMemo(() => parseWritKey(writKey), [writKey]);
  const scalePCs = useMemo(() => {
    if (!parsed) return null;
    return scalePitchClasses(parsed.rootSemitone, parsed.intervals);
  }, [parsed]);
  const tonicPC = parsed?.rootSemitone ?? null;

  const keys = useMemo(() => generateKeys(START_MIDI, END_MIDI), []);
  const whites = useMemo(() => keys.filter((k) => !k.isBlack), [keys]);
  const blacks = useMemo(() => keys.filter((k) => k.isBlack), [keys]);
  const whiteIndex = useMemo(() => {
    const m = new Map<number, number>();
    whites.forEach((k, i) => m.set(k.midi, i));
    return m;
  }, [whites]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [audioReady, setAudioReady] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    loadPianoSampler()
      .then(() => setAudioReady(true))
      .catch(() => setAudioReady(false));
  }, []);

  function play(midi: number) {
    if (!audioReady) setAudioLoading(true);
    playPianoNote(midi).finally(() => setAudioLoading(false));
    setPressed((prev) => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    window.setTimeout(() => {
      setPressed((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 220);
  }

  const whiteW = width > 0 ? width / whites.length : 0;
  const whiteH = Math.min(Math.max(whiteW * 3.8, 90), 150);
  const blackW = whiteW * 0.6;
  const blackH = whiteH * 0.62;

  const preferFlats = parsed ? parsed.rootLabel.includes('b') : true;

  const isScaleKey = (key: PianoKey) =>
    scalePCs ? scalePCs.has(midiToPitchClass(key.midi)) : false;
  const isTonic = (key: PianoKey) =>
    tonicPC != null && midiToPitchClass(key.midi) === tonicPC;

  const whiteBg = (scale: boolean, tonic: boolean) => {
    if (tonic) return '#f4b942';
    if (scale) return '#fcecc6';
    return '#ffffff';
  };
  const blackBg = (scale: boolean, tonic: boolean) => {
    if (tonic) return '#f4b942';
    if (scale) return '#7a5a1f';
    return '#1a1410';
  };

  return (
    <div className="card p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <p className="label">Note helper</p>
        {parsed ? (
          <p className="text-xs text-ink/70">
            Key:{' '}
            <span className="font-bold">
              {parsed.rootLabel} {parsed.scaleName}
            </span>
          </p>
        ) : (
          <p className="text-xs text-ink/50 italic">No key info for this tag</p>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full select-none touch-none"
        style={{ height: whiteH }}
      >
        {whiteW > 0 &&
          whites.map((key, i) => {
            const scale = isScaleKey(key);
            const tonic = isTonic(key);
            const label =
              key.noteName === 'C'
                ? `${key.noteName}${key.octave}`
                : scale
                  ? pitchClassLabel(midiToPitchClass(key.midi), preferFlats)
                  : '';
            return (
              <button
                key={key.midi}
                onPointerDown={(e) => {
                  e.preventDefault();
                  play(key.midi);
                }}
                aria-label={`${key.noteName}${key.octave}`}
                className="absolute top-0 border-2 border-ink rounded-b-md font-bold text-[10px] flex items-end justify-center pb-1 transition-transform"
                style={{
                  left: i * whiteW,
                  width: whiteW,
                  height: whiteH,
                  background: whiteBg(scale, tonic),
                  color: tonic ? '#1a1410' : '#1a1410',
                  transform: pressed.has(key.midi)
                    ? 'translateY(2px)'
                    : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
        {whiteW > 0 &&
          blacks.map((key) => {
            const lowerWhiteMidi = key.midi - 1;
            const idx = whiteIndex.get(lowerWhiteMidi);
            if (idx === undefined) return null;
            const left = (idx + 1) * whiteW - blackW / 2;
            const scale = isScaleKey(key);
            const tonic = isTonic(key);
            const label = scale
              ? pitchClassLabel(midiToPitchClass(key.midi), preferFlats)
              : '';
            return (
              <button
                key={key.midi}
                onPointerDown={(e) => {
                  e.preventDefault();
                  play(key.midi);
                }}
                aria-label={`${key.noteName}${key.octave}`}
                className="absolute top-0 border-2 border-ink rounded-b-md font-bold text-[9px] flex items-end justify-center pb-1 transition-transform z-10"
                style={{
                  left,
                  width: blackW,
                  height: blackH,
                  background: blackBg(scale, tonic),
                  color: tonic ? '#1a1410' : '#f5ecd7',
                  transform: pressed.has(key.midi)
                    ? 'translateY(2px)'
                    : undefined,
                }}
              >
                {label}
              </button>
            );
          })}
      </div>

      <p className="text-[11px] text-ink/60 italic text-center">
        {audioLoading && !audioReady
          ? 'Loading piano samples…'
          : 'Tap a key to hear it. Gold = tonic. Cream = scale notes.'}
      </p>
    </div>
  );
}
