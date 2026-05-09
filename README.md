# Vibe Vote Arena

Internal hackathon audience platform draft.

## Prototype Scope

- `/admin` administrator arena wall with live ranking, team logos, star totals, normalized 10-point scores, voter counts, hover stats with team members, floating stars, cheer bubbles, star movement feed, real participant list, message moderation, voting timer/star-budget controls, reset/test-data controls, close voting, and raffle.
- The live ranking wall also has a full-screen showup mode so all teams can be projected cleanly during the event.
- `/vote` audience mode where each participant first registers a name and affiliation/team, then gives stars directly on each team row. Audience users only see their own allocated stars, never team totals or ranking.
- Team rows expand on click so users can read the latest per-team cheer thread and send messages repeatedly.
- Participant name, affiliation/team, and anonymous browser device id are persisted in local storage plus a SameSite cookie. The server treats the same name + affiliation/team + browser device id as the same participant.
- A tiny Node/SSE realtime harness so mobile votes and cheer messages appear on the PC administrator screen.
- The administrator cheer panel opens a full-screen showup view where message bubbles float inside team territories and can be shuffled or dragged before selection.
- Lucky draw panel for voters, leader supporters, top-three supporters, or cheer-message participants, with a larger showup panel for drawing on the shared screen.
- LG-inspired white interface with LG Red used only as accent.

## Local Run

```powershell
npm install
npm run realtime
```

Open `http://localhost:5173/admin` on the host PC.

For mobile testing on the same network, open the host machine's LAN IP with `/vote`, for example:

```text
http://172.30.1.17:5173/vote
```

During UI-only development you can still run Vite:

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

The Vite-only mode does not share state across devices. Use `npm run realtime` for cross-device voting.

## Cloudflare Hosting

The Cloudflare track uses Workers Static Assets for the React build and one Durable Object room for shared realtime event state.

```text
Cloudflare Worker
- serves `dist/` static assets
- routes `/api/*` and `/events` to the event room

Durable Object `ArenaRoom`
- keeps the live event room
- handles registration, voting, cheer messages, moderation, reset, settings, and raffle APIs
- persists the current room snapshot in Durable Object storage
```

Local Cloudflare runtime:

```powershell
npm run cf:dev
```

Dry-run package validation:

```powershell
npm run cf:deploy:dry-run
```

First real deployment:

```powershell
npx wrangler login
npm run cf:deploy
```

The current Cloudflare worker intentionally keeps the same REST/SSE surface as the Node harness so the frontend can migrate without a large UI rewrite. The next scaling step is to split the stream into audience, admin, and wall roles and then replace broad state broadcasts with smaller role-specific events.

## Next Backend Step

The Node realtime harness is in-memory. The Cloudflare worker currently persists a compact room snapshot in Durable Object storage. For deeper reporting and post-event export, add D1 tables for:

- `teams`
- `participants`
- `settings`
- `votes`
- `cheers`
- `raffle_runs`

Keep vote mutation server-side so each participant can spend at most the administrator-configured star budget, with a maximum of 10 stars on any single team.

## Event And Team Config

Event copy and team metadata are managed in `teams.json`.

- `copy`: editable labels and guide text such as `Audience Vote`, `Vibe Vote Arena`, hero titles, registration guidance, raffle eligibility messages, and moderation/disqualification notices.
- `teams`: team name, submitted project title, up to three team members, color, generated-logo style, and optional `logoFile`.

## Team Logo Intake

Ask each team for one PNG file:

- Format: transparent PNG preferred.
- Canvas: square `512 x 512 px`.
- Safe area: keep the visible mark inside the central `384 x 384 px`; leave about `64 px` padding on every side.
- Background: no baked-in white box unless it is part of the official logo.
- Filename: `team-slug.png`, for example `aurora-lab.png`.
- Place files under `public/team-logos/` and set `logoFile` in `teams.json`, for example `/team-logos/aurora-lab.png`.
- Small-size check: the mark should still be recognizable at `48 x 48 px`.

## Anti-Duplicate Participation Design

The event keeps duplicate prevention deliberately light to reduce privacy and operations overhead. Participants enter only:

1. Name
2. Affiliation/team

The browser generates an anonymous device id and stores it in local storage plus a SameSite cookie. The server treats the same `name + affiliation/team + anonymous device id` combination as the same participant, so a normal browser restart restores the previous vote and cheer history.

This is enough for a large audience event where a small number of duplicate attempts will not materially change the outcome. It does not try to collect employee numbers, email addresses, phone numbers, photos, camera-based QR scans, or biometric/device fingerprint data.

Known limits:

1. Clearing cookies/local storage can create a new anonymous device id.
2. Using another browser or another device can create another participant.
3. A shared kiosk device is not a strong identity boundary.

Use the admin participant list and raffle-exclusion controls for obvious abuse rather than adding personally identifiable check-in data.
