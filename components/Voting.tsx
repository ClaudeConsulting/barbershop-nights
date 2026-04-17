'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, Participant, Tag } from '@/lib/types';
import { tallyVotes } from '@/lib/voicing';

type Api = {
  setVote: (tagId: number | null, tag?: Tag) => Promise<Response | undefined>;
  setPhase: (
    p: 'lobby' | 'assignment',
    extras?: { currentTag?: Tag | null; candidateTags?: Tag[] },
  ) => Promise<Response | undefined>;
};

type SortKey = 'Rating' | 'Downloaded' | 'Posted' | 'Title';

const PAGE_SIZE = 50;

export function Voting({
  session,
  me,
  isHost,
  api,
}: {
  session: Session;
  me: Participant;
  isHost: boolean;
  api: Api;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState<SortKey>('Rating');
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const nextStartRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(
    async (startAt: number, reset: boolean, thisSort: SortKey, thisQ: string) => {
      const myId = ++requestId.current;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          parts: '4',
          learning: 'Yes',
          sheetMusic: 'Yes',
          sortby: thisSort,
          n: String(PAGE_SIZE),
          start: String(startAt),
        });
        if (thisQ) params.set('q', thisQ);
        const res = await fetch(`/api/tags?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (myId !== requestId.current) return;
        const raw: Tag[] = data.tags ?? [];
        const incoming = raw.filter(
          (t) =>
            t.sheetMusic &&
            t.voiceTracks.Tenor &&
            t.voiceTracks.Lead &&
            t.voiceTracks.Bari &&
            t.voiceTracks.Bass,
        );
        setTags((prev) => {
          const merged = reset ? incoming : [...prev, ...incoming];
          const seen = new Set<number>();
          return merged.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
        });
        nextStartRef.current = startAt + PAGE_SIZE;
        setExhausted(raw.length < PAGE_SIZE);
      } catch (e) {
        if (myId === requestId.current) {
          setError(e instanceof Error ? e.message : 'fetch error');
        }
      } finally {
        if (myId === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    setTags([]);
    setExhausted(false);
    nextStartRef.current = 1;
    fetchPage(1, true, sort, debouncedQ);
  }, [sort, debouncedQ, fetchPage]);

  const loadMoreRef = useRef<() => void>(() => {});
  loadMoreRef.current = () => {
    if (loading || loadingMore || exhausted) return;
    fetchPage(nextStartRef.current, false, sort, debouncedQ);
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const q = debouncedQ;
  const pendingSearch = query.trim() !== debouncedQ;

  const tally = useMemo(() => tallyVotes(session.participants), [session.participants]);
  const counts = new Map(tally.map((t) => [t.tagId, t.count]));
  const votedIds = new Set(tally.map((t) => t.tagId));
  const totalVotes = session.participants.filter((p) => p.vote != null).length;
  const allVoted = totalVotes === session.participants.length;

  const leader = tally[0];
  const winner = leader
    ? session.candidateTags.find((t) => t.id === leader.tagId) ?? null
    : null;

  const tagsById = useMemo(() => {
    const m = new Map<number, Tag>();
    for (const t of session.candidateTags) m.set(t.id, t);
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [session.candidateTags, tags]);

  const votedList: Tag[] = [...votedIds]
    .map((id) => tagsById.get(id))
    .filter((t): t is Tag => !!t);

  const browseList = tags.filter((t) => !votedIds.has(t.id));

  async function vote(tag: Tag) {
    if (me.vote === tag.id) {
      await api.setVote(null);
      return;
    }
    await api.setVote(tag.id, tag);
  }

  async function revealWinner() {
    if (!winner) return;
    await api.setPhase('assignment', { currentTag: winner });
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 pb-40">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="label">Pick a tag</p>
            <p className="font-display text-3xl font-bold">Which one shall we sing?</p>
          </div>
          <p className="text-sm text-ink/60 text-right">
            {totalVotes}/{session.participants.length} voted
          </p>
        </header>

        <div className="card p-3 flex flex-col gap-2">
          <input
            className="w-full rounded-full border-2 border-ink bg-cream px-4 py-3 outline-none focus:bg-white"
            type="search"
            placeholder="Search by title or arranger…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={isHost}
          />
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="label mr-1">Sort</span>
            {(['Rating', 'Downloaded', 'Posted', 'Title'] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 py-1 rounded-full border-2 border-ink font-semibold uppercase tracking-wider ${
                  sort === s ? 'bg-ink text-cream' : 'bg-cream text-ink hover:bg-white'
                }`}
              >
                {s === 'Downloaded' ? 'Popular' : s === 'Posted' ? 'Newest' : s}
              </button>
            ))}
          </div>
        </div>

        {votedList.length > 0 ? (
          <section className="flex flex-col gap-2">
            <p className="label">In the vote pool</p>
            <ul className="flex flex-col gap-2">
              {votedList
                .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))
                .map((tag) => (
                  <TagCard
                    key={tag.id}
                    tag={tag}
                    count={counts.get(tag.id) ?? 0}
                    mine={me.vote === tag.id}
                    voters={session.participants.filter((p) => p.vote === tag.id)}
                    onClick={() => vote(tag)}
                    highlight
                  />
                ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <p className="label">
            {q ? `Search: "${q}" · ${browseList.length}` : 'Browse'}
            {loading || pendingSearch ? ' · loading…' : null}
          </p>
          {error ? <p className="text-lead text-sm">{error}</p> : null}
          {!loading && browseList.length === 0 && !error && exhausted ? (
            <p className="text-ink/50 text-sm italic">
              {q ? 'No matches found.' : 'No tags found.'}
            </p>
          ) : null}
          <ul className="flex flex-col gap-2">
            {browseList.map((tag) => (
              <TagCard
                key={tag.id}
                tag={tag}
                count={counts.get(tag.id) ?? 0}
                mine={me.vote === tag.id}
                voters={session.participants.filter((p) => p.vote === tag.id)}
                onClick={() => vote(tag)}
              />
            ))}
          </ul>
          {!exhausted ? (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6 text-ink/40 text-xs"
            >
              {loadingMore ? 'Loading more…' : loading ? null : '·'}
            </div>
          ) : tags.length > 0 ? (
            <p className="text-center text-ink/30 text-xs py-4">End of list</p>
          ) : null}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t-4 border-ink bg-cream p-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {isHost ? (
            <>
              <button
                className="btn-ghost"
                onClick={() => api.setPhase('lobby', { candidateTags: [], currentTag: null })}
              >
                Back
              </button>
              <button className="btn flex-1" disabled={!winner} onClick={revealWinner}>
                {winner
                  ? allVoted
                    ? `Sing "${winner.title}"`
                    : `Go with "${winner.title}"`
                  : 'Waiting for a vote…'}
              </button>
            </>
          ) : (
            <p className="text-sm text-ink/60 w-full text-center">
              {winner
                ? `Leader: ${winner.title} — waiting for host…`
                : 'Tap any tag to vote.'}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function TagCard({
  tag,
  count,
  mine,
  voters,
  onClick,
  highlight = false,
}: {
  tag: Tag;
  count: number;
  mine: boolean;
  voters: Participant[];
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`card w-full p-3 text-left flex items-center gap-3 transition-transform ${
          mine
            ? 'translate-x-[2px] translate-y-[2px] shadow-[3px_3px_0_0_#1a1410] bg-white'
            : 'hover:-translate-y-0.5'
        } ${highlight ? 'border-lead' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display text-lg font-bold truncate">{tag.title}</h3>
            {tag.writKey ? (
              <span className="text-[10px] uppercase tracking-widest text-ink/50">
                {tag.writKey}
              </span>
            ) : null}
          </div>
          {tag.altTitle ? (
            <p className="text-xs italic text-ink/60 truncate">&ldquo;{tag.altTitle}&rdquo;</p>
          ) : null}
          <p className="text-[11px] text-ink/50 mt-0.5">
            arr. {tag.arranger || 'unknown'} · ★ {tag.rating.toFixed(1)} · {tag.downloaded}↓
          </p>
          {voters.length > 0 ? (
            <p className="text-[11px] text-lead font-semibold mt-0.5">
              {voters.map((v) => v.name).join(', ')}
            </p>
          ) : null}
        </div>
        <div
          className={`shrink-0 w-10 h-10 rounded-full border-2 border-ink flex items-center justify-center font-display text-lg font-bold ${
            count > 0 ? 'bg-lead text-cream' : 'bg-cream'
          }`}
        >
          {count}
        </div>
      </button>
    </li>
  );
}
