# Vibe Vote Arena

사내 행사에서 관객 참여를 실시간으로 모으고 발표장 화면에 송출하기 위한 플랫폼입니다. 처음에는 해커톤 관객 투표, 응원 메시지, 행운권 추첨 시스템으로 시작했고, 현재 운영 기준은 **2026 AX 그룹 2분기 모임**의 Q&A/퀴즈 보드입니다.

이번 행사 기본 흐름은 다음과 같습니다.

1. 참가자는 `/message`에서 별명으로 입장합니다.
2. 질문을 올리면 발표장 `/wall`의 Q&A board에 카드로 쌓입니다.
3. 발표자/관리자가 질문 카드를 열면 읽음 표시가 자동 반영되고, 필요하면 다시 안읽음으로 되돌릴 수 있습니다.
4. 관리자는 `/admin` 운영 대시보드에서 Q&A/퀴즈 세션, 화면 문구, Q&A 글자 크기, 질문 초기화, 백업, reset 범위를 관리합니다.
5. 관리자가 퀴즈를 열면 `/message` 참가자 화면은 `/quiz`로 전환되고, 종료 후 다시 Q&A 입력 화면으로 돌아옵니다.

해커톤용 `/vote`, 응원 메시지, 행운권 추첨 기능은 여전히 남아 있지만, 이번 AX 모임의 기본 wall 노출 세션은 `Q&A`와 `퀴즈`입니다.

현재 라이브 배포 주소는 다음과 같습니다.

```text
https://meeting.axgroup.workers.dev/message
https://meeting.axgroup.workers.dev/wall
https://meeting.axgroup.workers.dev/admin
https://meeting.axgroup.workers.dev/vote
https://meeting.axgroup.workers.dev/help
```

운영 Worker 이름은 `meeting`이고, Cloudflare workers.dev 서브도메인은 `axgroup`입니다. 기본 Durable Object room도 추적성을 위해 `meeting`으로 맞춥니다.

## 0. 앱/행사 운영 규칙 요약

행사 운영은 아래 네 가지 이름을 일관되게 맞추는 것을 기본 원칙으로 합니다.

```text
event26q1.axgroup.workers.dev
Worker name: event26q1
ARENA_ROOM_NAME: event26q1
event.roomName: event26q1
settings file: event-configs/event26q1.json
```

운영 규칙은 다음과 같습니다.

1. `ARENA_ROOM_NAME`은 Durable Object namespace 안에서 특정 행사 room을 고르는 이름입니다. 운영 관점에서는 사실상 행사 DB 이름으로 봅니다.
2. Worker 이름이 달라도 `ARENA_ROOM_NAME`이 같으면 같은 room을 볼 수 있고, 같은 Worker라도 `ARENA_ROOM_NAME`을 바꾸면 다른 room을 봅니다.
3. 관리자 화면에서 preset/settings를 불러와도 DB room은 자동 전환되지 않습니다. 현재 room에 설정만 적용됩니다.
4. 관리자 화면의 Reset은 현재 접속한 Worker가 가리키는 현재 DB room 안의 운영 데이터만 초기화합니다. 다른 room은 건드리지 않습니다.
5. 관리자 화면에서는 `ARENA_ROOM_NAME`을 바꿀 수 없습니다. DB room 변경은 `wrangler deploy --name ... --var ARENA_ROOM_NAME:...` 같은 배포 단계에서만 합니다.
6. 새 행사는 새 Worker name과 새 `ARENA_ROOM_NAME`을 사용합니다. 기존 행사를 다시 보려면 같은 Durable Object namespace/class와 같은 `ARENA_ROOM_NAME`으로 접속합니다.
7. 행사 종료 후에는 `/api/export` JSON, `결과 내보내기 > XLSX`, `운영 콘텐츠 > settings.json 저장`을 함께 보관합니다.
8. `public/prev_settings/`에 공개 preset을 둘 때는 실명, 내부 소속, 비공개 사진, 민감한 상품 정보를 익명화합니다.

운영자가 가장 자주 확인하는 작업은 아래 순서로 처리합니다.

| 작업 | 관리자 위치 | 확인할 점 |
| --- | --- | --- |
| 현재 행사/DB 확인 | `/admin` Ops Guard | Worker, 현재 DB room, settings 권장 room이 의도한 조합인지 확인 |
| 행사 설정 적용 | `/admin?panel=teams` 저장된 설정 | `불러와 적용`은 현재 room에 선택한 설정을 반영 |
| 문구 수정 | `/admin?panel=teams` 화면별 문구 관리 | 오른쪽 프리뷰에서 `/vote`, `/message`, `/wall`, Quiz, Showup 노출 형태 확인 |
| 팀 사진 조정 | `/admin?panel=teams` 팀별 정보 | 실제 `/wall` 선택 팀 카드 기준 프리뷰와 프레임 preset 확인 |
| 데이터 백업 | `/admin?panel=export` | 원본 JSON, XLSX, settings를 같은 행사 폴더에 함께 저장 |
| 초기화 | `/admin` reset 카드 | reset 전에 백업 완료 여부와 현재 DB room 확인 |

## 1. 현재 개발 상태

현재 구현 상태는 AX Q&A 운영 기준으로 정리하면 다음과 같습니다.

1. 참가자는 `/message`에서 이름/소속/ID 대신 별명만 입력해 Q&A 방에 입장합니다.
2. 서버는 익명 브라우저 디바이스 ID와 관리 ID를 유지해, 익명성을 해치지 않으면서 운영 추적과 퀴즈 경품 확인이 가능하게 합니다.
3. 참가자는 보낸 질문을 다시 열어볼 수 있고, 행사 중 자신의 질문을 수정하거나 삭제할 수 있습니다.
4. 읽힌 질문이 수정되면 읽음 상태를 다시 해제하고 `수정됨` 배지를 표시합니다.
5. `/wall`의 Q&A board는 질문 카드를 길이에 따라 다른 크기로 tessellation 배치하고, 긴 질문은 카드 안에서 높이를 제한한 뒤 클릭 시 큰 모달에서 전체 내용을 보여줍니다.
6. 질문 카드를 열면 읽음 표시가 자동 반영되고, wall 카드/확대 카드/관리자 메시지 관리에서 다시 안읽음으로 되돌릴 수 있습니다.
7. Q&A board에는 질문 텍스트 기반 워드클라우드가 있으며, 단어를 클릭하면 관련 질문만 필터링합니다.
8. 워드클라우드는 브라우저에서 `d3-cloud`로 계산하므로 서버 CPU를 쓰지 않고, 질문 수십 건 규모의 실시간 운영에 맞춰 가볍게 동작합니다.
9. 관리자는 `/admin`에서 wall에 표시할 세션을 선택할 수 있습니다. 이번 행사 기본값은 `qna`, `quiz`입니다.
10. 상태 지표는 열린 세션과 연결됩니다. 예를 들어 실시간 현황을 열지 않으면 누적 별/응원 메시지 지표를 wall에 노출하지 않습니다.
11. `/admin` 기본 대시보드는 실시간 별 현황, 별 이벤트 피드, 응원 메시지 본문을 상시 노출하지 않고, 설정/세션/백업/초기화/상세 관리 진입에 집중합니다.
12. 관리자는 Q&A 글자 크기(`qnaWallFontScale`)와 화면 문구를 관리자 페이지에서 조정할 수 있습니다.
13. 관리자는 `/admin`에서 Q&A 질문 전체 reset을 할 수 있습니다.
14. 퀴즈가 열리면 `/message` 참가자 화면은 `/quiz`로 전환되고, 퀴즈가 끝나거나 Q&A로 돌아오면 질문 입력 화면으로 복귀합니다.
15. `/vote`는 투표/응원/행운권 관련 wall 세션이 열려 있을 때만 참가 화면으로 쓰며, Q&A/퀴즈만 열린 행사에서는 `/vote` 접근 시 안내 화면으로 막습니다.
16. 알 수 없는 SPA 경로는 `/vote`로 떨어지지 않고 404로 응답합니다.
17. Node realtime 서버와 Cloudflare Worker는 질문/퀴즈/관리자 인증/운영 설정 API를 같은 형태로 유지합니다.
18. `event-configs/2026_ax_group_q2_meeting.json`은 이번 행사 전용 설정이며, `teams.json`은 익명화된 샘플/이전 행사 기본 설정으로 남깁니다.
19. 관리자 인증 상태에서 `/api/export`로 참가자, 별 이벤트, 응원 메시지, 질문, 퀴즈 답변, 당첨 이력의 원본 JSON 백업을 받을 수 있습니다.
20. `event-configs/`에는 해커톤, 분기 모임, 특별 세션처럼 서로 다른 기능 조합의 preset을 둘 수 있고 `npm run ops:audit:all`로 함께 검사합니다.
21. `/admin?panel=teams`의 화면별 문구 관리는 그룹별 live preview를 제공해 저장 전에 참가자/관리자/송출 화면 노출 형태를 확인할 수 있습니다.
22. `/admin?panel=teams`의 팀 사진 편집은 실제 `/wall` 선택 팀 카드 구조와 같은 프리뷰를 사용하고, `송출 기본`, `16:9`, `4:3`, `전체보기` preset을 제공합니다.
23. `/admin?panel=export`는 행사 요약, 현재 DB room, JSON/XLSX/settings 저장 버튼을 한 곳에 배치합니다.
24. 관리자 화면의 운영 규칙 안내는 README의 room/reset/export 원칙과 같은 기준을 말해야 합니다.
25. `/admin` 상단과 필수 관리 작업에는 `/help` 운영 가이드 링크가 있으며, 이 가이드는 배포, room, 초기화, 백업, 문제 상황 대응 순서를 한 화면에서 안내합니다.

## 2. 주요 화면

### `/message`

이번 AX 모임의 참가자용 Q&A 화면입니다.

- 별명 기반 입장
- `2026 AX 그룹 2분기 모임` 행사명 표시
- `AX Group QnA` 방 안내
- 발표자에게 남길 질문 작성
- 보낸 질문 이력 확인
- 보낸 질문 수정/삭제
- 퀴즈 세션이 열리면 자동으로 `/quiz` 전환

### `/quiz`

참가자용 퀴즈 답변 화면입니다.

- `/message` 참가자가 퀴즈 활성 상태를 받으면 자동 진입
- 별명 입장 흐름 공유
- 정답 입력, 제출 결과 피드백, 당첨 이력 표시
- 퀴즈 종료 또는 Q&A 복귀 시 `/message`로 자동 복귀

### `/vote`

해커톤 투표 운영용 관객 화면입니다. 이번 AX Q&A 행사에서는 기본 진입 화면으로 쓰지 않으며, 투표/응원/행운권 세션이 열려 있지 않으면 참가 화면을 보여주지 않습니다.

- 이름과 ID 등록
- 총 별 개수 안내
- 팀별 별 배분
- 팀별 응원 메시지 작성
- 내 경품 추첨 응모 상태 표시
- 팀별 총점과 순위는 관객에게 보여주지 않음

### `/admin`

관리자용 화면입니다.

- AX Q&A/퀴즈 운영 상태 확인
- 필수 관리 작업 대시보드
- wall 표시 세션 선택
- 현재 DB room, 설정 room, preset 적용 범위 확인
- JSON/XLSX 백업
- reset 범위별 실행
- Q&A 질문 reset
- Q&A wall 글자 크기 조정
- Q&A/퀴즈/행사 화면 문구 편집
- 참여자 리스트 상세 관리
- 응원 메시지와 Q&A 질문 상세 관리
- 운영 콘텐츠 관리
- 결과 XLSX 내보내기
- 투표 타이머, 별 개수, 마감/재개, Reset, 테스트 데이터 주입
- 행운권 추첨과 응원 메시지 기반 확률 가중치 설정
- 퀴즈 추가 인정 답과 행운권 룰/선발 인원/상품 조합 설정

기본 `/admin` 화면은 실시간 현황판이 아닙니다. 실시간 별 순위, 별 이동 이벤트, 응원 메시지 본문은 기본 대시보드에 상시 노출하지 않고 `/wall`, `/admin?panel=messages`, `/admin?panel=participants`, `/admin?panel=raffle` 같은 역할별 화면에서 확인합니다.

### `/admin?showCheer=1`

해커톤 운영 때 발표장 스크린에 띄우는 응원 메시지 구름 화면입니다.

- 팀별 영역 표시
- 같은 팀 응원 버블끼리 가까이 모이는 움직임
- 별을 많이 준 참여자의 버블이 더 크게 표시
- 클릭 전에는 작성자와 메시지를 숨김
- 클릭하면 작성자와 응원 메시지를 크게 표시
- 사회자가 버블을 섞거나 드래그 가능

### `/wall`

관객 송출용 공개 보드입니다.

- Q&A board
- 질문 카드 스택/tessellation
- 질문 클릭 확대 보기
- 읽음/미읽음/수정됨 표시와 읽음/안읽음 토글
- AI cloud 형태 워드클라우드
- 워드 클릭 기반 질문 필터
- Q&A 질문 수 표시
- 퀴즈 출제, 답변 수집, 선착순 정답자 송출
- 실시간 별 현황
- 팀별 받은 별 개수
- 최근 응원 메시지
- 팀별 응원 메시지 필터
- 응원 버블 Showup 바로 열기
- 심사용 환산점수와 투표자 이름은 노출하지 않음

## 3. 기술 구조

```text
React + Vite frontend
        |
        | /api/*, /events
        v
Node realtime harness 또는 Cloudflare Worker
        |
        v
인메모리 상태 또는 Durable Object 상태
```

주요 파일은 다음과 같습니다.

```text
src/App.tsx          React 앱, 사용자/관리자/Showup 화면
src/App.css          LGD 스타일 UI와 애니메이션
server.mjs           로컬 Node/SSE 실시간 서버
worker/index.ts      Cloudflare Worker + Durable Object 서버
teams.json           팀 정보와 화면 문구의 기본 설정
event-configs/       행사별 JSON 설정
public/team-logos/   팀 로고 파일
scripts/ops-audit.mjs 운영 전 정적/런타임 audit 스크립트
wrangler.jsonc       Cloudflare Worker 배포 설정
AGENTS.md            이 작업공간의 개발 규칙
DESIGN.md            디자인 방향
```

로컬 Node 서버와 Cloudflare Worker는 같은 REST/SSE API 표면을 유지합니다. 그래서 프론트엔드는 로컬과 Cloudflare에서 거의 같은 방식으로 동작합니다.

## 4. 처음 실행하기

Windows PowerShell 기준입니다.

### 4.1. 의존성 설치

```powershell
npm install
```

Cloudflare Git Build는 현재 `npm@10.9.2`를 사용합니다. 의존성을 추가하거나 lockfile을 다시 맞출 때는 아래 명령을 쓰는 것이 안전합니다.

```powershell
npx npm@10.9.2 install --package-lock-only
npx npm@10.9.2 clean-install --progress=false --dry-run
```

### 4.2. 로컬 실시간 서버 실행

```powershell
$env:EVENT_CONFIG_FILE = 'event-configs/2026_ax_group_q2_meeting.json'
$env:ADMIN_PASSCODE="운영팀이_정한_passcode"
npm run realtime
```

브라우저에서 엽니다.

```text
http://localhost:5173/message
http://localhost:5173/wall
http://localhost:5173/admin
http://localhost:5173/vote
```

`npm run realtime`은 먼저 React 앱을 빌드한 뒤 `server.mjs`를 실행합니다. 모바일과 PC가 같은 투표 상태를 봐야 하므로 실제 테스트는 이 모드를 사용합니다.

관리자 화면은 항상 passcode 로그인을 요구합니다. `ADMIN_PASSCODE`가 비어 있으면 `/admin` 로그인 화면에서 설정 안내가 표시되고 관리자 기능은 열리지 않습니다. passcode가 설정되면 `/admin` 로그인 화면이 먼저 표시되고, 관리자 전용 API와 `/events?role=admin` 실시간 연결은 인증 쿠키가 있어야 사용할 수 있습니다.

AX Q&A 행사 설정을 쓰려면 `EVENT_CONFIG_FILE`을 함께 지정합니다. 지정하지 않으면 기존처럼 `teams.json`을 읽습니다.

### 4.3. 다른 포트로 실행하기

이미 5173 포트를 쓰고 있으면 다른 포트로 실행합니다.

```powershell
$env:PORT="5174"
node server.mjs
```

### 4.4. 모바일에서 접속하기

PC와 모바일이 같은 네트워크에 있어야 합니다. PC의 IP는 PowerShell에서 확인합니다.

```powershell
ipconfig
```

예를 들어 PC IP가 `172.30.1.17`이면 모바일에서는 아래 주소로 접속합니다.

```text
http://172.30.1.17:5173/message
```

### 4.5. UI만 빠르게 개발하기

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

주의할 점이 있습니다. Vite-only 개발 서버는 화면 개발에는 편하지만, 여러 기기의 상태 공유 검증에는 충분하지 않습니다. 모바일 투표와 관리자 화면 연동은 `npm run realtime`로 확인합니다.

## 5. Cloudflare 배포

이 프로젝트는 Cloudflare Workers Static Assets와 Durable Object를 사용합니다.

```text
Cloudflare Worker
- dist/ 정적 파일 제공
- /api/* 요청 처리
- /events SSE 연결 처리

Durable Object ArenaRoom
- `ARENA_ROOM_NAME`별 행사 방 상태 유지
- 참가자, 별 배분, 응원 메시지, 추첨 결과 저장
- 현재 상태를 Durable Object storage에 저장
```

Cloudflare 운영에서 특정 행사 DB를 가리키는 실무 조합은 다음과 같습니다.

```text
Worker name + Durable Object binding/class + ARENA_ROOM_NAME
= 특정 행사 DB room
```

권장 운영명은 `event26q1`, `event26q2`, `event26hackathon`처럼 행사 slug를 정하고, Worker name, `ARENA_ROOM_NAME`, `event.roomName`을 같은 값으로 맞추는 방식입니다.

### 5.1. 로그인 확인

```powershell
npx wrangler whoami
```

로그인이 안 되어 있으면:

```powershell
npx wrangler login
```

관리자 passcode는 Cloudflare secret으로 저장합니다. 값은 레포에 커밋하지 않습니다.

```powershell
npx wrangler secret put ADMIN_PASSCODE
```

passcode를 바꿀 때도 같은 명령으로 새 값을 다시 입력한 뒤 Worker를 재배포하거나 새 배포가 뜬 것을 확인합니다. 관리자 쿠키는 `ADMIN_PASSCODE`를 해시한 값으로 검증하므로, passcode를 바꾸면 기존 로그인 세션은 더 이상 인증되지 않고 `/admin`에서 다시 로그인해야 합니다. 로컬 Node 서버에서는 PowerShell에서 `$env:ADMIN_PASSCODE = '<새 passcode>'`를 지정하고 `node server.mjs` 또는 `npm run realtime`을 다시 시작합니다.

### 5.2. 로컬 Cloudflare 런타임

```powershell
npm run cf:dev
```

### 5.3. 배포 전 검증

```powershell
npm run lint
npm run build
npm run cf:deploy:dry-run
```

### 5.4. 수동 배포

```powershell
npm run cf:deploy
```

배포가 성공하면 다음과 같은 주소가 표시됩니다.

```text
https://meeting.axgroup.workers.dev
```

행사별 Worker와 DB room을 분리해 동시에 운영하려면 Worker 이름과 `ARENA_ROOM_NAME`을 함께 지정합니다.

```powershell
npx wrangler deploy --name event26q1 --var ARENA_ROOM_NAME:event26q1
npx wrangler deploy --name event26q2 --var ARENA_ROOM_NAME:event26q2
```

이 경우 `event26q1.axgroup.workers.dev`와 `event26q2.axgroup.workers.dev`는 같은 코드와 Durable Object class를 쓰더라도 서로 다른 room storage를 봅니다.

`airever`와 `scmax` 행사는 다음 명령으로 기존 `meeting.axgroup.workers.dev`를 유지한 채 별도 Worker와 별도 DB room으로 배포합니다.

```powershell
npx wrangler deploy --name airever --var ARENA_ROOM_NAME:airever
npx wrangler deploy --name scmax --var ARENA_ROOM_NAME:scmax
```

현재 번들에 등록된 예시 room은 다음과 같습니다.

| 행사 | Worker/room 권장 slug | 설정 파일 | 기본 조합 |
| --- | --- | --- | --- |
| 2026 AX 해커톤 1분기 본선 | `hackathon26q1` | `event-configs/2026_ax_hackathon_q1_vote_quiz_luckydraw.json` | vote + quiz + luckydraw |
| 2026 AX 그룹 1분기 모임 | `meeting26q1` | `event-configs/2026_ax_group_q1_meeting.json` | message/Q&A + quiz |
| 2026 AX 그룹 2분기 모임 | `meeting` | `event-configs/2026_ax_group_q2_meeting.json` | message/Q&A + quiz |
| airever | `airever` | `event-configs/2026_06_AIBD_REVERSE.json` | message/Q&A + quiz |
| scmax | `scmax` | `event-configs/2026_06_SCMAX_REVERSE.json` | message/Q&A + vote + quiz |
| 2026 AX 특별 세션 | `special26ax` | `event-configs/2026_ax_special_message_vote_quiz.json` | message/Q&A + vote + quiz |

### 5.5. Git Build 자동 배포

Cloudflare Dashboard의 Git 연결 설정은 다음 기준입니다.

```text
Repository: Infant83/vibe-arena
Production branch: main
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

Git Build는 푸시 직후 바로 끝나지 않습니다. 보통 2-5분 정도 여유를 두고 Cloudflare Dashboard의 빌드 로그를 확인합니다.

배포 목록은 CLI로도 볼 수 있습니다.

```powershell
npx wrangler deployments list --name meeting --json
```

2026-06-04 점검 기준으로는 `git push` 이후 새 Cloudflare deployment가 자동 생성되는 것을 확인하지 못했습니다. 현재 운영 배포는 수동 `wrangler deploy`로 반영된 상태입니다. Git Build 자동 배포를 운영에 쓰려면 Dashboard에서 repository, production branch, build/deploy command가 위 값으로 연결되어 있는지 먼저 확인하고, push 후 deployments 목록에 새 항목이 생기는지 검증합니다.

코드와 정적 assets만 다시 배포하는 것은 기존 Q&A 질문을 지우지 않습니다. 질문, 참가자, 퀴즈 답변 같은 운영 상태는 현재 Worker가 가리키는 `ARENA_ROOM_NAME` Durable Object storage에 저장됩니다. 단, `wrangler.jsonc`의 Worker 이름, Durable Object binding/class, `ARENA_ROOM_NAME`을 바꾸거나 `/api/reset`, `/api/question/reset`, 관리자 `Q&A reset`을 실행하면 운영 데이터에 영향을 줄 수 있습니다.

`airever.axgroup.workers.dev`와 `scmax.axgroup.workers.dev`는 각각 `ARENA_ROOM_NAME=airever`, `ARENA_ROOM_NAME=scmax` room을 봅니다. 기본 `meeting` Worker를 배포하거나 git push만 하는 것은 두 room의 운영 저장값을 바꾸지 않습니다. 두 Worker를 따로 `--name airever --var ARENA_ROOM_NAME:airever`, `--name scmax --var ARENA_ROOM_NAME:scmax`로 재배포해도 코드와 정적 assets만 갱신되며, 관리자 화면에서 저장한 로고·문구·운영 preset은 같은 Durable Object room storage에 남습니다. 운영 설정이 바뀌는 경우는 `ARENA_ROOM_NAME`을 다른 값으로 배포하거나, 해당 Worker의 관리자 화면에서 `Cloudflare 저장 및 반영`, `불러와 적용`, reset류 작업을 실행할 때입니다.

### 5.6. 긴급 롤백

운영 중 새 배포에서 오류가 급증하면 Cloudflare Dashboard에서 바로 이전 안정 버전으로 되돌립니다.

1. Cloudflare Dashboard > Workers & Pages > `meeting` > `배포` 또는 버전 목록으로 이동
2. 오류가 난 버전보다 앞선 안정 버전을 선택
3. `Rollback` 또는 `이 버전 배포`를 실행
4. `/message`, `/wall`, `/admin` 접속과 Observability 오류 그래프를 확인

CLI로도 롤백할 수 있습니다.

```powershell
npx wrangler deployments list --name meeting
npx wrangler rollback --name meeting <되돌릴_version_id> --message "Rollback to stable event build" --yes
```

스크린샷처럼 특정 버전에서 `SQLITE_TOOBIG` 오류가 몰리면, 해당 버전 직전의 정상 버전을 선택합니다. 롤백 뒤에는 운영 콘텐츠 저장이나 추첨 상태가 정상인지 `/admin`에서 짧게 확인합니다.

### 5.7. 자주 나온 배포 오류

Cloudflare 로그에 아래 문구가 나오면 `package.json`과 `package-lock.json`이 Cloudflare의 npm 기준으로 맞지 않는 상태입니다.

```text
npm ci can only install packages when your package.json and package-lock.json are in sync.
Missing: @emnapi/runtime@1.10.0 from lock file
Missing: @emnapi/core@1.10.0 from lock file
```

해결 방법:

```powershell
npx npm@10.9.2 install --package-lock-only
npx npm@10.9.2 clean-install --progress=false --dry-run
npm run build
git add package-lock.json
git commit -m "Regenerate lockfile for Cloudflare npm 10"
git push origin cloudflare-migration
```

### 5.8. Cloudflare 비용과 운영 규모 판단

가격과 무료 한도는 바뀔 수 있으므로 행사 전에는 Cloudflare 공식 가격 문서를 다시 확인합니다.

- Workers pricing: <https://developers.cloudflare.com/workers/platform/pricing/>
- Durable Objects pricing: <https://developers.cloudflare.com/durable-objects/platform/pricing/>

이 앱은 정적 화면만 제공하는 사이트가 아닙니다. `/api/*` 요청과 `/events` 실시간 연결이 Cloudflare Worker와 Durable Object를 사용합니다.

과금과 한도에 영향을 주는 주요 요소는 다음과 같습니다.

- Worker 요청 수
- Durable Object 요청 수
- Durable Object duration
- 장시간 열려 있는 SSE/EventSource 연결

특히 Durable Object duration은 단순히 배포를 많이 했다고 크게 늘어나는 항목이 아닙니다. 배포 후 `/message`, `/vote`, `/admin`, `/wall`, `/admin?showCheer=1` 같은 페이지를 오래 열어두고 실시간 연결이 유지될 때 빠르게 늘어날 수 있습니다. 개발 테스트는 가능하면 Cloudflare 배포 URL이 아니라 로컬 `npm run realtime` 서버에서 진행합니다.

운영 전 최적화 목표는 다음과 같습니다.

- `/message`, `/vote`: SSE를 기본 실시간 경로로 사용하고, 연결이 정상일 때는 주기적인 전체 상태 polling을 하지 않음
- `/message`, `/vote`: SSE 오류가 발생한 브라우저만 30초 내외 fallback polling으로 복구
- `/message`, `/vote`: Q&A 질문, 퀴즈 출제, 퀴즈 상태, 당첨 이력처럼 즉시성이 필요한 상태는 실시간으로 유지
- `/message`, `/vote`: 퀴즈 답변 제출은 제출자 자신의 POST 응답으로 즉시 결과를 받고, 모든 관객에게 매 답변마다 전체 상태를 다시 뿌리지 않음
- `/admin`: 관리자 화면은 운영 전체 상태가 필요하므로 SSE 유지
- `/wall`, `/admin?showCheer=1`: 발표장 송출 화면은 SSE 유지
- 숨겨진 브라우저 탭은 가능하면 실시간 연결 종료
- 큰 이미지와 상품 사진은 full 상태가 필요할 때만 전송하고, 반복 갱신은 `media=slim` 사용

예전처럼 1000명 관객이 30분 동안 15초 polling을 계속 하면 단순 계산으로 다음과 같은 상태 조회가 발생합니다.

```text
1000명 x 30분 x 분당 4회 = 120,000회 상태 조회
```

현재 구조는 SSE가 살아 있는 관객에게 이 반복 polling을 하지 않으므로, 정상 네트워크에서는 이 요청 대부분이 사라집니다. 여기에 입장, 질문 작성/수정, 별 조정, 응원 메시지 전송, 관리자 조작, fallback 재시도를 더한 실제 요청만 Worker/Durable Object에 들어갑니다.

Free 플랜은 개발과 작은 리허설에는 사용할 수 있지만, 전사 행사 운영용으로는 권장하지 않습니다. 1000명이 30분 정도 참여하면 요청 수만으로도 Free 일일 한도에 닿거나 넘을 수 있고, 실시간 연결을 오래 열어두면 Durable Object duration 경고가 먼저 발생할 수 있습니다.

행사 운영에는 Workers Paid 플랜을 권장합니다. 공식 문서 기준 Paid 플랜은 월 최소 비용이 있고, Free보다 훨씬 큰 월간 포함량을 제공합니다. 이 앱의 1회성 행사 규모라면 SSE 우선 구조와 slim payload를 적용한 상태에서 기본 포함량 안에 들어갈 가능성이 높습니다. 다만 여러 번 대규모 리허설을 하거나 fallback polling이 대량으로 발생하면 초과 사용량이 생길 수 있습니다.

운영 판단은 다음 기준으로 합니다.

| 상황 | 권장 플랜 |
| --- | --- |
| 로컬 개발 | 로컬 `npm run realtime` |
| 10-50명 내부 테스트 | Free 가능 |
| 100명 이하 짧은 리허설 | Free 가능, 사용량 확인 필요 |
| 300명 이상 행사 리허설 | Paid 권장 |
| 1000명 전사 행사 | Paid 권장 |

행사 전에는 Cloudflare Dashboard에서 사용량 알림과 비용 알림을 켜 둡니다. 행사 당일에는 사용하지 않는 `/message`, `/vote`, `/admin`, `/wall`, Showup 탭을 닫고, 리허설이 끝나면 Durable Object 사용량이 불필요하게 계속 늘지 않도록 배포 URL을 열어둔 브라우저를 정리합니다.

### 5.9. 운영 Preflight Audit

행사 전에는 정적 설정과 실행 중 서버 상태를 함께 점검합니다.

```powershell
npm run ops:audit:all

$env:EVENT_CONFIG_FILE = 'event-configs/2026_ax_group_q2_meeting.json'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run realtime

# 다른 PowerShell 창에서 실행
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2
```

`ops:audit:all`은 `event-configs/*.json` 전체를 정적으로 검사합니다. 각 파일의 `event.features`와 `settings.wallEnabledPanels`를 비교해 vote/message/quiz/luckydraw 조합이 맞는지, `event.roomName`, 팀 수, 퀴즈 수, 팀 사진 표시값, inline media, 팀 편집 키, HTTP 이미지 URL을 확인합니다. 실행 중 서버를 같이 점검하려면 행사별 `ops:audit:*` 명령에 `ADMIN_PASSCODE`와 `AUDIT_URL`을 함께 지정합니다.

Cloudflare 배포 주소를 점검할 때는 `AUDIT_URL`을 배포 URL로 지정합니다.

```powershell
$env:AUDIT_URL = 'https://meeting.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2
```

Audit 결과 기준:

- `FAIL`: 운영 전 반드시 수정합니다. 예: admin passcode 없음, 행사별 `ARENA_ROOM_NAME` 미분리, 공개 state의 편집 키 노출, 비인증 설정 변경, payload 과대.
- `WARN`: 리허설 전에 확인하고 의도한 값인지 판단합니다. 예: 서버가 꺼져 있어 runtime audit을 못 한 상태, 열어둔 SSE 탭이 많은 상태.
- `PASS`: 해당 항목은 현재 기준으로 안전합니다.

서버가 실행 중이면 보호된 `/api/ops/audit` endpoint도 확인합니다. 이 endpoint는 상태를 바꾸지 않고 현재 참가자/질문/응원/퀴즈 건수, role별 SSE 연결 수, full/slim 상태 payload 크기를 계산합니다. Cloudflare에서는 관리자 인증 후에만 접근됩니다.

## 6. 운영 콘텐츠 관리

팀 정보, 화면 문구, 퀴즈 문제, 운영 설정의 기본값은 `teams.json`에 있습니다.

지난 행사 설정을 보존하고 새 행사만 다른 설정으로 띄우려면 `event-configs/` 아래에 행사별 JSON을 두고 로컬 서버 실행 전에 `EVENT_CONFIG_FILE`을 지정합니다. 지정하지 않으면 기존처럼 `teams.json`을 읽습니다.

```powershell
$env:EVENT_CONFIG_FILE = 'event-configs/2026_ax_group_q2_meeting.json'
npm run realtime
```

이렇게 실행하면 로컬 Node 서버는 선택된 행사 JSON을 읽고, 관리자 화면에서 저장한 팀/문구/퀴즈/운영 설정도 같은 행사 JSON에 씁니다. 기존 Hackathon 설정은 `teams.json`에 그대로 남습니다. 같은 행사를 이듬해 다시 열 때는 이전 `event-configs/*.json` 또는 `settings.json` 백업을 복사해 새 파일명으로 만들고, 행사명/팀/문구/퀴즈/운영 설정만 수정하는 방식으로 재사용합니다.

관리자 화면에서 바로 불러올 사전/과거 설정은 `event-configs/`와 `public/prev_settings/`를 함께 활용합니다. 로컬 Node 서버는 `event-configs/*.json`을 관리자 전용 preset API(`/api/settings-presets`)로 노출하고, Cloudflare Worker는 번들에 포함된 행사 설정을 같은 API로 노출합니다. `public/prev_settings/settings_manifest.json`에 등록된 파일도 같은 드롭다운에 함께 표시됩니다. 단, `public/prev_settings/`는 공개 배포에 포함되므로 실명, 내부 소속, 비공개 사진이 들어간 설정은 익명화하거나 비공개 운영 저장소에 따로 보관합니다.

운영 중 만든 편집 초안은 `/admin?panel=teams`의 `저장 이름`에 이름을 넣고 `내 PC에 보관`을 누르면 같은 브라우저의 설정 보관함에 저장됩니다. 보관한 설정은 `저장된 설정` 드롭다운에 즉시 나타나며, 다음 리허설이나 행사 준비 때 현재 DB room에 다시 적용할 수 있습니다. 내 PC 보관 설정을 `불러와 적용`한 뒤 이름을 비워 저장하면 확인 후 같은 보관 항목을 덮어씁니다. 새 이름을 넣으면 새 보관 항목을 만들거나 같은 이름 항목을 확인 후 갱신합니다. 이 보관함은 빠른 재사용용이며 다른 관리자 PC에는 표시되지 않습니다. 다른 관리자 PC로 옮기거나 행사 종료 자료로 남길 때는 `settings.json 저장`으로 파일 백업을 함께 보관합니다.

같은 행사 room의 여러 관리자 PC가 함께 볼 preset은 `운영 preset 등록`으로 저장합니다. 이 기능은 현재 편집 draft를 현재 `ARENA_ROOM_NAME` Durable Object storage에 이름 붙여 보관하며, 같은 `/admin`에 로그인한 다른 PC의 `저장된 설정` 드롭다운에도 `운영 · ...` 항목으로 표시됩니다. 운영 preset을 `불러와 적용`한 뒤 이름을 비워 저장하면 확인 후 같은 운영 preset을 덮어씁니다. 배포 preset, 과거 preset, 업로드 파일은 읽기 전용 출처로 다루며 저장 시 내 PC 보관 또는 운영 preset으로 새 항목을 만듭니다. 운영 preset은 repo의 `event-configs/*.json` 파일을 바꾸지 않습니다. 현재 운영 화면에 실제 적용하려면 해당 preset을 선택한 뒤 `불러와 적용`을 누릅니다.

`settings.json`과 `event-configs/*.json`의 `event.roomName`은 해당 설정이 원래 의도한 Durable Object room을 기록하는 운영 메타데이터입니다. 관리자 화면에서 preset을 불러와도 DB room이 자동 전환되지는 않습니다. 현재 DB room은 Worker의 `ARENA_ROOM_NAME`으로 결정되며, Cloudflare 런타임에서 preset의 권장 room과 현재 room이 다르면 관리자 화면이 한 번 더 확인합니다.

운영 콘텐츠의 이미지 입력은 `event-brand/scmax_logo.jpg`, `public/event-brand/scmax_logo.jpg`, `/event-brand/scmax_logo.jpg`를 모두 `/event-brand/scmax_logo.jpg`로 정리합니다. 이 경로 방식은 repo의 `public/event-brand/scmax_logo.jpg` 파일이 배포에 포함될 때 사용합니다. 관리자 화면의 PC 파일 업로드는 JPG/PNG/WebP/SVG 파일을 base64 data URL로 읽어 현재 Durable Object room에 저장하는 방식입니다. 큰 JPG/PNG는 브라우저에서 압축한 뒤 저장하며, 실패하면 운영 콘텐츠 화면의 상태 메시지에 원인을 표시합니다.

Cloudflare Worker는 배포된 파일시스템에서 임의의 JSON 파일을 런타임에 바꿔 읽을 수 없습니다. Cloudflare 운영에서는 행사별로 `ARENA_ROOM_NAME`을 다르게 지정해 Durable Object 저장소를 분리합니다. 기본 `meeting` Worker는 추적성을 위해 `ARENA_ROOM_NAME=meeting`을 사용합니다. Worker에서 새 `event-configs/*.json`을 preset으로 쓰려면 해당 JSON을 `worker/index.ts`에 import하고 `bundledEventConfigPresets`와 `initialConfigByRoomName`에 함께 등록한 뒤 배포합니다.

`worker/index.ts`는 현재 `hackathon26q1`, `meeting26q1`, `meeting`, `airever`, `scmax`, `special26ax` 룸의 초기 설정을 함께 번들링합니다. `airever`의 활성 기본값은 `event-configs/2026_06_AIBD_REVERSE.json`, `scmax`의 활성 기본값은 `event-configs/2026_06_SCMAX_REVERSE.json`입니다. 과거 Q2 room인 `2026-ax-q2-meeting`도 export와 복구 접근을 위해 legacy alias로 남겨둡니다. 새 행사 프리셋을 추가할 때는 `event-configs/<행사>.json`을 만든 뒤 Worker import, `initialConfigByRoomName`, `bundledEventConfigPresets`, `npm run ops:audit:all`을 함께 갱신합니다. 운영 중 내용이 바뀌면 `/admin > 운영 콘텐츠 > 관리`에서 저장 적용하고, 행사 후에는 관리자 화면에서 settings 파일을 내려받아 `event-configs/` 또는 비공개 운영 보관함에 반영합니다.

관리자 화면에서도 수정할 수 있습니다.

```text
/admin > 운영 콘텐츠 > 관리
```

관리 가능한 항목:

- 앱 제목
- 화면별 문구(`/message`, `/vote`, `/admin`, `/wall`, Showup, Quiz, Q&A)
- 등록 안내 문구
- Q&A 방 안내 문구
- Q&A 입력/전송 문구
- 추첨 응모 안내 문구
- 퀴즈 문제와 정답
- 팀명
- 프로젝트명
- 팀원
- 팀 편집 키
- 팀 색상
- 팀 로고/팀 사진
- 기본 로고 스타일
- wall 선택 팀 카드 기준의 와이드 사진 프레임, 크기, 맞춤, 확대, 초점 위치
- wall 표시 세션
- Q&A wall 글자 크기
- 테스트 데이터용 기본 별 수와 투표자 수

화면 문구 관리 섹션은 각 그룹 오른쪽에 저장 전 프리뷰를 보여줍니다. 프리뷰는 입력 중인 draft를 기준으로 즉시 갱신되며, `{starBudget}`, `{maxStarsPerTeam}` 같은 운영 변수는 예시값으로 치환해 실제 문장 길이를 가늠할 수 있게 합니다. 긴 문구는 저장 전에 `/message`, `/vote`, `/wall`, Quiz, Showup 중 어느 화면에서 과해지는지 이 프리뷰로 먼저 확인합니다.

팀 사진은 작은 로고와 wall 하단 선택 팀 카드가 서로 다른 프레임을 씁니다. 운영 콘텐츠의 사진 편집 미리보기는 실제 `/wall` 응원 보드의 선택 팀 카드 구조를 따라 렌더링됩니다. `송출 기본`, `16:9`, `4:3`, `전체보기` 프리셋으로 프레임을 빠르게 잡고, 드래그/슬라이더로 초점과 확대를 조정한 뒤 `/wall`에서 최종 확인합니다.

운영 설정에서 화면 테마를 `기본 밝은 테마`, `브루탈리즘 파스텔 Yellow`, `어두운 송출 테마`와 확장 theme pack 중에서 선택할 수 있습니다. `브루탈리즘 파스텔 Yellow`는 코랄, 민트, 옐로, 딥그린을 쓰는 밝은 파스텔/수채화톤 브루탈리즘입니다. 글씨체는 `Vibe Arena`, `Gowun Dodum`, `시스템 기본` 중 선택할 수 있으며, 새 행사 기본값은 현재 Vibe Arena 글씨체입니다. 어두운 송출 테마는 `ppt_sample/EDM_(일반진행)해커톤 간지 선정_양식(외부)_v0.1.pptx`의 블랙/네이비, 블루, 바이올렛, 마젠타 톤을 기준으로 합니다.

### 6.1. JSON 구조

```json
{
  "event": {
    "id": "2026-ax-q2-meeting",
    "label": "2026 AX 그룹 2분기 모임",
    "workerName": "meeting",
    "roomName": "meeting",
    "settingsFile": "event-configs/2026_ax_group_q2_meeting.json",
    "description": "Q&A와 퀴즈 중심 운영 프로필",
    "features": ["message", "quiz"]
  },
  "copy": {
    "appTitle": "2026 AX 그룹 2분기 모임",
    "qnaRoomTitle": "AX Group QnA",
    "qnaRoomTarget": "AX Group에게 질문해주세요",
    "wallQnaTitle": "실시간 Q&A"
  },
  "settings": {
    "themeMode": "stage",
    "fontMode": "vibe",
    "wallEnabledPanels": ["qna", "quiz"],
    "qnaWallFontScale": 1.12
  },
  "teams": [
    {
      "id": "ax-qna-room",
      "code": "QNA",
      "editKey": "ax-qna-admin-rotated-20260607",
      "name": "AX Group",
      "title": "QnA Room",
      "members": ["AX Group"],
      "logoFile": "",
      "color": "#A50034",
      "logo": "orbit",
      "baseStars": 0,
      "baseVoters": 0,
      "sortOrder": 0
    }
  ]
}
```

`id`는 투표, 응원 메시지, 수상 이력과 연결되는 내부 키이므로 운영 중에는 바꾸지 않습니다. `editKey`는 관리자 화면에서 팀 편집 링크를 검증하는 보조 키입니다. 이 키는 공개 `/vote`/`/wall` state에 노출되지 않아야 하며, `/team/...` 편집 저장도 관리자 인증을 통과한 브라우저에서만 동작합니다. 짧거나 행사명이 그대로 드러나는 키는 회귀 위험이 있으므로 16자 이상으로 관리합니다.

### 6.2. ZIP 업로드 구조

관리자 화면은 `settings.json` 단일 파일 또는 `settings.zip` 파일을 받을 수 있습니다. `settings.json 저장`으로 내려받는 `settings.json`에는 팀 정보뿐 아니라 화면 문구(`copy`), 운영 설정(`settings`), 퀴즈 목록(`quizzes`)이 함께 들어갑니다. 따라서 행사 후에는 이 파일을 운영 백업으로 보관하고, 다음 행사에서는 이 파일을 업로드한 뒤 필요한 값만 수정해 재사용할 수 있습니다. 기존 자료 호환을 위해 `team_info.json` 단일 파일과 `team_infos.zip`도 계속 받을 수 있습니다.

기존 호환 ZIP 구조:

```text
team_infos.zip
└─ team_infos/
   ├─ team_info.json
   └─ logos/
      ├─ T1-logo.png
      ├─ T2-logo.jpg
      ├─ T3-logo.webp
      └─ ...
```

새 표준 ZIP 구조:

```text
settings.zip
└─ settings/
   ├─ settings.json
   └─ logos/
      ├─ T1-logo.png
      ├─ T2-logo.jpg
      ├─ T3-logo.webp
      └─ ...
```

팀별 `logoFile`에는 `/team-logos/T1-logo.png` 같은 배포 경로, `https://...` 인터넷 이미지 주소, 공개 공유된 Google Drive 이미지 링크, 또는 관리자 화면에서 업로드한 이미지 data URL을 사용할 수 있습니다. Google Drive 파일 링크는 관리자 화면에서 저장할 때 표시 가능한 thumbnail 주소로 자동 정리됩니다.

로컬 Node 서버에서는 ZIP으로 업로드한 로고를 `public/team-logos/`에 저장하고 `teams.json`도 갱신합니다.

Cloudflare Worker에서는 배포된 파일시스템을 직접 수정할 수 없습니다. 그래서 행사 중 수정한 팀 정보와 로고는 `저장 및 반영`을 통해 Cloudflare Durable Object storage에 직접 저장됩니다. 즉, Cloudflare 배포 주소에서 누른 저장은 로컬 PC의 `server.mjs`나 `teams.json`을 호출하지 않고, Cloudflare Worker 안의 운영 상태를 바로 바꿉니다. 행사 후 이 설정을 코드에 영구 반영하려면 관리자 화면에서 `settings.json 저장`을 눌러 `settings.json`을 내려받고, 그 내용을 레포의 `event-configs/<행사명>.json`, `public/prev_settings/<행사명>.settings.json`, 또는 개발 기본값인 `teams.json`에 반영합니다.

`내 PC에 보관`은 관리자 브라우저의 로컬 보관함에 현재 편집 draft를 저장합니다. `운영 preset 등록`은 현재 DB room의 Durable Object storage에 현재 편집 draft를 저장해 다른 관리자 PC에서도 선택할 수 있게 합니다. 저장된 항목을 `불러와 적용`한 뒤 이름을 비워 다시 보관하면 확인 후 같은 항목을 덮어씁니다. 이름을 새로 넣으면 새 항목을 만들거나 같은 이름의 항목을 확인 후 갱신합니다. Cloudflare Durable Object의 현재 운영 설정은 `Cloudflare 저장 및 반영` 또는 `불러와 적용`으로 바뀝니다. 운영자는 행사 중 여러 초안을 보관해 비교할 수 있고, 실제 송출 화면에 적용할 시점에 저장된 설정을 선택한 뒤 `불러와 적용`을 누릅니다.

레포에 커밋된 `teams.json`은 공개 저장소와 개발 환경에서 안전하게 다루기 위해 익명화되어 있습니다. 운영 중 Cloudflare Durable Object storage에 저장된 팀명, 프로젝트명, 팀원, 사진은 레포의 샘플 JSON과 다를 수 있습니다. 행사 후 운영 데이터를 보존하려면 관리자 화면에서 JSON을 내려받아 별도 보관하고, 공개 레포에 반영할 때는 실명/소속/사진을 다시 익명화합니다.

Cloudflare 운영 중 `/admin > 운영 콘텐츠 > 관리`에서 `저장 및 반영`을 누르면 저장 완료 시각과 반영 버전이 표시됩니다. 이 값이 갱신되면 Durable Object 운영 상태에 저장된 것이며, 이미 열려 있는 `/message`, `/wall`, `/vote` 화면도 SSE/폴링 갱신으로 같은 설정을 받습니다. Google Drive 공유 링크와 원격 이미지 주소는 저장 전에 표시 가능한 주소로 정리됩니다.

사내망처럼 inbound 접속은 가능하지만 브라우저의 outbound HTTPS가 막힌 환경에서는 Cloudflare 운영 저장소로 직접 저장할 수 없습니다. 이 경우 먼저 `settings.json 저장`으로 현재 편집본을 백업하고, 인터넷 연결이 가능한 관리자 PC에서 해당 JSON을 업로드하거나 같은 값을 다시 편집해 `저장 및 반영`합니다.

특정 사내망에서만 `Cloudflare 저장 실패(403)`이 뜨고 모바일/외부망에서는 저장되는 경우, 사내 보안망/프록시가 Cloudflare 저장 요청을 가로막았거나 관리자 mutation의 Origin/Referer 검증이 실패한 상황으로 봅니다. 같은 브라우저의 `/admin`에서 로그인한 뒤 다시 저장하고, 계속 실패하면 모바일 핫스팟/외부망에서 저장하거나 JSON 백업 파일을 옮겨 적용합니다.

운영 화면은 Cloudflare 저장 POST가 403으로 거절되면 같은 내용을 압축한 관리자 전용 GET 저장 경로로 한 번 더 자동 시도합니다. 이 우회 저장도 같은 관리자 쿠키와 같은 출처의 Referer가 있어야 동작하며, 사내망이 POST만 막는 경우에는 별도 업로드 없이 바로 반영될 수 있습니다. 저장 시 이미 운영 상태에 들어 있는 inline 이미지(data URL)는 다시 보내지 않고 기존 값을 보존하므로, 로고나 상품 이미지를 그대로 둔 문구/팀 정보 수정은 훨씬 작은 payload로 처리됩니다.

큰 로고/상품 이미지는 첫 화면 진입과 미디어가 실제로 바뀌는 운영 콘텐츠 저장 때만 full 상태로 내려갑니다. 이후 별 투표, 응원 메시지, 퀴즈 상태 같은 빈번한 갱신은 `/api/state?media=slim` 및 slim SSE payload를 사용하고, 브라우저는 직전 full 상태의 이미지를 보존합니다. 따라서 트로피 로고 같은 시각 자산은 유지하면서도 반복 상태 전송량을 줄입니다.

관리자 화면 상단의 `인증 확인`은 현재 브라우저의 관리자 세션을 다시 확인합니다. `로그아웃`을 누르면 관리자 인증 쿠키를 지우고 다시 로그인 화면으로 돌아갑니다.

관객 `/vote` 화면에서 다른 기기나 다른 참여자로 다시 들어가야 할 때는 상단 Live 표시 옆의 `Logout`을 사용합니다. 이 동작은 현재 브라우저의 참여자 쿠키와 로컬 입력값만 지우며, 이미 서버에 접수된 기존 참여자의 투표/응원 기록은 삭제하지 않습니다.

응원 메시지는 화면 전송량을 줄이기 위해 상태 응답에서는 최근 120개만 내려보냅니다. 전체 개수는 `cheerTotalCount`와 `visibleCheerTotalCount`로 별도 표시하고, 과거 메시지는 `/api/cheers?teamId=...&beforeId=...&limit=...`로 페이지 단위 조회합니다. 단, 행운권 추첨과 참여자별 응원 이력 계산에 쓰는 서버 내부 메시지 이력은 최대 5000개까지 보존합니다.

## 7. 팀 로고 규격

팀별로 하나의 정사각형 로고를 받는 것을 권장합니다.

- 권장 포맷: 투명 PNG
- 허용 포맷: PNG, JPG, JPEG, WebP, SVG, ICO
- 권장 크기: `512 x 512 px`
- 안전 영역: 중앙 `384 x 384 px` 안에 주요 로고가 들어오도록 배치
- 여백: 사방 약 `64 px`
- 배경: 공식 로고의 일부가 아니라면 흰색 박스를 깔지 않음
- ZIP 업로드 파일명: `T1-logo.png`부터 `T10-logo.png` 권장
- 직접 배치 파일명: `aurora-lab.png`처럼 팀 slug 사용 가능
- 작은 크기 확인: `48 x 48 px`에서도 알아볼 수 있어야 함

## 8. 결과와 원본 데이터 내보내기

관리자 화면에서 `결과 내보내기 > XLSX`를 누르면 엑셀 파일이 다운로드됩니다.

파일명 예시:

```text
vibe-vote-results-20260510105253.xlsx
```

포함되는 시트:

- `행사요약`
- `팀별결과`
- `참여자`
- `응원메시지`
- `추첨결과`
- `별이벤트`

관리자 인증이 된 브라우저에서는 원본 보관용 JSON도 받을 수 있습니다.

```text
GET /api/export
```

`/api/export`에는 다음 데이터가 포함됩니다.

- `generatedAt`: 내보내기 생성 시각
- `sessionId`: 현재 행사 세션
- `teams`: 현재 운영 상태의 팀 설정
- `participants`: 참가자와 별 배분 상태
- `cheers`: 서버/Cloudflare에 보관된 응원 메시지 이력
- `questions`: 서버/Cloudflare에 보관된 Q&A 질문 이력
- `quizAnswers`: 현재 퀴즈 라운드의 답변 이력
- `quizWinners`: 현재 퀴즈 라운드의 정답자
- `awardHistory`: 행운권/퀴즈 당첨 이력
- `voteEvents`: 별 이동 이벤트
- `settings`: 운영 설정
- `eventProfile`: 현재 event id, Worker 이름, 현재 DB room, 설정 권장 room
- `configRevision`, `configUpdatedAt`: 운영 콘텐츠 반영 버전과 시각

주의할 점이 있습니다. 화면 성능을 위해 `/api/state`는 최근 응원 메시지와 질문 일부만 내려주지만, `/api/export`는 서버가 보관 중인 원본 배열을 내려줍니다. 현재 보관 한도는 응원 메시지 최대 5000개, Q&A 질문 최대 500개, 퀴즈 답변 최대 1000개입니다. 더 긴 장기 보존이 필요하면 행사 종료 직후 JSON/XLSX를 모두 내려받아 별도 보관합니다.

행사 종료 백업 순서는 다음을 권장합니다.

1. 관리자 화면 `결과 내보내기 > 원본 JSON 백업` 또는 `/api/export`로 현재 room의 원본 운영 데이터를 보관합니다.
2. 관리자 화면 `결과 내보내기 > XLSX 결과 저장`으로 사람이 보기 좋은 결과표를 보관합니다.
3. 관리자 화면 `결과 내보내기 > settings 저장` 또는 `운영 콘텐츠 > settings 저장`으로 다음 행사에 재사용할 설정/preset을 보관합니다.
4. reset을 실행하기 전에 위 세 파일이 모두 저장되어 있는지 확인합니다.

### 8.1. 데이터 저장 위치

로컬 `npm run realtime` 서버에서는 참가자, 별, 응원 메시지, 추첨, 퀴즈 상태가 Node 프로세스 메모리에 있습니다. 서버를 종료하면 행사 상태는 사라지며, 팀/문구 기본 설정만 `teams.json`에 남습니다.

Cloudflare 운영 배포에서는 행사 상태가 Durable Object `ArenaRoom`의 storage에 저장됩니다. 큰 inline 이미지(data URL)는 snapshot에 직접 넣지 않고 `event-media-v1:*` storage key로 분리 저장하며, snapshot에는 참조 token만 들어갑니다. 이 구조는 상품 이미지와 트로피 로고처럼 큰 미디어 때문에 Durable Object 저장 payload가 커지는 문제를 줄이기 위한 것입니다.

같은 Worker와 같은 `ARENA_ROOM_NAME`으로 새 코드를 배포하면 Durable Object storage의 기존 질문은 유지됩니다. 예를 들어 기본 `meeting` Worker는 `ARENA_ROOM_NAME=meeting` room을 계속 볼 때 운영 질문과 설정을 이어받습니다. 워드클라우드 단어 추출 규칙이나 화면 UI를 개선해 배포하면 기존 질문 텍스트가 새 규칙으로 다시 표시될 뿐, 질문 자체를 수정하거나 삭제하지 않습니다.

Durable Object storage는 운영 중 상태 저장소이지, 영구 아카이브나 분석 DB를 대체하지 않습니다. 행사 후 보존이 필요하면 `/api/export` JSON과 XLSX를 내려받아 별도 저장합니다.

기존 행사 DB를 내려받으려면 해당 DB room을 가리키는 Worker로 접속해야 합니다. 예전 room이 `event26q1`이라면 임시 Worker를 같은 Durable Object binding/class와 `ARENA_ROOM_NAME=event26q1`로 배포한 뒤 `/api/export`만 내려받고, reset은 실행하지 않는 방식이 가장 안전합니다.

## 9. 중복 참여 방지 설계

이 플랫폼은 개인정보 수집을 늘리지 않는 방향으로 설계했습니다.

이번 AX Q&A 행사에서 `/message` 참가자는 별명만 입력합니다. 서버는 익명 브라우저 디바이스 ID와 관리 ID를 사용해 같은 브라우저의 질문 이력을 이어주고, 퀴즈 경품 운영에 필요한 최소한의 추적만 남깁니다. 참가자는 자신의 질문을 수정/삭제할 수 있고, 보낸 질문 목록을 다시 열어볼 수 있습니다.

해커톤 투표용 `/vote` 흐름에서는 참가자가 다음 두 값을 입력합니다.

1. 이름
2. ID

브라우저는 익명 디바이스 ID를 만들고 localStorage와 SameSite cookie에 저장합니다. 서버는 아래 조합을 같은 사람 판단 기준으로 사용합니다.

```text
이름 + ID
```

비교할 때만 다음 정규화를 적용합니다.

- 이름: 모든 띄어쓰기 제거
- ID: `@` 뒤 도메인 제거
- ID: 띄어쓰기 제거
- ID: 영문 대문자 소문자 변환
- ID: 영문/숫자/마침표/하이픈/밑줄만 사용

예시:

```text
"김 현중" == "김현중"
"gd.hong@lgdisplay.com" == "gd.hong"
"GD.HONG" == "gd.hong"
```

화면 표시는 사용자가 입력한 값을 최대한 유지합니다.

한 번 등록한 사용자는 같은 브라우저 device ID로 재접속하면 기존 참여 내역을 이어갑니다. 다른 기기에서 접속할 때는 이름과 ID를 입력한 뒤 `등록하고 투표 시작` 버튼을 누르거나 Enter로 제출해야 동일성 판단을 수행합니다. 제출된 이름과 ID가 기존 참여자와 같으면 같은 참여자로 묶고, 새 device ID를 같은 참여자에 추가합니다. 이 경우 기존 별 배분, 응원 메시지, 수상 이력 상태를 이어받습니다.

강한 중복 방지는 하지 않습니다. 사번, 이메일, 사진, 카메라 QR 스캔, 강한 디바이스 fingerprint는 기본 흐름에 넣지 않습니다.

알려진 한계:

1. 쿠키와 localStorage를 지우면 새 참여자로 보일 수 있습니다.
2. 다른 브라우저나 다른 기기를 쓰면 새 참여자로 보일 수 있습니다.
3. 공유 PC나 키오스크는 강한 신원 경계가 아닙니다.

전사 행사 운영에서는 관리자 참여자 리스트와 메시지 관리 기능으로 명백한 이상 행동을 사후 확인하는 방식을 우선합니다.

## 10. 운영 전 체크리스트

행사 전에는 다음을 확인합니다.

```powershell
npm run lint
npm run build
npm run cf:deploy:dry-run
```

운영 리허설:

1. `ADMIN_PASSCODE`가 로컬/운영 환경에 설정되어 있는지 확인
2. `/admin` 접속 후 passcode 로그인
3. `npm run ops:audit:all`로 모든 `event-configs/*.json`의 기능 조합과 room 설정 확인
4. 운영 콘텐츠에서 행사명, Q&A 문구, 퀴즈 문제 확인
5. 화면별 문구 관리 오른쪽 프리뷰가 수정 문구를 즉시 반영하는지 확인
6. 운영 콘텐츠의 팀 사진 미리보기가 실제 `/wall` 선택 팀 카드와 맞는지 확인
7. wall 표시 세션이 해당 행사 조합에 맞게 제한되어 있는지 확인
8. `Q&A reset` 실행
9. `/wall` 접속 후 초기 화면이 `아직 질문이 없습니다. 무엇이 궁금하신가요?`로 보이는지 확인
10. 모바일 `/message` 접속
11. 별명으로 Q&A 방 입장
12. 질문 작성, 보낸 질문 다시 보기, 수정, 삭제 확인
13. `/wall`에서 질문 카드 스택, 클릭 확대, 읽음 표시, 수정됨 표시 확인
14. 워드클라우드 단어 클릭 후 관련 질문 필터가 한 줄 안내와 함께 동작하는지 확인
15. `/admin`에서 Q&A 글자 크기 조정 후 `/wall` 반영 확인
16. `/admin`에서 퀴즈 출제 후 `/message`가 퀴즈 화면으로 전환되는지 확인
17. 퀴즈 종료 또는 Q&A 복귀 후 `/message`가 질문 입력 화면으로 돌아오는지 확인
18. `npm run ops:audit:ax-q2` 또는 Cloudflare 배포 URL 대상 audit 실행
19. 원본 JSON, XLSX, settings 다운로드 확인
20. 최종 `Q&A reset` 또는 전체 `Reset`

해커톤 투표 기능을 함께 쓰는 행사라면 추가로 `/vote` 이름/ID 등록, 별 배분, 응원 메시지, `/admin?showCheer=1`, 행운권 추첨도 확인합니다.

## 11. 개발 규칙

- 작업공간 규칙은 `AGENTS.md`를 따릅니다.
- 디자인 방향은 `DESIGN.md`를 우선합니다.
- 사용자 화면에는 관리자 진입 버튼을 노출하지 않습니다.
- 사용자 화면에는 팀별 총점과 순위를 보여주지 않습니다.
- 관리 기능을 바꾸면 Node 서버와 Cloudflare Worker를 함께 맞춥니다.
- 렌더링 변경은 가능하면 Playwright로 데스크톱과 모바일 폭을 확인합니다.
- Cloudflare 배포 전에 `npm run cf:deploy:dry-run`을 실행합니다.

## 12. 관련 문서

- `CHANGELOG.md`: 지금까지 구현된 변경 내역
- `TODO.md`: 남은 작업과 우선순위
- `memory-bank/active-context.md`: 현재 운영 기준, 최근 검증, 다음 작업 인수인계
- `docs/DEPLOYMENT_AND_OPERATIONS_RUNBOOK.md`: 배포 절차, 행사별 분리 배포, 운영 대응 명령어
- `public/help/index.html`: `/admin`에서 `/help`로 여는 운영 가이드 페이지
- `app_introduction/remotion-deck`: 운영자 교육용 Remotion 소개 덱
- `docs/OPERATIONS_ISSUE_REPORT_2026-05-23.md`: 행사 로그 기반 이슈 진단, 개선 내역, 예방 체크리스트
- `AGENTS.md`: 이 작업공간에서 Codex가 따라야 하는 개발 규칙
- `DESIGN.md`: UI/시각 디자인 기준
