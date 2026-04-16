import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set(['www.barbershoptags.com', 'barbershoptags.com']);

type CacheEntry = { body: ArrayBuffer; contentType: string; at: number };
type Globals = { __bn_media_cache?: Map<string, CacheEntry> };
const g = globalThis as unknown as Globals;
const cache: Map<string, CacheEntry> = g.__bn_media_cache ?? new Map();
g.__bn_media_cache = cache;
const CACHE_MAX = 200;
const CACHE_TTL_MS = 1000 * 60 * 60;

function prune() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.at > CACHE_TTL_MS) cache.delete(k);
  }
  while (cache.size > CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first === undefined) break;
    cache.delete(first);
  }
}

function respond(entry: CacheEntry): Response {
  return new Response(entry.body, {
    headers: {
      'Content-Type': entry.contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

function accepts(kind: string, contentType: string): boolean {
  if (kind === 'image') return contentType.startsWith('image/');
  if (kind === 'sheet') return contentType.startsWith('image/') || contentType === 'application/pdf';
  return true;
}

async function tryFetch(target: string, kind: string): Promise<CacheEntry | null> {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return null;
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;

  const hit = cache.get(target);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (barbershop-night)',
        Accept:
          kind === 'image'
            ? 'image/*,*/*;q=0.8'
            : kind === 'sheet'
              ? 'image/*,application/pdf,*/*;q=0.8'
              : '*/*',
        Referer: 'https://www.barbershoptags.com/',
      },
      redirect: 'follow',
    });
  } catch {
    return null;
  }
  if (!upstream.ok || !upstream.body) return null;

  const contentType = (upstream.headers.get('content-type') ?? '').toLowerCase();
  if (!accepts(kind, contentType)) return null;

  const body = await upstream.arrayBuffer();
  if (body.byteLength === 0) return null;

  const entry: CacheEntry = {
    body,
    contentType: contentType || 'application/octet-stream',
    at: Date.now(),
  };
  cache.set(target, entry);
  prune();
  return entry;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const single = url.searchParams.get('url');
  const multi = url.searchParams.get('urls');
  const kind = url.searchParams.get('kind') ?? '';

  const list = multi
    ? multi.split(',').map((s) => s.trim()).filter(Boolean)
    : single
      ? [single]
      : [];
  if (list.length === 0) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 });
  }

  for (const target of list) {
    const entry = await tryFetch(target, kind);
    if (entry) return respond(entry);
  }
  return NextResponse.json({ error: 'no working upstream' }, { status: 502 });
}
