import { fetchTagById } from '@/lib/tags-api';
import { getFavoriteTag, FAVORITE_TAG_IDS } from '@/lib/favorite-tags';
import { SoloTag } from '@/components/SoloTag';

// Prerender the baked-in favorites at build time so they're served statically
// (no API, no per-request render). Other ids still render on demand.
export function generateStaticParams() {
  return [...FAVORITE_TAG_IDS].map((id) => ({ id: String(id) }));
}

export default async function SoloTagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tagId = Number(id);
  if (!Number.isFinite(tagId) || tagId <= 0) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <p className="text-ink/60">Invalid tag id.</p>
      </main>
    );
  }

  // Favorites are baked into the app, so they resolve instantly without
  // hitting the slow barbershoptags.com API.
  const tag = getFavoriteTag(tagId) ?? (await fetchTagById(tagId));
  if (!tag) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-ink/60">Tag not found.</p>
        <a href="/solo" className="btn-ghost">
          ← Back to browse
        </a>
      </main>
    );
  }

  return <SoloTag tag={tag} />;
}
