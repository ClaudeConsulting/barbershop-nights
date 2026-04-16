import type { Voice } from '@/lib/types';

export function VoiceChip({
  voice,
  small = false,
  muted = false,
}: {
  voice: Voice;
  small?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={`voice-chip voice-${voice} ${small ? 'text-xs px-2 py-0.5' : ''} ${
        muted ? 'opacity-40' : ''
      }`}
    >
      {voice}
    </span>
  );
}
