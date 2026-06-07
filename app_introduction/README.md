# Vibe Vote Arena 소개 자료

이 폴더는 현재 작업공간의 프로젝트를 설명하기 위한 한국어 소개 자료입니다.

## 파일

- `index.html`: 브라우저에서 바로 열 수 있는 단계별 프로젝트 소개서입니다.
- `help.html`: 운영 가이드 제작 노트입니다. 배포용 가이드는 `../public/help/index.html`에서 관리하며 `/help`로 엽니다.
- `editor.html`: Remotion 덱을 브라우저에서 편집하는 로컬 편집기입니다.
- `editor-server.mjs`: 편집 내용을 저장하고 Remotion 소스를 갱신하는 작은 로컬 서버입니다.
- `remotion-deck/`: Remotion으로 다시 구성한 발표/영상용 소개 덱입니다.

## 열람 방법

Windows 탐색기나 브라우저에서 아래 파일을 엽니다.

```text
app_introduction/index.html
```

HTML 안에는 제품 개요, 주요 화면, 기능 명세, 아키텍처, Cloudflare 호스팅, 실시간 서빙 방식, 보안 경계, 데이터 모델, API 표면, 운영 검증 체크리스트가 포함되어 있습니다.

브라우저에서 인쇄하면 PDF 공유용 자료로도 사용할 수 있습니다.

## Remotion 덱

운영자 교육용 소개 영상은 아래 덱에서 확인합니다.

```powershell
cd app_introduction/remotion-deck
npm install
npm run dev
```

정지 프레임과 mp4 렌더:

```powershell
npm run still
npm run render
```

## 실시간 편집기

터미널을 두 개 열어 함께 실행합니다.

```powershell
cd app_introduction
node editor-server.mjs
```

브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:5222/editor.html
```

다른 터미널에서는 Remotion Studio를 실행합니다.

```powershell
cd app_introduction/remotion-deck
npm run dev
```

`editor.html`에서 텍스트, 슬라이드 순서, 제목/본문 영역 위치를 바꾸면 `remotion-deck/deck.config.json`과 `remotion-deck/src/deckData.ts`가 함께 저장됩니다. Remotion Studio는 파일 변경을 감지해 거의 바로 미리보기에 반영합니다.

정지 프레임 검증:

```powershell
npm run still
```

영상 렌더:

```powershell
npm run render
```
