import { kv } from '@vercel/kv';
import type { Session, Voice, Phase, Tag } from './types';

const SESSION_TTL_SECONDS = 60 * 60 * 4;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const USE_KV = !!process.env.KV_REST_API_URL;

type Globals = { __bn_sessions?: Map<string, Session> };
const g = globalThis as unknown as Globals;
const memStore: Map<string, Session> = g.__bn_sessions ?? new Map();
g.__bn_sessions = memStore;

function key(code: string): string {
  return `bn:session:${code.toUpperCase()}`;
}

function makeCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

async function readSession(code: string): Promise<Session | null> {
  const upper = code.toUpperCase();
  if (USE_KV) {
    return (await kv.get<Session>(key(upper))) ?? null;
  }
  return memStore.get(upper) ?? null;
}

async function writeSession(s: Session): Promise<void> {
  const upper = s.code.toUpperCase();
  if (USE_KV) {
    await kv.set(key(upper), s, { ex: SESSION_TTL_SECONDS });
    return;
  }
  memStore.set(upper, s);
}

async function deleteSession(code: string): Promise<void> {
  const upper = code.toUpperCase();
  if (USE_KV) {
    await kv.del(key(upper));
    return;
  }
  memStore.delete(upper);
}

async function claimUniqueCode(session: Session): Promise<boolean> {
  const upper = session.code.toUpperCase();
  if (USE_KV) {
    const res = await kv.set(key(upper), session, {
      ex: SESSION_TTL_SECONDS,
      nx: true,
    });
    return res !== null;
  }
  if (memStore.has(upper)) return false;
  memStore.set(upper, session);
  return true;
}

export async function createSession(
  hostId: string,
  hostName: string,
): Promise<Session> {
  for (let tries = 0; tries < 10; tries++) {
    const code = makeCode();
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
    if (await claimUniqueCode(session)) return session;
  }
  throw new Error('Could not allocate a unique session code');
}

export async function getSession(code: string): Promise<Session | null> {
  const s = await readSession(code);
  if (!s) return null;
  if (Date.now() - s.updatedAt > SESSION_TTL_SECONDS * 1000) {
    await deleteSession(code);
    return null;
  }
  return s;
}

export async function updateSession(
  code: string,
  mutator: (s: Session) => void,
): Promise<Session | null> {
  const s = await getSession(code);
  if (!s) return null;
  mutator(s);
  s.updatedAt = Date.now();
  await writeSession(s);
  return s;
}

export function joinSession(
  code: string,
  participantId: string,
  name: string,
): Promise<Session | null> {
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
): Promise<Session | null> {
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
): Promise<Session | null> {
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
): Promise<Session | null> {
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
): Promise<Session | null> {
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
): Promise<Session | null> {
  return updateSession(code, (s) => {
    s.participants = s.participants.filter((p) => p.id !== participantId);
    if (s.hostId === participantId && s.participants.length > 0) {
      s.hostId = s.participants[0].id;
    }
  });
}
