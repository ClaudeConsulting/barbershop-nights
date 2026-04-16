import { NextResponse } from 'next/server';
import { fetchTags, type FetchTagsQuery } from '@/lib/tags-api';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q: FetchTagsQuery = {};
  const parts = url.searchParams.get('parts');
  if (parts) q.parts = Number(parts);
  const type = url.searchParams.get('type');
  if (type) q.type = type;
  const learning = url.searchParams.get('learning');
  if (learning === 'Yes' || learning === 'No') q.learning = learning;
  const sheet = url.searchParams.get('sheetMusic');
  if (sheet === 'Yes' || sheet === 'No') q.sheetMusic = sheet;
  const collection = url.searchParams.get('collection');
  if (collection === 'classic' || collection === 'easytags' || collection === '100') {
    q.collection = collection;
  }
  const minRating = url.searchParams.get('minRating');
  if (minRating) q.minRating = Number(minRating);
  const sortby = url.searchParams.get('sortby');
  if (sortby) q.sortby = sortby as FetchTagsQuery['sortby'];
  const n = url.searchParams.get('n');
  if (n) q.n = Number(n);
  const start = url.searchParams.get('start');
  if (start) q.start = Number(start);
  const search = url.searchParams.get('q');
  if (search) q.q = search;

  try {
    const tags = await fetchTags(q);
    return NextResponse.json({ tags });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
