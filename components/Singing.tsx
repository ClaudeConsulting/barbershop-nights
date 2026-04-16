'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session, Participant, Voice, Tag } from '@/lib/types';
import { VOICES } from '@/lib/types';

type Api = {
  setPhase: (
    p: 'lobby' | 'voting' | 'assignment',
    extras?: { currentTag?: Tag | null; candidateTags?: Tag[] },
  ) => Promise<Response | undefined>;
};

const PROXY = (url: string) => `/api/media?url=${encodeURIComponent(url)}`;

export function Singing({
  session,
  me,
  isHost,
  api,
}: {
  session: Session;
  me: Participant;
  isHost: boolean;
  api: Api;
}) {
  const tag = session.currentTag;
  const myVoice = me.assignedVoice;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<'mine' | 'all' | null>(null);
  const [playing, setPlaying] = useState(false);

  const byVoice = useMemo(() => {
    const m = new Map<Voice, Participant>();
    for (const p of session.participants) {
      if (p.assignedVoice) m.set(p.assignedVoice, p);
    }
    return m;
  }, [session.participants]);

  const audioSrc = useMemo(() => {
    if (!tag) return null;
    if (mode === 'mine' && myVoice) {
      const src = tag.voiceTracks[myVoice];
      return src ? PROXY(src) : null;
    }
    if (mode === 'all' && tag.allParts) return PROXY(tag.allParts);
    return null;
  }, [tag, mode, myVoice]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!audioSrc) {
      el.pause();
      return;
    }
    el.src = audioSrc;
    el.currentTime = 0;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [audioSrc]);

  if (!tag || !myVoice) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <p className="text-ink/60">Missing tag or voice assignment.</p>
      </main>
    );
  }

  const voiceColor = voiceBg(myVoice);
  const voiceFg = myVoice === 'Tenor' ? '#1a1410' : '#f5ecd7';

  function stop() {
    audioRef.current?.pause();
    setMode(null);
    setPlaying(false);
  }

  return (
    <main className="min-h-dvh pb-40">
      <section
        className="px-4 md:px-6 py-6 border-b-4 border-ink"
        style={{ background: voiceColor, color: voiceFg }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] opacity-80">You sing</p>
            <h2 className="font-display text-5xl md:text-6xl font-bold">{myVoice}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] opacity-80">Tag</p>
            <p className="font-display text-xl md:text-2xl font-bold leading-tight">
              {tag.title}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {tag.writKey} · arr. {tag.arranger || 'unknown'}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {VOICES.map((v) => {
            const p = byVoice.get(v);
            return (
              <div
                key={v}
                className={`voice-chip voice-${v} ${v === myVoice ? 'ring-4 ring-ink' : ''}`}
              >
                {v} — {p ? p.name : '—'}
              </div>
            );
          })}
        </div>

        <div className="card p-2 overflow-hidden bg-white">
          <SheetMusic tag={tag} />
        </div>

        {tag.notes ? (
          <div className="card p-4">
            <p className="label">Notes</p>
            <p className="text-sm mt-1">{tag.notes}</p>
          </div>
        ) : null}

        {tag.lyrics ? (
          <div className="card p-4">
            <p className="label">Lyrics</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{tag.lyrics}</p>
          </div>
        ) : null}

        {tag.videoCode ? (
          <div className="card p-2 overflow-hidden">
            <p className="label px-2 pt-2">Demo</p>
            <div className="aspect-video mt-2 rounded-lg overflow-hidden border-2 border-ink">
              <iframe
                src={`https://www.youtube.com/embed/${tag.videoCode}`}
                title="Demo"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}
      </section>

      <audio ref={audioRef} onEnded={() => setPlaying(false)} preload="none" />

      <div className="fixed bottom-0 left-0 right-0 border-t-4 border-ink bg-cream p-3 md:p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
          <button
            className="btn-ghost flex-1"
            onClick={() => (mode === 'mine' && playing ? stop() : setMode('mine'))}
            disabled={!tag.voiceTracks[myVoice]}
          >
            {mode === 'mine' && playing ? `■ Stop ${myVoice}` : `▶ My part (${myVoice})`}
          </button>
          <button
            className="btn-ghost flex-1"
            onClick={() => (mode === 'all' && playing ? stop() : setMode('all'))}
            disabled={!tag.allParts}
          >
            {mode === 'all' && playing ? '■ Stop' : '▶ All parts'}
          </button>
          {isHost ? (
            <button
              className="btn"
              onClick={() => api.setPhase('assignment')}
              title="Reassign voices"
            >
              Reassign
            </button>
          ) : null}
          {isHost ? (
            <button
              className="btn-ghost"
              onClick={() => api.setPhase('lobby', { currentTag: null, candidateTags: [] })}
            >
              New tag
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function voiceBg(v: Voice): string {
  return { Tenor: '#f4b942', Lead: '#e94b3c', Bari: '#4a9b8e', Bass: '#2c4a7c' }[v];
}

function SheetMusic({ tag }: { tag: Tag }) {
  const candidates = [tag.sheetMusicAlt, tag.sheetMusic].filter(
    (u): u is string => !!u,
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [tag.id]);
  if (candidates.length === 0 || idx >= candidates.length) {
    return <p className="p-6 text-center text-ink/50">No sheet music available.</p>;
  }
  return (
    <img
      src={PROXY(candidates[idx])}
      alt={`${tag.title} sheet music`}
      className="w-full h-auto rounded-lg"
      onError={() => setIdx((i) => i + 1)}
    />
  );
}
