'use client';
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { Session, Participant, Voice, Tag } from '@/lib/types';
import { VOICES } from '@/lib/types';
import { coveredVoices } from '@/lib/voicing';
import { VoiceChip } from './VoiceChip';

type Api = {
  setVoices: (v: Voice[]) => Promise<Response | undefined>;
  setPhase: (p: 'voting', extras: { candidateTags: Tag[] }) => Promise<Response | undefined>;
  leave: () => Promise<Response | undefined>;
};

export function Lobby({
  code,
  session,
  me,
  isHost,
  api,
}: {
  code: string;
  session: Session;
  me: Participant;
  isHost: boolean;
  api: Api;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/s/${code}`;
  }, [code]);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      color: { dark: '#1a1410', light: '#f5ecd7' },
      width: 280,
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [joinUrl]);

  const covered = coveredVoices(session.participants);
  const missing = VOICES.filter((v) => !covered.includes(v));
  const allCovered = missing.length === 0;
  const enoughPeople = session.participants.length >= 4;
  const canStart = isHost && !loadingTags;

  async function toggleMyVoice(v: Voice) {
    const next = me.voices.includes(v)
      ? me.voices.filter((x) => x !== v)
      : [...me.voices, v];
    await api.setVoices(next);
  }

  async function findTags() {
    setLoadingTags(true);
    setTagError(null);
    try {
      await api.setPhase('voting', { candidateTags: [] });
    } catch (e) {
      setTagError(e instanceof Error ? e.message : 'unknown error');
      setLoadingTags(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 animate-fade-up">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="label">Session</p>
            <p className="font-display text-4xl font-bold tracking-[0.3em]">{code}</p>
          </div>
          <button
            className="text-ink/50 text-xs uppercase tracking-widest hover:text-ink"
            onClick={() => api.leave().then(() => (window.location.href = '/'))}
          >
            Leave
          </button>
        </header>

        <section className="card p-4 flex flex-col md:flex-row items-center gap-4">
          {qr ? (
            <img src={qr} alt="Join QR" className="w-40 h-40 rounded-lg border-2 border-ink" />
          ) : (
            <div className="w-40 h-40 rounded-lg border-2 border-ink bg-cream" />
          )}
          <div className="flex-1 w-full flex flex-col gap-2">
            <p className="label">Invite</p>
            <p className="text-sm text-ink/70 break-all">{joinUrl}</p>
            <button className="btn-ghost mt-2 w-full md:w-auto" onClick={copyLink}>
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </section>

        <section className="card p-5 flex flex-col gap-4">
          <p className="label">Which voices can you sing?</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {VOICES.map((v) => {
              const on = me.voices.includes(v);
              return (
                <button
                  key={v}
                  onClick={() => toggleMyVoice(v)}
                  className={`rounded-xl border-2 border-ink p-4 font-bold uppercase tracking-wider transition-all ${
                    on
                      ? `voice-${v} shadow-[4px_4px_0_0_#1a1410]`
                      : 'bg-cream text-ink/60 hover:bg-white'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink/50">Pick every voice you&apos;re comfortable singing.</p>
        </section>

        <section className="card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="label">Singers ({session.participants.length}/5)</p>
            <p className="text-xs text-ink/50">solo or up to 5</p>
          </div>
          <ul className="flex flex-col divide-y-2 divide-ink/10">
            {session.participants.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{p.name}</span>
                  {session.hostId === p.id ? (
                    <span className="text-[10px] uppercase tracking-widest text-ink/40">
                      Host
                    </span>
                  ) : null}
                  {p.id === me.id ? (
                    <span className="text-[10px] uppercase tracking-widest text-lead font-bold">
                      You
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {p.voices.length === 0 ? (
                    <span className="text-xs text-ink/40 italic">no voices yet</span>
                  ) : (
                    p.voices.map((v) => <VoiceChip key={v} voice={v} small />)
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 flex flex-col gap-3">
          <p className="label">Coverage</p>
          <div className="flex gap-2 flex-wrap">
            {VOICES.map((v) => (
              <div
                key={v}
                className={`voice-chip voice-${v} ${
                  covered.includes(v) ? '' : 'opacity-25 grayscale'
                }`}
              >
                {v} {covered.includes(v) ? '✓' : '—'}
              </div>
            ))}
          </div>
          {!allCovered ? (
            <p className="text-sm text-ink/60">
              Missing: <b>{missing.join(', ')}</b>
              {enoughPeople ? null : ' · that\u2019s fine, you can still sing along.'}
            </p>
          ) : (
            <p className="text-sm text-bari font-semibold">All four parts covered — ready to ring.</p>
          )}
        </section>

        {isHost ? (
          <div className="flex flex-col gap-2 items-center">
            <button className="btn" onClick={findTags} disabled={!canStart}>
              {loadingTags ? 'Opening…' : 'Browse tags'}
            </button>
            {tagError ? <p className="text-lead text-sm">{tagError}</p> : null}
          </div>
        ) : (
          <p className="text-center text-ink/60 text-sm">
            Waiting for the host to open the tag browser…
          </p>
        )}
      </div>
    </main>
  );
}
