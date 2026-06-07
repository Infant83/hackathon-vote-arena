export type DeckCard = {
  label: string;
  title: string;
  body: string;
  tone: "red" | "blue" | "green" | "violet" | "amber";
};

export type DeckFlowStep = {
  title: string;
  body: string;
};

export type DeckRow = {
  key: string;
  value: string;
  note: string;
};

export type DeckRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DeckCanvas = {
  title?: DeckRect;
  subtitle?: DeckRect;
  content?: DeckRect;
  heroContent?: DeckRect;
};

export type DeckSlide = {
  kicker: string;
  title: string;
  subtitle: string;
  layout: "hero" | "cards" | "flow" | "architecture" | "hosting" | "table" | "closing";
  cards?: DeckCard[];
  flow?: DeckFlowStep[];
  rows?: DeckRow[];
  code?: string[];
  note?: string;
  canvas?: DeckCanvas;
};

const standardCanvas: DeckCanvas = {
  title: { x: 92, y: 94, w: 1540, h: 150 },
  subtitle: { x: 92, y: 250, w: 1360, h: 90 },
  content: { x: 92, y: 386, w: 1736, h: 560 },
};

export const deckSlides: DeckSlide[] = [
  {
    kicker: "운영 안내",
    title: "Vibe Arena 운영 가이드",
    subtitle:
      "처음 맡은 운영자도 순서대로 따라갈 수 있도록 앱 구조, 행사별 설정, 배포, 현장 대응, 종료 백업을 한 흐름으로 설명합니다.",
    layout: "hero",
    note: "관리자 콘솔 · 송출 화면 · 배포 매뉴얼",
    canvas: {
      heroContent: { x: 110, y: 496, w: 1260, h: 480 },
    },
  },
  {
    kicker: "01 행사 흐름",
    title: "행사마다 같은 운영 순서를 씁니다",
    subtitle:
      "해커톤 투표, 분기 모임 Q&A/퀴즈, 특별 세션을 한 콘솔에서 운영합니다. settings와 DB room은 행사별로 분리합니다.",
    layout: "cards",
    cards: [
      {
        label: "/message",
        title: "Q&A 참여",
        body: "별명으로 들어와 질문을 남기고, 퀴즈가 열리면 바로 답변 화면으로 넘어갑니다.",
        tone: "blue",
      },
      {
        label: "/vote",
        title: "투표와 응원",
        body: "해커톤 행사에서 별 배분, 팀별 응원 메시지, 행운권 응모를 처리합니다.",
        tone: "red",
      },
      {
        label: "/wall",
        title: "발표장 송출",
        body: "Q&A, 퀴즈, 실시간 현황, Showup, 추첨을 행사 조합에 맞춰 보여줍니다.",
        tone: "violet",
      },
      {
        label: "/admin",
        title: "운영 콘솔",
        body: "설정, 콘텐츠, 미리보기, 내보내기, 초기화, 점검 기준을 계속 확인하는 운영자의 자리입니다.",
        tone: "green",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "02 DB room 안전 규칙",
    title: "DB room 기준으로 행사 데이터를 분리합니다",
    subtitle:
      "관리자 preset은 현재 room의 설정을 갱신합니다. 질문, 참가자, 퀴즈, 응원, 당첨 이력이 쌓이는 DB room은 배포할 때 지정한 ARENA_ROOM_NAME이 고릅니다.",
    layout: "flow",
    flow: [
      {
        title: "행사 slug 정하기",
        body: "예: hackathon26q1, meeting26q1, special26ax처럼 짧고 나중에 찾기 쉬운 이름을 정합니다.",
      },
      {
        title: "Worker와 room 맞추기",
        body: "권장 규칙은 Worker name = ARENA_ROOM_NAME = event.roomName입니다.",
      },
      {
        title: "Preset 적용하기",
        body: "settings를 불러오면 현재 room의 설정이 갱신됩니다. room 전환은 배포 단계에서 처리합니다.",
      },
      {
        title: "Reset 전 확인하기",
        body: "초기화 대상은 현재 Worker가 보는 현재 room입니다. 먼저 JSON/XLSX/settings를 저장합니다.",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "03 관리자 콘솔",
    title: "관리자 화면은 현황판보다 운영 판단에 집중합니다",
    subtitle:
      "기본 /admin은 안전한 관리 작업을 먼저 보여줍니다. 자세한 별 현황과 메시지는 역할별 패널과 /wall에서 확인합니다.",
    layout: "cards",
    cards: [
      {
        label: "운영 대상",
        title: "현재 운영 대상",
        body: "Worker, 현재 DB room, settings 권장 room, 내보내기와 초기화 경계를 먼저 확인합니다.",
        tone: "red",
      },
      {
        label: "콘텐츠",
        title: "운영 콘텐츠",
        body: "행사명, 문구, 팀 사진, 퀴즈, preset을 수정하고 저장 전 미리보기로 점검합니다.",
        tone: "blue",
      },
      {
        label: "내보내기",
        title: "종료 백업",
        body: "원본 JSON, XLSX, settings를 같은 행사 폴더에 함께 보관합니다.",
        tone: "green",
      },
      {
        label: "초기화",
        title: "초기화",
        body: "질문, 퀴즈 이력, 행운권, 전체 초기화를 구분하고 행사 중에는 범위를 좁힙니다.",
        tone: "amber",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "04 콘텐츠 편집",
    title: "문구와 이미지는 저장 전에 실제 화면처럼 확인합니다",
    subtitle:
      "운영 콘텐츠는 현장에서 가장 자주 바뀝니다. 미리보기가 붙어 있으면 저장 전 실수를 줄일 수 있습니다.",
    layout: "flow",
    flow: [
      {
        title: "화면별 문구",
        body: "global, vote, admin, wall, qna, showup, quiz 그룹마다 오른쪽 미리보기를 확인합니다.",
      },
      {
        title: "운영 변수",
        body: "{starBudget}, {maxStarsPerTeam} 같은 변수는 예시값으로 치환되어 문장 길이를 볼 수 있습니다.",
      },
      {
        title: "팀 사진",
        body: "작은 로고와 /wall 선택 팀 카드의 와이드 사진 프레임을 분리해 조정합니다.",
      },
      {
        title: "최종 확인",
        body: "저장 후 /message, /vote, /wall을 새로 열어 실제 표시가 의도와 맞는지 확인합니다.",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "05 배포 순서",
    title: "배포는 빌드, 사전 확인, 배포, 운영 점검 순서로 갑니다",
    subtitle:
      "현재 기본 배포는 meeting Worker와 2026-ax-q2-meeting room입니다. 다른 행사는 --name과 --var로 분리합니다.",
    layout: "hosting",
    code: [
      "npm run lint",
      "npm run build",
      "npm run cf:deploy:dry-run",
      "npm run cf:deploy",
      "",
      "$env:AUDIT_URL='https://meeting.axgroup.workers.dev'",
      "$env:ADMIN_PASSCODE='<운영 passcode>'",
      "npm run ops:audit:ax-q2",
    ],
    cards: [
      {
        label: "기본 배포",
        title: "meeting",
        body: "기본 wrangler.jsonc는 meeting Worker와 Q2 meeting room을 가리킵니다.",
        tone: "blue",
      },
      {
        label: "분리 배포",
        title: "--name + --var",
        body: "새 행사는 npx wrangler deploy --name event --var ARENA_ROOM_NAME:event로 분리합니다.",
        tone: "green",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "06 사전 점검",
    title: "행사 전에는 정적 설정과 실행 중 서버를 모두 봅니다",
    subtitle:
      "운영 점검 스크립트는 기능 조합, room, wall 세션, 팀 사진, editKey, payload, 인증 상태를 빠르게 확인합니다.",
    layout: "table",
    rows: [
      {
        key: "정적 검사",
        value: "npm run ops:audit:all",
        note: "모든 event-configs 파일의 room, features, wall panels, media 크기를 확인합니다.",
      },
      {
        key: "실행 검사",
        value: "npm run ops:audit:ax-q2",
        note: "실행 중 서버의 health, 관리자 인증, SSE 탭 수, payload 크기를 확인합니다.",
      },
      {
        key: "관리자/송출",
        value: "/admin, /wall",
        note: "운영 콘솔과 발표장 화면이 의도한 세션으로 열리는지 확인합니다.",
      },
      {
        key: "참가자 화면",
        value: "/message 또는 /vote",
        note: "390px 전후에서 입력, 전송, 전환, overflow를 확인합니다.",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "07 현장 운영",
    title: "행사 중에는 탭 수와 reset 범위를 먼저 봅니다",
    subtitle:
      "현장 문제의 출발점은 room 혼선, 열린 탭, reset 범위, 저장 실패인 경우가 많습니다. 먼저 작은 조치부터 실행합니다.",
    layout: "cards",
    cards: [
      {
        label: "열린 탭",
        title: "필요한 탭만 남기기",
        body: "운영에 필요한 /message, /vote, /admin, /wall 탭만 남기면 Durable Object 사용 시간을 줄일 수 있습니다.",
        tone: "blue",
      },
      {
        label: "현재 room",
        title: "현재 room 확인",
        body: "데이터 공백이 보이면 Worker name과 ARENA_ROOM_NAME부터 확인합니다.",
        tone: "red",
      },
      {
        label: "저장 실패",
        title: "저장 실패 대응",
        body: "인증 확인, settings 저장, 외부망 재시도 순서로 운영 콘텐츠를 보호합니다.",
        tone: "amber",
      },
      {
        label: "초기화",
        title: "백업 후 초기화",
        body: "원본 JSON, XLSX, settings를 받은 뒤 필요한 범위를 초기화합니다.",
        tone: "green",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "08 문제 상황 대응",
    title: "문제가 생기면 증상별 명령어를 바로 실행합니다",
    subtitle:
      "runbook은 현장에서 바로 움직이기 위한 문서입니다. health, 배포 이력, 되돌리기, 운영 점검 명령을 가까이 둡니다.",
    layout: "table",
    rows: [
      {
        key: "상태 확인",
        value: "Invoke-RestMethod /api/health",
        note: "runtime, adminPasscodeConfigured, configFile을 먼저 확인합니다.",
      },
      {
        key: "배포 이력",
        value: "wrangler deployments list",
        note: "최근 배포와 version id를 확인하고 안정 버전을 고릅니다.",
      },
      {
        key: "되돌리기",
        value: "wrangler rollback --name meeting <id> --yes",
        note: "배포 이슈는 바로 이전 안정 버전으로 되돌립니다.",
      },
      {
        key: "운영 점검",
        value: "AUDIT_URL + npm run ops:audit:*",
        note: "상태가 돌아온 뒤 인증, payload, room, SSE 탭 수를 확인합니다.",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "09 마감과 백업",
    title: "행사 마감은 export 완료가 기준입니다",
    subtitle:
      "Durable Object는 현장 운영 상태를 담는 저장소입니다. 장기 보관은 종료 직후 저장한 원본과 결과표가 맡습니다.",
    layout: "flow",
    flow: [
      {
        title: "원본 JSON",
        body: "/admin?panel=export에서 현재 room의 원본 운영 데이터를 내려받습니다.",
      },
      {
        title: "XLSX 결과",
        body: "요약, 팀별 결과, 참여자, 메시지, 퀴즈, 당첨 이력을 사람이 읽기 쉬운 표로 저장합니다.",
      },
      {
        title: "settings 저장",
        body: "다음 행사의 출발점이 될 화면 문구, 팀 정보, 퀴즈, 운영 설정을 함께 저장합니다.",
      },
      {
        title: "익명화",
        body: "공개 repo나 public/prev_settings에 넣기 전 실명, 소속, 사진, 민감 상품 정보를 제거합니다.",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "10 소개 영상",
    title: "이 소개 자료는 Remotion으로 영상화할 수 있습니다",
    subtitle:
      "운영 교육, 리허설 브리핑, 신규 운영자 온보딩에 맞춰 Studio에서 미리 보고 정지 프레임이나 mp4로 렌더링합니다.",
    layout: "hosting",
    code: [
      "cd app_introduction/remotion-deck",
      "npm install",
      "npm run dev",
      "",
      "npm run still",
      "npm run render",
    ],
    cards: [
      {
        label: "미리보기",
        title: "실시간 미리보기",
        body: "Remotion Studio에서 슬라이드 타이밍과 화면 구성을 확인합니다.",
        tone: "violet",
      },
      {
        label: "도움말",
        title: "/help",
        body: "운영 콘솔에서 바로 열 수 있는 정적 도움말 페이지와 같은 내용을 공유합니다.",
        tone: "green",
      },
    ],
    canvas: standardCanvas,
  },
  {
    kicker: "마무리",
    title: "좋은 운영은 안전한 순서에서 시작됩니다",
    subtitle:
      "room 확인, preset 확인, 미리보기 확인, 운영 점검, 내보내기. 이 다섯 순서가 여러 행사를 안정적으로 굴리는 기본입니다.",
    layout: "closing",
    note: "app_introduction/remotion-deck · public/help/index.html · /help",
    canvas: {
      content: { x: 92, y: 150, w: 1736, h: 790 },
    },
  },
];
