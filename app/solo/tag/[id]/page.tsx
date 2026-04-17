import { fetchTagById } from '@/lib/tags-api';
import { SoloTag } from '@/components/SoloTag';

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

  const tag = await fetchTagById(tagId);
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
