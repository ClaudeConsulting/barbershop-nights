'use client';
import { useEffect, useRef, useState } from 'react';
import { FAVORITE_TAGS } from '@/lib/favorite-tags';

export function FavoriteTags() {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Measure the content so the open/close can animate to an exact height.
  // (A grid-template-rows 0fr↔1fr collapse misbehaves inside this flex column,
  // so we animate max-height instead.) ResizeObserver keeps it correct if the
  // favorites list ever changes or fonts reflow.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-ink bg-cream">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="favorite-tags-panel"
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/40 transition-colors"
      >
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="text-tenor text-lg leading-none">★</span>
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-ink/70">
            Favorite tags
          </span>
          <span className="text-[11px] font-semibold text-ink/40 whitespace-nowrap">
            {FAVORITE_TAGS.length} ready
          </span>
        </span>
        <span
          className="text-ink/50 inline-block transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>

      <div
        id="favorite-tags-panel"
        inert={!open}
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: open ? contentHeight || 2000 : 0 }}
      >
        <div ref={contentRef}>
          <ul className="flex flex-col border-t-2 border-ink/15">
            {FAVORITE_TAGS.map((tag) => (
              <li key={tag.id} className="border-t-2 border-ink/10 first:border-t-0">
                <a
                  href={`/solo/tag/${tag.id}`}
                  className="flex items-center gap-3 px-5 py-3 text-left hover:bg-white/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold truncate leading-tight">
                      {tag.title}
                    </h3>
                    <p className="text-[11px] text-ink/50 mt-0.5 truncate">
                      {tag.writKey}
                      {tag.arranger ? ` · arr. ${tag.arranger}` : ''}
                    </p>
                  </div>
                  <span className="text-ink/30 shrink-0">→</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="px-5 py-2.5 text-[11px] text-ink/40 border-t-2 border-ink/10 italic">
            Preloaded — opens instantly, no songbook lookup.
          </p>
        </div>
      </div>
    </div>
  );
}
