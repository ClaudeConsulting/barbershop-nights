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
  const allPartsRef = useRef<HTMLAudioElement | null>(null);
  const voiceRefs = useRef<Record<Voice, HTMLAudioElement | null>>({
    Tenor: null,
    Lead: null,
    Bari: null,
    Bass: null,
  });
  type Mode = Voice | 'all' | 'minus' | null;
  const [mode, setMode] = useState<Mode>(null);
  const [playing, setPlaying] = useState(false);

  const byVoice = useMemo(() => {
    const m = new Map<Voice, Participant>();
    for (const p of session.participants) {
      if (p.assignedVoice) m.set(p.assignedVoice, p);
    }
    return m;
  }, [session.participants]);

  const tagId = tag?.id ?? null;
  useEffect(() => {
    const allEl = allPartsRef.current;
    const pauseAllVoices = () => {
      for (const v of VOICES) voiceRefs.current[v]?.pause();
    };
    const pauseAll = () => {
      allEl?.pause();
      pauseAllVoices();
    };

    if (!mode) {
      pauseAll();
      setPlaying(false);
      return;
    }

    if (mode === 'all') {
      pauseAllVoices();
      if (!allEl) return;
      allEl.currentTime = 0;
      allEl.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }

    allEl?.pause();
    const activeVoices: Voice[] =
      mode === 'minus' && myVoice
        ? VOICES.filter((v) => v !== myVoice)
        : mode === 'minus'
          ? [...VOICES]
          : [mode];

    for (const v of VOICES) {
      const el = voiceRefs.current[v];
      if (!el) continue;
      if (activeVoices.includes(v)) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, myVoice, tagId]);

  if (!tag || !myVoice) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <p className="text-ink/60">Missing tag or voice assignment.</p>
      </main>
    );
  }

  const voiceColor = voiceBg(myVoice);
  const voiceFg = myVoice === 'Tenor' ? '#1a1410' : '#f5ecd7';
  const minusAvailable = VOICES.filter((v) => v !== myVoice).every(
    (v) => !!tag.voiceTracks[v],
  );

  function stop() {
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

        {tag.notationAlt || tag.notation ? (
          <div className="card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="label">MuseScore file</p>
              <p className="text-xs text-ink/60 mt-1">
                Open in MuseScore to edit, transpose, or play back.
              </p>
            </div>
            <a
              className="btn-ghost whitespace-nowrap"
              href={tag.notationAlt ?? tag.notation ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              ↓ .mscz
            </a>
          </div>
        ) : null}
      </section>

      <audio
        ref={allPartsRef}
        src={tag.allParts ? PROXY(tag.allParts) : undefined}
        onEnded={() => mode === 'all' && stop()}
        preload="none"
      />
      {VOICES.map((v) => (
        <audio
          key={v}
          ref={(el) => {
            voiceRefs.current[v] = el;
          }}
          src={tag.voiceTracks[v] ? PROXY(tag.voiceTracks[v]!) : undefined}
          onEnded={() => mode === v && stop()}
          preload="none"
        />
      ))}

      <div className="fixed bottom-0 left-0 right-0 border-t-4 border-ink bg-cream p-3 md:p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-2">
            {VOICES.map((v) => {
              const has = !!tag.voiceTracks[v];
              const active = mode === v && playing;
              const mine = v === myVoice;
              return (
                <button
                  key={v}
                  onClick={() => (active ? stop() : setMode(v))}
                  disabled={!has}
                  title={mine ? `Your part (${v})` : v}
                  className={`rounded-xl border-2 border-ink p-2 font-bold uppercase tracking-wider text-xs md:text-sm transition-all ${
                    active
                      ? `voice-${v} shadow-[3px_3px_0_0_#1a1410]`
                      : has
                        ? `voice-${v} opacity-70 hover:opacity-100`
                        : 'bg-cream text-ink/30'
                  } ${mine ? 'ring-4 ring-ink ring-offset-1 ring-offset-cream' : ''}`}
                >
                  {active ? '■' : '▶'} {v}
                </button>
              );
            })}
            <button
              onClick={() => (mode === 'all' && playing ? stop() : setMode('all'))}
              disabled={!tag.allParts}
              className={`rounded-xl border-2 border-ink p-2 font-bold uppercase tracking-wider text-xs md:text-sm ${
                mode === 'all' && playing
                  ? 'bg-ink text-cream shadow-[3px_3px_0_0_#1a1410]'
                  : tag.allParts
                    ? 'bg-cream hover:bg-white'
                    : 'bg-cream text-ink/30'
              }`}
            >
              {mode === 'all' && playing ? '■ All' : '▶ All'}
            </button>
          </div>
          <button
            onClick={() => (mode === 'minus' && playing ? stop() : setMode('minus'))}
            disabled={!minusAvailable}
            title={`Play everyone except ${myVoice} — sing your part along`}
            className={`rounded-xl border-2 border-ink p-2 font-bold uppercase tracking-wider text-xs md:text-sm ${
              mode === 'minus' && playing
                ? 'bg-ink text-cream shadow-[3px_3px_0_0_#1a1410]'
                : minusAvailable
                  ? 'bg-cream hover:bg-white'
                  : 'bg-cream text-ink/30'
            }`}
          >
            {mode === 'minus' && playing
              ? `■ Practice (everyone but ${myVoice})`
              : `▶ Practice (everyone but ${myVoice})`}
          </button>
          {isHost ? (
            <div className="flex gap-2 justify-end">
              <button
                className="btn-ghost text-xs"
                onClick={() => api.setPhase('assignment')}
                title="Reassign voices"
              >
                Reassign
              </button>
              <button
                className="btn-ghost text-xs"
                onClick={() => api.setPhase('lobby', { currentTag: null, candidateTags: [] })}
              >
                New tag
              </button>
            </div>
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
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [tag.id]);

  const isPdf =
    tag.sheetMusicType === 'pdf' ||
    (tag.sheetMusicAlt?.toLowerCase().endsWith('.pdf') ?? false);
  const candidates = (isPdf
    ? [tag.sheetMusic, tag.sheetMusicAlt]
    : [tag.sheetMusicAlt, tag.sheetMusic]
  ).filter((u): u is string => !!u);

  if (candidates.length === 0 || failed) {
    return (
      <div className="p-6 text-center text-ink/50 flex flex-col gap-2">
        <p>Sheet music unavailable inline.</p>
        {candidates.length > 0 ? (
          <a
            className="btn-ghost self-center"
            href={candidates[0]}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on barbershoptags.com
          </a>
        ) : null}
      </div>
    );
  }

  const src = `/api/media?kind=sheet&urls=${candidates
    .map((u) => encodeURIComponent(u))
    .join(',')}`;

  if (isPdf) {
    return (
      <object
        data={src}
        type="application/pdf"
        className="w-full rounded-lg"
        style={{ height: '80vh' }}
      >
        <div className="p-6 text-center text-ink/50 flex flex-col gap-2">
          <p>Your browser can&apos;t display this PDF inline.</p>
          <a
            className="btn-ghost self-center"
            href={candidates[0]}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF
          </a>
        </div>
      </object>
    );
  }

  return (
    <img
      src={src}
      alt={`${tag.title} sheet music`}
      className="w-full h-auto rounded-lg"
      onError={() => setFailed(true)}
    />
  );
}
