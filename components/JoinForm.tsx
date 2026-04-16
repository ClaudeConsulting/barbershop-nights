'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState('');

  function go(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (clean.length === 4) router.push(`/s/${clean}`);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={go}>
      <input
        className="w-full rounded-full border-2 border-ink bg-cream px-4 py-3 text-center text-2xl tracking-[0.4em] font-display font-bold uppercase outline-none focus:bg-white"
        type="text"
        placeholder="CODE"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={4}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
      <button className="btn-ghost w-full" type="submit" disabled={code.trim().length !== 4}>
        Join
      </button>
    </form>
  );
}
