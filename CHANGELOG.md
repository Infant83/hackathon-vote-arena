# Changelog

이 문서는 `Vibe Vote Arena`의 주요 개발 진행 상황을 시간순으로 정리합니다.

## 2026-06-09

### 운영 안정성과 meeting room 추적성

- `wrangler.jsonc`의 CPU limit이 `limits.cpu_ms=300000`으로 설정되어 있음을 확인하고, Cloudflare observability 설정도 함께 점검했습니다.
- Worker 상태 생성과 퀴즈 답변 제한 검사에서 불필요한 배열 생성을 줄여, 공개 질문/메시지 카운팅과 퀴즈 제출 hot path의 CPU 사용을 낮췄습니다.
- 기본 `meeting` Worker의 `ARENA_ROOM_NAME`을 `meeting`으로 맞추고, `event-configs/2026_ax_group_q2_meeting.json`의 `event.roomName`도 `meeting`으로 정리해 `Worker name = ARENA_ROOM_NAME = event.roomName` 추적 규칙을 적용했습니다.
- 과거 Q2 room인 `2026-ax-q2-meeting`은 `worker/index.ts`의 legacy alias로 남겨, 필요한 경우 예전 room export와 복구 접근을 할 수 있게 했습니다.
- README에 기본 `meeting` 배포와 git push가 `airever`/`scmax` Durable Object room의 로고·문구·운영 preset 저장값을 바꾸지 않는 조건을 정리했습니다.

### airever/scmax 동시 운영 반영

- `event-configs/2026_06_AIBD_REVERSE.json`와 `event-configs/2026_06_SCMAX_REVERSE.json`을 Worker 번들에 추가하고, `airever`/`scmax` room의 활성 기본 설정으로 연결했습니다.
- `SCMAX_REVERSE` 설정의 room 메타데이터, wall 세션, 팀 편집 키를 운영 audit 기준에 맞춰 보정했습니다.
- `event-configs/2026_06_scmax.json`을 추가해 `scmax` 행사 preset을 Q&A/퀴즈 중심 운영 포맷으로 준비했습니다.
- Worker 번들 초기 설정과 관리자 preset manifest에 `scmax` room을 등록했습니다. `scmax.axgroup.workers.dev`는 `ARENA_ROOM_NAME=scmax` Durable Object room을 기준으로 운영합니다.
- `airever`와 `scmax` 모두 최신 Vibe Arena 로고, favicon, theme pack, `/message` 상단 바 정렬 개선을 적용할 수 있도록 같은 배포 흐름에 올렸습니다.
- `npm run ops:audit:scmax`를 추가해 `scmax` 설정만 따로 점검할 수 있게 했습니다.
- 운영 콘텐츠의 이미지 경로 입력에서 `event-brand/scmax_logo.jpg`, `public/event-brand/scmax_logo.jpg` 같은 공개 asset 경로를 `/event-brand/scmax_logo.jpg`로 정리하도록 개선했습니다.
- `public/event-brand/scmax_logo.png`를 `scmax` preset의 상단 브랜드 로고와 팀 로고 경로로 연결했습니다.
- JPG/PNG 파일 업로드 시 파일 헤더로 실제 이미지 MIME을 보정하고, base64 변환/압축 진행 상태와 실패 메시지를 운영 콘텐츠 화면에 즉시 표시하도록 개선했습니다.

### 운영 콘텐츠 저장과 송출 가독성

- `/admin?panel=teams`에서 내 PC 보관 또는 운영 preset을 `불러와 적용`한 뒤 이름을 비워 저장하면, 새 이름을 강제로 만들지 않고 확인 후 같은 항목을 덮어쓰도록 정리했습니다.
- 운영 preset 덮어쓰기는 같은 `ARENA_ROOM_NAME` Durable Object room 안에서 기존 preset ID를 유지하고 `updatedAt`만 갱신합니다.
- 배포 preset, 과거 preset, 업로드 파일은 읽기 전용 출처로 다루며, 저장 시 내 PC 보관 또는 운영 preset으로 별도 항목을 만들게 했습니다.
- `/wall`/Showup의 응원 메시지와 Q&A 카드 본문 색상, 글자 두께, 반투명 말풍선 배경을 조정해 밝은 테마와 stage 테마 모두에서 메시지 가독성을 높였습니다.

## 2026-06-08

### Vibe Arena 로고와 테마팩

- `$imagegen`으로 Vibe Arena 플랫폼 로고를 새로 만들고 `public/event-brand/vibe-arena-logo.png`, `public/event-brand/vibe-arena-logo-web.png`에 배치했습니다.
- 브라우저 favicon과 앱 아이콘을 새 로고 기반 PNG로 교체하고, 문서 title을 `Vibe Arena` 기준으로 정리했습니다.
- 운영 설정의 화면 테마 선택지를 18개 theme pack으로 확장했습니다. `light`, `pastel`, `stage` 세 표면 CSS를 공유하면서 LG 브루탈 파스텔, 수채화, 운영 콘솔, 송출 스테이지 계열을 선택할 수 있습니다.
- `/message`와 `/wall`의 Q&A/퀴즈/응원 메시지 색상 토큰을 정리해 파스텔 계열 테마에서도 보낸 질문, 카운터, 읽음/수정 배지가 같은 톤으로 보이도록 조정했습니다.
- `DESIGN.md`에 theme pack 운영 규칙과 `/vote`, `/message`, `/wall`, `/admin` 동시 audit 기준을 추가했습니다.

### 다중 행사 운영과 설정 관리

- `event-configs/`에 해커톤 본선, 1분기 모임, 2분기 모임, 특별 세션처럼 서로 다른 기능 조합의 행사 preset을 정리했습니다.
- `event-configs/2026_06_airever.json`을 추가해 `airever` 행사 preset을 Q&A/퀴즈 중심 운영 포맷으로 준비했습니다. 이 preset은 `airever.axgroup.workers.dev`와 `ARENA_ROOM_NAME=airever` 운영을 기준으로 합니다.
- `$imagegen`으로 생성한 AI/BD 로고를 `public/event-brand/ai-bd-reverse-reporting-logo.png`에 배치하고, 새 행사 preset의 앱 로고와 팀 로고로 연결했습니다.
- 각 행사 설정에 `event.features`, Worker/room/settingsFile 메타데이터를 두고, Worker 번들 초기 설정과 관리자 preset 목록에서 함께 활용하도록 맞췄습니다.
- `npm run ops:audit:all`을 추가해 모든 `event-configs/*.json`의 기능 조합, wall 세션, 팀 수, 퀴즈 수, 팀 사진 표시값, inline media, 팀 편집 키, HTTP 이미지 URL을 정적으로 검사합니다.
- Q2 설정은 기존 운영 URL 유지를 위해 `workerName=meeting`, `roomName=2026-ax-q2-meeting` 조합을 유지하며, audit에서는 추적성 WARN으로 표시합니다.

### 관리자 운영 콘솔과 백업

- `/admin` 운영 규칙 안내에 현재 Worker, 현재 DB room, settings 권장 room, reset/export 경계를 표시했습니다.
- `/admin?panel=export`에 행사 요약, 현재 DB room, 참여자/팀 수, 별/메시지 수를 표시하고 JSON 백업, XLSX 저장, settings 저장 버튼을 한 곳에 배치했습니다.
- `/admin?panel=teams`에 `새 저장 이름`, `내 PC에 보관`, `운영 preset 등록`을 두어 브라우저 전용 초안과 같은 DB room 관리자 공유 preset을 분리했습니다.
- 운영 preset은 현재 `ARENA_ROOM_NAME` Durable Object storage에 저장되며 다른 관리자 PC의 드롭다운에도 `운영 · ...` 항목으로 표시됩니다.
- 보관 설정 삭제 버튼과 room mismatch 안내를 함께 두어, 빠른 재사용과 실제 DB 반영 흐름을 분리했습니다.
- 운영 설정에 화면 테마 드롭다운과 글씨체 드롭다운을 추가해 `기본 밝은 테마`, `브루탈리즘 파스텔 Yellow`, `어두운 송출 테마`와 `Vibe Arena`, `Gowun Dodum`, `시스템 기본` 글씨체를 선택할 수 있게 했습니다.
- README와 AGENTS에 `ARENA_ROOM_NAME`을 행사 DB room으로 보는 운영 규칙, reset 범위, preset 적용 범위, 행사 종료 백업 순서를 정리했습니다.
- 관리자 passcode 설정과 변경 방법을 `ADMIN_PASSCODE` 환경변수/Cloudflare secret 기준으로 문서화했습니다.

### 운영 콘텐츠 편집 편의성

- 운영 콘텐츠 팀 사진 편집 프리뷰를 실제 `/wall` 선택 팀 카드 구조와 맞추고, `송출 기본`, `16:9`, `4:3`, `전체보기`, `초점 초기화` 조작을 추가했습니다.
- 화면별 문구 관리에 live preview를 추가해 `/vote`, `/admin`, `/wall`, Q&A, Showup, Quiz 문구가 어느 화면에서 어떻게 보이는지 저장 전 확인할 수 있게 했습니다.
- 문구 프리뷰는 입력 중인 draft를 즉시 반영하고 `{starBudget}`, `{maxStarsPerTeam}` 같은 운영 변수는 예시값으로 치환합니다.

### 검증

- `npm run lint`, `npm run build`, `npm run ops:audit:all`을 통과했습니다.
- 로컬 Node 서버에서 Q2 설정과 `ADMIN_PASSCODE`를 사용해 `/api/health`, `npm run ops:audit:ax-q2`, `/admin?panel=teams`, `/admin?panel=export`, `/wall`, 모바일 `/message`를 확인했습니다.
- Chrome Playwright 검증에서 관리자 문구 프리뷰 7개 렌더링, 입력 즉시 반영, `/message` 모바일 가로 overflow 없음, `/wall` Q&A/퀴즈 전환, console error/warning 없음을 확인했습니다.
- 검증 중 생성된 로컬 테스트 상태는 `/api/reset`으로 정리했습니다.

### 배포/운영 runbook

- `docs/DEPLOYMENT_AND_OPERATIONS_RUNBOOK.md`를 추가해 기본 배포, 행사별 Worker/room 분리 배포, 새 행사 preset 추가, 배포 후 smoke test, rollback, reset, export, 저장 실패, 송출 버벅임, 이전 행사 DB export 대응 명령어를 정리했습니다.

### 운영 가이드와 소개 덱

- `/help` 운영 가이드 페이지를 추가하고 `/admin` 상단 내비게이션과 필수 관리 작업 카드에서 바로 열 수 있게 했습니다.
- `app_introduction/remotion-deck`에 앱 구조, DB room 규칙, 관리자 콘솔, 배포, 운영 점검, 문제 상황 대응, 마감 백업을 설명하는 Remotion 소개 덱을 정리했습니다.
- 운영 가이드와 Remotion 덱의 문구를 긍정형 운영 문장으로 정리하고, 대조형·금지형 설명을 운영 순서와 확인 기준으로 바꿨습니다.

## 2026-06-07

### Vibe Arena repo rename

- GitHub repository를 `Infant83/hackathon-vote-arena`에서 `Infant83/vibe-arena`로 rename했습니다.
- local `origin` remote를 `https://github.com/Infant83/vibe-arena.git`로 갱신했습니다.
- Cloudflare Worker 운영 URL `https://meeting.axgroup.workers.dev`는 rename 전후 `/api/health`, `/message`, `/wall`에서 HTTP 200 응답을 확인했습니다.
- npm package name과 브라우저 title의 작업공간 표기를 `vibe-arena`로 정리하고, 현재 구현을 상위 `Vibe Arena` 플랫폼 관점으로 정리한 `docs/VIBE_ARENA_REORIENTATION_2026-06-07.md`를 추가했습니다.
- 운영 콘텐츠 백업 표준 파일명을 `settings.json`으로 정리하고, 기존 `team_info.json`/`team_infos.zip`은 업로드 호환용으로 유지했습니다.
- 관리자 화면이 `public/prev_settings/settings_manifest.json`에 등록된 과거/사전 설정 파일을 불러올 수 있도록 준비했습니다.
- 관리자 preset 목록이 로컬 `event-configs/*.json`, Worker 번들 행사 설정, `public/prev_settings` 공개 preset을 함께 표시하도록 통합했습니다.
- 행사 설정에 `event` 메타데이터를 추가하고, 관리자 화면에서 현재 DB room과 preset 권장 room을 함께 표시해 room mismatch 시 확인 후 적용하도록 했습니다.
- README/AGENTS에 `event slug = Worker name = ARENA_ROOM_NAME = event.roomName` 운영 규칙, reset/export/preset 경계를 정리하고 관리자 화면에 행사 운영 규칙 안내 패널을 추가했습니다.
- `/admin` 기본 화면을 실시간 현황판에서 운영 대시보드로 재구성해, 실시간 별 현황/별 이벤트 피드/응원 메시지 본문은 제거하고 필수 관리 작업, wall 세션, 데이터 상태, 백업/초기화, 운영 설정을 중심으로 배치했습니다.

## 2026-06-05

### Q&A/퀴즈 라우팅과 읽음 관리

- 참가자용 `/quiz` route를 추가하고, 퀴즈가 열리면 `/message` 참가자를 `/quiz`로 자동 전환하도록 정리했습니다.
- 퀴즈가 종료되거나 idle 상태가 되면 `/quiz`는 다시 `/message`로 복귀합니다.
- `/vote`는 투표/응원/행운권 관련 wall 세션이 열려 있을 때만 관객 투표 화면으로 접근하게 하고, Q&A/퀴즈만 열린 행사에서는 안내 화면으로 막도록 했습니다.
- 알 수 없는 extensionless 경로가 `/vote`로 fallback되던 문제를 막아, 로컬 Node 서버와 Cloudflare Worker 모두 알려진 앱 route나 정적 파일만 서빙하도록 변경했습니다.
- Cloudflare Assets의 SPA fallback보다 Worker route guard가 먼저 실행되도록 `assets.run_worker_first`를 전체 경로로 확장했습니다.
- Q&A wall 질문 카드와 확대 카드에 읽음/안읽음 토글을 추가해, 클릭으로 읽힌 질문도 다시 안읽음 상태로 돌릴 수 있게 했습니다.
- `/admin` 메시지 관리 상세 화면에 Q&A 질문 읽음 관리 섹션을 추가해 질문별 읽음/안읽음 상태를 운영자가 직접 바꿀 수 있게 했습니다.
- `npm run lint`, `npm run build`가 통과했고, 로컬 Node 서버에서 `/message`, `/quiz` idle 복귀, `/aa` 404 응답을 확인했습니다.

## 2026-06-04

### Cloudflare workers.dev 도메인 변경

- Cloudflare 계정 workers.dev 서브도메인 변경에 맞춰 운영 Worker 이름을 `hack`에서 `meeting`으로 변경했습니다.
- 운영 주소를 `https://meeting.axgroup.workers.dev`로 전환하기 위해 `wrangler.jsonc`의 `name`을 `meeting`으로 갱신했습니다.
- README의 라이브 접속 주소, 배포 확인 URL, deployments/rollback CLI 예시, 운영 audit URL을 새 도메인 기준으로 정리했습니다.
- `ARENA_ROOM_NAME=2026-ax-q2-meeting`은 유지해 이번 AX Q&A 행사 room 분리는 그대로 보존합니다.

### 운영 데이터와 배포 점검

- 운영 중 수집된 Q&A 질문은 배포 파일이 아니라 Cloudflare Durable Object `ARENA_ROOM_NAME=2026-ax-q2-meeting` room의 storage snapshot에 저장되므로, 같은 Worker/room으로 코드와 정적 assets만 재배포하면 기존 질문은 유지됩니다.
- README에 `/api/reset`, `/api/question/reset`, 관리자 `Q&A reset`, Worker 이름, Durable Object binding/class, `ARENA_ROOM_NAME` 변경이 운영 데이터에 영향을 줄 수 있음을 명시했습니다.
- `git push` 후 Cloudflare deployment가 자동 생성되는 것은 확인되지 않았고, 현재 운영 반영은 수동 `wrangler deploy` 기준임을 README에 기록했습니다.

### Cloudflare Git Build lockfile 수정

- Cloudflare Git Build의 `npm ci` 단계에서 `@emnapi/runtime@1.10.0`, `@emnapi/core@1.10.0`이 lockfile에 없다는 이유로 실패하던 문제를 수정했습니다.
- Cloudflare build 환경과 맞추기 위해 `npm@10.9.2 install --package-lock-only`로 `package-lock.json`을 재생성했고, 같은 npm 버전의 `npm ci`가 통과하는지 확인했습니다.

## 2026-06-03

### 2026 AX 그룹 2분기 모임 Q&A 전환

- 이번 행사 기본 운영 모드를 해커톤 투표 중심에서 `2026 AX 그룹 2분기 모임` Q&A/퀴즈 중심으로 전환했습니다.
- 참가자 진입 화면을 `/message`로 분리하고, 이름/ID/소속 대신 별명만 입력해 Q&A 방에 입장하도록 변경했습니다.
- `/message` 상단 행사명은 `2026 AX 그룹 2분기 모임`으로, 방 이름은 `AX Group QnA`로 표시하도록 정리했습니다.
- 참가자가 보낸 질문 이력을 화면 아래에 간단히 남기고, 보낸 질문을 다시 열어보거나 수정/삭제할 수 있게 했습니다.
- 읽힌 질문이 수정되면 `수정됨` 표시를 붙이고 읽음 상태를 다시 해제해, 발표자가 변경된 질문을 놓치지 않도록 했습니다.
- 퀴즈 세션이 열리면 `/message` 화면도 자동으로 퀴즈 화면으로 전환되고, 퀴즈가 끝나거나 Q&A로 돌아오면 질문 입력 화면으로 복귀하도록 했습니다.

### Q&A wall과 워드클라우드

- `/wall`에 Q&A board를 추가해 질문 카드가 질문 길이에 따라 다른 크기로 자연스럽게 쌓이도록 했습니다.
- 질문 카드를 클릭하면 가운데 큰 카드로 열리고, 긴 질문은 모달 안에서 스크롤로 전체 내용을 볼 수 있게 했습니다.
- 질문 카드의 `Q` 마크, matte 색감, 반투명 glow, 읽음/미읽음 테두리 차이를 조정해 발표장 화면에서 새 질문이 더 잘 구분되도록 했습니다.
- Q&A empty state 문구를 `아직 질문이 없습니다. 무엇이 궁금하신가요?`로 바꾸고, 질문이 없을 때 화면 중앙에 안정적으로 배치했습니다.
- 질문 텍스트 기반 워드클라우드를 AI cloud 형태로 추가하고, 단어를 클릭하면 관련 질문만 필터링하도록 했습니다.
- 워드클라우드는 `d3-cloud`를 lazy import해 브라우저에서 계산합니다. 서버나 Durable Object가 매 질문마다 layout을 계산하지 않으므로 Cloudflare CPU 부담을 늘리지 않습니다.
- 한국어 질문에서 조사, 어미, 기능어를 최대한 제외하고 명사/주제어 중심으로 보이도록 정규화 규칙을 추가했습니다.
- 워드클라우드 단어와 배경이 아주 약하게 함께 움직이도록 해 발표장 화면의 실시간감을 살렸습니다.

### 관리자 운영과 행사별 설정

- `/admin`에서 wall에 표시할 세션을 선택할 수 있게 했고, 이번 행사 기본값은 `Q&A`, `퀴즈`만 열도록 설정했습니다.
- wall 상단 상태 정보는 열린 세션과 연결되도록 정리했습니다. 실시간 현황을 숨기면 누적 별/응원 메시지 지표도 의미 없이 표시하지 않습니다.
- Q&A wall 글자 크기(`qnaWallFontScale`)를 관리자 운영 설정에서 조정할 수 있게 했습니다.
- `/admin`에 Q&A reset 버튼을 추가해 행사 리허설 후 질문만 빠르게 초기화할 수 있게 했습니다.
- `event-configs/2026_ax_group_q2_meeting.json`을 추가해 이번 행사 문구, wall 세션, 퀴즈, Q&A 설정을 `teams.json`과 분리했습니다.
- Cloudflare Worker는 `ARENA_ROOM_NAME=2026-ax-q2-meeting`일 때 위 행사 JSON을 초기 설정으로 번들링하고, Durable Object room도 이전 행사와 분리합니다.
- 운영 전후 점검용 `scripts/ops-audit.mjs`와 `npm run ops:audit:ax-q2`를 추가했습니다.

### 배포와 검증

- Cloudflare Worker `hack`을 `https://hack.infant83.workers.dev`에 배포했습니다.
- 배포 시점의 git 커밋은 `f710b41 feat: prepare AX QnA event deployment`입니다.
- `ADMIN_PASSCODE` Cloudflare secret 존재를 확인했고, 배포 후 protected ops audit 로그인도 통과했습니다.
- 배포 후 `/api/health`에서 runtime `cloudflare-workers`, room `2026-ax-q2-meeting`, admin passcode configured 상태를 확인했습니다.
- 배포 후 `/message`, `/wall`, `/admin` route가 모두 HTTP 200으로 응답하는지 확인했습니다.
- `npm run lint`, `npm run build`, `npm audit --omit=dev`, `npx wrangler deploy --dry-run`, Cloudflare 대상 `npm run ops:audit:ax-q2`가 모두 통과했습니다.

## 2026-05-24

### Cloudflare workers.dev 서빙 주소 이전

- Cloudflare 계정 workers.dev 서브도메인을 `lgdisplay`에서 `infant83`로 전환했습니다.
- Worker `hack`의 `workers_dev` 라우팅을 활성화해 운영 주소를 `https://hack.infant83.workers.dev`로 서빙하도록 변경했습니다.
- Durable Object 바인딩과 Worker 이름은 유지해 기존 운영 데이터 저장소를 그대로 사용하도록 했습니다.

### 관객 등록 화면 문구 정리

- 관객 화면 상단 행사명에서 `LGD` 문구를 제거해 `2026 상반기 AX Hackathon`으로 표시하도록 운영 copy와 기본 `teams.json`을 맞췄습니다.
- `/vote` 등록 화면의 `Let's ID` 표기를 `ID`로 줄이고, 기본 예시를 `홍길동`, `gd.hong`, `AI연구1팀`으로 변경했습니다.

## 2026-05-23

### Cloudflare 실시간 안정화와 데이터 백업

- Cloudflare Observability에서 `2026-05-21 14:12-14:36 KST` 구간 오류를 재확인하고, 주요 원인을 `/vote` 사용자의 동시 상태 조회와 SSE 재연결이 단일 Durable Object에 몰린 현상으로 정리했습니다.
- `/vote` 화면은 SSE 연결이 정상일 때 15초마다 전체 상태를 다시 조회하지 않도록 변경했습니다.
- SSE 연결이 끊긴 사용자만 fallback polling으로 복구하도록 바꿔, 정상 사용자의 반복 `/api/state?role=vote` 요청을 줄였습니다.
- `/events?role=vote` 연결은 기본적으로 `media=slim` 상태를 사용해 큰 로고/상품 이미지를 반복 전송하지 않도록 했습니다.
- 퀴즈 답변 제출 시 제출자 본인은 POST 응답으로 즉시 결과를 받고, 모든 관객에게 매 답변마다 전체 상태를 broadcast하지 않도록 정리했습니다.
- 퀴즈 phase가 실제로 바뀌는 경우에는 관객 화면으로 상태를 broadcast해 퀴즈 출제, 확인, 마감 흐름의 즉시성을 유지했습니다.
- 공개 응원 메시지 과거 조회용 `/api/cheers` API를 추가했습니다. `/vote`에서는 팀별 과거 메시지를 페이지 단위로 더 볼 수 있고, live 상태 payload에는 최근 메시지만 유지합니다.
- 상태 응답에 `cheerTotalCount`와 `visibleCheerTotalCount`를 추가해, 화면에는 최근 메시지만 보여도 전체 응원 메시지 규모를 잃지 않게 했습니다.
- 관리자 인증이 된 환경에서 원본 보관용 `/api/export` JSON을 받을 수 있게 했습니다. 이 export에는 팀 설정, 참가자, 응원 메시지, 퀴즈 답변, 퀴즈 정답자, 당첨 이력, 별 이동 이벤트, 운영 설정이 포함됩니다.
- 로컬 Node 서버와 Cloudflare Worker가 같은 `/api/cheers`, `/api/export`, slim SSE 정책을 쓰도록 맞췄습니다.

### 공개 저장소용 데이터 익명화

- 레포의 `teams.json`에 들어 있던 실명, 소속, 프로젝트명, 외부 사진 URL을 익명 개발 샘플 값으로 치환했습니다.
- JSON 구조, 팀 내부 ID, 팀 편집 키, 색상, 정렬, 이미지 프레임 설정은 그대로 유지해 운영 콘텐츠 관리 기능과 테스트 흐름이 깨지지 않게 했습니다.
- 운영 중 Cloudflare Durable Object storage에 저장된 실제 팀 정보와 레포의 익명 샘플 JSON이 다를 수 있다는 점을 README에 명시했습니다.

### 문서 정리

- README에 현재 실시간 통신 정책, Durable Object storage 저장 위치, `/api/cheers` 과거 응원 조회, `/api/export` 원본 데이터 백업, 운영 후 데이터 보존 절차를 추가했습니다.
- README의 Cloudflare 비용/운영 규모 설명을 예전 15초 polling 중심 설명에서 SSE 우선 구조와 slim payload 기준으로 갱신했습니다.

## 2026-05-21

### 퀴즈 정답 확인 딜레이 운영

- 퀴즈 출제 후 사회자가 문제를 읽는 동안 정답 후보를 먼저 모아두는 `퀴즈 정답 확인 딜레이시간(최초)` 설정을 `/admin` 운영 설정에 추가했습니다.
- 기본 초기 딜레이는 20초이며, 초기 딜레이 중에도 정답/오답 제출은 계속 받되 정답자는 확정하지 않고 후보로 보관합니다.
- `/admin` 퀴즈 운영 창에 `정답 확인 모드 전환` 버튼을 추가해, 사회자가 문제를 다 읽으면 초기 딜레이를 건너뛰고 기존 3초 보정 판정으로 바로 넘어갈 수 있게 했습니다.
- 초기 딜레이가 끝난 뒤에는 기존처럼 보정 제출시각, 서버 도착시각, 답변 ID 순으로 선착순 정답자를 확정합니다.

### 실시간 응원과 퀴즈 다중 정답

- `/vote` 관객 화면도 공개 응원 메시지 변경을 SSE로 즉시 받아, 다른 참가자가 보낸 새 응원 메시지가 polling 대기 없이 반영되도록 했습니다.
- 퀴즈 선착순 인원이 2명 이상일 때 1등 확정 이후에도 남은 정답자 자리를 계속 채우도록 수정했습니다.
- 이미 확정된 정답자 순위는 유지하고, 같은 참가자가 같은 문제의 여러 선착순 순위에 중복으로 들어가지 않도록 했습니다.
- 추가 정답자가 도착하면 해당 정답자를 기준으로 다시 짧은 확인 시간을 둔 뒤, 남은 순위 안에서 확정하도록 Node 서버와 Cloudflare Worker 로직을 맞췄습니다.

### 행운권 추첨 진행 상태

- `/admin` 또는 `/wall` 행운권 화면에서 추첨 룰을 바꾸면 이전 당첨자 패널을 지우고 추첨 대기 상태로 돌아가도록 했습니다.
- 행운권 추첨룰 10/11로 `공개 응원 메시지 3개 이상 참여자`와 `공개 응원 메시지 5개 이상 참여자`를 추가했습니다. 기본 선발 인원은 각각 2명, 1명입니다.
- 행운권 당첨자 카드에서 `외 N개 메시지` 요약을 클릭하면, 해당 참가자가 남긴 응원 팀과 메시지 목록을 스크롤로 펼쳐 볼 수 있게 했습니다.
- 추첨 결과 화면의 후보 수는 이미 당첨자를 제외하고 다시 계산한 값이 아니라, 해당 추첨 당시 실제 후보 수를 유지해 보여주도록 정리했습니다.
- `/admin`과 `/wall` 행운권 화면에서 추첨 룰, 선발 인원, 상품을 현장에서 조합해 고를 수 있게 했습니다.
- START/STOP과 실제 당첨 기록은 현재 stage에 선택된 선발 인원과 상품명/상품 이미지를 그대로 사용하도록 Node 서버와 Cloudflare Worker를 맞췄습니다.
- 추첨 결과가 열린 뒤 같은 룰에서 선발 인원이나 상품만 바꿔도 이전 당첨자 패널을 지우고 대기 상태로 돌아가도록 했습니다.
- 닫힌 행운권 Showup을 다시 열 때 직전 당첨 결과가 새 팝업처럼 다시 보이지 않도록, 새 stage 진입 시 이전 결과를 비우도록 했습니다.
- Cloudflare Durable Object 저장 snapshot에서 큰 inline 이미지를 별도 storage key로 분리해 저장하도록 보강했습니다. 운영 중 로고/상품 이미지가 커져도 `SQLITE_TOOBIG` 오류로 상태 저장이 막히지 않게 하기 위한 안정화입니다.

## 2026-05-20

### 관리자 인증과 퀴즈 답변 제한

- `/admin` 진입은 로컬과 운영 환경 모두에서 `ADMIN_PASSCODE` 로그인을 요구하도록 강화했습니다. passcode가 설정되지 않은 환경에서는 관리자 화면이 열리지 않고 설정 안내를 표시합니다.
- 퀴즈 답변 제출 기회를 문제당 기본 3회로 낮추고, 관리자가 `/admin` 운영 설정에서 `퀴즈 답변 시도 제한` 값을 조정할 수 있게 했습니다.
- `/admin` 퀴즈 운영 창에서도 운영 콘텐츠 관리와 같이 `추가 인정 답`을 편집할 수 있게 하고, `*10*`, `*10만*` 같은 포함 패턴을 Node/Cloudflare 정답 판정에 반영했습니다.
- Node 실시간 서버와 Cloudflare Worker가 같은 답변 제한/관리자 인증 규칙을 사용하도록 맞췄습니다.
- 반복 SSE/polling 상태에서 큰 inline 이미지와 불필요한 참여자 전체 데이터를 줄여 `/vote` 반응 payload를 가볍게 유지하도록 보강했습니다.

### 행운권 룰과 송출 검수

- 행운권 추첨 룰별 선발 인원을 운영 콘텐츠 관리에서 설정할 수 있게 했고, 기본값은 공개 응원 메시지 참여자 3명, 나머지 룰 1명으로 맞췄습니다.
- `/admin` 또는 `/wall`에서 행운권 화면이 열린 상태로 `퀴즈` 버튼을 눌러도 전역 행운권 상태를 종료하고 `/wall`이 바로 퀴즈 대기 화면으로 전환되도록 확인했습니다.
- 가장 긴 응원 메시지 룰이 후보를 놓치지 않도록 참여자별 최장 메시지 길이를 서버/Worker 상태 생성과 후보 필터 양쪽에서 같은 방식으로 계산하게 했습니다.
- 행운권 우측 상품 패널과 다중 당첨자 카드가 발표장 화면에서 잘리지 않도록 public 송출 레이아웃을 다시 조정했습니다.
- 모든 행운권 룰의 후보 필터를 synthetic API 데이터로 확인해 각 룰이 기대 후보를 1명 이상 선별하는지 검증했습니다.

## 2026-05-19

### 행운권과 참여자 관리

- 행운권 추첨에서 이미 당첨된 참여자는 다음 추첨 후보에서 제외하도록 했습니다.
- `/admin` 행운권 관리와 `/wall` 행운권 송출 화면을 같은 전역 행운권 상태로 연결해, 한쪽에서 행운권 화면을 열거나 룰/START/STOP을 바꾸면 다른 화면도 즉시 따라가도록 했습니다.
- 공개 응원 메시지 개수와 총 글자수가 많은 참여자의 당첨 확률을 완만하게 높이는 가중 추첨을 추가하고, 관리자 운영 설정에서 가중치(`0`-`1`, 기본 `0.2`)를 조절할 수 있게 했습니다.
- 행운권 송출 화면의 로또볼 기계를 더 크게 보이게 하고, 당첨자 카드에 이름이 한 글자씩 박히는 강조 애니메이션과 상품 배지를 추가했습니다.
- 행운권 우측 패널은 후보 전체 명단 대신 후보 수와 상품 이미지를 더 크게 보여주도록 정리했습니다.
- 행운권 룰에서 `7·8·9·10위 중 3팀 이상` 조건을 제거하고, `7·8·9위 팀 모두에게 응원 메시지를 보낸 참여자`와 `10위 팀에게 응원 메시지를 보낸 참여자` 룰로 분리했습니다.
- 행운권 로또볼은 실제 후보만 공으로 표시하도록 바꾸고, 선택한 추첨 조건은 시작 전에도 우측 패널에서 바로 보이도록 했습니다.
- 행운권 추첨 조건의 화면 표시 문구를 운영 콘텐츠 관리에서 수정할 수 있게 했고, `최대 별` 조건은 현재 팀당 최대 별 설정과 자동으로 맞물리도록 했습니다.
- `/wall` 퀴즈 화면에서 `행운권추첨` 버튼을 눌러도 퀴즈 패널에 고정되던 문제를 수정하고, 행운권 송출 화면의 로또볼/트로피/결과 트레이가 프레임 밖으로 밀리지 않도록 높이 기준 레이아웃을 조정했습니다.
- 실참여자 전체 리스트에 키워드 검색, 팀별 필터, 상태 필터(실참여/응모 완료/행운권 당첨자/퀴즈 정답자)를 추가했습니다.
- `/vote`의 `내 수상 이력`을 `내 당첨 이력`으로 바꾸고, 행운권 항목은 순위 대신 `행운권 당첨`으로 표시하도록 정리했습니다.
- 당첨 선물 전달 안내 문구를 운영 콘텐츠 관리에서 수정할 수 있게 했습니다.

### 운영 콘텐츠 저장과 실시간 성능

- 운영 콘텐츠 전체 저장 시 이미 서버/Cloudflare에 저장되어 있는 inline 이미지는 다시 payload에 싣지 않고 기존 값을 보존하도록 해, 사내망 GET 우회 저장 payload를 크게 줄였습니다.
- `/api/state?media=slim`을 추가하고, `/vote`와 `/wall`의 반복 polling 및 SSE broadcast에서는 큰 inline 이미지를 생략한 상태를 보내도록 조정했습니다.
- 클라이언트는 slim 상태에서 생략된 로고/상품 이미지를 직전 full 상태에서 보존해, 화면은 유지하면서 별/응원/퀴즈 반응 payload를 줄입니다.
- 팀 정보/이미지 저장처럼 미디어가 실제로 바뀌는 경우에는 full media 상태를 한 번 방송해 열린 `/wall`과 `/vote`에도 변경 이미지를 즉시 반영합니다.

### 퀴즈 정답 확정

- 퀴즈 최초 정답 도착 후 3초 동안 `정답 확인 중...` 상태를 두고, 그 사이 들어온 정답도 계속 접수한 뒤 보정 제출시각 기준으로 선착순 정답자를 확정하도록 변경했습니다.
- `정답 확인 중...` 상태를 `/vote`, `/admin`, `/wall`에 함께 표시하고, 확인 중에도 답변 제출이 계속 가능하다는 안내를 명확히 했습니다.
- `/vote`에서 정답 확정 후에도 `정답 후보입니다. 최종 정답 확인 중...` feedback이 남던 문제를 수정했습니다.
- 정답자가 확정된 뒤에도 관리자가 퀴즈를 마감하기 전까지 후속 답변을 계속 받아 `/wall` 답변 스트림에 보여주도록 했습니다.
- `/wall` 정답 팝업을 크게 키우고, 닫기/바깥 클릭/드래그 이동이 가능한 떠 있는 카드로 바꿨습니다.
- 500명 규모 부하를 고려해 상태 생성 시 참여자별 응원 메시지 수와 팀별 별 합계를 한 번만 집계하도록 Node/Cloudflare `getState()` 경로를 줄였습니다.

### 화면 문구와 투표 카드

- `/wall` 상단의 `말풍선 Showup` 문구를 `말풍선`으로 줄이고, 별도 `응원메세지` 버튼은 제거했습니다.
- `/vote` 팀 카드에서 팀명/프로젝트명을 펼친 영역에서 다시 반복하지 않고, 팀원/소속 정보는 카드 제목 아래 작은 글씨로 보여주도록 정리했습니다.
- 팀명은 각 팀의 고유 색을 반영해 표시하고, 한국어 문구가 글자 단위로 잘리지 않도록 줄바꿈 규칙을 보정했습니다.
- 운영 콘텐츠 관리 상단에 `브랜드/상품 이미지`, `행운권 관련`, `화면 문구 관리`, `팀별 정보`, `퀴즈` 섹션 바로가기 버튼을 추가했습니다.
- 퀴즈 편집 카드에 `제거` 버튼을 추가해 잘못 추가한 퀴즈를 운영 콘텐츠 관리에서 삭제할 수 있게 했습니다.
- `/wall` 실시간 현황에서 긴 프로젝트명이 행 하단을 밀어 화면 밖으로 잘리지 않도록 발표장 목록의 줄바꿈을 안정화했습니다.

## 2026-05-16

### 재진입과 수상 이력

- `/vote`에서 입력 중인 이름/Let's ID만으로 기존 참여자를 즉시 매칭하지 않고, 같은 브라우저 device ID이거나 명시적으로 등록/복원한 뒤에만 참여자로 확정하도록 변경했습니다.
- 행운권 당첨과 퀴즈 정답 기록을 `awardHistory`로 저장하고, 사용자 화면에 `내 수상 이력` 패널로 표시하도록 추가했습니다.
- 재진입 시 과거 당첨 팝업은 다시 띄우지 않고, 현재 접속 중 새로 발생한 행운권/퀴즈 당첨만 팝업으로 알리도록 조정했습니다.
- `/vote`의 `★` 문자를 붉은 별 색상으로 강조하고, 응원 메시지 입력 영역과 전송 버튼을 더 명확하게 다듬었습니다.
- 관객 송출보드의 공개 응원 메시지 카드에서는 시간 표시를 숨기고, 관리자/내 화면/내보내기 시간 정보는 유지했습니다.
- 브라우저 탭 제목에 현재 진입 화면을 드러내도록 `/vote`, `/wall/quiz`, `/admin/quiz` 같은 경로 정보를 반영했습니다.
- 모바일 `/vote`에서 입력 focus 시 자동 확대와 가로 overflow가 생기지 않도록 viewport와 작은 화면 CSS를 조정했습니다.
- `/vote` 팀 카드에 새 응원 메시지 미확인 수 뱃지를 추가하고, 다른 관객의 이름은 익명 처리했습니다.
- 로컬 서버 재시작 후에도 첫 진입 화면이 흰색으로 뜨지 않도록 기본 테마와 초기 HTML 테마를 stage/dark 기준으로 맞췄습니다.
- `/wall`의 `퀴즈`와 `/admin`의 `퀴즈 운영`을 같은 전역 퀴즈 상태로 연결해 한쪽에서 준비/종료하면 다른 화면도 자동 전환되도록 했습니다.
- `답변 마감`은 현재 문제를 끝내고 다시 `퀴즈를 준비 중입니다` 대기 화면으로 돌아가도록 변경했습니다.
- 운영 콘텐츠 관리에서 팀별 송출 하단 사진 프레임의 가로/세로/확대/초점을 조정할 수 있게 하고, 와이드 사진이 실시간 현황 팀명과 겹치지 않도록 좌측 목록 슬롯을 정렬했습니다.
- 운영 콘텐츠 관리창을 화면에 더 넓게 펼치고, 팀 사진 미리보기를 보면서 작은 로고와 송출 하단 와이드 사진 프레임을 각각 조정할 수 있도록 편집 패널을 재배치했습니다.
- 팀 사진 미리보기에서 직접 드래그로 초점과 프레임 크기를 조절할 수 있게 하고, 저장 시 이미 열린 `/wall` 화면에도 와이드 사진 프레임 변경이 즉시 반영되도록 확인했습니다.
- Cloudflare 운영 콘텐츠 저장 흐름에 반영 버전과 저장 시각을 추가해, 팀명/사진/문구 저장이 Durable Object 운영 상태에 실제로 들어갔는지 화면에서 확인할 수 있게 했습니다.
- 운영 콘텐츠 저장 시 Google Drive/원격 이미지 주소를 먼저 정리하고, Cloudflare API 응답은 캐시하지 않도록 맞춰 열린 `/wall`과 `/vote` 화면이 최신 팀 설정을 받도록 보강했습니다.
- 팀명/사진 같은 운영 콘텐츠를 저장해도 직전 행운권 추첨 결과가 사라지지 않도록 저장 부작용을 줄였습니다.
- 관리자 상단에 `인증 확인`과 `로그아웃` 버튼을 추가해 오래된 관리자 세션을 즉시 갱신하거나 다시 로그인할 수 있게 했습니다.
- `/vote` 상단 Live 표시 옆에 `Logout`을 배치하고, 본문 안의 `다른 참여자` 버튼은 제거했습니다.
- 참여자가 한 팀에 줄 수 있는 별의 기본 최대값을 5개로 낮추고, 관리자가 운영 설정에서 팀당 최대 별 개수를 조정할 수 있게 했습니다.
- 운영 콘텐츠 저장 화면에 현재 저장 대상이 로컬 Node 서버인지 Cloudflare 운영 저장소인지 표시하고, Cloudflare 저장 실패 시 관리자 인증/네트워크/대용량 원인을 구분해 안내하도록 했습니다.
- 특정 사내망에서 Cloudflare 저장 POST가 403으로 막히는 경우를 별도 안내해, 모바일/외부망 저장 또는 JSON 백업 경로를 바로 선택할 수 있게 했습니다.
- Cloudflare 저장 POST가 403으로 거절될 때 관리자 인증이 유지된 압축 GET 저장 경로를 자동으로 재시도해, POST만 막는 사내망에서도 즉시 반영될 수 있게 했습니다.
- Cloudflare 운영 본체 Worker를 Durable Object가 붙어 있는 `hack`으로 고정하고, 기존 `lgdhack` 주소는 같은 운영 상태로 프록시하는 호환 Worker로 분리했습니다.
- Cloudflare 계정 서브도메인을 `lgdisplay`로 전환하고, 기존 `lgdhack` 호환 Worker를 삭제해 운영 주소를 `https://hack.lgdisplay.workers.dev`로 단일화했습니다.
- 운영 콘텐츠 관리에서 행사 데이터 연결에 쓰이는 팀 내부 ID는 읽기 전용으로 두고, 팀별 직접 편집 링크에 쓰는 `팀 편집 키`를 별도 수정 항목으로 분리했습니다.
- 팀/퀴즈 ID 입력 중 카드가 다시 렌더링되며 한 글자마다 포커스가 끊기던 문제를 수정했습니다.
- 퀴즈 정답자 수가 마감된 뒤 들어온 늦은 답변은 네트워크 오류가 아니라 `정답자 선정이 마감되었습니다` 안내로 처리하도록 Node/Cloudflare API 응답을 맞췄습니다.
- 표시용 응원 메시지는 최근 120개만 내려주되, 서버/Cloudflare 내부에는 최대 5000개까지 보존해 500명 규모에서도 행운권 후보가 누락되지 않도록 했습니다.

## 2026-05-15

### 관리자 접근 보호

- `ADMIN_PASSCODE` 기반 관리자 로그인 화면을 추가했습니다.
- passcode가 설정된 환경에서는 관리자 전용 API와 `/events?role=admin` SSE 연결이 인증 쿠키 없이는 동작하지 않도록 했습니다.
- Node realtime harness와 Cloudflare Worker에서 같은 보호 규칙을 사용하도록 맞췄습니다.
- README와 운영 전 체크리스트에 로컬/Cloudflare passcode 설정 절차를 추가했습니다.

### 퀴즈 실시간 반영

- `/vote` 관객 화면도 filtered SSE를 열어 퀴즈 준비, 출제, 정답, 종료 상태를 즉시 받을 수 있게 했습니다.
- 별 이동과 일반 응원 흐름은 관객에게 전체 broadcast하지 않고, 15초 polling fallback과 POST 응답 갱신을 유지합니다.
- Node realtime harness와 Cloudflare Worker의 SSE broadcast를 `vote`, `wall`, `admin` 역할 기준으로 분리했습니다.
- stage 테마에서 퀴즈 정답 팝업 대비를 높이고, 정답자 스택과 오답/기타 답변 스트림을 분리했습니다.
- 퀴즈 답변 스트림과 관객 송출보드 팀 사진 패널의 하단 여백과 이미지 맞춤을 조정했습니다.

## 2026-05-12

### 회의 피드백 반영

- 사용자 등록 용어를 `소속`에서 `Let's ID`로 변경했습니다.
- Let's ID 입력값에 사내 이메일을 넣어도 `@` 뒤 도메인은 제외하고 ID만 사용하도록 했습니다.
- 같은 이름과 같은 Let's ID가 다른 기기에서 접속하면 같은 참여자로 묶고, 새 device ID를 같은 참여자에 추가하도록 변경했습니다.
- 참가자별 기본 별 개수를 10개로 변경했습니다.
- 점수 환산식을 1등 10점, 최하위 관리자 설정 점수, 중간 팀은 득표수 기준 선형 배분 방식으로 변경했습니다.
- 관리자 운영 설정에서 최하위 환산점수를 바꿀 수 있게 했습니다.
- `/vote`는 SSE를 사용하지 않고 15초 polling과 POST 응답 갱신으로 동기화하도록 변경했습니다.
- `/admin`과 Showup 화면은 실시간 SSE를 유지합니다.
- 관객 송출용 `/wall` 화면을 추가했습니다.
  - 실시간 별 현황
  - 최근 응원 메시지
  - 팀별 응원 메시지 필터
  - 말풍선 Showup 바로 열기
- `/wall`에서는 심사용 환산점수와 실시간 투표자 이름을 노출하지 않도록 했습니다.
- README와 TODO를 새 운영 정책 기준으로 갱신했습니다.

## 2026-05-10

### Cloudflare 배포 체계

- Cloudflare Worker 이름을 `hack`으로 정리했습니다.
- 현재 라이브 주소를 `https://hack.lgdisplay.workers.dev`로 맞췄습니다.
- React 정적 파일은 Workers Static Assets로 제공하고, 실시간 상태는 Durable Object `ArenaRoom`이 담당하도록 구성했습니다.
- GitHub repository `Infant83/hackathon-vote-arena`와 Cloudflare Git Build를 연결했습니다.
- production branch를 `cloudflare-migration`으로 설정했습니다.
- Git Build 설정 기준을 정리했습니다.
  - Build command: `npm run build`
  - Deploy command: `npx wrangler deploy`
  - Root directory: `/`
- Cloudflare Git Build가 `npm@10.9.2`를 사용한다는 점을 확인했고, 그 기준으로 `package-lock.json`을 재생성했습니다.
- `@emnapi/core`, `@emnapi/runtime` 누락으로 `npm ci`가 실패하던 문제를 해결했습니다.

### 사용자 투표 화면

- 사용자 화면과 관리자 화면의 역할을 분리했습니다.
- 사용자 화면에서 관리자 진입 버튼을 제거했습니다.
- 사용자는 최초 접속 시 이름과 소속을 등록하도록 했습니다.
- 이름과 소속은 cookie/localStorage에 저장되어 재접속 시 기존 참여 내역을 이어갑니다.
- 기본 별 개수를 20개로 변경했습니다.
- 한 팀에 줄 수 있는 최대 별을 10개로 제한했습니다.
- 팀별 별 선택 UI를 응원 풀 방식에서 직접 별 클릭 방식으로 단순화했습니다.
- 별을 준 팀에만 응원 메시지를 보낼 수 있도록 했습니다.
- Enter로 응원 메시지를 전송할 수 있게 했습니다.
- 최근 응원 메시지가 채팅처럼 아래에 추가되고, 메시지 영역은 스크롤되도록 조정했습니다.
- 별을 모두 회수할 때 해당 팀에 작성한 내 응원 메시지가 삭제된다는 확인 메시지를 추가했습니다.
- 상단 안내 카드에 경품 추첨 자동응모 조건을 더 명확히 표시했습니다.
- 안내 카드 배경 이미지를 추가하고, 별 지갑이 반응형으로 줄바꿈되도록 수정했습니다.
- 배경 이미지 위에서 남은 별과 사용한 별이 잘 보이도록 별 아이콘에 짙은 외곽선을 추가했습니다.

### 관리자 화면

- 관리자 실시간 현황에서 팀별 별 수, 참여자 수, 점유율, 환산점수를 볼 수 있게 했습니다.
- 점유율 100%를 10점으로 normalize한 환산점수를 표시했습니다.
- 팀 행 hover 패널에 팀원 정보를 표시했습니다.
- hover 패널이 뒤에 가려지거나 잘리는 문제를 개선했습니다.
- 순위 변경 시 위/아래 방향 표시를 추가했습니다.
- 관리자 운영 설정에서 참여자별 총 별 개수와 투표 타이머를 설정할 수 있게 했습니다.
- 투표 마감/재개, Reset, 테스트 데이터 주입 기능을 추가했습니다.
- 실참여자 리스트 패널을 추가했습니다.
- 메시지 관리 패널을 추가했습니다.
- 메시지를 키워드로 필터링하고, 필터 결과를 일괄 숨김/공개/삭제할 수 있게 했습니다.
- 메시지가 숨김 또는 삭제되어 응모 조건을 잃으면 사용자에게 조건 미충족 상태가 보이도록 했습니다.
- 행운권 추첨 패널과 Showup 패널을 개선했습니다.
- 추첨 결과에 이름과 소속을 같이 표시했습니다.
- 추첨 결과 발표 시 confetti와 gift-agent 시각 효과를 추가했습니다.

### 팀 정보 관리

- 관리자 화면에 `팀 정보` 패널을 추가했습니다.
- 앱 제목, 관객/관리자 안내 문구, 등록 문구, 추첨 안내 문구를 관리자 화면에서 수정할 수 있게 했습니다.
- 팀명, 프로젝트명, 팀원, 팀 색상, 로고 경로, 기본 로고 스타일, 테스트 기본 별 수와 투표자 수를 편집할 수 있게 했습니다.
- `team_info.json` 단일 업로드를 지원했습니다.
- `team_infos.zip` 업로드를 지원했습니다.
- ZIP 내부 구조는 `team_infos/team_info.json`과 `team_infos/logos/`를 권장합니다.
- 로컬 Node 서버에서는 관리자 수정사항을 `teams.json`과 `public/team-logos/`에 저장합니다.
- Cloudflare Worker에서는 파일시스템을 쓸 수 없으므로 Durable Object storage에 팀 설정과 로고 data URL을 저장합니다.
- 관리자 화면에서 현재 설정을 `team_info.json`으로 다운로드할 수 있게 했습니다.

### 결과 내보내기

- 관리자 화면에 XLSX 결과 내보내기 버튼을 추가했습니다.
- 브라우저에서 직접 `.xlsx` 파일을 생성하도록 `fflate`를 추가했습니다.
- 내보내는 workbook에는 다음 시트가 포함됩니다.
  - `행사요약`
  - `팀별결과`
  - `참여자`
  - `응원메시지`
  - `추첨결과`
  - `별이벤트`

### 응원 메시지 Showup

- 팀별 영역을 random tessellation 느낌으로 나눠 표시했습니다.
- 영역 크기는 팀별 별 수에 비례하도록 했습니다.
- 메시지 버블은 클릭 전 작성자와 내용을 숨기고, 클릭 시 크게 열어 확인하도록 했습니다.
- 별을 많이 준 참여자의 버블이 더 크게 보이도록 했습니다.
- 한 사람이 같은 팀에 여러 메시지를 작성하면 하나의 버블 그룹으로 묶도록 했습니다.
- 사회자가 버블을 섞거나 드래그할 수 있게 했습니다.
- 버블과 팀 정보 라벨이 겹치지 않도록 배치 규칙을 개선했습니다.

### 중복 참여 방지

- 강한 개인정보 수집 없이 이름, 소속, 익명 브라우저 디바이스 ID 조합으로 동일인을 판단하도록 했습니다.
- 이름 비교 시 모든 띄어쓰기를 제거합니다.
- 소속 비교 시 띄어쓰기, 구두점, 기호를 제거하고 영문은 소문자로 비교합니다.
- 마지막 `team` suffix는 `팀`으로 정규화합니다.
- 사용자 화면 표기는 사용자가 입력한 값을 최대한 유지합니다.

### 문서

- `README.md`를 입문자용 실행/배포/운영 가이드로 재정리했습니다.
- `CHANGELOG.md`를 추가했습니다.
- `TODO.md`를 추가했습니다.

## 2026-05-09

### 프로젝트 배포 준비

- GitHub repository를 `Infant83/hackathon-vote-arena`로 연결했습니다.
- `.gitignore`를 정리했습니다.
- Cloudflare Worker 배포를 위한 `wrangler.jsonc`를 추가했습니다.
- `worker/index.ts`에 Cloudflare Worker와 Durable Object 기반 API를 구성했습니다.
- 기존 Node/SSE 서버의 API와 Cloudflare Worker API를 맞췄습니다.

### 디자인 방향

- LG Red를 포인트 컬러로 사용하고, 전체 배경은 흰색과 밝은 회색 중심으로 정리했습니다.
- 텍스트는 짙은 회색/검정 계열로 유지했습니다.
- 사용자 화면은 빠르게 조작 가능한 투표 도구로, 관리자 화면은 반복 확인이 가능한 운영 콘솔로 방향을 잡았습니다.

## 2026-05-08 이전

### 초기 MVP

- 관객 투표 시스템의 기본 React 화면을 구성했습니다.
- 팀 목록, 별 배분, 응원 메시지, 관리자 랭킹 화면의 기본 구조를 만들었습니다.
- Node 기반 실시간 SSE harness를 구성했습니다.
- 행운권 추첨 아이디어와 관리자 운영 흐름을 MVP에 반영했습니다.
