# Vibe Vote Arena Design System

## Visual Theme

An LG-inspired internal event platform with a white product UI, restrained LG Red accents, and dark gray typography. The interface should feel polished, useful, and live without becoming noisy.

## Colors

| Token | Value | Role |
| --- | --- | --- |
| `--lg-red` | `#A50034` | Primary brand accent, buttons, eligibility, rank highlights |
| `--active-red` | `#FD312E` | Live motion, star fills, energetic status details |
| `--surface` | `#FFFFFF` | Panels, cards, mobile voting surface |
| `--canvas` | `#F7F7F8` | Page background only |
| `--ink` | `#202124` | Headings and high-emphasis text |
| `--body` | `#4A4A4F` | Body text |
| `--muted` | `#7B7B82` | Metadata and helper text |
| `--line` | `#E7E5E5` | Light dividers |
| `--line-strong` | `#D9D6D6` | Inputs and stronger controls |

Rules:

- Red is a point color, not a background theme.
- Keep the main screen white and light gray with dark text.
- Avoid purple, blue-black dashboard palettes, large red floods, and decorative gradient blobs.

## Typography

- Font stack: `Inter`, `Segoe UI`, `Apple SD Gothic Neo`, `Malgun Gothic`, system UI.
- H1: 28-46px, 760-800 weight.
- Section headings: 22-28px, 760 weight.
- Body: 15-17px, regular.
- Labels and metrics: 11-14px, 700-850 weight.
- Letter spacing is always `0`.

## Shape And Depth

- Maximum border radius: 8px.
- Use light borders before shadows.
- Shadows are subtle and appear on hover, live ranking rows, and popovers only.
- Do not nest cards inside cards unless it is a functional phone preview or popover.

## Components

- Event copy: app title, audience/admin eyelines, hero text, registration copy, raffle guidance, and moderation/disqualification notices are configured in `teams.json`.
- Team row: rank badge, logo mark, team name, project title, progress track, star total, and a normalized 10-point score derived from the current share.
- Audience registration: first screen collects participant name and organization/team before voting.
- Audience team vote board: full team list in neutral event order with logo/project title, no total stars or rank, and direct star controls per team using the administrator-configured star budget. A single team can receive at most 10 stars from one participant.
- Audience cheer entry: clicking a team expands an inline textarea and send button; the user can send multiple messages per team.
- Admin arena wall: live rows with floating star motion, normalized score, and hover stat popover including up to three team members. It also needs a full-screen projection mode where all teams fit on one screen.
- Admin cheer showup: clicking the cheer panel opens a full-screen message cloud where team messages cluster around team-specific color centers.
- Admin controls: voting close/reopen, live star movement feed, real participant list with expanded panel, cheer message moderation with keyword filtering and bulk actions, raffle rule select, winner count input, draw button, animated draw state, winner list, and large raffle showup panel. A participant remains raffle-eligible only when they have spent at least one star and still have at least one visible cheer message.

## Motion

- Motion should express event energy: floating stars, bubble entrance, draw pulse.
- Keep motion soft and sparse.
- Respect `prefers-reduced-motion`.

## Responsive Behavior

- `/admin` desktop: arena wall left, cheer wall and raffle right.
- `/vote` desktop: one full-width team vote board with direct star controls on each team row.
- `/vote` tablet/mobile: team rows stack vertically; star buttons remain large enough to tap and the expanded cheer thread stays under the selected team.
- Team rows must keep stable height and avoid text overlap.

## Accessibility

- Use native buttons, selects, inputs, and labels.
- All icon-only plus/minus buttons need `aria-label`.
- Maintain visible focus outlines.
- Red is not the only state indicator; include text labels.
