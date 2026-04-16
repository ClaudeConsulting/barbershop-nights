import type { Session, Participant, Voice, Phase, Tag } from './types';

const SESSION_TTL_MS = 1000 * 60 * 60 * 4;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type Globals = { __bn_sessions?: Map<string, Session> };
const g = globalThis as unknown as Globals;
const store: Map<string, Session> = g.__bn_sessions ?? new Map();
g.__bn_sessions = store;

function makeCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function createSession(hostId: string, hostName: string): Session {
  sweep();
  let code = makeCode();
  while (store.has(code)) code = makeCode();
  const now = Date.now();
  const session: Session = {
    code,
    hostId,
    phase: 'lobby',
    participants: [
      {
        id: hostId,
        name: hostName || 'Host',
        voices: [],
        vote: null,
        assignedVoice: null,
        joinedAt: now,
      },
    ],
    candidateTags: [],
    currentTag: null,
    history: [],
    createdAt: now,
    updatedAt: now,
  };
  store.set(code, session);
  return session;
}

export function getSession(code: string): Session | null {
  const s = store.get(code.toUpperCase());
  if (!s) return null;
  if (Date.now() - s.updatedAt > SESSION_TTL_MS) {
    store.delete(code.toUpperCase());
    return null;
  }
  return s;
}

export function updateSession(
  code: string,
  mutator: (s: Session) => void,
): Session | null {
  const s = getSession(code);
  if (!s) return null;
  mutator(s);
  s.updatedAt = Date.now();
  return s;
}

export function joinSession(
  code: string,
  participantId: string,
  name: string,
): Session | null {
  return updateSession(code, (s) => {
    if (s.phase !== 'lobby') return;
    if (s.participants.length >= 5) return;
    if (s.participants.some((p) => p.id === participantId)) {
      const p = s.participants.find((p) => p.id === participantId)!;
      if (name) p.name = name;
      return;
    }
    s.participants.push({
      id: participantId,
      name: name || `Singer ${s.participants.length + 1}`,
      voices: [],
      vote: null,
      assignedVoice: null,
      joinedAt: Date.now(),
    });
  });
}

export function setVoices(
  code: string,
  participantId: string,
  voices: Voice[],
): Session | null {
  return updateSession(code, (s) => {
    const p = s.participants.find((p) => p.id === participantId);
    if (p) p.voices = voices;
  });
}

export function setVote(
  code: string,
  participantId: string,
  tagId: number | null,
  tag?: Tag,
): Session | null {
  return updateSession(code, (s) => {
    if (s.phase !== 'voting') return;
    const p = s.participants.find((p) => p.id === participantId);
    if (!p) return;
    p.vote = tagId;
    if (tag && tagId != null && !s.candidateTags.some((t) => t.id === tagId)) {
      s.candidateTags.push(tag);
    }
  });
}

export function claimVoice(
  code: string,
  participantId: string,
  voice: Voice | null,
): Session | null {
  return updateSession(code, (s) => {
    if (s.phase !== 'assignment') return;
    const me = s.participants.find((p) => p.id === participantId);
    if (!me) return;
    me.assignedVoice = voice;
  });
}

export function setPhase(
  code: string,
  participantId: string,
  phase: Phase,
  extras?: { candidateTags?: Tag[]; currentTag?: Tag | null },
): Session | null {
  return updateSession(code, (s) => {
    if (s.hostId !== participantId) return;
    s.phase = phase;
    if (extras?.candidateTags !== undefined) s.candidateTags = extras.candidateTags;
    if (extras?.currentTag !== undefined) s.currentTag = extras.currentTag;
    if (phase === 'voting') {
      for (const p of s.participants) p.vote = null;
    }
    if (phase === 'assignment') {
      for (const p of s.participants) p.assignedVoice = null;
    }
    if (phase === 'lobby') {
      s.currentTag = null;
      s.candidateTags = [];
      for (const p of s.participants) {
        p.vote = null;
        p.assignedVoice = null;
      }
    }
  });
}

export function removeParticipant(
  code: string,
  participantId: string,
): Session | null {
  return updateSession(code, (s) => {
    s.participants = s.participants.filter((p) => p.id !== participantId);
    if (s.hostId === participantId && s.participants.length > 0) {
      s.hostId = s.participants[0].id;
    }
  });
}

function sweep() {
  const now = Date.now();
  for (const [code, s] of store.entries()) {
    if (now - s.updatedAt > SESSION_TTL_MS) store.delete(code);
  }
}
