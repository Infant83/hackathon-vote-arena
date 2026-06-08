# Vibe Vote Arena Agent Guide

이 작업공간의 주된 목표는 사내 행사에서 사용할 **관객 투표, Q&A, 퀴즈, 응원 메시지, 행운권 추첨 운영 플랫폼**을 안정적으로 다듬는 것이다. 글쓰기 하네스나 리포트 작성 규칙은 `../AI_Tech_Review`에서 관리하고, 여기서는 행사 플랫폼 동작과 검증에 집중한다.

## Product Focus

현재 상위 제품은 `Vibe Arena`이고, 구현된 주요 모듈은 `Vibe Vote Arena`, Q&A/Quiz Arena, Ops Console이다.

- `/vote`: 관객 모바일/PC 투표 화면
- `/message`: 참가자 Q&A 입장과 질문 작성 화면
- `/quiz`: 참가자 퀴즈 답변 화면
- `/wall`: 발표장 송출 화면
- `/admin`: 관리자 PC용 운영 대시보드, 설정, 세션, 백업, 초기화, 콘텐츠/메시지/추첨 관리 화면
- `/admin?showCheer=1`: 발표장 화면에 띄우는 응원 메시지 Showup
- `/help`: `/admin`에서 여는 운영 가이드 페이지

핵심 경험은 다음과 같다.

1. 행사 preset은 `event-configs/*.json`에 저장하고, 실제 운영 DB는 배포 시 지정한 `ARENA_ROOM_NAME` room으로 분리한다.
2. Q&A/퀴즈 행사에서는 참가자가 `/message`에서 별명으로 입장하고, `/wall`은 Q&A와 Quiz 송출에 집중한다.
3. 해커톤 투표 행사에서는 관객이 `/vote`에서 이름/소속 또는 ID를 등록하고, 관리자가 정한 총 별 개수를 팀별로 나눠 보낸다.
4. 관객 화면에는 전체 순위와 팀별 총 별 수를 보여주지 않는다.
5. 관리자는 기본 `/admin`에서 설정, 세션, 백업, 초기화, 콘텐츠/메시지/추첨 관리 진입을 처리한다.
6. 실시간 별 현황, 별 이동 이벤트, 응원 메시지 본문은 기본 `/admin` 화면에 상시 노출하지 않고 상세 관리 패널이나 `/wall` 운영 화면에서 확인한다.
7. 운영 콘텐츠 편집은 저장 전 preview로 실제 화면 노출을 확인할 수 있어야 한다.
8. Showup 화면은 응원 버블을 시각적으로 보여주되, 클릭 전에는 작성자와 메시지를 숨긴다.

## Current Interaction Rules

- 한 참가자는 서버 기준으로 관리자가 정한 별 개수 한도까지만 사용할 수 있어야 한다.
- 한 참가자가 한 팀에 줄 수 있는 별은 기본 최대 5개이며, 관리자가 운영 설정에서 조정할 수 있다.
- 별은 한 팀에 몰아줄 수도 있고, 여러 팀에 나눠줄 수도 있다.
- 투표 마감 전에는 별을 회수하거나 재분배할 수 있다.
- 별 1개 이상 사용하고 응원 메시지를 작성하면 추첨 자동응모 조건을 만족한다.
- 별을 주지 않은 팀에는 응원 메시지를 보낼 수 없다.
- 응원 메시지는 Enter로 전송한다. Shift+Enter 확장은 필요할 때만 추가한다.
- 사용자 응원 스레드는 최근 메시지가 아래에 붙는 채팅형 UI로 유지한다.
- 관리자 메시지 관리에서 숨김 처리된 메시지는 일반 메시지 패널과 Showup 버블에서 제외한다.
- Showup 버블은 별 수가 클수록 커져야 한다. 한 사람이 여러 메시지를 쓰면 같은 버블 안에 묶는다.
- Showup 버블은 클릭 전에는 작성자와 메시지를 숨기고, 클릭 후에만 크게 열어 확인한다.
- Showup 버블은 각 팀 영역 안에서 움직여야 하며, 같은 팀 버블끼리는 가까워지되 겹치지 않게 배치한다.
- 사회자가 Showup에서 버블을 섞거나 드래그할 수 있어야 하며, 섞기 동작은 추첨 전 무작위성을 느낄 수 있을 만큼 빠르고 역동적이어야 한다.
- 관리자는 별 개수, 투표 타이머, 마감/재개, 초기화, 테스트 데이터 주입을 운영 콘솔에서 처리할 수 있어야 한다.
- 관리자 기본 대시보드는 관리 필수 정보만 보여준다. 실시간 순위/별 이벤트/응원 메시지 본문은 기본 화면에 다시 넣지 않는다.
- Q&A/퀴즈 중심 행사에서는 `/vote`가 기본 참가 화면이 아니며, vote/raffle/showup 세션이 닫혀 있으면 안내 화면으로 제한한다.
- 퀴즈가 열리면 `/message` 참가자는 `/quiz`로 전환되고, 퀴즈 종료 또는 Q&A 복귀 시 질문 입력 화면으로 돌아와야 한다.

## Visual Direction

`DESIGN.md`를 우선한다.

- LG Red는 포인트 색으로만 쓴다.
- 전체 배경은 흰색과 밝은 회색, 글자는 짙은 회색/검정 계열을 유지한다.
- 사용자 화면은 빠르게 이해되고 조작되는 투표 도구여야 한다.
- 관리자 화면은 반복 확인에 적합한 운영 콘솔이어야 한다.
- Showup 화면은 발표장 시각 효과이지만, 팀 정보와 클릭 후 메시지 가독성이 먼저다.
- 카드 안에 카드를 과하게 중첩하지 않는다.
- 모바일에서 텍스트와 별 버튼이 겹치지 않게 확인한다.

## Implementation Boundaries

- 실시간 공유 상태는 `server.mjs`의 Node/SSE 서버 기준으로 확인한다.
- Vite-only dev server는 기기 간 상태 공유 검증에 충분하지 않다.
- Cloudflare 운영에서 행사 DB는 `ARENA_ROOM_NAME`으로 선택되는 Durable Object instance로 본다. 운영 관점의 권장 규칙은 `event slug = Worker name = ARENA_ROOM_NAME = event.roomName`이다.
- 관리자 화면에서 `ARENA_ROOM_NAME`을 바꾸는 기능은 기본 범위에 넣지 않는다. DB room 변경은 `wrangler deploy --name ... --var ARENA_ROOM_NAME:...` 같은 배포 단계에서만 한다.
- 관리자 화면의 preset/settings `불러와 적용`은 현재 room에 선택한 설정을 반영한다. DB room 전환은 배포 환경변수 `ARENA_ROOM_NAME` 변경으로 처리한다.
- `/admin?panel=teams`의 `내 PC에 보관`은 현재 편집 draft를 관리자 브라우저 보관함에 저장한다. 다른 PC에는 표시되지 않는다.
- `/admin?panel=teams`의 `운영 preset 등록`은 현재 편집 draft를 현재 `ARENA_ROOM_NAME` Durable Object storage에 저장한다. 같은 DB room의 다른 관리자 PC에서도 `운영 · ...` preset으로 보인다. repo의 `event-configs/*.json`은 바꾸지 않는다.
- 다른 PC 이동, 행사 종료 보존, 코드 반영은 `settings.json 저장` 파일 백업을 기준으로 한다.
- 관리자 화면의 Reset은 현재 접속한 Worker가 가리키는 현재 DB room만 초기화한다. 다른 room이나 과거 행사 room을 건드리지 않는다.
- 행사 종료 보존은 `/api/export` 원본 JSON, 결과 XLSX, `settings.json`을 함께 내려받는 것을 기준으로 한다.
- 기존 행사 DB를 내려받을 때는 같은 Durable Object binding/class와 같은 `ARENA_ROOM_NAME`으로 임시 Worker를 띄워 `/api/export`만 수행하고 reset은 실행하지 않는다.
- `event-configs/`는 관리자 전용 preset과 Cloudflare 번들 초기 설정의 기준이다. 새 이벤트 JSON을 추가하면 `worker/index.ts`의 import, `initialConfigByRoomName`, `bundledEventConfigPresets`, `npm run ops:audit:all`을 함께 갱신한다.
- 화면 테마는 `light`, `pastel`, `stage`를 지원한다. 글씨체는 `vibe`, `soft`, `system`을 지원한다. 새 설정값을 추가하면 `src/App.tsx`, `server.mjs`, `worker/index.ts`, 행사 JSON을 같은 schema로 맞춘다.
- `airever` 행사는 `event-configs/2026_06_airever.json`, Worker `airever`, `ARENA_ROOM_NAME=airever` room을 기준으로 운영한다.
- `public/prev_settings/`는 공개 배포에 포함되는 샘플/과거 설정 보관함이다. 실명, 내부 소속, 비공개 사진, 민감한 상품 정보가 있는 파일은 여기에 두지 않는다.
- 관리자 비밀번호는 코드가 아니라 `ADMIN_PASSCODE` 환경변수 또는 Cloudflare secret으로 설정한다. passcode를 바꾸면 기존 관리자 쿠키는 무효가 되며 다시 로그인해야 한다.
- 운영 콘텐츠의 화면별 문구를 수정할 때는 오른쪽 preview가 실제 노출 화면을 대표해야 한다. 새 copy 필드를 추가하면 `copyGroups`, preview 컴포넌트, README 운영 콘텐츠 설명을 함께 갱신한다.
- 운영 가이드와 앱 소개 문구는 긍정형 기준문으로 쓴다. 대조형·금지형 설명은 운영 순서, 기준, 확인 항목을 말하는 문장으로 바꾼다.
- `/help` 내용을 바꾸면 `app_introduction/remotion-deck/src/deckData.ts`, `app_introduction/remotion-deck/deck.config.json`, `app_introduction/README.md`의 안내도 같은 기준으로 맞춘다.
- 운영 콘텐츠에서 팀 사진을 조정할 때는 작은 로고 프레임과 wall 선택 팀 카드의 와이드 사진 프레임을 구분한다. 사진 미리보기는 실제 `/wall` 선택 팀 카드와 같은 구조로 유지하고, 조정 후 `/wall`에서 최종 확인한다.
- 공개 `/api/state`, `/events`, `/vote`, `/wall` 응답에는 팀 `editKey` 같은 운영 편집 키를 노출하지 않는다. `/team/...` 편집 저장과 팀 설정 저장은 관리자 인증과 같은 출처 Origin/Referer 검증을 통과해야 한다.
- 관리자 변경 요청은 쿠키 인증만 믿지 않는다. 보호된 mutation은 same-origin 검증을 유지하고, 공개 참여 API에는 행사 room 단위의 쿨다운/rate limit을 둔다.
- 중복 응모 방지는 개인정보 수집을 낮추기 위해 `이름 + 소속(팀명) + 익명 브라우저 디바이스 id` 조합으로 동일인을 판단한다. 사번, 이메일, 사진, 카메라/QR 스캔, 강한 디바이스 fingerprint는 기본 흐름에 넣지 않는다.
- 테스트 데이터는 검증 후 `/api/reset`으로 초기화한다.
- 불필요한 LLM 호출 기능, prompt audition 기능, 대규모 모델 실행 흐름은 이 MVP 범위에 넣지 않는다.

## Verification Checklist

UI나 서버 동작을 바꾸면 기본적으로 아래를 확인한다.

```powershell
npm run lint
npm run build
npm run ops:audit:all
```

렌더링과 동작 확인:

- `node server.mjs` 또는 `npm run realtime`로 실제 서버를 띄운다.
- `/vote`에서 등록, 관리자 설정 별 개수 배분, 회수, Enter 메시지 전송을 확인한다.
- `/admin`에서 운영 대시보드, 필수 관리 작업, wall 세션, 백업/초기화, 별 개수/타이머 설정, 마감/재개를 확인한다.
- `/admin`에서 `/help` 운영 가이드 링크가 보이고 새 탭에서 열리는지 확인한다.
- `/admin` 기본 화면에 실시간 별 현황, 별 이벤트 피드, 응원 메시지 본문이 상시 노출되지 않는지 확인한다.
- `/admin?panel=messages`, `/admin?panel=participants`, `/admin?panel=teams`, `/admin?panel=quiz`, `/admin?panel=raffle`, `/admin?panel=export` 상세 관리 패널을 확인한다.
- `/admin?panel=teams`에서 화면별 문구 preview가 7개 그룹으로 보이고, textarea 수정이 preview에 즉시 반영되는지 확인한다.
- `/admin?panel=teams`에서 팀 사진 preview가 실제 `/wall` 선택 팀 카드 기준으로 보이고, 사진 preset/초점 조절이 layout을 깨지 않는지 확인한다.
- `/admin?panel=export`에서 원본 JSON, XLSX, settings 저장 버튼과 현재 DB room 요약을 확인한다.
- `/wall`에서 역할별 송출 세션을 확인한다.
- `/message` 모바일 390px 전후에서 별명 입장과 Q&A 입력 화면이 가로 overflow 없이 보이는지 확인한다.
- `/admin?showCheer=1`에서 버블이 라벨을 가리지 않는지, 클릭 전 정보가 숨겨지는지, 클릭 후 메시지가 크게 읽히는지 확인한다.
- 모바일 폭 390px 전후에서 `/vote` 등록과 팀별 별 조작을 확인한다.
- 브라우저 console warning/error를 확인한다.
- 검증 후 `/api/reset`으로 테스트 참가자와 메시지를 정리한다.

## Durable Notes

- 팀 로고 규격은 `README.md`의 Team Logo Intake를 따른다.
- 디자인 토큰과 컴포넌트 원칙은 `DESIGN.md`를 따른다.
- 배포, 행사별 Worker/room 분리, rollback, reset/export 대응은 `docs/DEPLOYMENT_AND_OPERATIONS_RUNBOOK.md`를 따른다.
- 행사 운영상 추가되는 인증, QR, 배포, 지속 저장소 요구사항은 `README.md`와 이 파일에 함께 반영한다.
- 운영 규칙이 바뀌면 관리자 화면 안내 메시지도 함께 갱신해, 문서와 실제 운영 UI가 같은 기준을 말하게 한다.
- 현재 작업의 장기 인수인계는 `memory-bank/active-context.md`에 남긴다. Codex 장기 memory 업데이트가 필요하다는 명시 요청이 있으면 `C:\Users\angpa\.codex\memories\extensions\ad_hoc\notes\`에 별도 update note를 추가한다.
