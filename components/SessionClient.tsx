'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOrCreateClientId, getSessionInfo, saveJoinerInfo } from '@/lib/client-id';
import { useSession } from '@/lib/useSession';
import { Lobby } from './Lobby';
import { Voting } from './Voting';
import { Assignment } from './Assignment';
import { Singing } from './Singing';
import { JoinGate } from './JoinGate';

export function SessionClient({ code }: { code: string }) {
  const [selfId, setSelfId] = useState<string | null>(null);
  const [joined, setJoined] = useState<boolean>(false);

  useEffect(() => {
    const id = getOrCreateClientId();
    setSelfId(id);
    const info = getSessionInfo(code);
    if (info?.id === id) setJoined(true);
  }, [code]);

  const { session, status, api } = useSession(code, selfId);

  useEffect(() => {
    if (!session || !selfId) return;
    const me = session.participants.find((p) => p.id === selfId);
    if (me) setJoined(true);
  }, [session, selfId]);

  if (status === 'loading' || !selfId) {
    return <FullScreenMessage>Loading…</FullScreenMessage>;
  }

  if (status === 'missing' || !session) {
    return (
      <FullScreenMessage>
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="font-display text-4xl">Session not found</h2>
          <p className="text-ink/60">Code <span className="font-bold">{code}</span> isn&apos;t active.</p>
          <Link href="/" className="btn mt-4">Back home</Link>
        </div>
      </FullScreenMessage>
    );
  }

  const me = session.participants.find((p) => p.id === selfId) ?? null;

  if (!joined || !me) {
    return (
      <JoinGate
        code={code}
        session={session}
        onJoin={async (name) => {
          await api.join(name);
          saveJoinerInfo(code, selfId, name);
          setJoined(true);
        }}
      />
    );
  }

  const isHost = session.hostId === selfId;

  switch (session.phase) {
    case 'lobby':
      return <Lobby code={code} session={session} me={me} isHost={isHost} api={api} />;
    case 'voting':
      return <Voting session={session} me={me} isHost={isHost} api={api} />;
    case 'assignment':
      return <Assignment session={session} me={me} isHost={isHost} api={api} />;
    case 'singing':
      return <Singing session={session} me={me} isHost={isHost} api={api} />;
  }
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="text-ink/70 font-display text-xl">{children}</div>
    </main>
  );
}
