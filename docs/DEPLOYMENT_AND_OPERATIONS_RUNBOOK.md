# Deployment And Operations Runbook

작성일: 2026-06-08

이 문서는 `vibe-arena`를 Cloudflare Workers에 배포하고, 행사 중 문제가 생겼을 때 빠르게 대응하기 위한 운영 매뉴얼이다.

## 1. 현재 기본 배포 대상

현재 `wrangler.jsonc` 기본값은 2026 AX 그룹 2분기 모임 운영 기준이다.

```text
Worker name: meeting
URL: https://meeting.axgroup.workers.dev
ARENA_ROOM_NAME: 2026-ax-q2-meeting
Config: event-configs/2026_ax_group_q2_meeting.json
Features: message, quiz
```

`npm run cf:deploy`는 기본적으로 위 Worker와 room 조합으로 배포한다.

## 2. 배포 전 준비

### 2.1. Cloudflare 로그인 확인

```powershell
npx wrangler whoami
```

로그인이 안 되어 있으면:

```powershell
npx wrangler login
```

### 2.2. 관리자 passcode 확인/설정

운영 Worker에는 `ADMIN_PASSCODE` secret이 있어야 한다.

```powershell
npx wrangler secret list
npx wrangler secret put ADMIN_PASSCODE
```

passcode를 바꾸면 기존 관리자 로그인 쿠키는 더 이상 유효하지 않다. 변경 뒤 `/admin`에서 다시 로그인해야 한다.

### 2.3. 정적 설정 audit

모든 행사 preset을 점검한다.

```powershell
npm run ops:audit:all
```

특정 행사만 점검한다.

```powershell
npm run ops:audit:ax-q2
npm run ops:audit:ax-q1
npm run ops:audit:hackathon-q1
```

`FAIL`은 운영 전 반드시 고친다. `WARN`은 의도한 값인지 확인하고 기록한다.

## 3. 기본 수동 배포

현재 운영 Worker `meeting`으로 배포하는 표준 순서다.

```powershell
npm run lint
npm run build
npm run cf:deploy:dry-run
npm run cf:deploy
```

`cf:deploy`는 내부적으로 다음을 실행한다.

```powershell
npm run build && wrangler deploy
```

배포 후 health를 확인한다.

```powershell
Invoke-RestMethod -Uri 'https://meeting.axgroup.workers.dev/api/health' | ConvertTo-Json -Compress
```

운영 audit를 실행한다.

```powershell
$env:AUDIT_URL = 'https://meeting.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2
```

브라우저 확인:

```text
https://meeting.axgroup.workers.dev/message
https://meeting.axgroup.workers.dev/wall
https://meeting.axgroup.workers.dev/admin
```

## 4. 행사별 분리 배포

새 행사를 기존 행사와 동시에 운영하려면 Worker name과 `ARENA_ROOM_NAME`을 함께 분리한다.

권장 패턴:

```text
event slug = Worker name = ARENA_ROOM_NAME = event.roomName
```

예시:

```powershell
npm run lint
npm run build
npm run ops:audit:all

npx wrangler deploy --name hackathon26q1 --var ARENA_ROOM_NAME:hackathon26q1
npx wrangler deploy --name meeting26q1 --var ARENA_ROOM_NAME:meeting26q1
npx wrangler deploy --name special26ax --var ARENA_ROOM_NAME:special26ax
```

주의:

1. 관리자 화면에서 preset을 불러와도 DB room은 바뀌지 않는다.
2. 현재 DB room은 Worker에 배포된 `ARENA_ROOM_NAME`으로 결정된다.
3. 새 Worker name으로 배포하면 URL도 바뀐다. 예: `https://hackathon26q1.axgroup.workers.dev`
4. 기존 행사 DB를 보려는 목적이라면 아무 Worker나 새로 만들지 말고, 기존 Durable Object binding/class와 room 접근이 맞는지 먼저 export로 검증한다.

## 5. 새 행사 preset 추가 절차

1. `event-configs/<event>.json` 생성
2. `event.id`, `event.label`, `event.workerName`, `event.roomName`, `event.settingsFile`, `event.features` 작성
3. `settings.wallEnabledPanels`가 `event.features`와 맞는지 확인
4. `worker/index.ts`에 JSON import 추가
5. `initialConfigByRoomName`에 room mapping 추가
6. `bundledEventConfigPresets`에 preset 추가
7. 검사

```powershell
npm run ops:audit:all
npm run lint
npm run build
npm run cf:deploy:dry-run
```

8. 배포

```powershell
npx wrangler deploy --name <event-slug> --var ARENA_ROOM_NAME:<event-slug>
```

9. 배포 URL audit

```powershell
$env:AUDIT_URL = 'https://<event-slug>.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit
```

## 6. 배포 후 점검

### 6.1. 기본 health

```powershell
Invoke-RestMethod -Uri 'https://meeting.axgroup.workers.dev/api/health' | ConvertTo-Json -Compress
```

기대값:

```json
{
  "ok": true,
  "runtime": "cloudflare-workers",
  "adminPasscodeConfigured": true
}
```

### 6.2. 관리자 로그인

```text
/admin 접속 -> ADMIN_PASSCODE 입력 -> Ops Guard 확인
```

확인할 것:

- 현재 Worker
- 현재 DB room
- settings 권장 room
- JSON/XLSX/settings 백업 버튼
- wall 표시 세션

### 6.3. 역할별 smoke test

Q&A/퀴즈 행사:

```text
/message -> 별명 입장 -> 질문 작성
/wall -> Q&A 카드 표시 -> 퀴즈 탭 전환
/admin?panel=quiz -> 퀴즈 준비/종료
/admin?panel=export -> JSON/XLSX/settings 다운로드 버튼 확인
```

해커톤 투표 행사:

```text
/vote -> 참가자 등록 -> 별 배분 -> 응원 메시지
/wall -> 실시간 별 현황
/admin?showCheer=1 -> 응원 버블
/admin?panel=raffle -> 행운권 START/STOP
```

## 7. 운영 중 대응 매뉴얼

### 7.1. 사이트가 열리지 않음

1. health 확인

```powershell
Invoke-WebRequest -Uri 'https://meeting.axgroup.workers.dev/api/health' -UseBasicParsing
```

2. 최근 배포 목록 확인

```powershell
npx wrangler deployments list --name meeting
npx wrangler deployments status --name meeting
```

3. 이전 안정 버전으로 rollback

```powershell
npx wrangler rollback --name meeting <version_id> --message "Rollback to stable event build" --yes
```

4. 다시 health와 `/message`, `/wall`, `/admin` 확인

### 7.2. 관리자 로그인이 안 됨

1. secret 목록 확인

```powershell
npx wrangler secret list
```

2. passcode 재설정

```powershell
npx wrangler secret put ADMIN_PASSCODE
```

3. 새 배포가 필요한 경우 배포

```powershell
npm run cf:deploy
```

4. 브라우저에서 기존 `/admin` 탭을 새로고침하고 다시 로그인

### 7.3. 잘못된 행사 설정을 불러옴

관리자 preset 불러오기는 DB room을 바꾸지 않는다. 설정만 현재 room에 적용된다.

대응:

1. `/admin` Ops Guard에서 현재 DB room 확인
2. `/admin?panel=teams`에서 올바른 preset 다시 불러오기
3. 저장 전 화면 문구 preview와 팀 사진 preview 확인
4. `저장 및 반영`
5. `/wall`, `/message`, `/vote`에서 노출 확인

심각하게 꼬였으면, reset 전에 반드시 export를 먼저 받는다.

```text
/admin?panel=export -> 원본 JSON 백업
/admin?panel=export -> XLSX 결과 저장
/admin?panel=export -> settings 저장
```

### 7.4. reset을 해야 함

reset 전 확인:

1. 현재 DB room이 맞는가?
2. JSON 백업을 받았는가?
3. XLSX 결과를 받았는가?
4. settings를 받았는가?

관리자 화면에서 reset하는 것이 가장 안전하다.

```text
/admin -> reset 카드 -> 필요한 범위만 실행
```

명령으로 reset해야 하는 경우에는 관리자 쿠키와 same-origin 검증이 필요하므로 브라우저 관리자 화면 사용을 우선한다.

### 7.5. 배포 후 질문/데이터가 사라진 것처럼 보임

가장 먼저 확인할 것:

```text
Worker name
ARENA_ROOM_NAME
event.roomName
```

같은 코드라도 `ARENA_ROOM_NAME`이 다르면 다른 DB room을 본다.

현재 운영 health:

```powershell
Invoke-RestMethod -Uri 'https://meeting.axgroup.workers.dev/api/health' | ConvertTo-Json -Compress
```

운영 audit:

```powershell
$env:AUDIT_URL = 'https://meeting.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2
```

### 7.6. 운영 콘텐츠 저장이 실패함

증상:

- `/admin?panel=teams` 저장 실패
- Cloudflare 저장 403
- 사내망에서만 저장 실패

대응:

1. 같은 브라우저에서 `/admin` 로그인 상태 확인
2. 관리자 상단 `인증 확인` 실행
3. 다시 저장
4. 계속 실패하면 `settings.json 저장`으로 백업
5. 모바일 핫스팟/외부망 또는 다른 관리자 PC에서 업로드 후 저장

저장 전에 확인:

- 문구 preview
- 팀 사진 preview
- 현재 DB room
- preset 권장 room mismatch 경고

### 7.7. 송출 화면이 버벅임

우선 조치:

1. 사용하지 않는 `/message`, `/vote`, `/admin`, `/wall` 탭 닫기
2. `/admin`에서 열어둔 상세 패널 줄이기
3. 큰 inline 이미지가 들어간 설정인지 audit 확인

```powershell
npm run ops:audit:all

$env:AUDIT_URL = 'https://meeting.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2
```

확인할 audit 항목:

- full payload 크기
- slim payload 크기
- active SSE tabs
- inline media size
- stored interactions

### 7.8. 퀴즈가 안 열리거나 참가자 화면이 전환되지 않음

1. `/admin?panel=quiz`에서 퀴즈 상태 확인
2. `/wall`의 퀴즈 탭 확인
3. `/message` 참가자 화면 새로고침
4. runtime audit 확인

```powershell
$env:AUDIT_URL = 'https://meeting.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2
```

필요하면 `/admin?panel=quiz`에서 퀴즈 종료 후 다시 준비한다.

### 7.9. 이전 행사 DB를 내려받아야 함

원칙:

```text
export first, never reset first
```

절차:

1. 이전 행사 room 이름 확인
2. 해당 room에 접근하는 Worker 배포 또는 기존 Worker 확인
3. `/admin` 로그인
4. `/admin?panel=export`에서 원본 JSON 백업
5. XLSX와 settings도 함께 저장

기존 room이 `event26q1`이라면 예시:

```powershell
npx wrangler deploy --name event26q1-export --var ARENA_ROOM_NAME:event26q1
```

주의: 과거 데이터 접근용 Worker는 export만 수행하고 reset은 실행하지 않는다.

## 8. 운영 종료 절차

행사가 끝나면 reset 전에 아래 세 파일을 같은 폴더에 저장한다.

```text
원본 JSON 백업
XLSX 결과 저장
settings 저장
```

관리자 화면:

```text
/admin?panel=export
```

저장 후:

1. 파일명에 행사명과 날짜를 붙인다.
2. 실제 운영 데이터는 공개 repo에 커밋하지 않는다.
3. 다음 행사 preset으로 재사용할 settings만 익명화 후 `event-configs/` 또는 비공개 보관함에 반영한다.
4. 공개 샘플은 `public/prev_settings/`에 두기 전에 실명/소속/사진/민감 상품 정보를 제거한다.

## 9. 명령어 빠른 참조

```powershell
# Local
npm install
npm run lint
npm run build
$env:EVENT_CONFIG_FILE = 'event-configs/2026_ax_group_q2_meeting.json'
$env:ADMIN_PASSCODE = '<local passcode>'
npm run realtime

# Audit
npm run ops:audit:all
$env:AUDIT_URL = 'https://meeting.axgroup.workers.dev'
$env:ADMIN_PASSCODE = '<운영 passcode>'
npm run ops:audit:ax-q2

# Cloudflare auth/secrets
npx wrangler whoami
npx wrangler login
npx wrangler secret list
npx wrangler secret put ADMIN_PASSCODE

# Deploy current meeting Worker
npm run cf:deploy:dry-run
npm run cf:deploy

# Deploy separated event Worker
npx wrangler deploy --name <event-slug> --var ARENA_ROOM_NAME:<event-slug>

# Deployment history and rollback
npx wrangler deployments list --name meeting
npx wrangler deployments status --name meeting
npx wrangler rollback --name meeting <version_id> --message "Rollback to stable event build" --yes

# Health
Invoke-RestMethod -Uri 'https://meeting.axgroup.workers.dev/api/health' | ConvertTo-Json -Compress
```
