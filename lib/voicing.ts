import type { Participant, Voice } from './types';

export function coveredVoices(participants: Participant[]): Voice[] {
  const all = new Set<Voice>();
  for (const p of participants) for (const v of p.voices) all.add(v);
  return (['Tenor', 'Lead', 'Bari', 'Bass'] as Voice[]).filter((v) => all.has(v));
}

export function canCoverAllParts(participants: Participant[]): boolean {
  return coveredVoices(participants).length >= 4;
}

export function tallyVotes(
  participants: Participant[],
): { tagId: number; count: number }[] {
  const tally = new Map<number, number>();
  for (const p of participants) {
    if (p.vote == null) continue;
    tally.set(p.vote, (tally.get(p.vote) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([tagId, count]) => ({ tagId, count }))
    .sort((a, b) => b.count - a.count);
}
