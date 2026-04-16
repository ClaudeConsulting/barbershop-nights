import { NextResponse } from 'next/server';
import { createSession } from '@/lib/sessions';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const hostId = typeof body.hostId === 'string' && body.hostId ? body.hostId : crypto.randomUUID();
  const hostName = typeof body.hostName === 'string' ? body.hostName.slice(0, 40) : '';
  const session = createSession(hostId, hostName);
  return NextResponse.json({ session, hostId });
}
