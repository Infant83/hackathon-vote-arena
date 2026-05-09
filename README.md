# Vibe Vote Arena

Internal hackathon audience platform draft.

## Prototype Scope

- `/admin` administrator arena wall with live ranking, team logos, star totals, normalized 10-point scores, voter counts, hover stats with team members, floating stars, cheer bubbles, star movement feed, real participant list, message moderation, voting timer/star-budget controls, reset/test-data controls, close voting, and raffle.
- The live ranking wall also has a full-screen showup mode so all teams can be projected cleanly during the event.
- `/vote` audience mode where each participant first registers a name and organization/team, then gives stars directly on each team row. Audience users only see their own allocated stars, never team totals or ranking.
- Team rows expand on click so users can read the latest per-team cheer thread and send messages repeatedly.
- Participant name, organization/team, and browser participant id are persisted in local storage plus a SameSite cookie. The server also prefers the cookie id, so the same browser updates one participant record instead of creating another raffle entry.
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

## Deployment Notes

Good low-cost options for the first shared version:

- GitHub Pages for a static demo with simulated state.
- Vercel or Netlify for a static React app.
- Cloudflare Pages plus a lightweight Worker/Durable Object when real-time shared voting is added.
- Fly.io or Render for a small Node/WebSocket server if internal network policy allows it.

## Next Backend Step

The current realtime harness is in-memory. For production, persist the same event model:

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

The current version blocks duplicate entries from the same browser by combining a local browser id and SameSite cookie. That is enough for rehearsal, but it cannot stop someone who clears cookies, switches browsers, or uses another device.

For the real event, use a one-attendee-one-token model:

1. Generate one QR/token per checked-in attendee.
2. Open `/vote?token=...` from that QR and let the server claim the token once.
3. Bind votes, visible cheer messages, and raffle eligibility to that token, not to display name.
4. Allow display name/group edits only as profile metadata under the same claimed token.
5. Keep an admin exception flow for staff to revoke or reissue a token if a phone is lost or replaced.

Company SSO or employee-number check-in can replace the token if the event environment supports it. Avoid IP/device fingerprinting as the primary guard because shared networks and privacy restrictions make it unreliable.
