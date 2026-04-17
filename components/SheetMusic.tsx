'use client';
import { useEffect, useState } from 'react';
import type { Tag } from '@/lib/types';
import { PdfSheet } from './PdfSheet';

export function SheetMusic({ tag }: { tag: Tag }) {
  const [failed, setFailed] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    setFailed(false);
  }, [tag.id]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const isPdf =
    tag.sheetMusicType === 'pdf' ||
    (tag.sheetMusicAlt?.toLowerCase().endsWith('.pdf') ?? false);
  const candidates = (isPdf
    ? [tag.sheetMusic, tag.sheetMusicAlt]
    : [tag.sheetMusicAlt, tag.sheetMusic]
  ).filter((u): u is string => !!u);

  if (candidates.length === 0 || failed) {
    return (
      <div className="p-6 text-center text-ink/50 flex flex-col gap-2">
        <p>Sheet music unavailable inline.</p>
        {candidates.length > 0 ? (
          <a
            className="btn-ghost self-center"
            href={candidates[0]}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on barbershoptags.com
          </a>
        ) : null}
      </div>
    );
  }

  const src = `/api/media?kind=sheet&urls=${candidates
    .map((u) => encodeURIComponent(u))
    .join(',')}`;

  if (isPdf) {
    if (isMobile === null) {
      return <div className="w-full min-h-[400px]" />;
    }
    if (isMobile) {
      return <PdfSheet url={src} fallbackUrl={candidates[0]} />;
    }
    return (
      <object
        data={src}
        type="application/pdf"
        className="w-full rounded-lg"
        style={{ height: '80vh' }}
      >
        <PdfSheet url={src} fallbackUrl={candidates[0]} />
      </object>
    );
  }

  return (
    <img
      src={src}
      alt={`${tag.title} sheet music`}
      className="w-full h-auto rounded-lg"
      onError={() => setFailed(true)}
    />
  );
}
