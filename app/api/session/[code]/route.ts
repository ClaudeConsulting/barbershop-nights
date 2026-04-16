import { NextResponse } from 'next/server';
import {
  getSession,
  joinSession,
  setVoices,
  setVote,
  claimVoice,
  setPhase,
  removeParticipant,
} from '@/lib/sessions';
import { VOICES, type Voice, type Phase, type Tag } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isVoice(x: unknown): x is Voice {
  return typeof x === 'string' && (VOICES as readonly string[]).includes(x);
}

function isPhase(x: unknown): x is Phase {
  return x === 'lobby' || x === 'voting' || x === 'assignment' || x === 'singing';
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const session = await getSession(code);
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ session });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad body' }, { status: 400 });
  }
  const action = body.action as string;
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  let session = null;
  switch (action) {
    case 'join': {
      const name = typeof body.name === 'string' ? body.name.slice(0, 40) : '';
      session = await joinSession(code, id, name);
      break;
    }
    case 'setVoices': {
      const voices = Array.isArray(body.voices) ? body.voices.filter(isVoice) : [];
      session = await setVoices(code, id, voices);
      break;
    }
    case 'setVote': {
      const tagId = body.tagId == null ? null : Number(body.tagId);
      const tag =
        body.tag && typeof body.tag === 'object' ? (body.tag as Tag) : undefined;
      session = await setVote(code, id, tagId, tag);
      break;
    }
    case 'claimVoice': {
      const voice = body.voice === null ? null : isVoice(body.voice) ? body.voice : undefined;
      if (voice === undefined) {
        return NextResponse.json({ error: 'bad voice' }, { status: 400 });
      }
      session = await claimVoice(code, id, voice);
      break;
    }
    case 'setPhase': {
      if (!isPhase(body.phase)) {
        return NextResponse.json({ error: 'bad phase' }, { status: 400 });
      }
      const candidateTags = Array.isArray(body.candidateTags)
        ? (body.candidateTags as Tag[])
        : undefined;
      const currentTag =
        body.currentTag === null
          ? null
          : body.currentTag && typeof body.currentTag === 'object'
            ? (body.currentTag as Tag)
            : undefined;
      session = await setPhase(code, id, body.phase, { candidateTags, currentTag });
      break;
    }
    case 'leave': {
      session = await removeParticipant(code, id);
      if (!session) return NextResponse.json({ ok: true });
      break;
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  if (!session) return NextResponse.json({ error: 'session gone or not allowed' }, { status: 404 });
  return NextResponse.json({ session });
}
