import Link from 'next/link';
import { StartSessionButton } from '@/components/StartSessionButton';
import { JoinForm } from '@/components/JoinForm';

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center gap-10">
        <header className="text-center animate-fade-up">
          <div className="stripes h-3 w-32 mx-auto mb-6 rounded-full" />
          <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight text-ink leading-none">
            Barbershop
            <span className="block italic">Night</span>
          </h1>
          <p className="mt-4 text-ink/70 text-lg">
            Gather 'round. Pick a tag. Ring the chord.
          </p>
        </header>

        <div
          className="card w-full p-6 flex flex-col gap-4 animate-fade-up"
          style={{ animationDelay: '80ms' }}
        >
          <p className="label text-center">The songbook</p>
          <a href="/solo" className="btn">
            Browse tags
          </a>
        </div>

        <div
          className="w-full flex flex-col gap-4 animate-fade-up"
          style={{ animationDelay: '160ms' }}
        >
          <p className="label text-center">Gather your crew</p>
          <div className="card w-full p-6 flex flex-col gap-4">
            <p className="label text-center">Host a session</p>
            <StartSessionButton />
          </div>
          <div className="card w-full p-6 flex flex-col gap-4">
            <p className="label text-center">Join with a code</p>
            <JoinForm />
          </div>
        </div>

        <p
          className="text-center text-xs text-ink/50 max-w-xs animate-fade-in"
          style={{ animationDelay: '240ms' }}
        >
          Tags courtesy of{' '}
          <Link
            href="https://www.barbershoptags.com/"
            target="_blank"
            className="underline"
          >
            barbershoptags.com
          </Link>
        </p>
      </div>
    </main>
  );
}
