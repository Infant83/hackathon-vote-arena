# Vibe Vote Arena 운영 이슈 리포트

작성일: 2026-05-23  
대상 시스템: `https://hack.infant83.workers.dev`  
대상 범위: `/vote`, `/wall`, `/admin`, Cloudflare Worker `hack`, Durable Object `ArenaRoom`

## 1. 요약

행사 운영 중 확인된 주요 문제는 단일 원인 하나가 아니라, 실시간 행사 플랫폼 특유의 몇 가지 부하가 한 지점에 겹친 결과로 판단한다.

핵심 진단은 다음과 같다.

1. 관객 `/vote` 화면이 SSE 실시간 연결을 열어둔 상태에서도 주기적으로 전체 상태를 다시 조회하면서, 많은 관객이 동시에 접속하거나 퀴즈에 반응하는 순간 Durable Object 요청 큐가 밀렸다.
2. 퀴즈 답변 제출 시 모든 관객에게 전체 상태를 반복 broadcast하던 흐름이 있어, 정답 제출이 몰리는 순간 서버가 해야 하는 JSON 생성과 전송량이 크게 늘었다.
3. 로고, 상품 이미지, 트로피 이미지 같은 큰 inline media가 운영 상태 snapshot과 실시간 payload에 섞이면서 CPU, 메모리, 저장 payload 부담이 커졌다.
4. 응원 메시지는 화면 성능 때문에 최근 120개만 내려주도록 되어 있었으나, 사용자 입장에서는 전체 메시지가 120개만 있는 것처럼 보이는 문제가 있었다.
5. 퀴즈 정답 확인 로직은 공정성을 위해 지연 확정 방식을 넣었지만, 사회자 진행 타이밍과 맞지 않으면 "늦게 반응한다" 또는 "갑자기 정답자가 뜬다"는 느낌을 줄 수 있었다.
6. 행운권 추첨, 퀴즈, 실시간 현황 사이의 전역 stage 상태가 정리되지 않으면 닫았던 추첨 화면이 다시 열리거나 다른 화면으로 이동하지 못하는 문제가 있었다.

2026-05-23 기준으로 아래 개선을 적용했다.

- `/vote`는 SSE가 살아 있을 때 반복 polling을 하지 않도록 변경했다.
- SSE 오류가 발생한 사용자만 fallback polling으로 복구하도록 바꿨다.
- `/events?role=vote`는 `media=slim`을 사용해 큰 이미지를 반복 전송하지 않는다.
- 퀴즈 답변 제출은 제출자에게만 즉시 결과를 주고, 모든 관객에게 매 답변마다 전체 상태를 broadcast하지 않는다.
- 퀴즈 phase가 실제로 바뀌는 경우에는 관객 화면에 broadcast해 퀴즈 출제/확인/마감 즉시성을 유지한다.
- 큰 inline 이미지는 Durable Object snapshot에 직접 넣지 않고 별도 media storage key로 분리한다.
- 응원 메시지 과거 조회용 `/api/cheers`와 원본 백업용 `/api/export`를 추가했다.
- `teams.json`의 실명, 소속, 프로젝트명, 사진 URL은 공개 저장소용 익명 샘플로 치환했다.

## 2. 시스템 구조

운영 배포는 Cloudflare Workers Static Assets와 Durable Object를 함께 사용한다.

```text
Browser (/vote, /wall, /admin)
  -> Cloudflare Worker hack
  -> Durable Object ArenaRoom
  -> Durable Object storage
```

역할별 실시간 경로는 다음과 같다.

- `/vote`: 관객용 화면. SSE로 필수 상태를 받고, submit 결과는 POST 응답으로 즉시 받는다.
- `/wall`: 발표장 송출 화면. 실시간 현황, 응원 메시지, 퀴즈, 행운권 추첨 상태를 SSE로 받는다.
- `/admin`: 관리자 콘솔. 전체 운영 상태를 SSE로 받는다.
- `/api/state`: 현재 상태 조회.
- `/events`: SSE 상태 스트림.
- `/api/vote`: 별 투표 제출.
- `/api/cheer`: 응원 메시지 제출.
- `/api/quiz/answer`: 퀴즈 답변 제출.
- `/api/raffle/*`: 행운권 stage와 추첨 제어.
- `/api/cheers`: 과거 응원 메시지 페이지 조회.
- `/api/export`: 관리자 인증 기반 원본 JSON export.

운영 상태 저장 위치는 Cloudflare Durable Object storage다. 로컬 `npm run realtime`에서는 Node 프로세스 메모리에만 상태가 있고, 서버를 종료하면 행사 상태는 사라진다.

## 3. 주요 로그와 현상

### 3.1. Durable Object overload

확인된 메시지:

```text
Durable Object is overloaded. Requests queued for too long.
GET https://hack.lgdisplay.workers.dev/api/state?role=vote&media=slim
GET https://hack.lgdisplay.workers.dev/api/state?role=vote
POST https://hack.lgdisplay.workers.dev/api/quiz/answer
```

관찰된 시간대:

- 2026-05-21 14:31:45-14:31:47 KST: `/api/state?role=vote` 계열 요청이 짧은 시간에 몰림.
- 2026-05-21 15:37 KST: `POST /api/quiz/answer`, `GET /api/state?role=vote&media=slim`, Durable Object memory reset이 함께 관찰됨.
- 2026-05-21 15:59 KST: 퀴즈 답변 제출과 vote 상태 조회가 함께 몰리며 Durable Object queue overload가 반복됨.

진단:

- `ARENA_ROOM_NAME=default` 설정으로 모든 행사 요청이 하나의 Durable Object instance에 집중된다.
- Durable Object는 상태 일관성에는 유리하지만, 한 순간에 매우 많은 읽기/쓰기 요청이 들어오면 큐가 밀릴 수 있다.
- 기존 `/vote`는 SSE가 열려 있어도 반복 polling을 계속 수행했다. 관객 수가 많으면 단순 상태 조회만으로도 Durable Object에 큰 부하가 된다.
- 퀴즈 답변이 몰리는 순간 POST 쓰기 요청과 `/api/state` 읽기 요청이 같은 Durable Object queue에서 경쟁했다.

영향:

- 일부 관객 화면에서 반응이 늦게 느껴졌다.
- 일부 퀴즈 답변 제출이 503으로 실패했을 가능성이 있다.
- wall/admin 업데이트가 순간적으로 버벅이거나 늦게 반영될 수 있었다.

적용한 개선:

- `/vote`에서 SSE가 정상 연결된 동안 전체 상태 polling을 중지했다.
- SSE 오류가 난 브라우저만 fallback polling을 사용하도록 변경했다.
- fallback polling 주기를 30초 계열로 낮춰 전체 재시도 폭주를 줄였다.
- `/events?role=vote`에 `media=slim`을 적용했다.
- 퀴즈 답변 제출 시 모든 vote 사용자에게 전체 상태를 broadcast하지 않도록 했다.

추가 예방 과제:

- fallback polling에 25-45초 random jitter를 추가해 재연결 폭주를 더 줄인다.
- `/api/state?role=vote` 응답을 250-500ms 단위로 짧게 coalescing/caching해 동시 조회를 흡수한다.
- 관객 수가 500명 이상이고 퀴즈 답변이 동시에 몰릴 경우, quiz answer ingestion과 wall/admin state generation을 분리하는 구조를 검토한다.

### 3.2. Durable Object memory limit reset

확인된 메시지:

```text
Durable Object's isolate exceeded its memory limit and was reset.
```

진단:

- 큰 상태 객체를 반복 생성하고 JSON stringify하는 과정에서 메모리 사용량이 순간적으로 증가했을 가능성이 높다.
- 큰 inline image data URL이 상태 snapshot과 SSE payload에 포함되면, 한 번의 상태 생성이 매우 무거워진다.
- 많은 SSE client에게 각자 상태를 만들어 전송하면 동일한 큰 데이터가 반복 복제된다.

영향:

- Durable Object isolate reset 후 일시적으로 요청이 실패하거나, SSE 연결이 끊겼다가 재연결될 수 있다.
- 운영자에게는 화면이 순간적으로 멈추거나 새로고침되는 것처럼 보일 수 있다.

적용한 개선:

- `media=slim` 상태를 도입해 반복 상태 응답에서 큰 inline image를 제거했다.
- 브라우저는 직전 full state의 이미지를 보존하고, slim state에는 숫자/상태 변경만 반영한다.
- Durable Object snapshot 저장 시 큰 inline image를 `event-media-v1:*` storage key로 분리한다.
- 상태 생성 시 팀별 별 합계, 참여자별 응원 메시지 수를 한 번만 집계하도록 정리했다.

추가 예방 과제:

- broadcast 직전 payload byte size를 로그로 남긴다.
- SSE client 수, role별 client 수, state 생성 시간, stringify 시간을 observability에 남긴다.
- 이미지/상품 사진은 장기적으로 R2나 정적 asset URL 중심으로 운영하고, data URL은 임시 업로드 편의 기능으로 제한한다.

### 3.3. `cpu_ms` 관련 이슈

확인된 설정:

```json
"limits": {
  "cpu_ms": 300000
}
```

진단:

- 행사 당일 CPU limit 관련 문제는 `cpu_ms` 상향으로 완화되었다.
- 그러나 CPU limit 상향은 증상을 완화할 뿐, 상태 payload가 크고 요청이 몰리는 구조 자체를 해결하지 않는다.
- 실제 관찰된 overload는 CPU 시간 초과뿐 아니라 Durable Object queue overload, memory reset과 함께 발생했다.

영향:

- CPU limit만 올리면 특정 작업이 끝날 시간은 벌 수 있지만, 동시에 들어오는 요청을 더 많이 처리한다는 보장은 없다.
- 오히려 무거운 작업이 오래 살아남아 Durable Object queue가 더 오래 막힐 수도 있다.

적용한 개선:

- CPU 시간을 더 쓰게 하는 방향이 아니라, 반복 작업 자체를 줄이는 방향으로 수정했다.
- `/vote` 중복 polling 제거.
- 퀴즈 답변별 전체 관객 broadcast 제거.
- slim media payload 적용.
- 큰 inline media 분리 저장.

추가 예방 과제:

- `cpu_ms`는 운영 중 긴급 완화 옵션으로 유지하되, 정상 운영 목표는 낮은 CPU와 작은 payload로 둔다.
- 부하 테스트에서 `p95/p99` 응답 시간, 503 비율, Worker CPU time, DO queue 오류를 함께 본다.

### 3.4. `SQLITE_TOOBIG`

확인된 메시지:

```text
string or blob too big: SQLITE_TOOBIG
```

진단:

- Cloudflare Durable Object storage는 SQLite 기반 storage를 사용한다.
- 운영 콘텐츠 저장 시 로고, 상품 이미지, 트로피 이미지가 data URL 형태로 snapshot에 직접 들어가면 저장 blob이 너무 커질 수 있다.
- 이 경우 snapshot 저장 자체가 실패하고, 이후 상태 반영이나 행운권 stage 저장에도 영향을 줄 수 있다.

영향:

- 운영 콘텐츠 저장 실패.
- 행운권 stage 저장 실패.
- `/api/raffle/stage` 등 상태 변경 API가 500/503 오류로 보일 수 있음.

적용한 개선:

- snapshot 저장 전 큰 inline media를 탐지해 `event-media-v1:*` key로 분리 저장한다.
- snapshot에는 `__stored_media__:<hash>` 형태의 참조 token만 저장한다.
- load 시에는 token을 실제 media 값으로 복원한다.
- 이미 존재하는 inline media는 반복 저장 payload에 다시 싣지 않도록 했다.

추가 예방 과제:

- 운영 콘텐츠 관리 UI에서 data URL 이미지 크기 경고를 보여준다.
- 상품/팀 사진은 가능한 URL asset 또는 압축 이미지로 관리한다.
- `/api/export`에서도 media 포함 여부를 선택할 수 있게 한다.

### 3.5. `_cf_METADATA.key is prohibited: SQLITE_AUTH`

확인된 메시지:

```text
SQL Execution Error: Error: access to _cf_METADATA.key is prohibited: SQLITE_AUTH
```

진단:

- 현재 `worker/index.ts`와 `server.mjs`에는 `_cf_METADATA` 또는 직접 SQL query를 호출하는 코드가 없다.
- 따라서 이 오류는 애플리케이션 코드가 직접 `_cf_METADATA`를 조회해서 발생했다기보다는, Cloudflare Durable Object SQLite storage 내부/관측 계층/특정 storage operation 과정에서 발생했을 가능성이 높다.
- 단, 정확한 원인을 확정하려면 해당 시점의 request path, request body 유무, 직전/직후 storage operation 로그가 필요하다.

영향:

- 단발성이라면 운영 영향은 제한적일 수 있다.
- 특정 storage list/get/put 흐름과 반복적으로 연결된다면 상태 저장 또는 복원 실패로 이어질 수 있다.

적용한 개선:

- 직접 SQL을 쓰지 않는 현재 구조를 유지한다.
- 큰 media 분리 저장으로 storage operation 크기를 줄였다.
- export와 state payload를 분리해 불필요한 storage pressure를 줄였다.

추가 예방 과제:

- 동일 오류가 다시 발생하면 해당 request path와 Cloudflare `requestId`를 기준으로 전후 10초 로그를 확인한다.
- `state.storage.list({ prefix: mediaStoragePrefix })` 등 storage list 호출 직후에만 반복되는지 확인한다.
- 재현 가능하면 Cloudflare support 또는 platform issue로 분리한다.

### 3.6. 응원 메시지 120개 표시 제한

현상:

- wall과 vote에서 응원 메시지가 120개까지만 보이는 문제가 있었다.
- 운영자는 전체 메시지가 120개만 저장된 것인지, 화면에만 120개 보이는 것인지 구분하기 어려웠다.

진단:

- live state payload를 줄이기 위해 `cheers.slice(0, 120)` 방식으로 최근 120개만 상태 응답에 실었다.
- 이 자체는 성능상 필요한 제한이지만, 전체 개수와 과거 조회 경로가 없으면 데이터 유실처럼 보인다.

영향:

- 행사 후 응원 메시지 전체 확인이 어렵다고 느껴질 수 있다.
- 과거 메시지가 행운권 후보 조건에 들어갔는지 검증하기 어렵다.

적용한 개선:

- 상태 응답에 `cheerTotalCount`, `visibleCheerTotalCount`를 추가했다.
- `/api/cheers`를 추가해 팀별/전체 과거 메시지를 페이지 단위로 조회할 수 있게 했다.
- `/api/export`에 서버가 보관 중인 `cheers` 배열을 포함했다.

남은 한계:

- 현재 서버 내부 보관 한도는 최대 5000개다.
- 전사 행사에서 메시지를 장기 보존해야 한다면 Durable Object snapshot만으로는 충분하지 않다.

추가 예방 과제:

- 행사 종료 직후 `/api/export` JSON과 XLSX를 반드시 다운로드한다.
- 장기적으로 D1/R2 또는 별도 append-only log로 모든 응원 메시지와 퀴즈 답변을 영구 저장한다.

### 3.7. 퀴즈 정답 확인 지연과 선착순 판정

현상:

- 최초 정답 도착 후 20초 초기 확인 딜레이가 있을 때, 사회자가 문제를 다 읽기 전까지 정답자가 확정되지 않는 것은 의도된 동작이었다.
- 다만 운영 중에는 20초 뒤 즉시 발표되지 않거나, 뒤늦게 정답자가 갑자기 뜨는 것처럼 보일 수 있었다.
- 선착순 2명 이상인 문제에서 1등 이후의 정답자가 사용자 화면에서 충분히 축하받지 못하거나 리스트 반영이 늦는 문제가 있었다.

진단:

- 공정성을 위해 `clientSubmittedAt`, 서버 수신 시각, 보정 제출시각을 함께 고려했다.
- 최초 정답 후보 도착 후 일정 시간 동안 늦게 도착한 더 빠른 제출을 기다리는 방식은 네트워크 차이를 완화하지만, 운영자는 지연으로 느낄 수 있다.
- 초기 20초 딜레이와 이후 3초 보정 판정이 겹치면 진행자가 체감하는 로직이 복잡해진다.
- 선착순 N명 로직에서 1등 확정 이후 남은 slot을 계속 채우는 절차가 충분히 명확하지 않았다.

영향:

- 퀴즈 운영 흐름이 끊기는 느낌.
- 정답 후보자가 본인 화면에서 상태를 오래 기다리는 느낌.
- 2등/3등 정답자가 1등처럼 확실히 안내받지 못하는 UX.

적용한 개선:

- 초기 정답 확인 딜레이를 관리자 설정값으로 분리했다.
- 기본 초기 딜레이는 20초로 두고, 사회자가 문제를 다 읽으면 `정답 확인 모드 전환`으로 즉시 3초 보정 판정에 들어갈 수 있게 했다.
- 답변 제출 제한은 기본 3회로 낮추고 관리자 설정으로 변경 가능하게 했다.
- 정답자가 확정된 뒤에도 퀴즈 마감 전까지 후속 답변은 계속 받아 wall에 보여주도록 했다.
- 선착순 slot이 남아 있으면 1등 확정 이후에도 추가 정답자를 계속 확정하도록 수정했다.
- 같은 참가자가 같은 문제에서 여러 선착순 순위를 차지하지 않도록 막았다.
- `/vote`, `/admin`, `/wall`에 `정답 확인 중...` 상태를 표시했다.

남은 한계:

- 현재 `/api/export`는 현재 퀴즈 라운드의 `quiz.answers` 중심이다. 모든 라운드의 전체 답변을 영구 보존하려면 별도 `quizAnswerHistory` 또는 append-only archive가 필요하다.
- 클라이언트 제출시각은 사용자 기기 시간에 영향을 받으므로 완전한 공정성 기준으로 쓰기 어렵다. 현재는 서버 수신 시각과 보정 offset을 함께 고려하는 완화책이다.

추가 예방 과제:

- 퀴즈 답변 전체 이력을 라운드별로 append-only 저장한다.
- 관리자 화면에 `초기 딜레이 남은 시간`, `3초 보정 판정 남은 시간`, `현재 후보 수`, `확정 대기 slot`을 명확히 보여준다.
- 운영자 리허설에서 "문제 읽기 중", "정답 확인 모드 전환", "답변 마감" 버튼 타이밍을 표준화한다.

### 3.8. 행운권 추첨 stage 고착

현상:

- 관리자가 행운권 추첨 창을 닫아도 wall에서 계속 행운권 showup이 뜨는 경우가 있었다.
- wall에서 실시간 현황이나 퀴즈로 이동하려 해도 다른 화면에서 행운권 stage를 잡고 있으면 다시 행운권 화면으로 돌아오는 느낌이 있었다.
- 직전 당첨자가 행운권 showup 진입 시 다시 팝업되는 것처럼 보였다.

진단:

- 행운권 stage는 admin과 wall이 공유하는 전역 상태다.
- 닫기/전환/룰 변경 시 `active`, `drawing`, `lastRaffle`, stage winner payload를 모두 정리해야 한다.
- 일부 경로에서는 UI 화면만 이동하고 전역 stage 상태는 남아 있었다.

영향:

- 운영자가 원하는 화면 전환이 즉시 되지 않음.
- 관객 송출 화면에 이전 당첨 결과가 다시 노출될 수 있음.

적용한 개선:

- 행운권 화면에서 다른 운영 화면으로 이동할 때 전역 stage를 닫도록 정리했다.
- 룰, 선발 인원, 상품을 바꾸면 이전 당첨자 패널을 지우고 대기 상태로 돌아가게 했다.
- 행운권 추첨 이력 초기화와 퀴즈 이력 초기화 기능을 관리자 흐름에 추가했다.
- admin과 wall의 행운권 구도를 맞추고, 관리자는 룰을 알 수 있지만 관객은 시작 전 조건 노출을 제한하는 방향으로 정리했다.

추가 예방 과제:

- stage 상태 전환을 state machine으로 문서화한다.
- `idle -> staged -> drawing -> revealed -> closed` 외 경로를 금지한다.
- 모든 navigation button이 stage close side effect를 갖는지 테스트한다.

### 3.9. 운영 콘텐츠 저장 실패와 사내망 제약

현상:

- 운영 콘텐츠 관리에서 저장 시 `403`, `400`, "관리자 인증 또는 네트워크 상태 확인" 메시지가 나타났다.
- 모바일/외부망에서는 저장이 되고, 사내망에서는 실패하는 경우가 있었다.

진단:

- Cloudflare 운영 저장은 로컬 파일을 고치는 것이 아니라 Cloudflare Worker/DO에 직접 저장하는 구조다.
- 사내망 보안 장비가 POST, 큰 payload, 특정 Cloudflare 요청을 차단할 수 있다.
- 이미지 data URL이 큰 경우 payload가 커져 실패 가능성이 높아진다.

영향:

- 현장 PC에서 팀 정보/문구 수정 후 저장되지 않는 것처럼 보임.
- 운영 콘텐츠 반영 여부를 확신하기 어려움.

적용한 개선:

- 저장 완료 시각과 config revision을 표시했다.
- POST 실패 시 압축 GET 저장 경로를 한 번 더 시도하도록 했다.
- 기존 inline image를 반복 payload에 싣지 않도록 줄였다.
- 관리자 인증 확인/로그아웃 버튼을 추가했다.
- Cloudflare 저장소와 로컬 JSON 저장 경로를 문서화했다.

추가 예방 과제:

- 행사 전 최종 운영 콘텐츠는 가능한 외부망에서 미리 반영한다.
- 현장에서는 문구/룰 정도만 수정하고, 대용량 이미지 교체는 피한다.
- 저장 후 `/wall`과 `/vote`에서 config revision이 반영되는지 확인한다.

## 4. 현재 적용된 개선 요약

| 영역 | 문제 | 개선 |
| --- | --- | --- |
| 트래픽 | vote 전체 상태 polling 중복 | SSE 정상 시 polling 중단, 오류 시 fallback |
| Payload | 큰 이미지 반복 전송 | `media=slim`, 브라우저 기존 이미지 보존 |
| 저장 | 큰 inline media로 `SQLITE_TOOBIG` | media storage key 분리 |
| 퀴즈 | 답변마다 전체 관객 broadcast | 제출자 POST 응답 중심, phase 변화만 audience broadcast |
| 퀴즈 | 초기 딜레이 체감 혼란 | 20초 초기 딜레이 설정 + `정답 확인 모드 전환` |
| 퀴즈 | 선착순 2명 이상 처리 | 남은 slot 계속 확정, 중복 순위 방지 |
| 응원 | 120개만 보이는 문제 | total count, `/api/cheers`, `/api/export` |
| 행운권 | stage 고착 | close/navigation/rule change 시 stage reset |
| 운영 저장 | 사내망 POST/대용량 실패 | 압축 GET fallback, media 반복 payload 제거 |
| 공개 데이터 | 실명/사진 포함 | `teams.json` 익명화 |

## 5. 남은 리스크와 우선순위

### P0: 행사 운영 안정성

1. 퀴즈 답변과 응원 메시지의 append-only archive를 추가한다.
   - 현재 `/api/export`는 현재 상태 중심이다.
   - 모든 퀴즈 라운드의 전체 답변과 모든 응원 메시지를 행사 후 감사 가능한 형태로 남기려면 별도 history 저장이 필요하다.
2. fallback polling에 random jitter를 넣는다.
   - SSE 장애나 네트워크 재연결이 동시에 발생할 때 재시도 폭주를 줄인다.
3. `/api/state` 짧은 캐시/coalescing을 적용한다.
   - 같은 role의 동시 상태 조회를 하나의 상태 생성으로 묶는다.
4. Cloudflare Observability용 structured log를 추가한다.
   - request path, role, client count, payload bytes, state build ms, persist ms, broadcast target count.

### P1: 데이터 보존과 운영 회고

1. `/api/export`를 화면 버튼으로 노출하거나, 관리자 export 패널에서 JSON 다운로드를 추가한다.
2. export 파일에 schema version을 넣는다.
3. `cheers`, `quizAnswers`, `awardHistory`, `voteEvents`를 CSV로도 내려받게 한다.
4. 운영 종료 체크리스트에 JSON/XLSX 다운로드를 필수 단계로 넣는다.

### P2: 구조 개선

1. 단일 Durable Object 병목을 줄이기 위한 분리 구조를 검토한다.
   - control DO: admin/wall/quiz/raffle state
   - ingest path: vote/cheer/quiz answer write queue
   - archive store: D1/R2 append-only log
2. 이미지 asset은 data URL보다 R2 또는 정적 asset URL 중심으로 전환한다.
3. stage 상태를 명시적 finite state machine으로 구현한다.

## 6. 운영 예방 체크리스트

행사 전:

1. Cloudflare Dashboard에서 최근 배포 버전과 Observability 오류 수를 확인한다.
2. `/admin`, `/wall`, `/vote`를 열고 SSE 연결 상태를 확인한다.
3. 30명 리허설에서 투표, 응원, 퀴즈, 행운권을 한 번씩 실행한다.
4. 100명 이상 리허설에서는 `/api/state`, `/api/quiz/answer`, `Durable Object is overloaded` 로그를 본다.
5. 운영 콘텐츠 저장은 외부망 또는 안정된 네트워크에서 미리 완료한다.
6. Reset 후 팀 정보/문구/퀴즈/상품 설정이 유지되는지 확인한다.
7. 긴급 롤백할 안정 버전 ID를 기록한다.

행사 중:

1. 사용하지 않는 `/vote`, `/admin`, `/wall`, Showup 탭은 닫는다.
2. 퀴즈 출제 후 사회자가 문제를 다 읽으면 `정답 확인 모드 전환`을 눌러 진행 감각을 맞춘다.
3. 행운권 화면에서 다른 화면으로 갈 때는 닫기 또는 전환 버튼으로 stage를 정리한다.
4. Observability에서 503, Durable Object overload, memory reset이 급증하는지 본다.
5. 오류가 급증하면 새 기능을 계속 조작하지 말고, 현재 화면을 안정화한 뒤 롤백 여부를 판단한다.

행사 후:

1. `/api/export` JSON을 다운로드한다.
2. 결과 XLSX를 다운로드한다.
3. Cloudflare 운영 상태에서 최종 팀 정보 JSON을 내려받는다.
4. 공개 저장소에 반영할 때는 실명, 소속, 사진 URL을 익명화한다.
5. Observability 로그에서 오류 시간대와 진행 순서를 비교해 다음 행사 개선 항목을 남긴다.

## 7. 결론

이번 장애성 로그의 핵심은 "Cloudflare가 약해서"라기보다, 행사형 실시간 앱에서 흔히 발생하는 fan-out, polling, 큰 payload, 단일 상태 객체 병목이 동시에 나타난 것이다. CPU limit 상향은 필요한 응급 처치였지만, 근본 개선은 요청 수와 payload 크기를 줄이고, 상태 broadcast 범위를 역할별로 나누는 방향이다.

현재 적용한 수정은 사용자 경험을 크게 포기하지 않는다. 관객은 퀴즈 출제, 당첨 이력, 공개 응원 메시지를 계속 실시간으로 받는다. 대신 모든 관객에게 매 이벤트마다 전체 상태를 다시 보내던 과한 실시간성을 줄였다. 이 방향은 안정성, 비용, 반응성 모두에 유리하다.

남은 핵심 과제는 모든 이벤트를 감사 가능한 append-only archive로 남기는 것이다. 이 부분까지 정리되면, 행사 운영 중 장애 대응뿐 아니라 행사 후 결과 검증과 리포팅까지 더 단단해진다.
