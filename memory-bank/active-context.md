# Active Context

Updated: 2026-06-08

## Current Product State

`vibe-arena` is now treated as a multi-event operations platform. The current deployed event is the 2026 AX group Q2 meeting, but the app also supports hackathon vote/quiz/luckydraw and mixed event presets.

Current live URLs:

- `https://meeting.axgroup.workers.dev/message`
- `https://meeting.axgroup.workers.dev/wall`
- `https://meeting.axgroup.workers.dev/admin`
- `https://meeting.axgroup.workers.dev/vote`

Current Q2 production identity:

- Worker name: `meeting`
- Durable Object room: `2026-ax-q2-meeting`
- settings file: `event-configs/2026_ax_group_q2_meeting.json`
- features: `message`, `quiz`

## Event And DB Rules

1. `ARENA_ROOM_NAME` is the effective event DB room inside the Durable Object namespace.
2. Loading a preset/settings file in admin does not switch DB room. It only applies settings to the current room.
3. Admin Reset resets only the current room connected to the current Worker.
4. The safest new-event pattern is `event slug = Worker name = ARENA_ROOM_NAME = event.roomName`.
5. Existing event DB export requires a Worker pointing to the same Durable Object binding/class and the same `ARENA_ROOM_NAME`; export first, never reset first.

## Bundled Event Presets

- `event-configs/2026_ax_hackathon_q1_vote_quiz_luckydraw.json`: `hackathon26q1`, features `vote`, `quiz`, `luckydraw`
- `event-configs/2026_ax_group_q1_meeting.json`: `meeting26q1`, features `message`, `quiz`
- `event-configs/2026_ax_group_q2_meeting.json`: `2026-ax-q2-meeting`, features `message`, `quiz`
- `event-configs/2026_06_airever.json`: `airever`, features `message`, `quiz`, default theme `pastel`, default font `vibe`
- `event-configs/2026_ax_special_message_vote_quiz.json`: `special26ax`, features `message`, `vote`, `quiz`

Worker bundled presets must be kept in sync in `worker/index.ts` through imports, `initialConfigByRoomName`, and `bundledEventConfigPresets`.

## Admin UX Rules

- Default `/admin` is an operations console, not a realtime feed screen.
- Realtime stars, star events, and cheer message bodies stay in detail panels or `/wall`.
- `/admin?panel=teams` handles settings upload/download, preset load, visual assets, screen copy, teams, and quizzes.
- `/admin?panel=teams` can save the current settings draft under a new name in the admin browser storage. These saved drafts appear in the same settings dropdown and apply to the current DB room when loaded.
- Screen copy editing has live previews for `global`, `vote`, `admin`, `wall`, `qna`, `showup`, and `quiz`.
- Team photo editing previews the actual `/wall` selected-team card layout and includes frame presets.
- `/admin?panel=export` should remain the primary event closeout place for JSON backup, XLSX result export, and settings download.
- `/admin` links to `/help`; the help page uses affirmative operator-facing Korean copy and mirrors the Remotion introduction deck in `app_introduction/remotion-deck`.

## Verification Snapshot

Last verified on 2026-06-08:

- `npm run lint`: pass
- `npm run build`: pass
- `npm run ops:audit:all`: WARN only for existing Q2 `workerName=meeting` vs `roomName=2026-ax-q2-meeting`
- `npm run ops:audit:ax-q2`: PASS with expected local runtime WARN for `local-node`
- Browser check through Chrome Playwright:
  - `/admin?panel=teams` copy previews rendered 7 groups
  - editing the vote hero text updated the preview immediately
  - `/admin?panel=export` showed JSON/XLSX/settings actions
  - mobile `/message` at 390px had no horizontal overflow
  - `/wall` Q&A and Quiz panels worked after admin authentication
  - console error/warning list was empty in checked flows

After verification, local test state was reset with `/api/reset`.

## Next Things To Watch

- If Q2 should be easier to trace, decide whether to align `workerName` and `roomName`. Keeping `meeting` is currently intentional for the live URL.
- When adding a new event config, run `npm run ops:audit:all` before deployment.
- When adding or renaming copy fields, update `copyGroups`, `CopyGroupPreview`, README, and AGENTS together.
- Do not put real internal names, private photos, or sensitive prize details in `public/prev_settings`.
- Browser-saved named settings are quick reuse drafts. Event closeout and cross-PC transfer still require downloading `settings.json`.
- Deployment, separated event Workers, rollback, reset/export, and command-line response procedures are documented in `docs/DEPLOYMENT_AND_OPERATIONS_RUNBOOK.md`.
- When changing `/help`, keep `app_introduction/remotion-deck/src/deckData.ts`, `deck.config.json`, and `app_introduction/README.md` aligned.
