'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrCreateClientId, saveHostInfo } from '@/lib/client-id';

export function StartSessionButton() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const hostId = getOrCreateClientId();
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, hostName: name.trim() }),
      });
      if (!res.ok) throw new Error('Could not start session');
      const data = await res.json();
      const code = data.session.code as string;
      saveHostInfo(code, hostId, name.trim());
      router.push(`/s/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        className="w-full rounded-full border-2 border-ink bg-cream px-4 py-3 text-ink placeholder-ink/40 outline-none focus:bg-white"
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        disabled={loading}
      />
      <button
        className="btn w-full"
        onClick={start}
        disabled={loading || !name.trim()}
      >
        {loading ? 'Starting…' : 'Start session'}
      </button>
      {error ? <p className="text-lead text-sm text-center">{error}</p> : null}
    </div>
  );
}
