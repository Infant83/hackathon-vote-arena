# Vibe Arena Reorientation

작성일: 2026-06-07

이 문서는 `vibe-compete`에서 `vibe-arena`로 작업공간 이름을 바꾼 뒤, 현재 구현 상태와 다음 정리 방향을 한 번에 이어가기 위한 기준 메모다.

## 1. 이름 정리 기준

- 상위 작업공간/플랫폼명: `Vibe Arena`
- 로컬 폴더명: `vibe-arena`
- npm package name: `vibe-arena`
- 현재 투표/응원/추첨 제품 모듈명: `Vibe Vote Arena`
- 현재 GitHub remote: `Infant83/vibe-arena`
- 이전 GitHub remote: `Infant83/hackathon-vote-arena`

2026-06-07에 GitHub API로 `Infant83/hackathon-vote-arena`를 `Infant83/vibe-arena`로 rename했다. 현재 토큰은 push/admin 권한을 가졌고, local `origin`도 `https://github.com/Infant83/vibe-arena.git`로 갱신했다. 기존 GitHub URL은 새 repo로 redirect된다. Cloudflare Worker `meeting`과 운영 URL `https://meeting.axgroup.workers.dev`는 repo rename 직후에도 `/api/health`, `/message`, `/wall`이 200으로 응답했다.

## 2. 현재 구현 표면

현재 앱은 단일 투표 도구를 넘어 행사 운영 플랫폼 성격을 가진다.

- `/message`: AX Q&A용 참가자 질문 입력 화면
- `/quiz`: 참가자 퀴즈 답변 화면
- `/vote`: 해커톤 투표, 응원 메시지, 행운권 응모 화면
- `/wall`: 발표장 송출 화면
- `/admin`: 관리자 운영 콘솔
- `/admin?showCheer=1`: 응원 메시지 Showup
- `/team/:key`: 팀별 자체 편집 화면

React 앱 기준 주요 모드는 `admin`, `vote`, `wall`, `team`, `message`, `quiz`, `not-found`다. 관리자 패널은 `arena`, `participants`, `messages`, `raffle`, `teams`, `quiz`, `export`로 나뉘고, wall 패널은 `overview`, `cheer`, `raffle`, `quiz`, `qna`로 나뉜다.

## 3. 백엔드와 배포 경계

- 로컬 실시간 서버: `server.mjs`
- Cloudflare Worker/Durable Object: `worker/index.ts`
- 정적 frontend: Vite build output `dist`
- 운영 Worker name: `meeting`
- 운영 room: `ARENA_ROOM_NAME=2026-ax-q2-meeting`
- 행사별 설정: `event-configs/2026_ax_group_q2_meeting.json`

Node 서버와 Cloudflare Worker는 같은 REST/SSE 표면을 유지한다. 주요 API는 `/api/state`, `/events`, `/api/register`, `/api/vote`, `/api/question`, `/api/quiz/*`, `/api/raffle/*`, `/api/team-config`, `/api/settings`, `/api/export`, `/api/reset`이다. 관리자 보호 대상은 `ADMIN_PASSCODE`와 `vibe-vote-admin` 쿠키 기준으로 관리된다.

## 4. 플랫폼 관점 재정의

`Vibe Arena`는 여러 행사 운영 모듈을 담는 상위 플랫폼으로 두고, 현재 구현은 다음 모듈로 재정리하는 것이 자연스럽다.

1. `Vote Arena`: 별 투표, 팀 응원, 응원 Showup, 행운권 추첨
2. `Q&A Arena`: 별명 입장, 질문 작성/수정/삭제, 발표장 Q&A board, 읽음 관리, 워드클라우드
3. `Quiz Arena`: 퀴즈 출제, 카운트다운, 정답 후보 수집, 선착순 확정, 정답자 송출
4. `Ops Console`: 운영 설정, 콘텐츠 관리, 참가자/메시지 관리, export/reset/audit
5. `Event Config Studio`: 행사별 preset, 팀/상품/문구/화면 세션 구성

이 기준을 쓰면 `Vibe Vote Arena`는 사라지는 이름이 아니라 `Vibe Arena` 안의 첫 번째 행사 모듈 이름으로 남는다.

## 5. 다음 작업 제안

### P0

- README/TODO/AGENTS의 관점 차이를 정리한다. 현재 AGENTS는 해커톤 본선 투표 중심이고, README/TODO는 AX Q&A/퀴즈 운영 기준이다.
- Cloudflare Dashboard의 Git Build 연결이 새 repo 이름 `Infant83/vibe-arena`로 정상 표시되는지 확인한다. 기존 GitHub URL redirect가 있더라도 Dashboard 표시는 수동 확인이 필요하다.
- 다음 실제 행사의 기본 진입 화면이 `/vote`인지 `/message`인지 확정한다.
- `npm run lint`, `npm run build`로 rename 뒤 기본 검증을 수행한다.

### P1

- 행사 preset 구조를 명확히 한다. 예: `hackathon_vote`, `ax_qna_quiz`, `generic_event`.
- 관리자 콘솔에서 현재 행사 모드와 열린 wall 세션을 더 명확하게 보여준다.
- `/vote`, `/message`, `/quiz` 사이의 참가자 identity 정책을 문서화하고 코드 주석이 필요한 지점만 보강한다.
- `/api/export`와 reset 절차를 행사 종료 운영 체크리스트로 연결한다.
- `settings.json`/`settings.zip`을 표준 운영 백업명으로 사용한다. 기존 `team_info.json`/`team_infos.zip`은 업로드 호환용으로 유지한다. `settings.json`은 `event`, `copy`, `settings`, `teams`, `quizzes`를 담는다. 관리자 화면의 preset 목록은 로컬 `event-configs/*.json`, Worker 번들 행사 설정, `public/prev_settings/*.settings.json`과 `public/prev_settings/settings_manifest.json`을 함께 활용한다.
- `event.roomName`은 설정의 권장 room이고, 실제 운영 DB는 `ARENA_ROOM_NAME`으로 선택된 Durable Object room이다. preset 적용은 DB room을 자동 전환하지 않는다.

### P2

- 다중 행사 room을 관리자 UI에서 선택하거나 생성할 수 있는지 검토한다.
- 운영자/사회자/콘텐츠 관리자 역할 분리를 검토한다.
- GitHub/Cloudflare 이름, Worker 이름, room 이름을 행사 단위와 플랫폼 단위로 분리한다.
