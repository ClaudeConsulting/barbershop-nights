'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session, Tag, Voice, Phase } from './types';

const POLL_MS = 1500;

export function useSession(code: string, selfId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'missing' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/session/${code}`, { cache: 'no-store' });
      if (!mounted.current) return;
      if (res.status === 404) {
        setStatus('missing');
        setSession(null);
        return;
      }
      if (!res.ok) {
        setStatus('error');
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setSession(data.session);
      setStatus('ready');
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setStatus('error');
      setError(e instanceof Error ? e.message : 'network error');
    } finally {
      busy.current = false;
    }
  }, [code]);

  useEffect(() => {
    mounted.current = true;
    fetchOnce();
    const t = setInterval(fetchOnce, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [fetchOnce]);

  const patch = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (!selfId) return;
      const res = await fetch(`/api/session/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: selfId, ...extra }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.session && mounted.current) setSession(data.session);
      }
      return res;
    },
    [code, selfId],
  );

  const api = {
    join: (name: string) => patch('join', { name }),
    setVoices: (voices: Voice[]) => patch('setVoices', { voices }),
    setVote: (tagId: number | null, tag?: Tag) =>
      patch('setVote', { tagId, ...(tag ? { tag } : {}) }),
    claimVoice: (voice: Voice | null) => patch('claimVoice', { voice }),
    setPhase: (phase: Phase, extras?: { candidateTags?: Tag[]; currentTag?: Tag | null }) =>
      patch('setPhase', { phase, ...extras }),
    leave: () => patch('leave'),
    refresh: fetchOnce,
  };

  return { session, status, error, api };
}
