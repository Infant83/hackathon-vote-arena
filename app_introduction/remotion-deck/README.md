# Vibe Vote Arena Remotion Deck

`app_introduction` 소개 자료를 영상/슬라이드 스타일로 다시 구성한 Remotion 프로젝트입니다.

## 구성

- Composition ID: `VibeVoteArenaDeck`
- 해상도: `1920 x 1080`
- FPS: `30`
- 길이: 11개 장면, 약 66초
- 주요 소스: `src/deckData.ts`, `src/Composition.tsx`, `src/Root.tsx`

## 실행

```powershell
npm install
npm run dev
```

Remotion Studio가 열리면 `VibeVoteArenaDeck` composition을 선택해 미리 볼 수 있습니다.

## 편집기와 함께 쓰기

별도 터미널에서 편집 서버를 실행합니다.

```powershell
npm run editor
```

브라우저에서 `http://127.0.0.1:5222/editor.html`을 열면 슬라이드 텍스트, 장면 순서, 제목/부제/본문 영역 위치를 조정할 수 있습니다. 저장 시 `deck.config.json`과 `src/deckData.ts`가 같이 갱신되므로, Remotion Studio를 켜 둔 상태라면 변경사항이 거의 바로 반영됩니다.

## 검증용 still

```powershell
npm run still
```

출력:

```text
out/vibe-vote-arena-intro-frame.png
```

## 영상 렌더

```powershell
npm run render
```

출력:

```text
out/vibe-vote-arena-intro.mp4
```

## 작성 원칙

Remotion 렌더링 안정성을 위해 CSS transition/animation을 쓰지 않고, `useCurrentFrame()`, `interpolate()`, `spring()` 기반으로 장면 모션을 구성했습니다.
