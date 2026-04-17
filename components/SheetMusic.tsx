'use client';
import { useEffect, useState } from 'react';
import type { Tag } from '@/lib/types';

export function SheetMusic({ tag }: { tag: Tag }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [tag.id]);

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
    return (
      <object
        data={src}
        type="application/pdf"
        className="w-full rounded-lg"
        style={{ height: '80vh' }}
      >
        <div className="p-6 text-center text-ink/50 flex flex-col gap-2">
          <p>Your browser can&apos;t display this PDF inline.</p>
          <a
            className="btn-ghost self-center"
            href={candidates[0]}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF
          </a>
        </div>
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
