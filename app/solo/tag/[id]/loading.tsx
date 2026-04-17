export default function Loading() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full border-4 border-ink border-t-transparent animate-spin" />
        <p className="label">Loading tag…</p>
        <p className="text-xs text-ink/50">Fetching from barbershoptags.com</p>
      </div>
    </main>
  );
}
