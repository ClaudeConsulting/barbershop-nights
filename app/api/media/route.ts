import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set(['www.barbershoptags.com', 'barbershoptags.com']);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'bad url' }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { 'User-Agent': 'barbershop-night/0.1' },
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const contentLength = upstream.headers.get('content-length') ?? undefined;
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  };
  if (contentLength) headers['Content-Length'] = contentLength;

  return new Response(upstream.body, { headers });
}
