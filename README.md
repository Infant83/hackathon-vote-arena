# Vibe Vote Arena

사내 해커톤 본선에서 관객이 팀별로 별을 나눠 주고, 응원 메시지를 남기고, 경품 추첨에 자동 응모할 수 있게 만든 실시간 투표 플랫폼입니다.

현재 라이브 배포 주소는 다음과 같습니다.

```text
https://lgdhack.aigov.workers.dev/vote
https://lgdhack.aigov.workers.dev/admin
```

## 1. 현재 개발 상태

현재 MVP는 다음 흐름까지 구현되어 있습니다.

1. 관객은 `/vote`에서 이름과 소속을 등록합니다.
2. 관객은 관리자가 정한 별 개수만큼 팀별로 별을 나눠 줍니다.
3. 한 팀에 줄 수 있는 별은 최대 10개입니다.
4. 투표 마감 전에는 별을 회수하거나 다시 배분할 수 있습니다.
5. 별을 준 팀에만 응원 메시지를 작성할 수 있습니다.
6. 별 1개 이상을 사용하고 공개 응원 메시지를 남기면 경품 추첨 대상이 됩니다.
7. 관리자는 `/admin`에서 실시간 순위, 참여자, 메시지, 추첨, 설정을 관리합니다.
8. 관리자는 `/admin?showCheer=1`에서 응원 버블 Showup 화면을 띄울 수 있습니다.
9. 관리자는 팀 정보와 안내 문구를 화면에서 편집하고, JSON/ZIP으로 가져오거나 내보낼 수 있습니다.
10. 관리자는 행사 결과를 `.xlsx` 파일로 내보낼 수 있습니다.

## 2. 주요 화면

### `/vote`

관객용 화면입니다.

- 이름과 소속 등록
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
- 팀 정보 관리
- 결과 XLSX 내보내기
- 투표 타이머, 별 개수, 마감/재개, Reset, 테스트 데이터 주입
- 행운권 추첨

### `/admin?showCheer=1`

발표장 스크린에 띄우는 응원 메시지 구름 화면입니다.

- 팀별 영역 표시
- 같은 팀 응원 버블끼리 가까이 모이는 움직임
- 별을 많이 준 참여자의 버블이 더 크게 표시
- 클릭 전에는 작성자와 메시지를 숨김
- 클릭하면 작성자와 응원 메시지를 크게 표시
- 사회자가 버블을 섞거나 드래그 가능

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
https://lgdhack.aigov.workers.dev
```

### 5.5. Git Build 자동 배포

Cloudflare Dashboard의 Git 연결 설정은 다음 기준입니다.

```text
Repository: Infant83/hackathon-vote-arena
Production branch: cloudflare-migration
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

Git Build는 푸시 직후 바로 끝나지 않습니다. 보통 2-5분 정도 여유를 두고 Cloudflare Dashboard의 빌드 로그를 확인합니다.

배포 목록은 CLI로도 볼 수 있습니다.

```powershell
npx wrangler deployments list --name lgdhack --json
```

### 5.6. 자주 나온 배포 오류

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

## 6. 팀 정보 관리

팀 정보와 화면 문구의 기본값은 `teams.json`에 있습니다.

관리자 화면에서도 수정할 수 있습니다.

```text
/admin > 팀 정보 > 관리
```

관리 가능한 항목:

- 앱 제목
- 관객 화면 문구
- 관리자 화면 문구
- 등록 안내 문구
- 추첨 응모 안내 문구
- 팀명
- 프로젝트명
- 팀원
- 팀 색상
- 팀 로고 경로
- 기본 로고 스타일
- 테스트 데이터용 기본 별 수와 투표자 수

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

로컬 Node 서버에서는 업로드한 로고를 `public/team-logos/`에 저장하고 `teams.json`도 갱신합니다.

Cloudflare Worker에서는 배포된 파일시스템을 직접 수정할 수 없습니다. 그래서 행사 중 수정한 팀 정보와 로고는 Durable Object storage에 저장됩니다. 행사 후 이 설정을 코드에 영구 반영하려면 관리자 화면에서 `team_info.json 저장`을 눌러 파일을 내려받고, 그 내용을 레포의 `teams.json`에 반영합니다.

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
2. 소속 또는 팀명

브라우저는 익명 디바이스 ID를 만들고 localStorage와 SameSite cookie에 저장합니다. 서버는 아래 조합을 같은 사람 판단 기준으로 사용합니다.

```text
이름 + 소속(팀명) + 익명 브라우저 디바이스 ID
```

비교할 때만 다음 정규화를 적용합니다.

- 이름: 모든 띄어쓰기 제거
- 소속: 띄어쓰기, 구두점, 기호 제거
- 영문 대문자: 소문자로 변환
- 마지막 `team` suffix: `팀`으로 변환

예시:

```text
"김 현중" == "김현중"
"AI Governance 팀" == "aigovernance팀"
"SC 품질/AI팀" == "sc품질ai팀"
```

화면 표시는 사용자가 입력한 값을 최대한 유지합니다.

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

1. `/admin` 접속
2. `Reset` 실행
3. 팀 정보와 안내 문구 확인
4. 모바일 `/vote` 접속
5. 이름/소속 등록
6. 여러 팀에 별 배분
7. 별 회수와 재배분 확인
8. 별을 준 팀에 응원 메시지 작성
9. `/admin`에서 실시간 별 현황과 메시지 확인
10. 메시지 숨김/공개 확인
11. `/admin?showCheer=1`에서 버블 표시 확인
12. 행운권 추첨 테스트
13. 결과 XLSX 다운로드 확인
14. 최종 `Reset`

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
