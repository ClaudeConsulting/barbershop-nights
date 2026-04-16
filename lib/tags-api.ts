import { XMLParser } from 'fast-xml-parser';
import type { Tag, Voice } from './types';

const BASE = 'https://www.barbershoptags.com/api.php';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  processEntities: true,
  htmlEntities: true,
});

type RawTag = {
  id?: string | number;
  Title?: string;
  AltTitle?: string;
  Arranger?: string;
  Parts?: string | number;
  Type?: string;
  WritKey?: string;
  Rating?: string | number;
  RatingCount?: string | number;
  Downloaded?: string | number;
  Notes?: string;
  Lyrics?: string;
  SheetMusic?: { '#text'?: string; '@_type'?: string } | string;
  SheetMusicAlt?: string;
  Notation?: { '#text'?: string; '@_type'?: string } | string;
  NotationAlt?: string;
  AllParts?: { '#text'?: string; '@_type'?: string } | string;
  Bass?: { '#text'?: string; '@_type'?: string } | string;
  Bari?: { '#text'?: string; '@_type'?: string } | string;
  Lead?: { '#text'?: string; '@_type'?: string } | string;
  Tenor?: { '#text'?: string; '@_type'?: string } | string;
  videos?: {
    '@_available'?: string;
    '@_count'?: string;
    video?: RawVideo | RawVideo[];
  };
};

type RawVideo = {
  id?: string | number;
  Code?: string;
  SungKey?: string;
  Multitrack?: string;
};

function extractUrl(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field.trim() || null;
  if (typeof field === 'object' && field !== null) {
    const v = (field as { '#text'?: string })['#text'];
    return v?.trim() || null;
  }
  return null;
}

function extractType(field: unknown): string | null {
  if (!field || typeof field !== 'object') return null;
  const t = (field as { '@_type'?: string })['@_type'];
  return t ? t.toLowerCase() : null;
}

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function toStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return '';
  return String(v);
}

function mapTag(raw: RawTag): Tag {
  const videos = raw.videos?.video
    ? Array.isArray(raw.videos.video)
      ? raw.videos.video
      : [raw.videos.video]
    : [];
  const firstVideo = videos[0];
  return {
    id: toNum(raw.id),
    title: toStr(raw.Title),
    altTitle: toStr(raw.AltTitle),
    arranger: toStr(raw.Arranger),
    parts: toNum(raw.Parts, 4),
    type: toStr(raw.Type),
    writKey: toStr(raw.WritKey),
    rating: toNum(raw.Rating),
    ratingCount: toNum(raw.RatingCount),
    downloaded: toNum(raw.Downloaded),
    notes: toStr(raw.Notes),
    lyrics: toStr(raw.Lyrics),
    sheetMusic: extractUrl(raw.SheetMusic),
    sheetMusicType: extractType(raw.SheetMusic),
    sheetMusicAlt: toStr(raw.SheetMusicAlt) || null,
    voiceTracks: {
      Tenor: extractUrl(raw.Tenor) ?? undefined,
      Lead: extractUrl(raw.Lead) ?? undefined,
      Bari: extractUrl(raw.Bari) ?? undefined,
      Bass: extractUrl(raw.Bass) ?? undefined,
    } as Partial<Record<Voice, string>>,
    allParts: extractUrl(raw.AllParts),
    notation: extractUrl(raw.Notation),
    notationAlt: toStr(raw.NotationAlt) || null,
    videoCode: firstVideo?.Code ? String(firstVideo.Code) : null,
  };
}

export type FetchTagsQuery = {
  q?: string;
  parts?: number;
  type?: string;
  learning?: 'Yes' | 'No';
  sheetMusic?: 'Yes' | 'No';
  collection?: 'classic' | 'easytags' | '100';
  minRating?: number;
  sortby?: 'Title' | 'Posted' | 'stamp' | 'Rating' | 'Downloaded' | 'Classic';
  n?: number;
  start?: number;
};

export async function fetchTags(query: FetchTagsQuery): Promise<Tag[]> {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.parts) params.set('Parts', String(query.parts));
  if (query.type) params.set('Type', query.type);
  if (query.learning) params.set('Learning', query.learning);
  if (query.sheetMusic) params.set('SheetMusic', query.sheetMusic);
  if (query.collection) params.set('Collection', query.collection);
  if (query.minRating != null) params.set('MinRating', String(query.minRating));
  if (query.sortby) params.set('Sortby', query.sortby);
  params.set('n', String(query.n ?? 20));
  params.set('start', String(query.start ?? 1));
  params.set('client', 'barbershop-night');

  const url = `${BASE}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'barbershop-night/0.1' },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`barbershoptags.com responded ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const tagsNode = parsed?.tags?.tag;
  if (!tagsNode) return [];
  const arr: RawTag[] = Array.isArray(tagsNode) ? tagsNode : [tagsNode];
  return arr.map(mapTag).filter((t) => t.id > 0);
}

export async function fetchTagById(id: number): Promise<Tag | null> {
  const params = new URLSearchParams({ id: String(id), client: 'barbershop-night' });
  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) return null;
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const tagsNode = parsed?.tags?.tag;
  if (!tagsNode) return null;
  const raw = Array.isArray(tagsNode) ? tagsNode[0] : tagsNode;
  return mapTag(raw);
}
