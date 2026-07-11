# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Current visual direction

- Source screenshot: `/Users/stefanpopadic/Library/Application Support/CleanShot/media/media_TeG8Kvjab6/CleanShot 2026-07-11 at 16.59.23@2x.png`.
- Preserve the deliberately sparse composition: wordmark top-left, earned resets top-center, time remaining top-right, “My taps” at the left midpoint, the circular action centered, “Total taps” at the right midpoint, and taps remaining directly below the button.
- Keep the UI quiet, flat, monochrome, and extremely simple. Do not add navigation, cards, illustrations, secondary calls to action, or feature sections.
- The full brand palette is strictly white, graphite, black, and neutral gray. Do not introduce green, sage, or other color accents in the UI, launch graphics, focus states, or icons.
- The Open Graph image is a separate 1200×630 black editorial composition: large explanatory headline on the left and a premium monochrome 3D click scene on the right. The scene shows a sculpted cursor pressing a graphite button while OpenAI-knot tokens and tap numbers burst outward.
- The product must remain clearly unofficial and not affiliated with OpenAI.
- Header typography: wordmark and countdown are 16px, with the earned-reset count centered between them.
- Footer typography is 14px.
- “My taps” shows the persistent per-IP count on the left; “Total taps” shows global taps against the 10,000,000 target on the right; taps remaining uses a two-line centered label beneath the button.
- Side labels are muted and smaller than their values. The remaining helper is muted, smaller, and parenthesized as “(taps for next reset).”
- Earned-reset status uses the capped campaign format `0/3 resets earned`; three resets is the visible maximum.
- Every user-facing number uses English thousands separators, for example `546,050`, never `546050`.
- The Open Graph headline is “10,000,000 taps. One ChatGPT reset.” with no description and no CTA pill. Keep only the eyebrow, headline, 3D cursor-pointer scene, header, and footer.
- Each successful interaction immediately launches an OpenAI-mark token from the button into a real gravity/collision simulation; tokens collect along the bottom with a performance cap on visible bodies.
- Physics tokens must receive their spawn transform in the first React render; never allow an unpositioned token to flash at `top: 0; left: 0`. Keep token centers below the 72px header safe-zone and inside the horizontal viewport bounds.
- Button feedback must feel instant and must not wait for the network request before returning to rest.
- The central button is surrounded by a live circular progress ring using the same monochrome structure as the Open Graph graphic.
- Each tap plays a short synthesized pop and uses a clearly tactile press: immediate 0.945 depression with inset depth, followed by a 210ms spring release, surface flash, and supported-device micro vibration.
- “My taps” is server-owned per IP address. Store only an HMAC hash of the IP, never the raw address.
- Every physics token is exactly 48px; do not randomize logo size.
- Count only trusted browser interactions that pass a signed same-origin server proof. Allow up to 40 taps per five-second burst and 200 taps per minute per hashed IP; exceeding either limit causes a temporary five-minute cooldown, never a permanent IP ban.
