'use client';
import { useState } from 'react';
import type { Session } from '@/lib/types';

export function JoinGate({
  code,
  session,
  onJoin,
}: {
  code: string;
  session: Session;
  onJoin: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = session.participants.length >= 5;
  const locked = session.phase !== 'lobby';

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin(name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join');
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 animate-fade-up">
      <div className="w-full max-w-md flex flex-col gap-6">
        <header className="text-center">
          <p className="label">Joining session</p>
          <p className="font-display text-6xl font-bold tracking-[0.3em] mt-2">{code}</p>
          <p className="mt-3 text-ink/60">
            {session.participants.length} {session.participants.length === 1 ? 'singer' : 'singers'} here:{' '}
            <span className="font-semibold">
              {session.participants.map((p) => p.name).join(', ')}
            </span>
          </p>
        </header>

        {locked ? (
          <div className="card p-6 text-center">
            <p className="text-ink/70">Session has already started.</p>
          </div>
        ) : full ? (
          <div className="card p-6 text-center">
            <p className="text-ink/70">This session is full (5 singers).</p>
          </div>
        ) : (
          <div className="card p-6 flex flex-col gap-3">
            <input
              className="w-full rounded-full border-2 border-ink bg-cream px-4 py-3 text-ink placeholder-ink/40 outline-none focus:bg-white"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              maxLength={40}
              autoFocus
            />
            <button className="btn w-full" onClick={submit} disabled={busy || !name.trim()}>
              {busy ? 'Joining…' : 'Join'}
            </button>
            {error ? <p className="text-lead text-sm text-center">{error}</p> : null}
          </div>
        )}
      </div>
    </main>
  );
}
