'use client';
import type { Session, Participant, Voice, Tag } from '@/lib/types';
import { VOICES } from '@/lib/types';

type Api = {
  claimVoice: (v: Voice | null) => Promise<Response | undefined>;
  setPhase: (
    p: 'voting' | 'singing',
    extras?: { currentTag?: Tag | null; candidateTags?: Tag[] },
  ) => Promise<Response | undefined>;
};

export function Assignment({
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
  const tag = session.currentTag;
  if (!tag) return null;

  const byVoice = new Map<Voice, Participant[]>();
  for (const v of VOICES) byVoice.set(v, []);
  for (const p of session.participants) {
    if (p.assignedVoice) byVoice.get(p.assignedVoice)!.push(p);
  }

  const allVoicesCovered = VOICES.every((v) => (byVoice.get(v) ?? []).length > 0);
  const everyoneAssigned = session.participants.every((p) => p.assignedVoice != null);
  const fullyReady = allVoicesCovered && everyoneAssigned;
  const canSing = me.assignedVoice != null;

  async function claim(v: Voice) {
    if (me.assignedVoice === v) {
      await api.claimVoice(null);
      return;
    }
    await api.claimVoice(v);
  }

  return (
    <main className="min-h-dvh p-4 md:p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <header className="text-center">
          <p className="label">You&apos;re singing</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mt-1">{tag.title}</h1>
          {tag.altTitle ? (
            <p className="italic text-ink/60 mt-1">&ldquo;{tag.altTitle}&rdquo;</p>
          ) : null}
          <p className="text-xs text-ink/50 mt-2">
            arr. {tag.arranger || 'unknown'} · {tag.writKey}
          </p>
        </header>

        <p className="text-center label">Pick your voice</p>

        <ul className="flex flex-col gap-3">
          {VOICES.map((v) => {
            const occupants = byVoice.get(v) ?? [];
            const myComfortable = me.voices.length === 0 || me.voices.includes(v);
            const isMine = me.assignedVoice === v;
            const others = occupants.filter((p) => p.id !== me.id);
            return (
              <li key={v}>
                <button
                  className={`w-full card p-4 flex items-center justify-between gap-4 text-left transition-transform ${
                    isMine ? 'shadow-[3px_3px_0_0_#1a1410] translate-x-[1px] translate-y-[1px]' : ''
                  } ${!myComfortable && !isMine ? 'opacity-60' : ''}`}
                  style={
                    isMine
                      ? { background: voiceBg(v), color: voiceText(v) }
                      : undefined
                  }
                  onClick={() => claim(v)}
                >
                  <div>
                    <div className="font-display text-2xl font-bold uppercase tracking-wider">
                      {v}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {v === 'Tenor' && 'highest · above the lead'}
                      {v === 'Lead' && 'the melody'}
                      {v === 'Bari' && 'tricky middle · fills the chord'}
                      {v === 'Bass' && 'lowest · the foundation'}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-0.5">
                    {occupants.length === 0 ? (
                      <span className="text-ink/50 text-sm italic">
                        {myComfortable ? 'tap to take' : 'tap to try'}
                      </span>
                    ) : (
                      <>
                        {isMine ? <span className="font-bold">{me.name}</span> : null}
                        {others.map((p) => (
                          <span
                            key={p.id}
                            className={`${isMine ? 'opacity-80 text-sm' : 'font-bold'}`}
                          >
                            {p.name}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2 sticky bottom-4">
          <div className="flex items-center justify-between gap-3">
            {isHost ? (
              <>
                <button className="btn-ghost" onClick={() => api.setPhase('voting')}>
                  Back
                </button>
                <button
                  className="btn flex-1"
                  disabled={!canSing}
                  onClick={() => api.setPhase('singing')}
                >
                  {canSing ? 'Sing!' : 'Pick your voice first'}
                </button>
              </>
            ) : (
              <p className="text-sm text-ink/60 w-full text-center">
                {fullyReady ? 'Host will start the song…' : 'Claim a voice above.'}
              </p>
            )}
          </div>
          {isHost && !fullyReady && canSing ? (
            <p className="text-xs text-ink/50 text-center">
              {everyoneAssigned ? 'Not all 4 voices covered — it\u2019ll be a partial chord.' : 'Some singers haven\u2019t picked yet.'}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function voiceBg(v: Voice): string {
  return { Tenor: '#f4b942', Lead: '#e94b3c', Bari: '#4a9b8e', Bass: '#2c4a7c' }[v];
}
function voiceText(v: Voice): string {
  return v === 'Tenor' ? '#1a1410' : '#f5ecd7';
}
