'use client';
import { useEffect, useRef, useState } from 'react';

const PDFJS_VERSION = '4.10.38';
const PDFJS_CDN = `https://esm.sh/pdfjs-dist@${PDFJS_VERSION}`;
const PDFJS_WORKER = `https://esm.sh/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

const loadPdfjs = new Function('url', 'return import(url)') as (
  url: string,
) => Promise<any>;

type LoadState = 'loading' | 'ready' | 'error';

export function PdfSheet({
  url,
  fallbackUrl,
}: {
  url: string;
  fallbackUrl?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<any>(null);
  const tokenRef = useRef(0);
  const [state, setState] = useState<LoadState>('loading');
  const [pageCount, setPageCount] = useState(0);

  async function renderAll(containerWidth: number) {
    const doc = docRef.current;
    const container = containerRef.current;
    if (!doc || !container || containerWidth <= 0) return;
    const token = ++tokenRef.current;
    const dpr = window.devicePixelRatio || 1;

    container.innerHTML = '';
    for (let i = 1; i <= doc.numPages; i++) {
      if (token !== tokenRef.current) return;
      const page = await doc.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = containerWidth / unscaled.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      canvas.style.display = 'block';
      canvas.style.marginBottom = i < doc.numPages ? '12px' : '0';
      canvas.style.background = '#fff';
      canvas.style.borderRadius = '8px';
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      container.appendChild(canvas);
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
  }

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setPageCount(0);
    docRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = '';

    (async () => {
      try {
        const pdfjs = await loadPdfjs(PDFJS_CDN);
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) return;
        docRef.current = doc;
        setPageCount(doc.numPages);
        await renderAll(containerRef.current?.clientWidth ?? 0);
        if (!cancelled) setState('ready');
      } catch (e) {
        console.error('PDF load failed', e);
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastWidth = container.clientWidth;
    let timeoutId: number | undefined;
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      if (Math.abs(w - lastWidth) < 2 || !docRef.current) return;
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        lastWidth = w;
        renderAll(w);
      }, 120);
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (state === 'error') {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full border-4 border-ink bg-cream flex items-center justify-center text-3xl">
          ♪
        </div>
        <p className="label">Sheet music</p>
        <p className="text-xs text-ink/60 max-w-xs">
          Couldn&apos;t render inline. Tap below to open the PDF.
        </p>
        <a
          className="btn mt-2"
          href={fallbackUrl ?? url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open PDF
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full min-h-[200px]" />
      {state === 'loading' ? (
        <p className="text-center text-xs text-ink/50 italic py-6">
          Rendering PDF…
        </p>
      ) : (
        <div className="flex items-center justify-center gap-3 py-2 text-[10px] text-ink/50">
          {pageCount > 1 ? <span>{pageCount} pages</span> : null}
          <a
            href={fallbackUrl ?? url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            Open PDF for zoom
          </a>
        </div>
      )}
    </div>
  );
}
