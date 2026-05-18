# Vibe Vote Arena Design System

## Visual Theme

An LG-inspired internal event platform with two coordinated surfaces:

- **Current mode** (`light`): white product UI, restrained LG Red accents, and dark gray typography.
- **Dark mode** (`stage`): event-stage UI based on `ppt_sample/EDM_(일반진행)해커톤 간지 선정_양식(외부)_v0.1.pptx`, with midnight navy, electric blue, violet, magenta, and coral light accents.

The administrator can switch the global theme from the control desk. The interface should feel polished, useful, and live without becoming noisy. The dark stage style is for auditorium focus and should not reduce mobile voting readability.

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
| `--event-night` | `#030611` | Projection/showup base background inspired by the external 간지 slide |
| `--event-navy` | `#07142F` | Deep blue stage gradient |
| `--event-blue` | `#3F63FF` | Electric blue light ribbon |
| `--event-cyan` | `#8FD6FF` | High-energy cool highlight |
| `--event-violet` | `#7A3FF2` | Violet secondary glow |
| `--event-magenta` | `#E447A8` | Magenta ribbon accent |
| `--event-coral` | `#FF7A7A` | Warm answer/winner highlight |

Rules:

- Red is a point color in operational UI, not a background theme.
- Keep the participant voting screen white and light gray with dark text.
- Use the dark event palette either for shared-screen surfaces or when the administrator intentionally switches the global theme to dark mode.
- The dark palette should read as black/navy with luminous blue-magenta ribbons, not a generic purple dashboard.
- Avoid decorative orbs/blobs; use broad light-ribbon gradients and glass-like panels when referencing the external 간지.
- In dark mode, avoid plain white panels inside `/admin`, `/wall`, `/vote`, raffle, cheer, and quiz surfaces. Use translucent navy glass panels, cyan-blue borders, white/off-white text, muted blue secondary text, and coral/magenta only for live emphasis or primary action.
- Ranking badges in dark mode should be legible cyan/white chips, not small red dots. Gauge tracks should be dark translucent, with team-color-to-coral/cyan fills so they remain visible against the navy background.
- Guidance text in dark mode must not rely on deep red, purple, or low-saturation team colors. Use a bright rose/coral guide color on a translucent dark panel, or mix team colors toward off-white/cyan so labels remain readable without losing team identity.
- Participant vote cards, cheer threads, quiz standby cards, raffle showup, and cheer showup must all be audited together when dark mode changes. No surface should retain a plain white card unless it is an intentional logo/photo well.

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
- Admin cheer showup: clicking the cheer panel opens a full-screen message cloud where team messages cluster around team-specific color centers. It may use the dark event palette when projected.
- Admin controls: voting close/reopen, live star movement feed, real participant list with expanded panel, cheer message moderation with keyword filtering and bulk actions, raffle rule select, winner count input, draw button, animated draw state, winner list, and large raffle showup panel. A participant remains raffle-eligible only when they have spent at least one star and still have at least one visible cheer message.
- Content management: `/admin` has a single 운영 콘텐츠 panel for team data, screen copy, quiz bank, import/export, and publish. Screen copy fields are grouped by where they appear (`/vote`, `/wall`, showup, quiz) so an operator can edit without guessing.
- Team imagery: team logo fields accept bundled `/team-logos/...` paths, public image URLs, Google Drive image links, and local image uploads. When a team is selected on `/wall`, show this image as a larger team photo/card preview rather than only a small mark.

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
