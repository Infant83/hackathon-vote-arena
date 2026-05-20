# Vibe Vote Arena

사내 해커톤 본선에서 관객이 팀별로 별을 나눠 주고, 응원 메시지를 남기고, 경품 추첨에 자동 응모할 수 있게 만든 실시간 투표 플랫폼입니다.

현재 라이브 배포 주소는 다음과 같습니다.

```text
https://hack.lgdisplay.workers.dev/vote
https://hack.lgdisplay.workers.dev/admin
```

운영 Worker 이름은 `hack`이고, Cloudflare workers.dev 서브도메인은 `lgdisplay`입니다.

## 1. 현재 개발 상태

현재 MVP는 다음 흐름까지 구현되어 있습니다.

1. 관객은 `/vote`에서 이름과 Let's ID를 등록합니다.
2. 관객은 관리자가 정한 별 개수만큼 팀별로 별을 나눠 줍니다.
3. 한 팀에 줄 수 있는 별은 기본 최대 5개이며, 관리자가 운영 설정에서 조정할 수 있습니다.
4. 투표 마감 전에는 별을 회수하거나 다시 배분할 수 있습니다.
5. 별을 준 팀에만 응원 메시지를 작성할 수 있습니다.
6. 별 1개 이상을 사용하고 공개 응원 메시지를 남기면 경품 추첨 대상이 됩니다.
7. 관리자는 `/admin`에서 실시간 순위, 참여자, 메시지, 추첨, 설정을 관리합니다.
8. 관리자는 `/wall`에서 관객 송출용 실시간 현황/응원 메시지 보드를 띄울 수 있습니다.
9. 관리자는 `/admin?showCheer=1`에서 응원 버블 Showup 화면을 띄울 수 있습니다.
10. 관리자는 `/wall`의 `퀴즈` 모드에서 문제를 출제하고, 관객 답변과 선착순 정답자를 송출할 수 있습니다.
    출제 후 기본 20초 동안은 사회자가 문제를 읽을 수 있도록 정답 후보만 모아두고, 관리자가 `정답 확인 모드 전환`을 누르거나 초기 딜레이가 끝나면 3초 보정 판정으로 넘어갑니다.
    확인 중에도 다른 참가자의 답변 제출은 계속 받으며, 확인 시간이 끝나면 보정 제출시각 기준으로 최종 정답자를 확정합니다.
11. 참가자는 퀴즈 한 문제당 기본 3번까지 답변을 제출할 수 있고, 관리자가 `/admin` 운영 설정에서 이 값을 조정할 수 있습니다.
12. 관리자는 팀 정보와 안내 문구를 화면에서 편집하고, JSON/ZIP으로 가져오거나 내보낼 수 있습니다.
13. 관리자는 행사 결과를 `.xlsx` 파일로 내보낼 수 있습니다.
14. 행운권 추첨은 이미 당첨된 참여자를 제외하고, 관리자가 설정한 응원 메시지 가중치에 따라 메시지 개수와 총 글자수가 많은 참여자의 확률을 완만하게 높일 수 있습니다.
15. 퀴즈 운영 창과 운영 콘텐츠 관리 모두에서 추가 인정 답을 입력할 수 있고, `*10*`처럼 별표를 붙인 포함 패턴도 정답으로 인정할 수 있습니다.
16. 행운권 추첨은 룰별 기본값을 바탕으로, 현장에서 관리자가 추첨 룰·선발 인원·상품을 조합해 진행할 수 있으며 송출 화면은 여러 명이 동시에 뽑혀도 겹치지 않게 표시합니다.

## 2. 주요 화면

### `/vote`

관객용 화면입니다.

- 이름과 Let's ID 등록
- 총 별 개수 안내
- 팀별 별 배분
- 팀별 응원 메시지 작성
- 내 경품 추첨 응모 상태 표시
- 팀별 총점과 순위는 관객에게 보여주지 않음

### `/admin`

관리자용 화면입니다.

- 실시간 별 현황
- 순위 변동 표시
- 팀별 별 총합, 참여자 수, 환산점수
- 참여자 리스트
- 별 이동 이벤트 피드
- 응원 메시지 관리
- 운영 콘텐츠 관리
- 결과 XLSX 내보내기
- 투표 타이머, 별 개수, 마감/재개, Reset, 테스트 데이터 주입
- 행운권 추첨과 응원 메시지 기반 확률 가중치 설정
- 퀴즈 추가 인정 답과 행운권 룰/선발 인원/상품 조합 설정

### `/admin?showCheer=1`

발표장 스크린에 띄우는 응원 메시지 구름 화면입니다.

- 팀별 영역 표시
- 같은 팀 응원 버블끼리 가까이 모이는 움직임
- 별을 많이 준 참여자의 버블이 더 크게 표시
- 클릭 전에는 작성자와 메시지를 숨김
- 클릭하면 작성자와 응원 메시지를 크게 표시
- 사회자가 버블을 섞거나 드래그 가능

### `/wall`

관객 송출용 공개 보드입니다.

- 실시간 별 현황
- 팀별 받은 별 개수
- 최근 응원 메시지
- 팀별 응원 메시지 필터
- 응원 버블 Showup 바로 열기
- 퀴즈 출제, 답변 수집, 선착순 정답자 송출
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
public/team-logos/   팀 로고 파일
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
npm run realtime
```

브라우저에서 엽니다.

```text
http://localhost:5173/vote
http://localhost:5173/admin
```

`npm run realtime`은 먼저 React 앱을 빌드한 뒤 `server.mjs`를 실행합니다. 모바일과 PC가 같은 투표 상태를 봐야 하므로 실제 테스트는 이 모드를 사용합니다.

관리자 화면은 항상 passcode 로그인을 요구합니다. 실행 전에 `ADMIN_PASSCODE`를 설정합니다.

```powershell
$env:ADMIN_PASSCODE="운영팀이_정한_passcode"
npm run realtime
```

`ADMIN_PASSCODE`가 비어 있으면 `/admin` 로그인 화면에서 설정 안내가 표시되고 관리자 기능은 열리지 않습니다. passcode가 설정되면 `/admin` 로그인 화면이 먼저 표시되고, 관리자 전용 API와 `/events?role=admin` 실시간 연결은 인증 쿠키가 있어야 사용할 수 있습니다.

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
http://172.30.1.17:5173/vote
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
- 하나의 행사 방 상태 유지
- 참가자, 별 배분, 응원 메시지, 추첨 결과 저장
- 현재 상태를 Durable Object storage에 저장
```

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
https://hack.lgdisplay.workers.dev
```

### 5.5. Git Build 자동 배포

Cloudflare Dashboard의 Git 연결 설정은 다음 기준입니다.

```text
Repository: Infant83/hackathon-vote-arena
Production branch: main
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

Git Build는 푸시 직후 바로 끝나지 않습니다. 보통 2-5분 정도 여유를 두고 Cloudflare Dashboard의 빌드 로그를 확인합니다.

배포 목록은 CLI로도 볼 수 있습니다.

```powershell
npx wrangler deployments list --name hack --json
```

### 5.6. 긴급 롤백

운영 중 새 배포에서 오류가 급증하면 Cloudflare Dashboard에서 바로 이전 안정 버전으로 되돌립니다.

1. Cloudflare Dashboard > Workers & Pages > `hack` > `배포` 또는 버전 목록으로 이동
2. 오류가 난 버전보다 앞선 안정 버전을 선택
3. `Rollback` 또는 `이 버전 배포`를 실행
4. `/vote`, `/wall`, `/admin` 접속과 Observability 오류 그래프를 확인

CLI로도 롤백할 수 있습니다.

```powershell
npx wrangler deployments list --name hack
npx wrangler rollback --name hack <되돌릴_version_id> --message "Rollback to stable event build" --yes
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

특히 Durable Object duration은 단순히 배포를 많이 했다고 크게 늘어나는 항목이 아닙니다. 배포 후 `/vote`, `/admin`, `/wall`, `/admin?showCheer=1` 같은 페이지를 오래 열어두고 실시간 연결이 유지될 때 빠르게 늘어날 수 있습니다. 개발 테스트는 가능하면 Cloudflare 배포 URL이 아니라 로컬 `npm run realtime` 서버에서 진행합니다.

운영 전 최적화 목표는 다음과 같습니다.

- `/vote`: filtered SSE로 퀴즈/마감/설정/추첨 같은 관객 필수 이벤트만 즉시 반영하고, 별 이동 같은 일반 상태는 15초 polling과 POST 응답 갱신 중심으로 유지
- `/admin`: 관리자 화면은 운영 전체 상태가 필요하므로 SSE 유지
- `/wall`, `/admin?showCheer=1`: 발표장 송출 화면은 SSE 유지
- 숨겨진 브라우저 탭은 가능하면 실시간 연결 종료
- 관객 화면은 SSE 실패나 일반 상태 보정을 위해 15초 polling fallback 유지

1000명 관객, 30분 투표, 15초 polling fallback을 기준으로 단순 계산하면 다음과 같습니다.

```text
1000명 x 30분 x 분당 4회 = 120,000회 상태 조회
```

여기에 등록, 별 조정, 응원 메시지 전송, 관리자 조작을 더하면 대략 `130,000-150,000`회 안팎의 Worker/Durable Object 요청이 발생할 수 있습니다.

Free 플랜은 개발과 작은 리허설에는 사용할 수 있지만, 전사 행사 운영용으로는 권장하지 않습니다. 1000명이 30분 정도 참여하면 요청 수만으로도 Free 일일 한도에 닿거나 넘을 수 있고, 실시간 연결을 오래 열어두면 Durable Object duration 경고가 먼저 발생할 수 있습니다.

행사 운영에는 Workers Paid 플랜을 권장합니다. 공식 문서 기준 Paid 플랜은 월 최소 비용이 있고, Free보다 훨씬 큰 월간 포함량을 제공합니다. 이 앱의 1회성 행사 규모라면 filtered SSE와 15초 polling fallback을 적용한 상태에서 기본 포함량 안에 들어갈 가능성이 높습니다. 다만 여러 번 대규모 리허설을 하거나 polling 주기를 짧게 줄이면 초과 사용량이 생길 수 있습니다.

운영 판단은 다음 기준으로 합니다.

| 상황 | 권장 플랜 |
| --- | --- |
| 로컬 개발 | 로컬 `npm run realtime` |
| 10-50명 내부 테스트 | Free 가능 |
| 100명 이하 짧은 리허설 | Free 가능, 사용량 확인 필요 |
| 300명 이상 행사 리허설 | Paid 권장 |
| 1000명 전사 행사 | Paid 권장 |

행사 전에는 Cloudflare Dashboard에서 사용량 알림과 비용 알림을 켜 둡니다. 행사 당일에는 사용하지 않는 `/vote`, `/admin`, Showup 탭을 닫고, 리허설이 끝나면 Durable Object 사용량이 불필요하게 계속 늘지 않도록 배포 URL을 열어둔 브라우저를 정리합니다.

## 6. 운영 콘텐츠 관리

팀 정보, 화면 문구, 퀴즈 문제의 기본값은 `teams.json`에 있습니다.

관리자 화면에서도 수정할 수 있습니다.

```text
/admin > 운영 콘텐츠 > 관리
```

관리 가능한 항목:

- 앱 제목
- 화면별 문구(`/vote`, `/admin`, `/wall`, Showup, Quiz)
- 등록 안내 문구
- 추첨 응모 안내 문구
- 퀴즈 문제와 정답
- 팀명
- 프로젝트명
- 팀원
- 팀 편집 키
- 팀 색상
- 팀 로고/팀 사진
- 기본 로고 스타일
- 테스트 데이터용 기본 별 수와 투표자 수

운영 설정에서 화면 테마를 `현재 모드`와 `어두운 모드` 중 선택할 수 있습니다. 어두운 모드는 `ppt_sample/EDM_(일반진행)해커톤 간지 선정_양식(외부)_v0.1.pptx`의 블랙/네이비, 블루, 바이올렛, 마젠타 톤을 기준으로 합니다.

### 6.1. JSON 구조

```json
{
  "copy": {
    "appTitle": "Vibe Vote Arena",
    "audienceEyeline": "Audience Vote"
  },
  "teams": [
    {
      "id": "team-t1",
      "code": "T1",
      "editKey": "t1-edit",
      "name": "Team One",
      "title": "Submitted Project",
      "members": ["Member A", "Member B", "Member C"],
      "logoFile": "/team-logos/T1-logo.png",
      "color": "#A50034",
      "logo": "orbit",
      "baseStars": 0,
      "baseVoters": 0,
      "sortOrder": 0
    }
  ]
}
```

`id`는 투표, 응원 메시지, 수상 이력과 연결되는 내부 키이므로 운영 중에는 바꾸지 않습니다. 팀별 직접 편집 링크를 짧게 관리해야 할 때는 `editKey`를 사용합니다. 예를 들어 Aurora Lab의 `editKey`가 `tabfy8`이면 관리자 화면에서 생성되는 팀 편집 링크의 인증 키로 이 값이 쓰입니다.

### 6.2. ZIP 업로드 구조

관리자 화면은 `team_info.json` 단일 파일 또는 `team_infos.zip` 파일을 받을 수 있습니다.

권장 ZIP 구조:

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

팀별 `logoFile`에는 `/team-logos/T1-logo.png` 같은 배포 경로, `https://...` 인터넷 이미지 주소, 공개 공유된 Google Drive 이미지 링크, 또는 관리자 화면에서 업로드한 이미지 data URL을 사용할 수 있습니다. Google Drive 파일 링크는 관리자 화면에서 저장할 때 표시 가능한 thumbnail 주소로 자동 정리됩니다.

로컬 Node 서버에서는 ZIP으로 업로드한 로고를 `public/team-logos/`에 저장하고 `teams.json`도 갱신합니다.

Cloudflare Worker에서는 배포된 파일시스템을 직접 수정할 수 없습니다. 그래서 행사 중 수정한 팀 정보와 로고는 `저장 및 반영`을 통해 Cloudflare Durable Object storage에 직접 저장됩니다. 즉, Cloudflare 배포 주소에서 누른 저장은 로컬 PC의 `server.mjs`나 `teams.json`을 호출하지 않고, Cloudflare Worker 안의 운영 상태를 바로 바꿉니다. 행사 후 이 설정을 코드에 영구 반영하려면 관리자 화면에서 `로컬 JSON 저장`을 눌러 파일을 내려받고, 그 내용을 레포의 `teams.json`에 반영합니다.

Cloudflare 운영 중 `/admin > 운영 콘텐츠 > 관리`에서 `저장 및 반영`을 누르면 저장 완료 시각과 반영 버전이 표시됩니다. 이 값이 갱신되면 Durable Object 운영 상태에 저장된 것이며, 이미 열려 있는 `/wall`과 `/vote` 화면도 SSE/폴링 갱신으로 같은 설정을 받습니다. Google Drive 공유 링크와 원격 이미지 주소는 저장 전에 표시 가능한 주소로 정리됩니다.

사내망처럼 inbound 접속은 가능하지만 브라우저의 outbound HTTPS가 막힌 환경에서는 Cloudflare 운영 저장소로 직접 저장할 수 없습니다. 이 경우 먼저 `로컬 JSON 저장`으로 현재 편집본을 백업하고, 인터넷 연결이 가능한 관리자 PC에서 해당 JSON을 업로드하거나 같은 값을 다시 편집해 `저장 및 반영`합니다.

특정 사내망에서만 `Cloudflare 저장 실패(403)`이 뜨고 모바일/외부망에서는 저장되는 경우, 관리자 인증이나 앱 오류가 아니라 사내 보안망/프록시가 Cloudflare 저장 POST 요청을 거절한 상황으로 봅니다. 이때는 모바일 핫스팟/외부망에서 저장하거나 JSON 백업 파일을 옮겨 적용합니다.

운영 화면은 Cloudflare 저장 POST가 403으로 거절되면 같은 내용을 압축한 관리자 전용 GET 저장 경로로 한 번 더 자동 시도합니다. 이 우회 저장도 같은 관리자 쿠키가 있어야 동작하며, 사내망이 POST만 막는 경우에는 별도 업로드 없이 바로 반영될 수 있습니다. 저장 시 이미 운영 상태에 들어 있는 inline 이미지(data URL)는 다시 보내지 않고 기존 값을 보존하므로, 로고나 상품 이미지를 그대로 둔 문구/팀 정보 수정은 훨씬 작은 payload로 처리됩니다.

큰 로고/상품 이미지는 첫 화면 진입과 미디어가 실제로 바뀌는 운영 콘텐츠 저장 때만 full 상태로 내려갑니다. 이후 별 투표, 응원 메시지, 퀴즈 상태 같은 빈번한 갱신은 `/api/state?media=slim` 및 slim SSE payload를 사용하고, 브라우저는 직전 full 상태의 이미지를 보존합니다. 따라서 트로피 로고 같은 시각 자산은 유지하면서도 반복 상태 전송량을 줄입니다.

관리자 화면 상단의 `인증 확인`은 현재 브라우저의 관리자 세션을 다시 확인합니다. `로그아웃`을 누르면 관리자 인증 쿠키를 지우고 다시 로그인 화면으로 돌아갑니다.

관객 `/vote` 화면에서 다른 기기나 다른 참여자로 다시 들어가야 할 때는 상단 Live 표시 옆의 `Logout`을 사용합니다. 이 동작은 현재 브라우저의 참여자 쿠키와 로컬 입력값만 지우며, 이미 서버에 접수된 기존 참여자의 투표/응원 기록은 삭제하지 않습니다.

응원 메시지는 화면 전송량을 줄이기 위해 상태 응답에서는 최근 120개만 내려보냅니다. 단, 행운권 추첨과 참여자별 응원 이력 계산에 쓰는 서버 내부 메시지 이력은 최대 5000개까지 보존합니다.

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

## 8. 결과 내보내기

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

## 9. 중복 참여 방지 설계

이 플랫폼은 개인정보 수집을 늘리지 않는 방향으로 설계했습니다. 참가자는 다음 두 가지만 입력합니다.

1. 이름
2. Let's ID

브라우저는 익명 디바이스 ID를 만들고 localStorage와 SameSite cookie에 저장합니다. 서버는 아래 조합을 같은 사람 판단 기준으로 사용합니다.

```text
이름 + Let's ID
```

비교할 때만 다음 정규화를 적용합니다.

- 이름: 모든 띄어쓰기 제거
- Let's ID: `@` 뒤 도메인 제거
- Let's ID: 띄어쓰기 제거
- Let's ID: 영문 대문자 소문자 변환
- Let's ID: 영문/숫자/마침표/하이픈/밑줄만 사용

예시:

```text
"김 현중" == "김현중"
"hyun-jung.kim@lgdisplay.com" == "hyun-jung.kim"
"HYUN-JUNG.KIM" == "hyun-jung.kim"
```

화면 표시는 사용자가 입력한 값을 최대한 유지합니다.

한 번 등록한 사용자는 같은 브라우저 device ID로 재접속하면 기존 참여 내역을 이어갑니다. 다른 기기에서 접속할 때는 이름과 Let's ID를 입력한 뒤 `등록하고 투표 시작` 버튼을 누르거나 Enter로 제출해야 동일성 판단을 수행합니다. 제출된 이름과 Let's ID가 기존 참여자와 같으면 같은 참여자로 묶고, 새 device ID를 같은 참여자에 추가합니다. 이 경우 기존 별 배분, 응원 메시지, 수상 이력 상태를 이어받습니다.

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
3. `Reset` 실행
4. 팀 정보와 안내 문구 확인
5. 모바일 `/vote` 접속
6. 이름/Let's ID 등록
7. 여러 팀에 별 배분
8. 별 회수와 재배분 확인
9. 별을 준 팀에 응원 메시지 작성
10. `/admin`에서 실시간 별 현황과 메시지 확인
11. 메시지 숨김/공개 확인
12. `/admin?showCheer=1`에서 버블 표시 확인
13. 행운권 추첨 테스트
14. 결과 XLSX 다운로드 확인
15. 최종 `Reset`

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
- `AGENTS.md`: 이 작업공간에서 Codex가 따라야 하는 개발 규칙
- `DESIGN.md`: UI/시각 디자인 기준
