# ChatGPT Reset

Status: live at [chatgptreset.com](https://chatgptreset.com/).

An unofficial one-button internet experiment. Every tap advances a shared global counter; each 10,000,000 taps earns one symbolic collective reset.

## What exists

- Responsive single-screen frontend based on Stefan's reference layout.
- Live 30-day campaign countdown.
- Optimistic tap interaction with error recovery.
- Persistent per-IP “My taps” count alongside the live global total. The server stores only an HMAC hash, never the raw IP address.
- Matter.js gravity, collision, and stacking: every click launches an OpenAI-mark token from the reset button into a growing pile at the bottom of the screen.
- Fast press/bounce feedback and a locally generated 110ms tap-pop sound on each click.
- Atomic global counter backed by Neon Postgres.
- Local in-memory fallback when `DATABASE_URL` is not configured.

## Launch package

The production URL is set to `https://chatgptreset.com/` across the canonical tag, Open Graph metadata, structured data, robots file, and sitemap.

- Search title and description, canonical URL, crawler rules, and large image previews.
- Open Graph and X card metadata with a 1200×630 social graphic.
- The social graphic is exported from the real centered hero UI at `/?og-preview=1`, so it stays visually consistent with the product instead of using a separate promotional composition.
- `WebSite`, `WebPage`, and `WebApplication` structured data.
- Sitemap, robots file, web app manifest, favicon set, Apple icon, and install icons.
- Apex-domain redirect and basic production security headers for Vercel.
- A repeatable launch check: `npm run launch:check`.

Production runs on Vercel with a persistent Neon counter, a stable per-IP hash salt, and both the apex and `www` domains attached. `www` redirects permanently to the apex domain.

## Local development

Install dependencies and run the development server. Add a private `.env.local` containing `DATABASE_URL` to use the live Neon counter; without it, the app uses an in-memory counter for local visual work.

## Database

Neon project: `chatgpt-reset`

The database uses one singleton `reset_campaign` row for the global number and one `reset_tappers` row per hashed IP. A single SQL statement increments both counters atomically without accounts or raw IP storage.

People sharing one public IP, such as the same office or home network, also share the same “My taps” number.

## Brand note

This project is an unofficial parody/experiment and is not affiliated with OpenAI.
The falling mark is sourced from the MIT-licensed Lobe Icons asset package; OpenAI's mark remains a trademark of OpenAI.

The tap sound is generated locally by `scripts/generate-tap-sound.mjs` and stored as `public/assets/tap-pop.wav`.
