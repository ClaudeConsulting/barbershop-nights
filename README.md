# Barbershop Night

A small Next.js app for running barbershop-tag dinner parties with 3–5 singers. Host a session, everyone joins with a short code, vote on a tag, claim a voice part (Tenor / Lead / Bari / Bass), and sing.

Includes a solo mode that skips the session flow if you just want to browse and learn a tag on your own.

Tags, sheet music, per-voice learning tracks, and demo videos are pulled live from [barbershoptags.com](https://www.barbershoptags.com/).

## Features

- **Host a session** — short 4-letter join code + QR, up to 5 participants.
- **Vote on a tag** — browse the full barbershoptags.com catalog with live search, infinite scroll, and sort by Rating / Popular / Newest / Title. Only tags with sheet music and all four learning tracks are shown.
- **Claim a voice** — each singer picks Tenor / Lead / Bari / Bass; conflicts are obvious.
- **Sing together** — shared sheet music, per-voice track playback, all-parts mix, plus a live piano keyboard that highlights the scale of the tag's key.
- **Solo mode** — same browse + tag page with no session plumbing.
- **Piano** — 2-octave keyboard with authentic sampled sound (Salamander Grand Piano samples via Tone.js).

## Tech stack

- Next.js 15 (App Router) with React 19
- TypeScript, Tailwind CSS
- Tone.js for piano playback
- Optional: Vercel KV (Upstash Redis) for cross-instance session persistence; falls back to in-memory if unset.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. The dev server listens on `0.0.0.0` so you can join from a phone on the same network.

### Environment (optional)

By default, sessions live in-process and disappear on restart — fine for a single dev server. For multi-instance deploys, set the standard Vercel KV env vars:

```
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
KV_URL=...
```

When `KV_REST_API_URL` is present the app uses Vercel KV; otherwise it uses the in-memory store.

### Build

```bash
npm run build
npm start
```

## How session codes work

- 4-char alphabetic code (confusable characters removed).
- Sessions expire after 4 hours of inactivity.
- Host is the first participant; if the host leaves, the next participant inherits.

## Data + credits

- **Tags** — courtesy of [barbershoptags.com](https://www.barbershoptags.com/). This app proxies their XML API and media URLs; please respect their terms and don't hammer the endpoint.
- **Piano samples** — [Salamander Grand Piano](https://tonejs.github.io/audio/salamander/) served by the Tone.js CDN.
- **Demo videos** — embedded directly from YouTube.

## Project layout

```
app/
  page.tsx            home (host / join / solo)
  s/[code]/           in-session flow (lobby → voting → assignment → singing)
  solo/               solo browse + tag page
  api/
    session/          create / read / mutate sessions
    tags/             XML → JSON proxy over barbershoptags.com
    media/            audio/image proxy (adds Referer so CDNs don't 403)
components/           Lobby, Voting, Assignment, Singing, Piano, …
lib/
  sessions.ts         KV-backed + in-memory session store
  tags-api.ts         barbershoptags.com client
  piano-engine.ts     music theory helpers (scales, key parsing)
  piano-audio.ts      Tone.js sampler wrapper
```

## License

No license chosen yet. Until one is added, all rights are reserved by the author.
