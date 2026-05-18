import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties,
  FormEvent as ReactFormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
  ReactNode,
} from 'react'
import { deflateSync, strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Gift,
  ImagePlus,
  Link2,
  LockKeyhole,
  LogIn,
  LogOut,
  Maximize2,
  Megaphone,
  MessageCircle,
  MoveHorizontal,
  Radio,
  RadioTower,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import './App.css'

type LogoKind = 'orbit' | 'beam' | 'grid' | 'wave' | 'core'
type ImageShape = 'circle' | 'rounded' | 'square' | 'wide'
type ImageFit = 'cover' | 'contain'
type ImageFrame = 'soft' | 'line' | 'glow' | 'clean'

type Team = {
  id: string
  code: string
  editKey?: string
  name: string
  title: string
  members: string[]
  logoFile?: string
  logoShape?: ImageShape
  logoFrame?: ImageFrame
  logoFit?: ImageFit
  logoSize?: number
  logoWidth?: number
  logoHeight?: number
  logoZoom?: number
  logoFocusX?: number
  logoFocusY?: number
  photoFit?: ImageFit
  photoShape?: ImageShape
  photoFrame?: ImageFrame
  photoWidth?: number
  photoHeight?: number
  photoRadius?: number
  photoZoom?: number
  photoFocusX?: number
  photoFocusY?: number
  baseStars: number
  baseVoters: number
  color: string
  logo: LogoKind
  sortOrder?: number
  totalStars: number
  voters: number
  rank: number
  rankDelta?: number
  share: number
  score?: number
}

type Participant = {
  id: string
  deviceId?: string
  deviceIds?: string[]
  name: string
  group: string
  department?: string
  allocations: Record<string, number>
  cheered: boolean
  cheerSubmitted?: boolean
  visibleCheerCount?: number
  hiddenCheerCount?: number
  updatedAt: number
}

type CheerMessage = {
  id: number
  teamId: string
  participantId?: string
  author: string
  text: string
  createdAt: number
  hidden?: boolean
}

type VoteEvent = {
  id: number
  participantId: string
  author: string
  teamId: string
  delta: number
  previous: number
  next: number
  createdAt: number
}

type RaffleWinner = {
  id: string
  name: string
  group?: string
  department?: string
  cheered: boolean
  rank?: number
  supportDetails?: RaffleSupportDetail[]
  cheerDetails?: RaffleCheerDetail[]
}

type RaffleSupportDetail = {
  teamId: string
  teamName: string
  stars: number
  rank?: number
}

type RaffleCheerDetail = {
  teamId: string
  teamName: string
  text: string
  createdAt: number
}

type AwardRecord = {
  id: string
  participantId: string
  participantName?: string
  participantGroup?: string
  participantDepartment?: string
  kind: 'raffle' | 'quiz'
  rank?: number
  rule?: RaffleRule
  quizId?: number
  question?: string
  prizeImageFile?: string
  prizeName?: string
  createdAt: number
}

type LastRaffle = {
  rule: RaffleRule
  winnerCount: number
  candidates: number
  winners: RaffleWinner[]
  prizeImageFile?: string
  prizeName?: string
  createdAt: number
}

type QuizMode = 'idle' | 'standby' | 'countdown' | 'open' | 'settling' | 'closed'

type QuizAnswer = {
  id: number
  quizId: number
  participantId: string
  author: string
  group: string
  department?: string
  text: string
  correct: boolean
  rank?: number
  clientSubmittedAt?: number
  clientServerOffsetMs?: number
  estimatedSubmittedAt?: number
  serverReceivedAt?: number
  createdAt: number
}

type QuizState = {
  id: number
  round: number
  mode: QuizMode
  selectedQuizId: string
  question: string
  prizeImageFile: string
  winnerCount: number
  answers: QuizAnswer[]
  winners: QuizAnswer[]
  introEndsAt: number
  opensAt: number
  settlementStartedAt: number
  settlementDeadlineAt: number
  createdAt: number
  updatedAt: number
}

type QuizConfig = {
  id: string
  title: string
  question: string
  answer: string
  acceptedAnswers: string[]
  prizeImageFile: string
  winnerCount: number
  enabled: boolean
}

type QuizSubmission = {
  accepted: boolean
  reason?: string
  correct?: boolean
  rank?: number
  text?: string
  answerId?: number
}

type ThemeMode = 'light' | 'stage'
type TimerMode = 'duration' | 'targetTime'

type EventState = {
  teams: Team[]
  participants: Participant[]
  cheers: CheerMessage[]
  voteEvents: VoteEvent[]
  awardHistory: AwardRecord[]
  closed: boolean
  closesAt: number
  lastRaffle: LastRaffle | null
  quiz: QuizState
  quizBank: QuizConfig[]
  serverTime: number
  receivedAt?: number
  sessionId: number
  configRevision: number
  configUpdatedAt: number
  settings: {
    showScoresToAudience: boolean
    starBudget: number
    maxStarsPerTeam: number
    durationMinutes: number
    timerMode: TimerMode
    targetTime: string
    minScore: number
    cheerNameMode: CheerNameMode
    themeMode: ThemeMode
  }
  copy: EventCopy
}

type PostOptions = {
  throwOnError?: boolean
}

type PostEventState = (path: string, body: unknown, options?: PostOptions) => Promise<EventState | null>
type QuizSubmissionResponse = EventState & { quizSubmission?: QuizSubmission }

type EventCopy = {
  appTitle: string
  appLogoFile: string
  appLogoShape: string
  appLogoFrame: string
  appLogoFit: string
  appLogoSize: string
  appLogoWidth: string
  appLogoHeight: string
  appLogoZoom: string
  appLogoFocusX: string
  appLogoFocusY: string
  audienceEyeline: string
  adminEyeline: string
  audienceHeroTitle: string
  audienceHeroSubtitle: string
  adminHeroTitle: string
  adminHeroSubtitle: string
  checkInEyeline: string
  checkInTitle: string
  teamVoteEyeline: string
  teamVoteTitle: string
  raffleReady: string
  raffleGuide: string
  raffleHiddenDisqualified: string
  raffleRemovedDisqualified: string
  voteClosedAlert: string
  registrationReady: string
  registrationConnecting: string
  cheerButtonLabel: string
  wallEyeline: string
  wallMetricStars: string
  wallMetricCheers: string
  wallOverviewLabel: string
  wallCheerLabel: string
  wallRaffleLabel: string
  wallShowupLabel: string
  wallQuizLabel: string
  wallArenaEyeline: string
  wallArenaTitle: string
  wallCheerEyeline: string
  wallCheerTitle: string
  wallSelectedCheerSuffix: string
  wallRaffleEyeline: string
  wallRaffleTitle: string
  wallQuizEyeline: string
  wallQuizTitle: string
  quizStandbyHeadline: string
  quizStandbySubhead: string
  quizStandbyHint: string
  quizCurrentQuestionLabel: string
  quizPendingQuestion: string
  quizAnswerEmpty: string
  showupEyeline: string
  showupTitle: string
  showupShuffleLabel: string
  contentPanelEyeline: string
  contentPanelTitle: string
  contentPanelSummary: string
  rafflePanelEyeline: string
  rafflePanelTitle: string
  rafflePrizeImageFile: string
  rafflePrizeImageAll: string
  rafflePrizeImageLeader: string
  rafflePrizeImageTop3: string
  rafflePrizeImageRank456: string
  rafflePrizeImageLowerPack: string
  rafflePrizeImageMulti: string
  rafflePrizeImageBig: string
  rafflePrizeImageLongestCheer: string
  rafflePrizeNameFile: string
  rafflePrizeNameAll: string
  rafflePrizeNameLeader: string
  rafflePrizeNameTop3: string
  rafflePrizeNameRank456: string
  rafflePrizeNameLowerPack: string
  rafflePrizeNameMulti: string
  rafflePrizeNameBig: string
  rafflePrizeNameLongestCheer: string
  raffleStartButtonLabel: string
  raffleStopButtonLabel: string
}

type EventCopyImageKey =
  | 'appLogoFile'
  | 'rafflePrizeImageFile'
  | 'rafflePrizeImageAll'
  | 'rafflePrizeImageLeader'
  | 'rafflePrizeImageTop3'
  | 'rafflePrizeImageRank456'
  | 'rafflePrizeImageLowerPack'
  | 'rafflePrizeImageMulti'
  | 'rafflePrizeImageBig'
  | 'rafflePrizeImageLongestCheer'
type RafflePrizeImageKey = Exclude<EventCopyImageKey, 'appLogoFile'>
type RafflePrizeNameKey =
  | 'rafflePrizeNameFile'
  | 'rafflePrizeNameAll'
  | 'rafflePrizeNameLeader'
  | 'rafflePrizeNameTop3'
  | 'rafflePrizeNameRank456'
  | 'rafflePrizeNameLowerPack'
  | 'rafflePrizeNameMulti'
  | 'rafflePrizeNameBig'
  | 'rafflePrizeNameLongestCheer'

type CheerNameMode = 'masked' | 'real'
type RaffleRule = 'all' | 'leader' | 'top3' | 'rank456' | 'rank7to10Three' | 'multi' | 'big' | 'longestCheer' | 'cheer'
type ConnectionState = 'connecting' | 'live' | 'offline'
type AdminSessionState = {
  ready: boolean
  required: boolean
  authenticated: boolean
  loading: boolean
  error: string
  login: (passcode: string) => Promise<boolean>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}
type AppMode = 'admin' | 'vote' | 'wall' | 'team'
type AdminPanel = 'arena' | 'participants' | 'messages' | 'raffle' | 'teams' | 'quiz' | 'export'
type WallPanel = 'overview' | 'cheer' | 'raffle' | 'quiz'

const raffleRuleOptions: Array<{ value: RaffleRule; label: string }> = [
  { value: 'all', label: '공개 응원 메시지 참여자' },
  { value: 'leader', label: '현재 1위 팀에 별을 준 참여자' },
  { value: 'top3', label: '현재 1·2·3위 팀 모두에 별을 준 참여자' },
  { value: 'rank456', label: '현재 4·5·6위 팀 모두에 별을 준 참여자' },
  { value: 'rank7to10Three', label: '현재 7·8·9·10위 중 3팀 이상에 별을 준 참여자' },
  { value: 'multi', label: '5개 이상 팀에 별을 나눠 준 참여자' },
  { value: 'big', label: '한 팀에 별 7개 이상을 준 참여자' },
  { value: 'longestCheer', label: '가장 긴 응원 메시지를 남긴 참여자' },
]

const rafflePrizeImageKeyByRule: Record<RaffleRule, RafflePrizeImageKey> = {
  all: 'rafflePrizeImageAll',
  leader: 'rafflePrizeImageLeader',
  top3: 'rafflePrizeImageTop3',
  rank456: 'rafflePrizeImageRank456',
  rank7to10Three: 'rafflePrizeImageLowerPack',
  multi: 'rafflePrizeImageMulti',
  big: 'rafflePrizeImageBig',
  longestCheer: 'rafflePrizeImageLongestCheer',
  cheer: 'rafflePrizeImageAll',
}

const rafflePrizeNameKeyByRule: Record<RaffleRule, RafflePrizeNameKey> = {
  all: 'rafflePrizeNameAll',
  leader: 'rafflePrizeNameLeader',
  top3: 'rafflePrizeNameTop3',
  rank456: 'rafflePrizeNameRank456',
  rank7to10Three: 'rafflePrizeNameLowerPack',
  multi: 'rafflePrizeNameMulti',
  big: 'rafflePrizeNameBig',
  longestCheer: 'rafflePrizeNameLongestCheer',
  cheer: 'rafflePrizeNameAll',
}

const rafflePrizeImageFields: Array<{ key: RafflePrizeImageKey; label: string; description: string }> = [
  {
    key: 'rafflePrizeImageFile',
    label: '기본 행운권 상품 이미지',
    description: '추첨 룰별 상품 이미지가 비어 있을 때 대신 보여줄 기본 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageAll',
    label: '공개 응원 메시지 참여자 상품',
    description: '추첨 룰이 “공개 응원 메시지 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageLeader',
    label: '현재 1위 팀 참여자 상품',
    description: '추첨 룰이 “현재 1위 팀에 별을 준 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageTop3',
    label: '1·2·3위 팀 참여자 상품',
    description: '추첨 룰이 “현재 1·2·3위 팀 모두에 별을 준 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageRank456',
    label: '4·5·6위 팀 참여자 상품',
    description: '추첨 룰이 “현재 4·5·6위 팀 모두에 별을 준 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageLowerPack',
    label: '7·8·9·10위 중 3팀 참여자 상품',
    description: '추첨 룰이 “현재 7·8·9·10위 중 3팀 이상에 별을 준 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageMulti',
    label: '5개 이상 팀 참여자 상품',
    description: '추첨 룰이 “5개 이상 팀에 별을 나눠 준 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageBig',
    label: '한 팀 7개 이상 참여자 상품',
    description: '추첨 룰이 “한 팀에 별 7개 이상을 준 참여자”일 때 보여줄 상품 이미지입니다.',
  },
  {
    key: 'rafflePrizeImageLongestCheer',
    label: '가장 긴 응원 메시지 참여자 상품',
    description: '추첨 룰이 “가장 긴 응원 메시지를 남긴 참여자”일 때 보여줄 상품 이미지입니다.',
  },
]

const rafflePrizeNameFields: Array<{ key: RafflePrizeNameKey; label: string; description: string }> = [
  {
    key: 'rafflePrizeNameFile',
    label: '기본 행운권 상품 이름',
    description: '룰별 상품명이 비어 있을 때 대신 보여줄 기본 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameAll',
    label: '공개 응원 메시지 참여자 상품 이름',
    description: '추첨룰 1의 상품명을 운영자 화면과 당첨 안내에 표시합니다.',
  },
  {
    key: 'rafflePrizeNameLeader',
    label: '현재 1위 팀 참여자 상품 이름',
    description: '추첨룰 2의 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameTop3',
    label: '1·2·3위 팀 참여자 상품 이름',
    description: '추첨룰 3의 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameRank456',
    label: '4·5·6위 팀 참여자 상품 이름',
    description: '추첨룰 4의 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameLowerPack',
    label: '7·8·9·10위 중 3팀 참여자 상품 이름',
    description: '추첨룰 5의 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameMulti',
    label: '5개 이상 팀 참여자 상품 이름',
    description: '추첨룰 6의 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameBig',
    label: '한 팀 7개 이상 참여자 상품 이름',
    description: '추첨룰 7의 상품명입니다.',
  },
  {
    key: 'rafflePrizeNameLongestCheer',
    label: '가장 긴 응원 메시지 참여자 상품 이름',
    description: '추첨룰 8의 상품명입니다.',
  },
]

type Point = {
  x: number
  y: number
}
type TerritoryCell = {
  team: Team
  share: number
  path: string
  polygon: Point[]
}
type BubbleGroupInput = {
  key: string
  teamId: string
  participantId?: string
  author: string
  authorGroup?: string
  messages: CheerMessage[]
  latestMessage: CheerMessage
  team: Team
  size: number
  starCount: number
}
type ParticipantSummary = Participant & {
  spent: number
  cheers: {
    total: number
    visible: number
  }
  allocationsList: Array<[string, number]>
  allocationSummary: string
  status: string
  statusClass: string
}
type TeamVisual = Pick<
  Team,
  | 'name'
  | 'logo'
  | 'color'
  | 'logoFile'
  | 'logoShape'
  | 'logoFrame'
  | 'logoFit'
  | 'logoSize'
  | 'logoWidth'
  | 'logoHeight'
  | 'logoZoom'
  | 'logoFocusX'
  | 'logoFocusY'
  | 'photoFit'
  | 'photoShape'
  | 'photoFrame'
  | 'photoWidth'
  | 'photoHeight'
  | 'photoRadius'
  | 'photoZoom'
  | 'photoFocusX'
  | 'photoFocusY'
>
type ImageTuningField = 'shape' | 'frame' | 'fit' | 'width' | 'height' | 'zoom' | 'focusX' | 'focusY'
type ImageTuningValues = Record<ImageTuningField, string> & { size?: string }

const DEFAULT_STAR_BUDGET = 10
const DEFAULT_MAX_STARS_PER_TEAM = 5
const MAX_CONFIGURABLE_STARS_PER_TEAM = 10
const DEFAULT_DURATION_MINUTES = 10
const DEFAULT_MIN_SCORE = 5
const KST_OFFSET_MINUTES = 9 * 60
const DEFAULT_TEAM_PHOTO_RADIUS = 18
const logoKinds: LogoKind[] = ['orbit', 'beam', 'grid', 'wave', 'core']
const imageShapeOptions: Array<{ value: ImageShape; label: string }> = [
  { value: 'circle', label: '원형' },
  { value: 'rounded', label: '둥근 사각형' },
  { value: 'square', label: '각진 사각형' },
  { value: 'wide', label: '와이드' },
]
const imageFrameOptions: Array<{ value: ImageFrame; label: string }> = [
  { value: 'soft', label: '부드러운 음영' },
  { value: 'line', label: '얇은 테두리' },
  { value: 'glow', label: '발광 강조' },
  { value: 'clean', label: '테두리 없음' },
]
const imageFitOptions: Array<{ value: ImageFit; label: string }> = [
  { value: 'cover', label: '채우기' },
  { value: 'contain', label: '전체 보이기' },
]
const teamColorPalette = ['#D85A6A', '#4F8EF7', '#22A699', '#F2A93B', '#8B6CF6', '#EF7A45', '#5BA85A', '#D65DB1', '#4C78A8', '#9C755F']
const copyLabels: Record<keyof EventCopy, string> = {
  appTitle: '앱 제목',
  appLogoFile: '상단 로고 이미지',
  appLogoShape: '상단 로고 모양',
  appLogoFrame: '상단 로고 테두리 효과',
  appLogoFit: '상단 로고 맞춤 방식',
  appLogoSize: '상단 로고 크기',
  appLogoWidth: '상단 로고 프레임 가로',
  appLogoHeight: '상단 로고 프레임 세로',
  appLogoZoom: '상단 로고 확대',
  appLogoFocusX: '상단 로고 가로 초점',
  appLogoFocusY: '상단 로고 세로 초점',
  audienceEyeline: '관객 화면 상단 라벨',
  adminEyeline: '관리자 화면 상단 라벨',
  audienceHeroTitle: '관객 안내 제목',
  audienceHeroSubtitle: '관객 안내 문구',
  adminHeroTitle: '관리자 안내 제목',
  adminHeroSubtitle: '관리자 안내 문구',
  checkInEyeline: '등록 영역 라벨',
  checkInTitle: '등록 안내 제목',
  teamVoteEyeline: '투표 영역 라벨',
  teamVoteTitle: '투표 영역 제목',
  raffleReady: '추첨 응모 완료 문구',
  raffleGuide: '추첨 안내 문구',
  raffleHiddenDisqualified: '숨김 처리 안내 문구',
  raffleRemovedDisqualified: '삭제 처리 안내 문구',
  voteClosedAlert: '투표 마감 안내',
  registrationReady: '재접속 안내',
  registrationConnecting: '연결 중 안내',
  cheerButtonLabel: '관객 응원 버튼 문구',
  wallEyeline: '송출 화면 상단 라벨',
  wallMetricStars: '송출 누적 별 라벨',
  wallMetricCheers: '송출 응원 메시지 라벨',
  wallOverviewLabel: '송출 실시간 현황 버튼',
  wallCheerLabel: '송출 응원 메시지 버튼',
  wallRaffleLabel: '송출 행운권 추첨 버튼',
  wallShowupLabel: '송출 말풍선 Showup 버튼',
  wallQuizLabel: '송출 퀴즈 버튼',
  wallArenaEyeline: '송출 현황 패널 라벨',
  wallArenaTitle: '송출 현황 패널 제목',
  wallCheerEyeline: '송출 응원 패널 라벨',
  wallCheerTitle: '송출 응원 패널 제목',
  wallSelectedCheerSuffix: '송출 선택 팀 응원 제목 접미사',
  wallRaffleEyeline: '송출 추첨 패널 라벨',
  wallRaffleTitle: '송출 추첨 패널 제목',
  wallQuizEyeline: '송출 퀴즈 패널 라벨',
  wallQuizTitle: '송출 퀴즈 패널 제목',
  quizStandbyHeadline: '퀴즈 대기 화면 큰 제목',
  quizStandbySubhead: '퀴즈 대기 화면 설명',
  quizStandbyHint: '퀴즈 대기 화면 보조 안내',
  quizCurrentQuestionLabel: '퀴즈 현재 문제 라벨',
  quizPendingQuestion: '퀴즈 문제 대기 문구',
  quizAnswerEmpty: '퀴즈 답변 없음 문구',
  showupEyeline: '말풍선 쇼업 라벨',
  showupTitle: '말풍선 쇼업 제목',
  showupShuffleLabel: '말풍선 섞기 버튼',
  contentPanelEyeline: '운영 콘텐츠 관리 라벨',
  contentPanelTitle: '운영 콘텐츠 관리 제목',
  contentPanelSummary: '운영 콘텐츠 관리 요약',
  rafflePanelEyeline: '관리자 추첨 패널 라벨',
  rafflePanelTitle: '관리자 추첨 패널 제목',
  rafflePrizeImageFile: '행운권 상품 이미지',
  rafflePrizeImageAll: '공개 응원 메시지 참여자 상품 이미지',
  rafflePrizeImageLeader: '현재 1위 팀 참여자 상품 이미지',
  rafflePrizeImageTop3: '1·2·3위 팀 참여자 상품 이미지',
  rafflePrizeImageRank456: '4·5·6위 팀 참여자 상품 이미지',
  rafflePrizeImageLowerPack: '7·8·9·10위 중 3팀 참여자 상품 이미지',
  rafflePrizeImageMulti: '5개 이상 팀 참여자 상품 이미지',
  rafflePrizeImageBig: '한 팀 7개 이상 참여자 상품 이미지',
  rafflePrizeImageLongestCheer: '가장 긴 응원 메시지 참여자 상품 이미지',
  rafflePrizeNameFile: '기본 행운권 상품 이름',
  rafflePrizeNameAll: '공개 응원 메시지 참여자 상품 이름',
  rafflePrizeNameLeader: '현재 1위 팀 참여자 상품 이름',
  rafflePrizeNameTop3: '1·2·3위 팀 참여자 상품 이름',
  rafflePrizeNameRank456: '4·5·6위 팀 참여자 상품 이름',
  rafflePrizeNameLowerPack: '7·8·9·10위 중 3팀 참여자 상품 이름',
  rafflePrizeNameMulti: '5개 이상 팀 참여자 상품 이름',
  rafflePrizeNameBig: '한 팀 7개 이상 참여자 상품 이름',
  rafflePrizeNameLongestCheer: '가장 긴 응원 메시지 참여자 상품 이름',
  raffleStartButtonLabel: '행운권 시작 버튼 문구',
  raffleStopButtonLabel: '행운권 정지 버튼 문구',
}

const copyHelp: Partial<Record<keyof EventCopy, string>> = {
  appTitle: '모든 화면의 좌측 상단 큰 제목입니다.',
  appLogoFile: '상단 V 로고 자리에 쓸 이미지 주소입니다. 아래 브랜드/상품 이미지 관리에서 파일도 올릴 수 있습니다.',
  audienceHeroTitle: '/vote 첫 화면의 별 배분 안내 제목입니다. {starBudget}, {maxStarsPerTeam} 사용 가능.',
  audienceHeroSubtitle: '/vote 첫 화면의 사용법 안내 문구입니다.',
  raffleGuide: '/vote 투표 보드 상단의 추첨 응모 안내입니다.',
  cheerButtonLabel: '/vote 팀 행을 열 때 보이는 응원 메시지 버튼입니다.',
  wallOverviewLabel: '/wall 상단 실시간 현황 버튼입니다.',
  wallCheerLabel: '/wall 상단 응원 메시지 버튼입니다.',
  wallRaffleLabel: '/wall 상단 행운권 추첨 버튼입니다.',
  wallShowupLabel: '/wall 상단 말풍선 쇼업 버튼입니다.',
  wallQuizLabel: '/wall 상단 퀴즈 버튼입니다.',
  quizStandbyHeadline: '/wall과 /vote 퀴즈 대기 화면의 가장 큰 안내입니다.',
  quizStandbySubhead: '/wall 퀴즈 대기 화면에서 참가자 전환 상태를 설명합니다.',
  quizStandbyHint: '/wall과 /vote 퀴즈 대기 화면의 짧은 참여 방법 안내입니다.',
  contentPanelSummary: '/admin 운영 콘텐츠 카드의 설명 문구입니다.',
  rafflePrizeImageFile: '행운권 추첨 화면의 선물 아이콘을 눌렀을 때 보여줄 상품 이미지입니다.',
  rafflePrizeImageAll: '공개 응원 메시지 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageLeader: '현재 1위 팀 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageTop3: '1·2·3위 팀 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageRank456: '4·5·6위 팀 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageLowerPack: '7·8·9·10위 중 3팀 이상 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageMulti: '5개 이상 팀 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageBig: '한 팀 7개 이상 참여자 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeImageLongestCheer: '가장 긴 응원 메시지 추첨 룰에서 기본 상품 대신 보여줄 이미지입니다.',
  rafflePrizeNameFile: '상품 이미지가 없거나 룰별 상품 이름이 비어 있을 때 쓰는 기본 상품명입니다.',
  rafflePrizeNameAll: '공개 응원 메시지 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameLeader: '현재 1위 팀 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameTop3: '1·2·3위 팀 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameRank456: '4·5·6위 팀 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameLowerPack: '7·8·9·10위 중 3팀 이상 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameMulti: '5개 이상 팀 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameBig: '한 팀 7개 이상 참여자 추첨 룰에서 보여줄 상품명입니다.',
  rafflePrizeNameLongestCheer: '가장 긴 응원 메시지 추첨 룰에서 보여줄 상품명입니다.',
  raffleStartButtonLabel: '행운권 패널과 송출 화면의 시작 버튼 문구입니다.',
  raffleStopButtonLabel: '행운권 패널과 송출 화면의 정지 버튼 문구입니다.',
}

const copyGroups: Array<{
  id: string
  eyeline: string
  title: string
  description: string
  keys: Array<keyof EventCopy>
}> = [
  {
    id: 'global',
    eyeline: 'Global',
    title: '전체 공통',
    description: '모든 화면의 상단 제목과 역할 라벨입니다.',
    keys: ['appTitle', 'audienceEyeline', 'adminEyeline', 'wallEyeline'],
  },
  {
    id: 'vote',
    eyeline: '/vote',
    title: '관객 투표 화면',
    description: '참가자가 등록, 별 배분, 응원 메시지를 작성할 때 보는 문구입니다.',
    keys: [
      'audienceHeroTitle',
      'audienceHeroSubtitle',
      'checkInEyeline',
      'checkInTitle',
      'registrationReady',
      'registrationConnecting',
      'teamVoteEyeline',
      'teamVoteTitle',
      'cheerButtonLabel',
      'raffleReady',
      'raffleGuide',
      'raffleHiddenDisqualified',
      'raffleRemovedDisqualified',
      'voteClosedAlert',
    ],
  },
  {
    id: 'admin',
    eyeline: '/admin',
    title: '관리자 콘솔',
    description: '운영 콘솔 첫 화면과 콘텐츠 관리 카드에서 보이는 문구입니다.',
    keys: ['adminHeroTitle', 'adminHeroSubtitle', 'contentPanelEyeline', 'contentPanelTitle', 'contentPanelSummary'],
  },
  {
    id: 'wall',
    eyeline: '/wall',
    title: '관객 송출 보드',
    description: '발표장 화면 상단 버튼, 실시간 별 현황, 응원 메시지 패널의 문구입니다.',
    keys: [
      'wallMetricStars',
      'wallMetricCheers',
      'wallOverviewLabel',
      'wallCheerLabel',
      'wallRaffleLabel',
      'wallShowupLabel',
      'wallQuizLabel',
      'wallArenaEyeline',
      'wallArenaTitle',
      'wallCheerEyeline',
      'wallCheerTitle',
      'wallSelectedCheerSuffix',
    ],
  },
  {
    id: 'showup',
    eyeline: 'Showup',
    title: '말풍선/행운권 쇼업',
    description: '말풍선 쇼업과 행운권 추첨 송출 화면에서 사용하는 문구입니다.',
    keys: [
      'showupEyeline',
      'showupTitle',
      'showupShuffleLabel',
      'wallRaffleEyeline',
      'wallRaffleTitle',
      'rafflePanelEyeline',
      'rafflePanelTitle',
      'raffleStartButtonLabel',
      'raffleStopButtonLabel',
    ],
  },
  {
    id: 'quiz',
    eyeline: 'Quiz',
    title: '퀴즈 진행 화면',
    description: '퀴즈 대기, 문제, 답변 스트림에서 보이는 문구입니다.',
    keys: [
      'wallQuizEyeline',
      'wallQuizTitle',
      'quizStandbyHeadline',
      'quizStandbySubhead',
      'quizStandbyHint',
      'quizCurrentQuestionLabel',
      'quizPendingQuestion',
      'quizAnswerEmpty',
    ],
  },
]
const storageKey = 'vibe-vote-participant'
const nameKey = 'vibe-vote-name'
const groupKey = 'vibe-vote-group'
const departmentKey = 'vibe-vote-department'
const registeredKey = 'vibe-vote-registered'
const registeredSessionKey = 'vibe-vote-registered-session'
const raffleDismissedKey = 'vibe-vote-raffle-dismissed-at'
const quizWinnerDismissedKey = 'vibe-vote-quiz-winner-dismissed'
const themeModeKey = 'vibe-vote-theme-mode'
const cookieMaxAge = 60 * 60 * 24 * 14
const fallbackCopy: EventCopy = {
  appTitle: 'Vibe Vote Arena',
  appLogoFile: '',
  appLogoShape: 'circle',
  appLogoFrame: 'soft',
  appLogoFit: 'cover',
  appLogoSize: '52',
  appLogoWidth: '52',
  appLogoHeight: '52',
  appLogoZoom: '1',
  appLogoFocusX: '50',
  appLogoFocusY: '50',
  audienceEyeline: 'Audience Vote',
  adminEyeline: 'Admin Arena Wall',
  audienceHeroTitle: '별 {starBudget}개를 원하는 팀에 나눠 담으세요.',
  audienceHeroSubtitle:
    '한 팀에는 최대 {maxStarsPerTeam}개까지, 마감 전까지 다시 조정할 수 있습니다. 별과 함께 응원 메시지를 남기면 경품 추첨에 자동응모됩니다.',
  adminHeroTitle: '관리자 모드에서 실시간 별 현황을 공개합니다.',
  adminHeroSubtitle: '모바일 사용자가 보낸 별과 응원 메시지가 이 화면에 즉시 반영됩니다.',
  checkInEyeline: 'Check In',
  checkInTitle: "먼저 이름과 Let's ID를 등록하세요.",
  teamVoteEyeline: 'Team Vote',
  teamVoteTitle: '팀별 별 보내기',
  raffleReady: '추첨 자동응모 완료',
  raffleGuide:
    '별 1개 이상 사용하고 응원 메시지를 작성하면 경품 추첨에 자동응모됩니다. 메시지는 모두에게 보이니 존중하는 마음을 담아주세요. 부여한 별이 많을수록 응원 메시지가 더 크게 보입니다.',
  raffleHiddenDisqualified:
    '관리자에 의해 응원 메시지가 숨김 처리되어 경품 추첨 응모 조건이 충족되지 않았습니다. 별을 준 팀에 새 응원 메시지를 작성해주세요.',
  raffleRemovedDisqualified:
    '관리자에 의해 응원 메시지가 제거되어 경품 추첨 응모 조건이 충족되지 않았습니다. 별을 준 팀에 새 응원 메시지를 작성해주세요.',
  voteClosedAlert: '투표가 마감되어 별을 추가하거나 메시지를 보낼 수 없습니다.',
  registrationReady: "같은 이름과 Let's ID로 다시 접속하면 기존 참여 내역을 이어갑니다. 이메일을 입력해도 @ 뒤 주소는 사용하지 않습니다.",
  registrationConnecting: '행사 서버에 연결하는 중입니다.',
  cheerButtonLabel: '응원 메시지 보내기',
  wallEyeline: 'Audience Wall',
  wallMetricStars: '누적 별',
  wallMetricCheers: '응원 메시지',
  wallOverviewLabel: '실시간 현황',
  wallCheerLabel: '응원메세지',
  wallRaffleLabel: '행운권추첨',
  wallShowupLabel: '말풍선 Showup',
  wallQuizLabel: '퀴즈',
  wallArenaEyeline: 'Live Arena Wall',
  wallArenaTitle: '실시간 별 현황',
  wallCheerEyeline: 'Cheer Board',
  wallCheerTitle: '응원 메시지',
  wallSelectedCheerSuffix: '응원 메시지',
  wallRaffleEyeline: 'Lucky Draw Showup',
  wallRaffleTitle: '행운권 추첨',
  wallQuizEyeline: 'Live Quiz',
  wallQuizTitle: '퀴즈',
  quizStandbyHeadline: '퀴즈를 준비 중입니다',
  quizStandbySubhead: '참가자 화면이 퀴즈 대기 모드로 전환되었습니다',
  quizStandbyHint: '문제가 출제되면 3초 카운트다운 뒤 문제가 공개됩니다. 최대한 빨리 정답을 입력하세요. :)',
  quizCurrentQuestionLabel: 'Current Question',
  quizPendingQuestion: '퀴즈 대기 중입니다.',
  quizAnswerEmpty: '아직 도착한 답변이 없습니다.',
  showupEyeline: 'Cheer Bubble',
  showupTitle: '응원 메시지',
  showupShuffleLabel: '섞기',
  contentPanelEyeline: 'Content Setup',
  contentPanelTitle: '운영 콘텐츠',
  contentPanelSummary: '팀 정보, 화면 문구, 퀴즈 문제를 한 곳에서 수정합니다.',
  rafflePanelEyeline: 'Lucky Draw',
  rafflePanelTitle: '행운권 추첨',
  rafflePrizeImageFile: '',
  rafflePrizeImageAll: '',
  rafflePrizeImageLeader: '',
  rafflePrizeImageTop3: '',
  rafflePrizeImageRank456: '',
  rafflePrizeImageLowerPack: '',
  rafflePrizeImageMulti: '',
  rafflePrizeImageBig: '',
  rafflePrizeImageLongestCheer: '',
  rafflePrizeNameFile: '',
  rafflePrizeNameAll: '',
  rafflePrizeNameLeader: '',
  rafflePrizeNameTop3: '',
  rafflePrizeNameRank456: '',
  rafflePrizeNameLowerPack: '',
  rafflePrizeNameMulti: '',
  rafflePrizeNameBig: '',
  rafflePrizeNameLongestCheer: '',
  raffleStartButtonLabel: '추첨 시작',
  raffleStopButtonLabel: '정지',
}

const fallbackTeams: Team[] = [
  {
    id: 'team-aurora',
    code: 'A1',
    name: 'Aurora Lab',
    title: '사내 지식 검색 Copilot',
    members: ['김도윤', '이서진', '박민재'],
    logoFile: '',
    baseStars: 128,
    baseVoters: 46,
    color: '#A50034',
    logo: 'orbit',
    totalStars: 128,
    voters: 46,
    rank: 1,
    share: 100,
  },
  {
    id: 'team-prism',
    code: 'B2',
    name: 'Prism Works',
    title: '제조 라인 이상 감지 대시보드',
    members: ['최서연', '한지우', '윤태오'],
    logoFile: '',
    baseStars: 112,
    baseVoters: 41,
    color: '#D85A6A',
    logo: 'beam',
    totalStars: 112,
    voters: 41,
    rank: 2,
    share: 88,
  },
  {
    id: 'team-nova',
    code: 'C3',
    name: 'Nova Ops',
    title: '회의록 자동 액션 추출기',
    members: ['정유나', '강민호', '오하린'],
    logoFile: '',
    baseStars: 104,
    baseVoters: 39,
    color: '#2E6F9E',
    logo: 'grid',
    totalStars: 104,
    voters: 39,
    rank: 3,
    share: 82,
  },
  {
    id: 'team-flow',
    code: 'D4',
    name: 'Flow Mint',
    title: '현장 작업자 음성 QA 봇',
    members: ['문도연', '배준서', '신가은'],
    logoFile: '',
    baseStars: 91,
    baseVoters: 35,
    color: '#A67835',
    logo: 'wave',
    totalStars: 91,
    voters: 35,
    rank: 4,
    share: 72,
  },
  {
    id: 'team-signal',
    code: 'E5',
    name: 'Signal One',
    title: '영업 제안서 품질 평가기',
    members: ['장하나', '서지훈', '임채원'],
    logoFile: '',
    baseStars: 88,
    baseVoters: 33,
    color: '#007C73',
    logo: 'core',
    totalStars: 88,
    voters: 33,
    rank: 5,
    share: 69,
  },
  {
    id: 'team-lattice',
    code: 'F6',
    name: 'Lattice AI',
    title: '장애 리포트 원인 추적 Agent',
    members: ['남기현', '조예린', '허준영'],
    logoFile: '',
    baseStars: 76,
    baseVoters: 29,
    color: '#6F58C9',
    logo: 'grid',
    totalStars: 76,
    voters: 29,
    rank: 6,
    share: 60,
  },
  {
    id: 'team-pulse',
    code: 'G7',
    name: 'Pulse Crew',
    title: '고객 VOC 우선순위 엔진',
    members: ['권도현', '백수아', '류현우'],
    logoFile: '',
    baseStars: 73,
    baseVoters: 27,
    color: '#E06B3D',
    logo: 'wave',
    totalStars: 73,
    voters: 27,
    rank: 7,
    share: 57,
  },
  {
    id: 'team-craft',
    code: 'H8',
    name: 'Craft Mode',
    title: '신입 온보딩 튜터',
    members: ['송지민', '고은재', '차서우'],
    logoFile: '',
    baseStars: 69,
    baseVoters: 25,
    color: '#52734D',
    logo: 'beam',
    totalStars: 69,
    voters: 25,
    rank: 8,
    share: 54,
  },
  {
    id: 'team-kindred',
    code: 'I9',
    name: 'Kindred',
    title: '협업 감정 온도 체크',
    members: ['표다은', '양준혁', '안소율'],
    logoFile: '',
    baseStars: 62,
    baseVoters: 23,
    color: '#C44B8E',
    logo: 'orbit',
    totalStars: 62,
    voters: 23,
    rank: 9,
    share: 49,
  },
  {
    id: 'team-vector',
    code: 'J10',
    name: 'Vector Room',
    title: '코드 리뷰 위험도 요약기',
    members: ['홍유나', '이도겸', '전하늘'],
    logoFile: '',
    baseStars: 57,
    baseVoters: 22,
    color: '#4C5968',
    logo: 'core',
    totalStars: 57,
    voters: 22,
    rank: 10,
    share: 45,
  },
]

const fallbackQuizBank: QuizConfig[] = [
  {
    id: 'quiz-1',
    title: '오프닝 퀴즈',
    question: '오늘 행사의 관객 참여 시스템 이름은 무엇일까요?',
    answer: 'Vibe Vote Arena',
    acceptedAnswers: ['vibevotearena', '바이브보트아레나'],
    prizeImageFile: '',
    winnerCount: 2,
    enabled: true,
  },
  {
    id: 'quiz-2',
    title: '투표 규칙',
    question: '한 참가자가 한 팀에 줄 수 있는 별의 최대 개수는 몇 개일까요?',
    answer: '5',
    acceptedAnswers: ['5개', '다섯개', '다섯 개'],
    prizeImageFile: '',
    winnerCount: 2,
    enabled: true,
  },
]

const fallbackState: EventState = {
  teams: fallbackTeams,
  participants: [],
  cheers: [
    {
      id: 1,
      teamId: 'team-aurora',
      author: '민준',
      text: '검색 데모가 바로 써볼 수 있어 보여요',
      createdAt: Date.now() - 60_000,
    },
    {
      id: 2,
      teamId: 'team-prism',
      author: '서연',
      text: '현장 적용성이 좋아요',
      createdAt: Date.now() - 30_000,
    },
  ],
  voteEvents: [],
  awardHistory: [],
  closed: false,
  closesAt: Date.now() + 10 * 60 * 1000,
  lastRaffle: null,
  quiz: {
    id: 0,
    round: 0,
    mode: 'idle',
    selectedQuizId: '',
    question: '',
    prizeImageFile: '',
    winnerCount: 2,
    answers: [],
    winners: [],
    introEndsAt: 0,
    opensAt: 0,
    settlementStartedAt: 0,
    settlementDeadlineAt: 0,
    createdAt: 0,
    updatedAt: 0,
  },
  quizBank: fallbackQuizBank,
  serverTime: Date.now(),
  receivedAt: Date.now(),
  sessionId: 0,
  configRevision: 1,
  configUpdatedAt: Date.now(),
  settings: {
    showScoresToAudience: true,
    starBudget: DEFAULT_STAR_BUDGET,
    maxStarsPerTeam: DEFAULT_MAX_STARS_PER_TEAM,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    timerMode: 'duration',
    targetTime: '',
    minScore: DEFAULT_MIN_SCORE,
    cheerNameMode: 'masked',
    themeMode: 'stage',
  },
  copy: fallbackCopy,
}

const fallbackTeamOrder = new Map(fallbackTeams.map((team, index) => [team.id, index]))
const messageTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

function App() {
  const mode = getAppMode()
  const [participantId, setParticipantId] = useState(getOrCreateParticipantId)
  const adminSession = useAdminSession(mode === 'admin')
  const allowProtectedRealtime = mode !== 'admin' || adminSession.authenticated
  const { state, connection, post } = useEventState(mode, participantId, true, allowProtectedRealtime)
  const themeMode = getThemeMode(state)
  const [name, setName] = useState(() => getStoredValue(nameKey))
  const [group, setGroup] = useState(() => getStoredValue(groupKey))
  const [department, setDepartment] = useState(() => getStoredValue(departmentKey))
  const [wallPanel, setWallPanel] = useState<WallPanel>(getInitialWallPanel)
  const [showCheerConstellation, setShowCheerConstellation] = useState(
    () => new URLSearchParams(window.location.search).get('showCheer') === '1',
  )
  const visibleWallPanel: WallPanel = mode === 'wall' && state.quiz.mode !== 'idle' ? 'quiz' : wallPanel

  const participant = state.participants.find((person) => isSameParticipantDevice(person, participantId))
  const allocations = participant?.allocations ?? {}
  const starBudget = getStarBudget(state)
  const maxStarsPerTeam = getMaxStarsPerTeam(state)
  const spentStars = sumStars(allocations)
  const remainingStars = Math.max(0, starBudget - spentStars)

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    storeValue(themeModeKey, themeMode)
  }, [themeMode])

  useEffect(() => {
    document.title = getDocumentTitle(mode, visibleWallPanel)
  }, [mode, visibleWallPanel])

  const saveName = (nextName: string) => {
    setName(nextName)
    storeValue(nameKey, nextName)
  }

  const saveGroup = (nextGroup: string) => {
    setGroup(nextGroup)
    storeValue(groupKey, nextGroup)
  }

  const saveDepartment = (nextDepartment: string) => {
    setDepartment(nextDepartment)
    storeValue(departmentKey, nextDepartment)
  }

  const switchVoteParticipant = () => {
    clearStoredValue(storageKey)
    clearStoredValue(nameKey)
    clearStoredValue(groupKey)
    clearStoredValue(departmentKey)
    clearStoredValue(registeredKey)
    clearStoredValue(registeredSessionKey)
    clearStoredValue(raffleDismissedKey)
    clearStoredValue(quizWinnerDismissedKey)

    const nextParticipantId = createParticipantId()
    storeValue(storageKey, nextParticipantId)
    setParticipantId(nextParticipantId)
    setName('')
    setGroup('')
    setDepartment('')
  }

  if (mode === 'admin' && (!adminSession.ready || (adminSession.required && !adminSession.authenticated))) {
    return (
      <main className={`app-shell theme-${themeMode}`}>
        <AdminLoginView session={adminSession} />
      </main>
    )
  }

  return (
    <main className={`app-shell theme-${themeMode} ${mode === 'wall' ? 'wall-shell-app' : ''}`}>
      <Header
        mode={mode}
        connection={connection}
        state={state}
        wallPanel={visibleWallPanel}
        onWallPanelChange={setWallPanel}
        onOpenCheerConstellation={() => setShowCheerConstellation(true)}
        onPrepareQuiz={() => {
          if (mode === 'admin' || mode === 'wall') return post('/api/quiz/prepare', {})
          return null
        }}
        onEndQuiz={() => {
          if (mode === 'admin' || mode === 'wall') return post('/api/quiz/clear', {})
          return null
        }}
        adminSession={mode === 'admin' ? adminSession : undefined}
        onVoteLogout={mode === 'vote' ? switchVoteParticipant : undefined}
      />
      {mode === 'admin' ? (
        <AdminView state={state} connection={connection} post={post} />
      ) : mode === 'wall' ? (
        <PublicWallView
          state={state}
          post={post}
          wallPanel={visibleWallPanel}
          onWallPanelChange={setWallPanel}
          showCheerConstellation={showCheerConstellation}
          onShowCheerConstellationChange={setShowCheerConstellation}
        />
      ) : mode === 'team' ? (
        <TeamSelfEditView key={getEditableConfigSignature(state)} state={state} post={post} />
      ) : (
        <VoteView
          state={state}
          participantId={participantId}
          participant={participant}
          name={name}
          group={group}
          department={department}
          onNameChange={saveName}
          onGroupChange={saveGroup}
          onDepartmentChange={saveDepartment}
          allocations={allocations}
          spentStars={spentStars}
          remainingStars={remainingStars}
          starBudget={starBudget}
          maxStarsPerTeam={maxStarsPerTeam}
          post={post}
        />
      )}
    </main>
  )
}

function AdminLoginView({ session }: { session: AdminSessionState }) {
  const [passcode, setPasscode] = useState('')

  const submit = (event: ReactFormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void session.login(passcode)
  }

  return (
    <section className="admin-auth-shell" aria-label="관리자 인증">
      <div className="admin-auth-card">
        <div className="auth-lock" aria-hidden="true">
          <LockKeyhole size={28} />
        </div>
        <p className="section-kicker">Admin Access</p>
        <h1>관리자 화면 보호</h1>
        <p className="auth-copy">
          운영 콘솔, 메시지 관리, 추첨, 초기화 기능은 관리자 passcode 확인 후 사용할 수 있습니다.
        </p>
        <form className="admin-auth-form" onSubmit={submit}>
          <label htmlFor="admin-passcode">Passcode</label>
          <input
            id="admin-passcode"
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder={session.ready ? '관리자 passcode 입력' : '상태 확인 중'}
            autoComplete="current-password"
            disabled={!session.ready || session.loading}
          />
          {session.error ? <p className="auth-error" role="alert">{session.error}</p> : null}
          <button type="submit" className="primary-action" disabled={!session.ready || session.loading || !passcode.trim()}>
            <LogIn size={17} />
            {session.loading ? '확인 중' : '입장'}
          </button>
        </form>
      </div>
    </section>
  )
}

function getAppMode(): AppMode {
  if (window.location.pathname.startsWith('/admin')) return 'admin'
  if (window.location.pathname.startsWith('/wall')) return 'wall'
  if (window.location.pathname.startsWith('/team')) return 'team'
  return 'vote'
}

function getInitialWallPanel(): WallPanel {
  const panel = new URLSearchParams(window.location.search).get('panel')
  return panel === 'cheer' || panel === 'raffle' || panel === 'quiz' ? panel : 'overview'
}

function getInitialAdminPanel(): AdminPanel | null {
  const panel = new URLSearchParams(window.location.search).get('panel')
  return panel === 'arena' ||
    panel === 'participants' ||
    panel === 'messages' ||
    panel === 'raffle' ||
    panel === 'teams' ||
    panel === 'quiz' ||
    panel === 'export'
    ? panel
    : null
}

function syncAdminPanelRoute(panel: AdminPanel | null) {
  if (!window.location.pathname.startsWith('/admin')) return

  const nextUrl = new URL(window.location.href)

  if (panel) {
    nextUrl.searchParams.delete('showCheer')
    nextUrl.searchParams.set('panel', panel)
  } else {
    nextUrl.searchParams.delete('panel')
  }

  const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  window.history.replaceState(null, '', nextPath)
}

function getDocumentTitle(mode: AppMode, wallPanel: WallPanel) {
  if (mode === 'wall') return `vibe-compete/wall${wallPanel === 'overview' ? '' : `/${wallPanel}`}`
  if (mode === 'admin') {
    const panel = getInitialAdminPanel()
    return `vibe-compete/admin${panel ? `/${panel}` : ''}`
  }
  if (mode === 'team') {
    const teamId = getTeamEditRouteId()
    return `vibe-compete/team${teamId ? `/${teamId}` : ''}`
  }
  return 'vibe-compete/vote'
}

function getTeamEditRouteId() {
  const pathMatch = window.location.pathname.match(/^\/team\/([^/?#]+)/)
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1])
  return new URLSearchParams(window.location.search).get('team') || ''
}

function getTeamEditRouteKey() {
  return new URLSearchParams(window.location.search).get('key') || ''
}

function getTeamEditPath(teamId: string, teamCode = '', editKey = '') {
  return `/team/${encodeURIComponent(teamId)}?key=${encodeURIComponent(getTeamEditKey(teamId, teamCode, editKey))}`
}

function getTeamEditKey(teamId: string, teamCode = '', editKey = '') {
  const explicitKey = sanitizeClientSlug(editKey)
  if (explicitKey) return explicitKey

  let hash = 2166136261
  const value = `${teamId}|${teamCode}|vibe-team-edit`

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function Header({
  mode,
  connection,
  state,
  wallPanel,
  onWallPanelChange,
  onOpenCheerConstellation,
  onPrepareQuiz,
  onEndQuiz,
  adminSession,
  onVoteLogout,
}: {
  mode: AppMode
  connection: ConnectionState
  state: EventState
  wallPanel: WallPanel
  onWallPanelChange: (panel: WallPanel) => void
  onOpenCheerConstellation: () => void
  onPrepareQuiz?: () => Promise<EventState | null> | EventState | null | void
  onEndQuiz?: () => Promise<EventState | null> | EventState | null | void
  adminSession?: AdminSessionState
  onVoteLogout?: () => void
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const secondsLeft = Math.max(0, Math.floor((state.closesAt - now) / 1000))
  const connectionLabel = connection === 'live' ? 'Live' : connection === 'connecting' ? '연결 중' : '오프라인 데모'
  const voteUrl = `${window.location.host}/vote`
  const wallTotalStars = state.teams.reduce((sum, team) => sum + team.totalStars, 0)
  const wallVisibleCheers = state.cheers.filter((message) => !message.hidden).length
  const adminPanel = new URLSearchParams(window.location.search).get('panel')
  const adminOverviewActive = state.quiz.mode === 'idle' && (!adminPanel || adminPanel === 'arena')
  const adminQuizActive = adminPanel === 'quiz' || state.quiz.mode !== 'idle'

  return (
    <header className={`topbar ${mode === 'admin' ? 'admin-topbar' : 'audience-topbar'} ${mode === 'wall' ? 'wall-topbar' : ''}`} aria-label="행사 상태">
      <div className="brand-lockup">
        <BrandMark copy={state.copy} />
        <div>
          <p className="eyeline">{mode === 'admin' ? state.copy.adminEyeline : mode === 'wall' ? state.copy.wallEyeline : state.copy.audienceEyeline}</p>
          <div className="brand-title-row">
            <h1>{state.copy.appTitle}</h1>
            {mode === 'admin' ? <span className="admin-console-badge">운영 콘솔</span> : null}
          </div>
        </div>
      </div>

      <div className="event-controls">
        {mode === 'admin' ? (
          <>
            <a className={`role-nav-link ${adminOverviewActive ? 'active' : ''}`} href="/admin">
              <RadioTower size={15} />
              실시간 현황
            </a>
            <a className={`role-nav-link ${adminPanel === 'teams' ? 'active' : ''}`} href="/admin?panel=teams">
              <Settings2 size={15} />
              운영 콘텐츠
            </a>
            <a className={`role-nav-link ${adminPanel === 'messages' ? 'active' : ''}`} href="/admin?panel=messages">
              <MessageCircle size={15} />
              메시지 관리
            </a>
            <a className={`role-nav-link ${adminPanel === 'participants' ? 'active' : ''}`} href="/admin?panel=participants">
              <Users size={15} />
              참여자 리스트
            </a>
            <a className={`role-nav-link ${adminPanel === 'export' ? 'active' : ''}`} href="/admin?panel=export">
              <FileSpreadsheet size={15} />
              결과 내보내기
            </a>
            <a
              className={`role-nav-link ${adminQuizActive ? 'active' : ''}`}
              href="/admin?panel=quiz"
              onClick={(event) => {
                if (!onPrepareQuiz) return
                event.preventDefault()
                void onPrepareQuiz()
              }}
            >
              <CircleHelp size={15} />
              퀴즈 운영
            </a>
            <a className="role-nav-link" href="/admin?showCheer=1">
              <Sparkles size={15} />
              Showup
            </a>
            <a className="role-nav-link" href="/wall" target="_blank" rel="noreferrer">
              <Radio size={15} />
              관객 송출 보드
            </a>
            <a className="role-nav-link" href="/vote" target="_blank" rel="noreferrer">
              <Megaphone size={15} />
              관객 화면 미리보기
            </a>
            {adminSession ? (
              <>
                <button
                  type="button"
                  className="role-nav-link auth-action"
                  onClick={() => {
                    void adminSession.refresh()
                  }}
                  disabled={adminSession.loading}
                >
                  <RefreshCcw size={15} />
                  인증 확인
                </button>
                <button
                  type="button"
                  className="role-nav-link auth-action"
                  onClick={() => {
                    void adminSession.logout()
                  }}
                  disabled={adminSession.loading || !adminSession.required}
                  title={adminSession.required ? '관리자 세션에서 로그아웃' : '현재 배포는 관리자 passcode가 필요하지 않습니다'}
                >
                  <LogOut size={15} />
                  {adminSession.required ? '로그아웃' : '인증 불필요'}
                </button>
              </>
            ) : null}
            <div className="short-url" aria-label="모바일 접속 주소">
              <Radio size={16} />
              <span>{voteUrl}</span>
            </div>
          </>
        ) : mode === 'wall' ? (
          <>
            <div className="public-wall-metrics wall-topbar-metrics" aria-label="관객 공개 지표">
              <div>
                <span>{state.copy.wallMetricStars}</span>
                <strong>{wallTotalStars}</strong>
              </div>
              <div>
                <span>{state.copy.wallMetricCheers}</span>
                <strong>{wallVisibleCheers}</strong>
              </div>
            </div>
            <div className="public-wall-actions wall-topbar-actions">
              <button
                type="button"
                className={wallPanel === 'overview' ? 'active' : ''}
                onClick={() => {
                  if (state.quiz.mode !== 'idle') onEndQuiz?.()
                  onWallPanelChange('overview')
                }}
              >
                <RadioTower size={16} />
                {state.copy.wallOverviewLabel}
              </button>
              <button type="button" className={wallPanel === 'cheer' ? 'active' : ''} onClick={() => onWallPanelChange('cheer')}>
                <MessageCircle size={16} />
                {state.copy.wallCheerLabel}
              </button>
              <button type="button" className={wallPanel === 'raffle' ? 'active' : ''} onClick={() => onWallPanelChange('raffle')}>
                <Ticket size={16} />
                {state.copy.wallRaffleLabel}
              </button>
              <button type="button" onClick={onOpenCheerConstellation}>
                <Sparkles size={17} />
                {state.copy.wallShowupLabel}
              </button>
              <button
                type="button"
                className={wallPanel === 'quiz' ? 'active' : ''}
                onClick={() => {
                  onWallPanelChange('overview')
                  onPrepareQuiz?.()
                }}
              >
                <CircleHelp size={16} />
                {state.copy.wallQuizLabel}
              </button>
            </div>
          </>
        ) : (
          <div className="audience-status-pill" aria-label="현재 화면">
            {mode === 'team' ? <Settings2 size={16} /> : <Radio size={16} />}
            <span>{mode === 'team' ? '팀 정보 편집' : '관객 투표 화면'}</span>
          </div>
        )}
        <div className={`timer ${state.closed ? 'closed' : ''}`}>
          <Clock3 size={18} />
          <span>{state.closed ? '투표 마감' : formatTime(secondsLeft)}</span>
        </div>
        <div className={`connection ${connection}`}>
          <span className="live-dot" />
          <span>{connectionLabel}</span>
        </div>
        {mode === 'vote' && onVoteLogout ? (
          <button type="button" className="session-logout-button" onClick={onVoteLogout}>
            <LogOut size={15} />
            Logout
          </button>
        ) : null}
      </div>
    </header>
  )
}

function BrandMark({ copy }: { copy: EventCopy }) {
  const shape = normalizeImageShape(copy.appLogoShape, 'circle')
  const frame = normalizeImageFrame(copy.appLogoFrame, 'soft')
  const fit = normalizeImageFit(copy.appLogoFit, 'cover')

  return (
    <div
      className={`lg-dot shape-${shape} frame-${frame} ${copy.appLogoFile ? 'has-image' : ''}`}
      style={getAppLogoStyle(copy)}
      aria-hidden="true"
    >
      {copy.appLogoFile ? (
        <img
          src={copy.appLogoFile}
          alt=""
          style={{
            objectFit: fit,
            objectPosition: `${getPercentValue(copy.appLogoFocusX, 50)}% ${getPercentValue(copy.appLogoFocusY, 50)}%`,
            transform: `scale(${getZoomValue(copy.appLogoZoom, 1)})`,
            transformOrigin: `${getPercentValue(copy.appLogoFocusX, 50)}% ${getPercentValue(copy.appLogoFocusY, 50)}%`,
          }}
        />
      ) : 'V'}
    </div>
  )
}

type BrandLogoEditMode = 'focus' | 'width' | 'height' | 'frame'

function BrandLogoFrameEditor({
  copy,
  onChange,
  onUpload,
}: {
  copy: EventCopy
  onChange: (field: ImageTuningField, value: string) => void
  onUpload: (file: File | undefined) => void
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    mode: BrandLogoEditMode
    startX: number
    startY: number
    width: number
    height: number
    focusX: number
    focusY: number
    renderedWidth: number
    renderedHeight: number
  } | null>(null)
  const shape = normalizeImageShape(copy.appLogoShape, 'circle')
  const size = getImageSizeValue(copy.appLogoSize, 52, 36, 92)
  const fallbackFrame = getDefaultImageFrameDimensions(shape, size)
  const width = getImageDimensionValue(copy.appLogoWidth, fallbackFrame.width, 36, 220)
  const height = getImageDimensionValue(copy.appLogoHeight, fallbackFrame.height, 32, 120)
  const focusX = getPercentValue(copy.appLogoFocusX, 50)
  const focusY = getPercentValue(copy.appLogoFocusY, 50)
  const zoom = getZoomValue(copy.appLogoZoom, 1)

  const beginDrag = (mode: BrandLogoEditMode, event: ReactPointerEvent<HTMLElement>) => {
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds) return

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      width,
      height,
      focusX,
      focusY,
      renderedWidth: bounds.width,
      renderedHeight: bounds.height,
    }
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (drag.mode === 'focus') {
      onChange('focusX', String(clamp(Math.round(drag.focusX + (deltaX / Math.max(1, drag.renderedWidth)) * 100), 0, 100)))
      onChange('focusY', String(clamp(Math.round(drag.focusY + (deltaY / Math.max(1, drag.renderedHeight)) * 100), 0, 100)))
      return
    }

    const scaleX = drag.width / Math.max(1, drag.renderedWidth)
    const scaleY = drag.height / Math.max(1, drag.renderedHeight)

    if (drag.mode === 'width' || drag.mode === 'frame') {
      onChange('width', String(clamp(Math.round(drag.width + deltaX * scaleX), 36, 220)))
    }

    if (drag.mode === 'height' || drag.mode === 'frame') {
      onChange('height', String(clamp(Math.round(drag.height + deltaY * scaleY), 32, 120)))
    }
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be released by the browser.
    }
    dragRef.current = null
  }

  const adjustZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!copy.appLogoFile) return
    event.preventDefault()
    const step = event.deltaY < 0 ? 0.05 : -0.05
    onChange('zoom', String(Number(clamp(zoom + step, 1, 2.4).toFixed(2))))
  }

  return (
    <div
      className="brand-logo-frame-editor"
      ref={frameRef}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={adjustZoom}
    >
      <BrandMark copy={copy} />
      {copy.appLogoFile ? (
        <>
          <button
            type="button"
            className="photo-editor-surface"
            aria-label="상단 로고 초점 이동"
            title="상단 로고 초점 이동"
            onPointerDown={(event) => beginDrag('focus', event)}
          />
          <span className="photo-editor-focus" style={{ left: `${focusX}%`, top: `${focusY}%` }} aria-hidden="true" />
        </>
      ) : null}
      <label className="photo-upload-hotspot compact" title="상단 로고 파일 변경">
        <ImagePlus size={13} />
        변경
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          onChange={(event) => {
            onUpload(event.currentTarget.files?.[0])
            event.currentTarget.value = ''
          }}
        />
      </label>
      <button type="button" className="photo-resize-handle width" aria-label="상단 로고 가로 조절" onPointerDown={(event) => beginDrag('width', event)} />
      <button type="button" className="photo-resize-handle height" aria-label="상단 로고 세로 조절" onPointerDown={(event) => beginDrag('height', event)} />
      <button type="button" className="photo-resize-handle corner" aria-label="상단 로고 크기 조절" onPointerDown={(event) => beginDrag('frame', event)} />
    </div>
  )
}

type QuizDisplayPhase = 'idle' | 'standby' | 'intro' | 'countdown' | 'open' | 'settling' | 'closed'

function useQuizClock(quiz: QuizState, serverTime?: number, receivedAt?: number) {
  const serverOffset =
    typeof serverTime === 'number' && typeof receivedAt === 'number' ? serverTime - receivedAt : 0
  const [now, setNow] = useState(() => Date.now() + serverOffset)

  useEffect(() => {
    if (quiz.mode !== 'countdown' && quiz.mode !== 'open' && quiz.mode !== 'settling') {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now() + serverOffset), 180)
    return () => window.clearInterval(timer)
  }, [quiz.id, quiz.mode, serverOffset])

  return now
}

function getQuizDisplayPhase(quiz: QuizState, now = Date.now()): QuizDisplayPhase {
  if (quiz.mode === 'standby') return 'standby'

  if (quiz.mode === 'countdown') {
    if (quiz.introEndsAt > 0 && now < quiz.introEndsAt) return 'intro'
    if (quiz.opensAt > 0 && now < quiz.opensAt) return 'countdown'
    return 'open'
  }

  return quiz.mode
}

function getQuizCountdownValue(quiz: QuizState, now: number) {
  return clamp(Math.ceil(Math.max(0, quiz.opensAt - now) / 1000), 1, 3)
}

function getQuizSettlementValue(quiz: QuizState, now: number) {
  return clamp(Math.ceil(Math.max(0, quiz.settlementDeadlineAt - now) / 1000), 1, 3)
}

function isQuizParticipationActive(quiz: QuizState, now = Date.now()) {
  const phase = getQuizDisplayPhase(quiz, now)
  return phase === 'standby' || phase === 'intro' || phase === 'countdown' || phase === 'open' || phase === 'settling' || phase === 'closed'
}

function VoteView({
  state,
  participantId,
  participant,
  name,
  group,
  department,
  onNameChange,
  onGroupChange,
  onDepartmentChange,
  allocations,
  spentStars,
  remainingStars,
  starBudget,
  maxStarsPerTeam,
  post,
}: {
  state: EventState
  participantId: string
  participant: Participant | undefined
  name: string
  group: string
  department: string
  onNameChange: (name: string) => void
  onGroupChange: (group: string) => void
  onDepartmentChange: (department: string) => void
  allocations: Record<string, number>
  spentStars: number
  remainingStars: number
  starBudget: number
  maxStarsPerTeam: number
  post: PostEventState
}) {
  const [cheerTexts, setCheerTexts] = useState<Record<string, string>>({})
  const [quizAnswerDraft, setQuizAnswerDraft] = useState({ quizId: 0, text: '' })
  const [quizFeedbackDraft, setQuizFeedbackDraft] = useState({ quizId: 0, text: '' })
  const [dismissedRaffleAt, setDismissedRaffleAt] = useState(() => Number(getStoredValue(raffleDismissedKey)) || 0)
  const [dismissedQuizWinner, setDismissedQuizWinner] = useState(() => getStoredValue(quizWinnerDismissedKey))
  const [noticeMountedAt] = useState(() => Date.now())
  const [cheerReadAtByTeam, setCheerReadAtByTeam] = useState<Record<string, number>>({})
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const directTeamRefs = useRef<Record<string, HTMLElement | null>>({})
  const cheerThreadRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const cheerInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const pendingExpandedTeamFrameRef = useRef<string | null>(null)
  const pendingCheerFocusTeamRef = useRef<string | null>(null)
  const pendingCollapsedTeamFocusRef = useRef<string | null>(null)

  const audienceTeams = useMemo(() => {
    return [...state.teams].sort((a, b) => (fallbackTeamOrder.get(a.id) ?? 0) - (fallbackTeamOrder.get(b.id) ?? 0))
  }, [state.teams])
  const hasRegistrationInfo = Boolean(name.trim() && normalizeLetsIdDisplay(group) && department.trim())
  const departmentDisplay = department.trim() || participant?.department || ''
  const sessionReady = state.sessionId > 0
  const isRegistered = Boolean(participant)
  const canVote = sessionReady && isRegistered && !state.closed
  const perTeamStarLimit = Math.min(starBudget, maxStarsPerTeam)
  const currentParticipantId = participant?.id ?? participantId
  const participantMessages = state.cheers.filter((message) => message.participantId === currentParticipantId)
  const quizNow = useQuizClock(state.quiz, state.serverTime, state.receivedAt)
  const quizServerOffset =
    typeof state.serverTime === 'number' && typeof state.receivedAt === 'number' ? state.serverTime - state.receivedAt : 0
  const quizPhase = getQuizDisplayPhase(state.quiz, quizNow)
  const quizActive = isQuizParticipationActive(state.quiz, quizNow)
  const quizAnswerText = quizAnswerDraft.quizId === state.quiz.id ? quizAnswerDraft.text : ''
  const quizFeedback = quizFeedbackDraft.quizId === state.quiz.id ? quizFeedbackDraft.text : ''
  const myQuizAnswers = state.quiz.answers.filter((answer) => answer.participantId === currentParticipantId)
  const quizAttemptCount = myQuizAnswers.length
  const quizAttemptLimit = 5
  const latestMyQuizAnswer = myQuizAnswers[0]
  const myWinningQuizAnswer = state.quiz.winners.find((answer) => answer.participantId === currentParticipantId)
  const quizWinnerNoticeKey = myWinningQuizAnswer ? `${myWinningQuizAnswer.quizId}:${myWinningQuizAnswer.id}` : ''
  const showQuizWinnerNotice = Boolean(
    myWinningQuizAnswer &&
      myWinningQuizAnswer.createdAt > noticeMountedAt &&
      quizWinnerNoticeKey !== dismissedQuizWinner,
  )
  const raffleWinner = isRegistered ? state.lastRaffle?.winners.find((winner) => winner.id === currentParticipantId) : undefined
  const showRaffleWinnerNotice = Boolean(
    state.lastRaffle &&
      raffleWinner &&
      state.lastRaffle.createdAt > noticeMountedAt &&
      state.lastRaffle.createdAt !== dismissedRaffleAt,
  )
  const myAwardHistory = useMemo(() => {
    return buildParticipantAwardHistory(state, currentParticipantId)
  }, [currentParticipantId, state])
  const hasVisibleCheer = participantMessages.some((message) => !message.hidden)
  const hasHiddenCheer = participantMessages.some((message) => message.hidden)
  const hasSubmittedCheer = Boolean(participant?.cheerSubmitted || participantMessages.length)
  const raffleReady = spentStars > 0 && hasVisibleCheer
  const raffleStatusText = raffleReady
    ? state.copy.raffleReady
    : spentStars > 0 && hasHiddenCheer
      ? state.copy.raffleHiddenDisqualified
      : spentStars > 0 && hasSubmittedCheer
        ? state.copy.raffleRemovedDisqualified
        : state.copy.raffleGuide
  const moderationNoticeText =
    spentStars > 0 && !raffleReady && hasSubmittedCheer
      ? hasHiddenCheer
        ? state.copy.raffleHiddenDisqualified
        : state.copy.raffleRemovedDisqualified
      : ''

  useEffect(() => {
    if (!expandedTeamId) return

    const thread = cheerThreadRefs.current[expandedTeamId]
    if (!thread) return

    window.requestAnimationFrame(() => {
      thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
    })
  }, [expandedTeamId, state.cheers.length])

  useEffect(() => {
    const teamId = pendingCheerFocusTeamRef.current
    if (!teamId || expandedTeamId !== teamId) return

    pendingCheerFocusTeamRef.current = null
    window.requestAnimationFrame(() => {
      directTeamRefs.current[teamId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      cheerThreadRefs.current[teamId]?.scrollTo({ top: cheerThreadRefs.current[teamId]?.scrollHeight ?? 0, behavior: 'smooth' })
      cheerInputRefs.current[teamId]?.focus({ preventScroll: true })
    })
  }, [expandedTeamId, state.cheers.length])

  useEffect(() => {
    const teamId = pendingExpandedTeamFrameRef.current
    if (!teamId || expandedTeamId !== teamId) return

    pendingExpandedTeamFrameRef.current = null
    window.requestAnimationFrame(() => {
      directTeamRefs.current[teamId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [expandedTeamId])

  useEffect(() => {
    const teamId = pendingCollapsedTeamFocusRef.current
    if (!teamId || expandedTeamId) return

    pendingCollapsedTeamFocusRef.current = null
    window.requestAnimationFrame(() => {
      directTeamRefs.current[teamId]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [expandedTeamId])

  const setTeamStars = async (teamId: string, targetStars: number) => {
    if (!canVote) return
    const current = allocations[teamId] ?? 0
    const target = Math.min(targetStars, perTeamStarLimit)
    const maxForTeam = Math.min(perTeamStarLimit, current + remainingStars)
    const nextStars = Math.min(current === target ? Math.max(0, target - 1) : target, maxForTeam)
    const removesAllStars = current > 0 && nextStars === 0
    const hasTeamMessages = state.cheers.some(
      (message) => message.participantId === currentParticipantId && message.teamId === teamId,
    )

    if (
      removesAllStars &&
      hasTeamMessages &&
      !window.confirm('이 팀에 보낸 별을 모두 회수하면 내가 남긴 응원 메시지도 함께 삭제됩니다. 계속할까요?')
    ) {
      return
    }

    await updateVote(post, state.sessionId, participantId, name, group, departmentDisplay, { ...allocations, [teamId]: nextStars })
  }

  const registerParticipant = async () => {
    if (!sessionReady || !hasRegistrationInfo) return
    const letsId = normalizeLetsIdDisplay(group)
    const response = await post('/api/register', {
      sessionId: state.sessionId,
      participantId,
      name: name.trim(),
      group: letsId,
      department: departmentDisplay,
    })
    if (response) {
      onGroupChange(letsId)
      storeValue(registeredKey, '1')
      storeValue(registeredSessionKey, String(response.sessionId))
    }
  }

  const handleRegistrationSubmit = (event: ReactFormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void registerParticipant()
  }

  const markTeamCheerRead = (teamId: string) => {
    setCheerReadAtByTeam((current) => ({ ...current, [teamId]: Date.now() }))
  }

  const toggleTeamCheer = (teamId: string, expanded: boolean) => {
    markTeamCheerRead(teamId)
    if (expanded) {
      pendingCollapsedTeamFocusRef.current = teamId
    } else {
      pendingExpandedTeamFrameRef.current = teamId
    }
    setExpandedTeamId(expanded ? null : teamId)
  }

  const sendCheer = async (teamId: string) => {
    const text = (cheerTexts[teamId] ?? '').trim()
    if (!canVote || !teamId || !text || (allocations[teamId] ?? 0) <= 0) return

    const response = await post('/api/cheer', {
      sessionId: state.sessionId,
      participantId,
      name: name.trim(),
      group: normalizeLetsIdDisplay(group),
      department: departmentDisplay,
      teamId,
      text,
    })

    if (response) {
      pendingCheerFocusTeamRef.current = teamId
      setExpandedTeamId(teamId)
      markTeamCheerRead(teamId)
      setCheerTexts((current) => ({ ...current, [teamId]: '' }))
    }
  }

  const handleCheerKeyDown = (teamId: string, event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

    event.preventDefault()
    sendCheer(teamId)
  }

  const sendQuizAnswer = async () => {
    const text = quizAnswerText.trim()
    if (quizAttemptCount >= quizAttemptLimit) {
      setQuizFeedbackDraft({
        quizId: state.quiz.id,
        text: `이 문제는 최대 ${quizAttemptLimit}번까지만 제출할 수 있습니다.`,
      })
      return
    }

    if (!text || !isRegistered || quizPhase !== 'open') return

    const response = await post('/api/quiz/answer', {
      sessionId: state.sessionId,
      participantId,
      name: name.trim(),
      group: normalizeLetsIdDisplay(group),
      department: departmentDisplay,
      text,
      quizId: state.quiz.id,
      clientSubmittedAt: Date.now(),
      clientServerOffsetMs: quizServerOffset,
    })

    if (!response) return

    const submission = (response as QuizSubmissionResponse).quizSubmission
    if (submission && !submission.accepted) {
      setQuizFeedbackDraft({
        quizId: state.quiz.id,
        text: submission.reason || '답변을 접수하지 못했습니다.',
      })
      return
    }

    const submittedAnswer = response.quiz.answers.find(
      (answer) => answer.participantId === currentParticipantId && answer.text === text,
    )
    setQuizAnswerDraft({ quizId: state.quiz.id, text: '' })
    setQuizFeedbackDraft({
      quizId: state.quiz.id,
      text: (submission?.correct ?? submittedAnswer?.correct)
        ? response.quiz.mode === 'settling'
          ? '정답 후보입니다. 최종 정답 확인 중...'
          : '정답 후보로 접수되었습니다.'
        : '정답이 아닙니다.',
    })
  }

  const handleQuizKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

    event.preventDefault()
    sendQuizAnswer()
  }

  const dismissRaffleWinnerNotice = () => {
    const dismissedAt = state.lastRaffle?.createdAt ?? Date.now()
    storeValue(raffleDismissedKey, String(dismissedAt))
    setDismissedRaffleAt(dismissedAt)
  }

  const dismissQuizWinnerNotice = () => {
    if (!quizWinnerNoticeKey) return
    storeValue(quizWinnerDismissedKey, quizWinnerNoticeKey)
    setDismissedQuizWinner(quizWinnerNoticeKey)
  }

  return (
    <>
      {!quizActive ? (
        <section className="hero-band audience">
          <div>
            <h2>{renderStarAccent(formatCopy(state.copy.audienceHeroTitle, { starBudget, maxStarsPerTeam }))}</h2>
            <p>{formatCopy(state.copy.audienceHeroSubtitle, { starBudget, maxStarsPerTeam })}</p>
          </div>
          <StarWallet remainingStars={remainingStars} spentStars={spentStars} starBudget={starBudget} />
        </section>
      ) : null}

      {showRaffleWinnerNotice && raffleWinner ? (
        <RaffleWinnerNotice state={state} winner={raffleWinner} onDismiss={dismissRaffleWinnerNotice} />
      ) : null}

      {showQuizWinnerNotice && myWinningQuizAnswer ? (
        <QuizWinnerNotice winner={myWinningQuizAnswer} onDismiss={dismissQuizWinnerNotice} />
      ) : null}

      {quizActive && isRegistered ? (
        <section className="quiz-participant-banner" aria-label="퀴즈 참여자 정보">
          <div>
            <span>참여자</span>
            <strong>{name}</strong>
          </div>
          <div>
            <span>Let's ID</span>
            <strong>{normalizeLetsIdDisplay(group)}</strong>
          </div>
          {departmentDisplay ? (
            <div>
            <span>팀명/부서/소속</span>
              <strong>{departmentDisplay}</strong>
            </div>
          ) : null}
        </section>
      ) : null}

      {!isRegistered ? (
        <section className="registration-shell" aria-label="참여자 등록">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">{state.copy.checkInEyeline}</p>
              <h2>{state.copy.checkInTitle}</h2>
            </div>
          </div>
          <form className="registration-form" onSubmit={handleRegistrationSubmit}>
            <label>
              <span>이름</span>
              <input
                value={name}
                maxLength={18}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="예: 김민준"
              />
              </label>
            <label>
              <span>Let's ID</span>
              <input
                value={group}
                maxLength={48}
                onChange={(event) => onGroupChange(event.target.value)}
                placeholder="예: hyun-jung.kim"
              />
            </label>
            <label>
              <span>부서/소속</span>
              <input
                value={department}
                maxLength={40}
                onChange={(event) => onDepartmentChange(event.target.value)}
                placeholder="예: DX팀"
              />
            </label>
            <button type="submit" disabled={!hasRegistrationInfo || !sessionReady}>
              <Check size={17} />
              등록하고 투표 시작
            </button>
          </form>
          <p className="registration-note">
            {sessionReady ? `${state.copy.registrationReady} 팀명/부서/소속도 함께 입력해야 입장할 수 있습니다.` : state.copy.registrationConnecting}
          </p>
        </section>
      ) : quizActive ? (
        <QuizParticipationView
          quiz={state.quiz}
          copy={state.copy}
          serverTime={state.serverTime}
          receivedAt={state.receivedAt}
          answerText={quizAnswerText}
          onAnswerTextChange={(value) => setQuizAnswerDraft({ quizId: state.quiz.id, text: value })}
          onSubmit={sendQuizAnswer}
          onKeyDown={handleQuizKeyDown}
          latestAnswer={latestMyQuizAnswer}
          winningAnswer={myWinningQuizAnswer}
          feedback={quizFeedback}
          attemptCount={quizAttemptCount}
          attemptLimit={quizAttemptLimit}
        />
      ) : (
        <section className="direct-vote-grid">
          <section className="team-catalog direct" aria-label="팀별 별 투표">
            <div className="section-heading compact">
              <div>
                <p className="section-kicker">{state.copy.teamVoteEyeline}</p>
                <h2>{renderStarAccent(state.copy.teamVoteTitle)}</h2>
              </div>
              <div className="participant-chip">
                <strong>{name}</strong>
                <span>{[normalizeLetsIdDisplay(group), departmentDisplay].filter(Boolean).join(' · ')}</span>
              </div>
            </div>

            <div className={`raffle-status ${raffleReady ? 'ready' : ''}`} aria-live="polite">
              <Gift size={18} />
              <span>{raffleStatusText}</span>
            </div>
            <ParticipantAwardHistory awards={myAwardHistory} state={state} />
            {moderationNoticeText ? (
              <div className="inline-alert moderation-alert" role="status" aria-live="assertive">
                <EyeOff size={17} />
                <span>{moderationNoticeText}</span>
              </div>
            ) : null}

            {state.closed ? <p className="inline-alert">{state.copy.voteClosedAlert}</p> : null}

            <div className="direct-team-list">
              {audienceTeams.map((team) => {
                const myStars = allocations[team.id] ?? 0
                const canCheerForTeam = canVote && myStars > 0
                const maxSelectable = Math.min(perTeamStarLimit, myStars + remainingStars)
                const expanded = expandedTeamId === team.id
                const visibleTeamCheers = state.cheers
                  .filter((message) => message.teamId === team.id && !message.hidden)
                  .sort((a, b) => a.createdAt - b.createdAt)
                const teamCheers = visibleTeamCheers.slice(-10)
                const unreadCheerCount = visibleTeamCheers.filter(
                  (message) =>
                    message.participantId !== currentParticipantId &&
                    message.createdAt > (cheerReadAtByTeam[team.id] ?? noticeMountedAt),
                ).length

                return (
                  <article
                    className={`direct-team ${myStars > 0 ? 'has-stars' : ''} ${expanded ? 'is-expanded' : ''}`}
                    key={team.id}
                    style={{ '--team-color': team.color } as CSSProperties}
                    ref={(node) => {
                      directTeamRefs.current[team.id] = node
                    }}
                  >
                    <div className="direct-team-head">
                      <button
                        type="button"
                        className="direct-team-summary"
                        onClick={() => toggleTeamCheer(team.id, expanded)}
                        aria-expanded={expanded}
                      >
                        <LogoMark team={team} />
                        <div className="direct-team-copy">
                          <strong>{team.name}</strong>
                          <span>{team.title}</span>
                        </div>
                      </button>

                      <div className="team-vote-control">
                        <div className="team-vote-meta">
                          <button
                            type="button"
                            className="cheer-summary-action"
                            onClick={() => toggleTeamCheer(team.id, expanded)}
                            aria-expanded={expanded}
                          >
                            <span>{expanded ? '닫기' : state.copy.cheerButtonLabel}</span>
                            {!expanded && unreadCheerCount > 0 ? (
                              <em aria-label={`읽지 않은 응원 메시지 ${unreadCheerCount}개`}>
                                {Math.min(unreadCheerCount, 99)}
                              </em>
                            ) : null}
                          </button>
                          <span className="team-star-count">{myStars} / {perTeamStarLimit}</span>
                        </div>

                        <div className="team-star-picker" aria-label={`${team.name}에 준 별 ${myStars}개`}>
                          {Array.from({ length: perTeamStarLimit }).map((_, index) => {
                            const target = index + 1
                            const disabled = !canVote || target > maxSelectable
                            const filled = index < myStars
                            const className = filled ? 'filled' : disabled ? 'locked' : 'available'

                            return (
                              <button
                                type="button"
                                key={target}
                                className={className}
                                onClick={() => setTeamStars(team.id, target)}
                                disabled={disabled}
                                title={
                                  state.closed
                                    ? '투표가 마감되었습니다.'
                                    : target > maxSelectable
                                      ? '남은 별이 부족합니다.'
                                      : `${team.name}에 별 ${target}개 적용`
                                }
                              >
                                <Star size={20} />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="inline-cheer">
                        <div
                          className="cheer-thread"
                          aria-live="polite"
                          ref={(node) => {
                            cheerThreadRefs.current[team.id] = node
                          }}
                        >
                          {teamCheers.length ? (
                            teamCheers.map((message) => (
                              <div
                                className={`thread-message ${message.participantId === currentParticipantId ? 'mine' : ''}`}
                                key={message.id}
                              >
                                <div>
                                  <strong>
                                    {message.participantId === currentParticipantId
                                      ? '나'
                                      : formatCheerAuthor(message.author, 'masked')}
                                  </strong>
                                  <time>{formatMessageTime(message.createdAt)}</time>
                                </div>
                                <p>{message.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="thread-empty">아직 이 팀에 남겨진 응원 메시지가 없습니다.</p>
                          )}
                        </div>

                        <div className="cheer-composer">
                          <textarea
                            ref={(node) => {
                              cheerInputRefs.current[team.id] = node
                            }}
                            value={cheerTexts[team.id] ?? ''}
                            onChange={(event) =>
                              setCheerTexts((current) => ({ ...current, [team.id]: event.target.value }))
                            }
                            onKeyDown={(event) => handleCheerKeyDown(team.id, event)}
                            placeholder={
                              myStars > 0
                                ? `${team.name}에게 응원 메시지`
                                : '별을 먼저 보내면 응원 메시지를 작성할 수 있습니다'
                            }
                            disabled={!canCheerForTeam}
                          />
                          <button
                            type="button"
                            onClick={() => sendCheer(team.id)}
                            disabled={!canCheerForTeam || !(cheerTexts[team.id] ?? '').trim()}
                          >
                            <MessageCircle size={16} />
                            응원 전송
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        </section>
      )}
    </>
  )
}

function RaffleWinnerNotice({ state, winner, onDismiss }: { state: EventState; winner: RaffleWinner; onDismiss: () => void }) {
  const details = getRaffleWinnerDetails(state, winner)

  return (
    <section className="raffle-winner-notice" role="status" aria-live="assertive">
      <div>
        <Gift size={30} />
        <p className="section-kicker">Lucky Draw</p>
        <h2>행운권에 당첨되었습니다!</h2>
        {winner.rank ? <p className="winner-rank-label">{winner.rank}등 당첨</p> : null}
        <strong>{winner.name}</strong>
        {[winner.group, winner.department].filter(Boolean).length ? <span>{[winner.group, winner.department].filter(Boolean).join(' · ')}</span> : null}
        <div className="winner-notice-details">
          <div>
            <b>응원한 팀</b>
            {details.supports.length ? details.supports.map((item) => <em key={item.teamId}>{item.teamName} {item.stars}★</em>) : <em>기록 없음</em>}
          </div>
          <div>
            <b>응원 메시지</b>
            {details.cheers.length ? details.cheers.map((message, index) => <p key={`${message.teamId}-${message.createdAt}-${index}`}>{message.teamName} · {message.text}</p>) : <p>표시할 공개 메시지가 없습니다.</p>}
          </div>
        </div>
        <button type="button" onClick={onDismiss}>
          투표 화면으로 돌아가기
        </button>
      </div>
    </section>
  )
}

function QuizWinnerNotice({ winner, onDismiss }: { winner: QuizAnswer; onDismiss: () => void }) {
  return (
    <section className="raffle-winner-notice quiz-winner-notice" role="status" aria-live="assertive">
      <div>
        <Trophy size={32} />
        <p className="section-kicker">Quiz Winner</p>
        <h2>정답을 맞혔습니다!</h2>
        <strong>{winner.author}</strong>
        <span>{winner.rank ? `${winner.rank}번째 정답자` : '정답자'} · {[winner.group || 'ID 없음', winner.department].filter(Boolean).join(' · ')}</span>
        <button type="button" onClick={onDismiss}>
          확인하고 돌아가기
        </button>
      </div>
    </section>
  )
}

function ParticipantAwardHistory({ awards, state }: { awards: AwardRecord[]; state: EventState }) {
  if (!awards.length) return null

  return (
    <section className="award-history-panel" aria-label="내 수상 이력">
      <div className="award-history-heading">
        <Trophy size={17} />
        <div>
          <strong>내 수상 이력</strong>
          <span>행운권 당첨과 퀴즈 정답 기록을 확인할 수 있습니다.</span>
        </div>
      </div>
      <div className="award-history-list">
        {awards.map((award) => {
          const isRaffle = award.kind === 'raffle'
          const ruleLabel = award.rule ? getRaffleRuleLabel(award.rule) : ''
          const prizeInfo = isRaffle && award.rule ? getRafflePrizeInfo(state.copy, award.rule) : null
          const prizeLabel = award.prizeName || prizeInfo?.name || (isRaffle ? getRafflePrizeLabel(award.rule) : '퀴즈 상품')
          const prizeImage = award.prizeImageFile || prizeInfo?.image || ''
          const title = isRaffle ? `행운권 ${award.rank ? `${award.rank}등 ` : ''}당첨` : `퀴즈 ${award.rank ? `${award.rank}번째 ` : ''}정답`
          const detail = isRaffle ? ruleLabel || '행운권 추첨' : award.question || '퀴즈 정답'

          return (
            <details className="award-history-item" key={award.id}>
              <summary>
                <span>{title}</span>
                <small>{formatMessageTime(award.createdAt)}</small>
              </summary>
              <dl>
                <div>
                  <dt>선정 기준</dt>
                  <dd>{detail}</dd>
                </div>
                <div>
                  <dt>상품</dt>
                  <dd>{prizeLabel}</dd>
                </div>
              </dl>
              {prizeImage ? <img src={prizeImage} alt={prizeLabel} /> : null}
            </details>
          )
        })}
      </div>
    </section>
  )
}

function buildQuizWinnerHistory(state: EventState) {
  const participantMap = new Map(state.participants.map((person) => [person.id, person]))
  const records = new Map<
    string,
    {
      id: string
      question: string
      createdAt: number
      winners: Array<{ id: string; rank?: number; name: string; group?: string; department?: string }>
    }
  >()

  for (const award of state.awardHistory ?? []) {
    if (award.kind !== 'quiz') continue

    const key = `${award.quizId ?? 'unknown'}:${award.question || award.createdAt}`
    const participant = participantMap.get(award.participantId)
    const record = records.get(key) ?? {
      id: key,
      question: award.question || '이전 퀴즈',
      createdAt: award.createdAt,
      winners: [],
    }

    record.createdAt = Math.max(record.createdAt, award.createdAt)
    record.winners.push({
      id: award.participantId,
      rank: award.rank,
      name: award.participantName || participant?.name || award.participantId,
      group: award.participantGroup || participant?.group,
      department: award.participantDepartment || participant?.department,
    })
    records.set(key, record)
  }

  for (const winner of state.quiz.winners) {
    const key = `${winner.quizId}:${state.quiz.question || state.quiz.createdAt}`
    const record = records.get(key) ?? {
      id: key,
      question: state.quiz.question || '현재 퀴즈',
      createdAt: winner.createdAt,
      winners: [],
    }

    if (!record.winners.some((item) => item.id === winner.participantId && item.rank === winner.rank)) {
      record.winners.push({
        id: winner.participantId,
        rank: winner.rank,
        name: winner.author,
        group: winner.group,
        department: winner.department,
      })
    }
    records.set(key, record)
  }

  return [...records.values()]
    .map((record) => ({
      ...record,
      winners: record.winners.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

function QuizParticipationView({
  quiz,
  copy,
  serverTime,
  receivedAt,
  answerText,
  onAnswerTextChange,
  onSubmit,
  onKeyDown,
  latestAnswer,
  winningAnswer,
  feedback,
  attemptCount,
  attemptLimit,
}: {
  quiz: QuizState
  copy: EventCopy
  serverTime?: number
  receivedAt?: number
  answerText: string
  onAnswerTextChange: (value: string) => void
  onSubmit: () => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  latestAnswer?: QuizAnswer
  winningAnswer?: QuizAnswer
  feedback: string
  attemptCount: number
  attemptLimit: number
}) {
  const now = useQuizClock(quiz, serverTime, receivedAt)
  const phase = getQuizDisplayPhase(quiz, now)
  const countdownValue = getQuizCountdownValue(quiz, now)
  const settlementValue = getQuizSettlementValue(quiz, now)
  const isOpen = phase === 'open'
  const canSubmit = phase === 'open' || phase === 'settling'
  const hasWon = Boolean(winningAnswer)
  const reachedAttemptLimit = attemptCount >= attemptLimit
  const statusText = hasWon
    ? `${winningAnswer?.rank ?? 1}번째 정답자로 선정되었습니다.`
    : phase === 'settling' && latestAnswer?.correct
      ? '정답 후보입니다. 최종 정답 확인 중...'
      : canSubmit
      ? reachedAttemptLimit
        ? '이 문제의 답변 기회를 모두 사용했습니다.'
        : phase === 'settling'
          ? '정답 확인 중입니다. 마감 전 도착한 답변을 비교하고 있습니다.'
          : '정답을 입력해 전송하세요.'
      : phase === 'closed'
        ? '이 문제는 마감되었습니다.'
        : phase === 'standby'
          ? '퀴즈를 준비 중입니다. 잠시 후 안내에 따라 참여하세요.'
          : '잠시 후 답변 입력창이 열립니다.'

  return (
    <section className={`quiz-participation-shell phase-${phase}`} aria-label="퀴즈 모드">
      <div className="quiz-live-badge">
        <Sparkles size={18} />
        <span>Quiz Mode</span>
      </div>
      {phase === 'standby' ? (
        <div className="quiz-start-screen standby">
          <Sparkles size={34} />
          <p>{copy.quizStandbyHeadline}</p>
          {copy.quizStandbySubhead ? <h2 className="quiz-standby-subhead">{copy.quizStandbySubhead}</h2> : null}
          <span>{copy.quizStandbyHint}</span>
        </div>
      ) : null}
      {phase === 'intro' ? (
        <div className="quiz-start-screen">
          <Sparkles size={34} />
          <p>곧 퀴즈가 시작됩니다</p>
          <h2>문제를 보고 정답을 입력해 전송하세요</h2>
          <span>모든 화면은 서버 기준 시작 시각에 맞춰 3/2/1을 함께 카운트다운합니다.</span>
        </div>
      ) : null}
      {phase === 'countdown' ? (
        <div className="quiz-countdown-screen" aria-live="assertive">
          <span>{countdownValue}</span>
          <strong>준비하세요</strong>
        </div>
      ) : null}
      {phase === 'settling' ? (
        <div className="quiz-settlement-banner" aria-live="assertive">
          <Sparkles size={20} />
          <strong>정답 확인 중...</strong>
          <span>{settlementValue}초 후 최종 정답자를 확정합니다.</span>
        </div>
      ) : null}
      <div className="quiz-question-card">
        <div className="quiz-question-layout participant">
          <div className="quiz-question-copy">
            <p className="section-kicker">Live Quiz #{quiz.round || 1}</p>
            <h2 className="quiz-question-heading">
              <span className="quiz-question-prefix">Q.</span>
              <span>
                {phase === 'standby'
                  ? copy.quizPendingQuestion
                  : phase === 'intro' || phase === 'countdown'
                    ? '문제가 곧 공개됩니다.'
                    : quiz.question || copy.quizPendingQuestion}
              </span>
            </h2>
          </div>
          <QuizPrizeCard image={quiz.prizeImageFile} label="퀴즈 상품" />
        </div>
      </div>

      <div className={`quiz-answer-card ${hasWon ? 'is-winner' : ''}`}>
        <div>
          <strong>{statusText}</strong>
          {latestAnswer ? (
            <span>
              마지막 답변: {latestAnswer.text} · {latestAnswer.correct ? '정답' : '정답이 아닙니다'}
            </span>
          ) : (
            <span>문제가 바뀌면 이 화면도 자동으로 갱신됩니다.</span>
          )}
        </div>
        <div className="quiz-answer-form">
          <input
            value={answerText}
            maxLength={120}
            onChange={(event) => onAnswerTextChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              isOpen
                ? '정답 입력'
                : phase === 'settling'
                  ? '정답 확인 중에도 제출할 수 있습니다'
                : phase === 'closed'
                  ? '퀴즈가 마감되었습니다'
                  : phase === 'standby'
                    ? '퀴즈 준비 중입니다'
                    : '카운트다운이 끝나면 입력할 수 있습니다'
            }
            disabled={!canSubmit || hasWon || reachedAttemptLimit}
          />
          <button type="button" onClick={onSubmit} disabled={!canSubmit || hasWon || reachedAttemptLimit || !answerText.trim()}>
            {attemptCount}/{attemptLimit} 전송
          </button>
        </div>
        {feedback ? <p className="quiz-feedback">{feedback}</p> : null}
      </div>

      {quiz.winners.length ? (
        <div className="quiz-winner-list audience">
          {quiz.winners.map((winner) => (
            <span key={`${winner.quizId}-${winner.id}`}>
              {winner.rank}등 {winner.author}
              {[winner.group, winner.department].filter(Boolean).length ? ` · ${[winner.group, winner.department].filter(Boolean).join(' · ')}` : ''}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AdminView({
  state,
  connection,
  post,
}: {
  state: EventState
  connection: ConnectionState
  post: PostEventState
}) {
  const [raffleRule, setRaffleRule] = useState<RaffleRule>('all')
  const [isDrawing, setIsDrawing] = useState(false)
  const [showCheerConstellation, setShowCheerConstellation] = useState(
    () => new URLSearchParams(window.location.search).get('showCheer') === '1',
  )
  const [activePanel, setActivePanel] = useState<AdminPanel | null>(getInitialAdminPanel)
  const visiblePanel: AdminPanel | null = state.quiz.mode !== 'idle' ? 'quiz' : activePanel
  const starBudget = getStarBudget(state)
  const maxStarsPerTeam = getMaxStarsPerTeam(state)
  const durationMinutes = getDurationMinutes(state)
  const timerMode = getTimerMode(state)
  const targetTime = getTargetTime(state)
  const minScore = getMinScore(state)
  const cheerNameMode = getCheerNameMode(state)
  const themeMode = getThemeMode(state)
  const [draftTimerMode, setDraftTimerMode] = useState<TimerMode>(timerMode)
  const [draftDurationMinutes, setDraftDurationMinutes] = useState(String(durationMinutes))
  const [draftTargetTime, setDraftTargetTime] = useState(() => targetTime || formatKstTime(Date.now() + durationMinutes * 60 * 1000))
  const totalRegistered = state.participants.length
  const totalDynamicVoters = state.participants.filter((person) => sumStars(person.allocations) > 0).length
  const totalDynamicStars = state.participants.reduce((sum, person) => sum + sumStars(person.allocations), 0)
  const totalEligibleParticipants = state.participants.filter((person) => {
    const spent = sumStars(person.allocations)
    if (spent <= 0) return false
    return state.cheers.some((message) => message.participantId === person.id && !message.hidden)
  }).length

  const openAdminPanel = (panel: AdminPanel | null) => {
    setActivePanel(panel)
    syncAdminPanelRoute(panel)
  }

  useEffect(() => {
    syncAdminPanelRoute(visiblePanel)
    document.title = visiblePanel ? `vibe-compete/admin/${visiblePanel}` : 'vibe-compete/admin'
  }, [visiblePanel])

  const openQuizPanel = () => {
    openAdminPanel('quiz')
    void post('/api/quiz/prepare', {})
  }

  const endQuizAndClosePanel = async () => {
    await post('/api/quiz/clear', {})
    openAdminPanel(null)
  }

  const closeDetailPanel = () => {
    if (visiblePanel === 'quiz' && state.quiz.mode !== 'idle') {
      void endQuizAndClosePanel()
      return
    }

    openAdminPanel(null)
  }

  const startDrawing = () => {
    setIsDrawing(true)
  }

  const stopDrawing = async () => {
    if (!isDrawing) setIsDrawing(true)
    await new Promise((resolve) => window.setTimeout(resolve, isDrawing ? 320 : 900))
    await post('/api/raffle', { rule: raffleRule, winnerCount: 1 })
    setIsDrawing(false)
  }

  const closeVote = () => {
    post('/api/close', { closed: !state.closed })
  }

  const applySettings = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const nextTimerMode = data.get('timerMode') === 'targetTime' ? 'targetTime' : 'duration'
    const nextDurationMinutes = normalizeDurationInput(data.get('durationMinutes'), durationMinutes)
    const nextTargetTime = normalizeTimeInput(String(data.get('targetTime') || ''))
    const derivedTargetTime =
      nextTimerMode === 'duration'
        ? formatKstTime(Date.now() + nextDurationMinutes * 60 * 1000)
        : nextTargetTime || formatKstTime(Date.now() + durationMinutes * 60 * 1000)
    const derivedDuration =
      nextTimerMode === 'targetTime'
        ? minutesUntilKstTime(derivedTargetTime)
        : nextDurationMinutes

    post('/api/settings', {
      starBudget: data.get('starBudget'),
      maxStarsPerTeam: data.get('maxStarsPerTeam'),
      durationMinutes: derivedDuration,
      timerMode: nextTimerMode,
      targetTime: derivedTargetTime,
      minScore: data.get('minScore'),
      cheerNameMode: data.get('cheerNameMode'),
      themeMode: data.get('themeMode'),
    })
  }

  const applyThemeMode = (nextThemeMode: ThemeMode) => {
    post('/api/settings', {
      starBudget,
      maxStarsPerTeam,
      durationMinutes,
      timerMode,
      targetTime,
      minScore,
      cheerNameMode,
      themeMode: nextThemeMode,
    })
  }

  const resetVotesOnly = () => {
    post('/api/reset', { seed: false, keepParticipants: true })
  }

  const resetAll = () => {
    if (!window.confirm('참가자 등록 기록까지 모두 초기화할까요? 행사 중에는 투표만 Reset을 권장합니다.')) return
    post('/api/reset', { seed: false, keepParticipants: false })
  }

  const seedTestData = () => {
    post('/api/reset', { seed: true })
  }

  return (
    <>
      {showCheerConstellation ? (
        <CheerConstellation state={state} starBudget={starBudget} maxStarsPerTeam={maxStarsPerTeam} onClose={() => setShowCheerConstellation(false)} />
      ) : null}
      {visiblePanel ? (
        <AdminDetailPanel title={getAdminPanelTitle(visiblePanel)} onClose={closeDetailPanel}>
          {visiblePanel === 'arena' ? <ArenaDetailPanel state={state} starBudget={starBudget} maxStarsPerTeam={maxStarsPerTeam} /> : null}
          {visiblePanel === 'participants' ? <ParticipantDetailPanel state={state} post={post} /> : null}
          {visiblePanel === 'messages' ? <MessageManagerDetail state={state} post={post} /> : null}
          {visiblePanel === 'teams' ? <TeamConfigDetail key={getEditableConfigSignature(state)} state={state} post={post} /> : null}
          {visiblePanel === 'quiz' ? <QuizAdminPanel state={state} post={post} onEndQuiz={endQuizAndClosePanel} detail /> : null}
          {visiblePanel === 'export' ? <ResultExportDetailPanel state={state} /> : null}
          {visiblePanel === 'raffle' ? (
            <RaffleDetailPanel
              state={state}
              raffleRule={raffleRule}
              isDrawing={isDrawing}
              onRuleChange={setRaffleRule}
              onStart={startDrawing}
              onStop={stopDrawing}
            />
          ) : null}
        </AdminDetailPanel>
      ) : null}

      <section className="hero-band admin">
        <div>
          <h2>{state.copy.adminHeroTitle}</h2>
          <p>{state.copy.adminHeroSubtitle}</p>
        </div>
        <div className="admin-stats">
          <div>
            <Users size={18} />
            <span>등록 인원</span>
            <strong>{totalRegistered}</strong>
          </div>
          <div>
            <Check size={18} />
            <span>응모 완료</span>
            <strong>{totalEligibleParticipants}</strong>
          </div>
          <div>
            <Users size={18} />
            <span>별 사용</span>
            <strong>{totalDynamicVoters}</strong>
          </div>
          <div>
            <Star size={18} />
            <span>실시간 별</span>
            <strong>{totalDynamicStars}</strong>
          </div>
          <button type="button" onClick={closeVote}>
            {state.closed ? '투표 재개' : '투표 마감'}
          </button>
        </div>
      </section>

      <section className="admin-control-panel" aria-label="운영 설정">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Control Desk</p>
            <h2>투표 운영 설정</h2>
          </div>
        </div>
        <form
          className="control-grid"
          key={`${starBudget}:${maxStarsPerTeam}:${durationMinutes}:${timerMode}:${targetTime}:${minScore}:${cheerNameMode}:${themeMode}`}
          onSubmit={(event) => {
            event.preventDefault()
            applySettings(event.currentTarget)
          }}
        >
          <label>
            <span>참여자별 별 개수</span>
            <input
              name="starBudget"
              type="number"
              min={1}
              max={20}
              defaultValue={starBudget}
            />
          </label>
          <label>
            <span>한 팀당 최대 별</span>
            <input
              name="maxStarsPerTeam"
              type="number"
              min={1}
              max={MAX_CONFIGURABLE_STARS_PER_TEAM}
              defaultValue={maxStarsPerTeam}
            />
          </label>
          <label>
            <span>최하위 환산점수</span>
            <div className="inline-input">
              <input
                name="minScore"
                type="number"
                min={0}
                max={9.9}
                step={0.1}
                defaultValue={minScore}
              />
              <em>점</em>
            </div>
          </label>
          <label>
            <span>타이머 방식</span>
            <select
              name="timerMode"
              value={draftTimerMode}
              onChange={(event) => {
                const nextMode = event.currentTarget.value === 'targetTime' ? 'targetTime' : 'duration'
                setDraftTimerMode(nextMode)
                if (nextMode === 'duration') {
                  setDraftTargetTime(formatKstTime(Date.now() + normalizeDurationInput(draftDurationMinutes, durationMinutes) * 60 * 1000))
                } else {
                  setDraftDurationMinutes(String(minutesUntilKstTime(draftTargetTime)))
                }
              }}
            >
              <option value="duration">분 단위</option>
              <option value="targetTime">마감 시각</option>
            </select>
          </label>
          <label>
            <span>투표 시간</span>
            <div className="inline-input">
              <input
                name="durationMinutes"
                type="number"
                min={1}
                value={draftDurationMinutes}
                readOnly={draftTimerMode === 'targetTime'}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  setDraftDurationMinutes(value)
                  if (draftTimerMode === 'duration') {
                    setDraftTargetTime(formatKstTime(Date.now() + normalizeDurationInput(value, durationMinutes) * 60 * 1000))
                  }
                }}
              />
              <em>분</em>
            </div>
          </label>
          <label>
            <span>마감 시각(KST)</span>
            <input
              name="targetTime"
              type="time"
              value={draftTargetTime}
              readOnly={draftTimerMode === 'duration'}
              onChange={(event) => {
                const value = event.currentTarget.value
                setDraftTargetTime(value)
                if (draftTimerMode === 'targetTime') {
                  setDraftDurationMinutes(String(minutesUntilKstTime(value)))
                }
              }}
            />
          </label>
          <label>
            <span>송출 이름 표시</span>
            <select name="cheerNameMode" defaultValue={cheerNameMode}>
              <option value="masked">익명모드</option>
              <option value="real">실명모드</option>
            </select>
          </label>
          <fieldset className="theme-toggle-field">
            <legend>화면 테마</legend>
            <label>
              <input
                type="radio"
                name="themeMode"
                value="light"
                defaultChecked={themeMode === 'light'}
                onChange={(event) => {
                  if (event.currentTarget.checked) applyThemeMode('light')
                }}
              />
              <span>현재 모드</span>
            </label>
            <label>
              <input
                type="radio"
                name="themeMode"
                value="stage"
                defaultChecked={themeMode === 'stage'}
                onChange={(event) => {
                  if (event.currentTarget.checked) applyThemeMode('stage')
                }}
              />
              <span>어두운 모드</span>
            </label>
          </fieldset>
          <button type="submit">
            <Clock3 size={16} />
            설정 적용
          </button>
          <button type="button" className="secondary-control" onClick={resetVotesOnly}>
            투표만 Reset
          </button>
          <button type="button" className="secondary-control danger-control" onClick={resetAll}>
            전체 Reset
          </button>
          <button type="button" className="secondary-control" onClick={seedTestData}>
            테스트 데이터
          </button>
        </form>
        <p className="control-note">
          현재 중복 응모 방지는 이름과 Let's ID 기준으로 판단합니다. 이메일을 입력하면 @ 뒤 주소는 제외하고 Let's ID만 사용합니다.
        </p>
      </section>

      <section className="admin-grid">
        <section className="arena-panel" aria-label="실시간 투표 현황">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Live Arena Wall</p>
              <h2>실시간 별 현황</h2>
            </div>
            <div className="arena-heading-actions">
              <button type="button" className="panel-open-button" onClick={() => openAdminPanel('arena')}>
                <Maximize2 size={14} />
                전체화면
              </button>
              <div className={`connection ${connection}`}>
                <span className="live-dot" />
                <span>{connection === 'live' ? 'Live' : connection === 'connecting' ? '연결 중' : '오프라인'}</span>
              </div>
            </div>
          </div>

          <div className="arena-stage">
            <FloatingStars />
            <div className="ranking-list">
              {state.teams.map((team) => {
                const recentEvent = state.voteEvents.find((event) => event.teamId === team.id)
                return <TeamRow key={team.id} team={team} recentEvent={recentEvent} starBudget={starBudget} maxStarsPerTeam={maxStarsPerTeam} />
              })}
            </div>
          </div>
        </section>

        <aside className="admin-side">
          <CheerWall state={state} onOpen={() => setShowCheerConstellation(true)} />
          <VoteActivityFeed state={state} />
          <ParticipantListPanel state={state} onOpen={() => openAdminPanel('participants')} />
          <CheerModerationPanel state={state} post={post} onOpen={() => openAdminPanel('messages')} />
          <TeamConfigPanel state={state} onOpen={() => openAdminPanel('teams')} />
          <QuizAdminPanel state={state} post={post} onOpen={openQuizPanel} />
          <ResultExportPanel state={state} onOpen={() => openAdminPanel('export')} />
          <RafflePanel
            state={state}
            raffleRule={raffleRule}
            isDrawing={isDrawing}
            onRuleChange={setRaffleRule}
            onStart={startDrawing}
            onStop={stopDrawing}
            onOpen={() => openAdminPanel('raffle')}
          />
        </aside>
      </section>
    </>
  )
}

function PublicWallView({
  state,
  post,
  wallPanel,
  onWallPanelChange,
  showCheerConstellation,
  onShowCheerConstellationChange,
}: {
  state: EventState
  post: PostEventState
  wallPanel: WallPanel
  onWallPanelChange: (panel: WallPanel) => void
  showCheerConstellation: boolean
  onShowCheerConstellationChange: (show: boolean) => void
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [raffleRule, setRaffleRule] = useState<RaffleRule>('all')
  const [isDrawing, setIsDrawing] = useState(false)
  const [wallSplit, setWallSplit] = useState(70)
  const wallGridRef = useRef<HTMLDivElement | null>(null)
  const setWallPanel = onWallPanelChange
  const setShowCheerConstellation = onShowCheerConstellationChange
  const starBudget = getStarBudget(state)
  const maxStarsPerTeam = getMaxStarsPerTeam(state)
  const cheerNameMode = getCheerNameMode(state)
  const selectedTeam = selectedTeamId === 'all' ? null : state.teams.find((team) => team.id === selectedTeamId) ?? null
  const wallSplitMin = 54
  const wallSplitMax = 82

  const startDrawing = () => {
    setWallPanel('raffle')
    setIsDrawing(true)
  }

  const stopDrawing = async () => {
    if (!isDrawing) setIsDrawing(true)
    await new Promise((resolve) => window.setTimeout(resolve, isDrawing ? 320 : 900))
    await post('/api/raffle', { rule: raffleRule, winnerCount: 1 })
    setIsDrawing(false)
  }

  const selectTeamMessages = (teamId: string) => {
    setSelectedTeamId((current) => (current === teamId ? 'all' : teamId))
    if (wallPanel === 'raffle') setWallPanel('overview')
  }

  const resizeWallSplit = (clientX: number) => {
    const grid = wallGridRef.current
    if (!grid) return

    const rect = grid.getBoundingClientRect()
    const nextSplit = ((clientX - rect.left) / rect.width) * 100
    setWallSplit(clamp(nextSplit, wallSplitMin, wallSplitMax))
  }

  const handleWallResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    resizeWallSplit(event.clientX)
    document.body.classList.add('is-wall-resizing')

    const handleMove = (moveEvent: PointerEvent) => resizeWallSplit(moveEvent.clientX)
    const handleUp = () => {
      document.body.classList.remove('is-wall-resizing')
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleWallResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    setWallSplit((current) => clamp(current + (event.key === 'ArrowLeft' ? -3 : 3), wallSplitMin, wallSplitMax))
  }

  return (
    <>
      {showCheerConstellation ? (
        <CheerConstellation state={state} starBudget={starBudget} maxStarsPerTeam={maxStarsPerTeam} onClose={() => setShowCheerConstellation(false)} />
      ) : null}

      <section className="public-wall-shell" aria-label="관객 송출 보드">
        {wallPanel === 'quiz' ? (
          <section className="public-quiz-board" aria-label="관객 퀴즈 송출">
            <QuizWallBoard state={state} onPrepareQuiz={() => post('/api/quiz/prepare', {})} />
          </section>
        ) : wallPanel === 'raffle' ? (
          <section className="public-raffle-board" aria-label="관객 행운권 추첨 쇼업">
            <div className="wall-panel-toolbar">
              <div>
                <p className="section-kicker">{state.copy.wallRaffleEyeline}</p>
                <h2>{state.copy.wallRaffleTitle}</h2>
              </div>
              <button type="button" onClick={() => setWallPanel('overview')}>
                <X size={16} />
                닫기
              </button>
            </div>
            <RaffleDetailPanel
              state={state}
              raffleRule={raffleRule}
              isDrawing={isDrawing}
              onRuleChange={setRaffleRule}
              onStart={startDrawing}
              onStop={stopDrawing}
              publicMode
            />
          </section>
        ) : (
          <div
            ref={wallGridRef}
            className={`public-wall-grid ${wallPanel === 'cheer' ? 'cheer-focus' : ''}`}
            style={
              wallPanel === 'overview'
                ? ({
                    gridTemplateColumns: `minmax(620px, ${wallSplit}fr) 10px minmax(360px, ${100 - wallSplit}fr)`,
                  } as CSSProperties)
                : undefined
            }
          >
            {wallPanel === 'overview' ? (
              <section className="public-arena-board" aria-label="실시간 별 현황">
                <div className="section-heading compact">
                  <div>
                    <p className="section-kicker">{state.copy.wallArenaEyeline}</p>
                    <h2>{state.copy.wallArenaTitle}</h2>
                  </div>
                  {selectedTeam ? <span className="selected-team-note">{selectedTeam.name} {state.copy.wallSelectedCheerSuffix} 보기</span> : null}
                </div>
                <div className="public-ranking-list">
                  {state.teams.map((team) => {
                    const recentEvent = state.voteEvents.find((event) => event.teamId === team.id)
                    return (
                      <TeamRow
                        key={team.id}
                        team={team}
                        recentEvent={recentEvent}
                        starBudget={starBudget}
                        maxStarsPerTeam={maxStarsPerTeam}
                        showScore={false}
                        showVoteAuthor={false}
                        showScoreStack={false}
                        showEventLabel={false}
                        showMembersInline
                        selected={selectedTeamId === team.id}
                        onSelect={() => selectTeamMessages(team.id)}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}

            {wallPanel === 'overview' ? (
              <div
                className="wall-resize-handle"
                role="separator"
                aria-label="실시간 별 현황과 응원 메시지 패널 폭 조절"
                aria-orientation="vertical"
                aria-valuemin={wallSplitMin}
                aria-valuemax={wallSplitMax}
                aria-valuenow={Math.round(wallSplit)}
                tabIndex={0}
                onPointerDown={handleWallResizePointerDown}
                onKeyDown={handleWallResizeKeyDown}
              >
                <MoveHorizontal size={18} strokeWidth={2.5} />
              </div>
            ) : null}

            <PublicCheerBoard
              state={state}
              selectedTeamId={selectedTeamId}
              onSelectAll={() => setSelectedTeamId('all')}
              cheerNameMode={cheerNameMode}
              large={wallPanel === 'cheer'}
            />
          </div>
        )}
      </section>
    </>
  )
}

function QuizWallBoard({ state, onPrepareQuiz }: { state: EventState; onPrepareQuiz?: () => void }) {
  const now = useQuizClock(state.quiz, state.serverTime, state.receivedAt)
  const phase = getQuizDisplayPhase(state.quiz, now)
  const countdownValue = getQuizCountdownValue(state.quiz, now)
  const settlementValue = getQuizSettlementValue(state.quiz, now)
  const latestWinner = state.quiz.winners.at(-1) ?? null
  const spotlightWinner =
    latestWinner && now - latestWinner.createdAt <= 4300 && state.quiz.mode !== 'idle' ? latestWinner : null
  const answerCount = state.quiz.answers.length
  const correctCount = state.quiz.answers.filter((item) => item.correct).length
  const orderedWinners = [...state.quiz.winners].sort(
    (a, b) => (a.rank ?? 999) - (b.rank ?? 999) || a.createdAt - b.createdAt,
  )
  const answerHistory = state.quiz.answers.filter((item) => !item.rank)

  return (
    <section className={`quiz-wall-board wall-only phase-${phase}`} aria-label="퀴즈 진행">
      {spotlightWinner ? <QuizWinnerSpotlight key={`${spotlightWinner.quizId}-${spotlightWinner.id}`} winner={spotlightWinner} /> : null}

      <div className="section-heading compact">
        <div>
          <p className="section-kicker">{state.copy.wallQuizEyeline}</p>
          <h2>{state.copy.wallQuizTitle}</h2>
        </div>
        <div className="quiz-wall-status-actions">
          {phase === 'idle' && onPrepareQuiz ? (
            <button type="button" className="quiz-standby-action" onClick={onPrepareQuiz}>
              <Sparkles size={15} />
              퀴즈 준비 모드
            </button>
          ) : null}
          <span className={`quiz-mode-pill ${phase}`}>
            {phase === 'open'
              ? '진행 중'
              : phase === 'settling'
                ? '정답 확인 중'
              : phase === 'intro' || phase === 'countdown'
                ? '곧 시작'
                : phase === 'closed'
                  ? '마감'
                  : phase === 'standby'
                    ? '준비 중'
                    : '대기'}
          </span>
        </div>
      </div>

      {phase === 'idle' || phase === 'standby' ? (
        <div className="quiz-wall-start-screen idle">
          <Sparkles size={44} />
          <p>{state.copy.quizStandbyHeadline}</p>
          <h3 className="quiz-standby-subhead">
            {phase === 'standby'
              ? state.copy.quizStandbySubhead
              : '관리자가 문제를 출제하면 모든 참가자 화면이 동시에 퀴즈 모드로 전환됩니다'}
          </h3>
          <span>{state.copy.quizStandbyHint}</span>
        </div>
      ) : null}

      {phase === 'intro' ? (
        <div className="quiz-wall-start-screen">
          <Sparkles size={48} />
          <p>잠시 후 퀴즈가 시작됩니다</p>
          <h3>정답을 아는 즉시 관객 화면에서 입력하세요</h3>
          <span>선착순 정답자는 이 화면에 순서대로 표시됩니다.</span>
        </div>
      ) : null}

      {phase === 'countdown' ? (
        <div className="quiz-wall-countdown" aria-live="assertive">
          <span>{countdownValue}</span>
          <strong>문제 공개</strong>
        </div>
      ) : null}

      {phase === 'settling' ? (
        <div className="quiz-wall-settlement" aria-live="assertive">
          <Sparkles size={36} />
          <p>정답 확인 중...</p>
          <strong>{settlementValue}초 후 최종 정답자를 확정합니다</strong>
          <span>먼저 제출된 정답 후보를 비교하고 있습니다.</span>
        </div>
      ) : null}

      <div className="quiz-current-panel">
        <div className="quiz-question-layout wall">
          <div className="quiz-question-copy">
            <p className="section-kicker">{state.copy.quizCurrentQuestionLabel}</p>
            <h3 className="quiz-question-heading">
              <span className="quiz-question-prefix">Q.</span>
              <span>
                {phase === 'idle' || phase === 'standby'
                  ? state.copy.quizPendingQuestion
                  : phase === 'intro' || phase === 'countdown'
                    ? '문제가 곧 공개됩니다.'
                    : state.quiz.question || state.copy.quizPendingQuestion}
              </span>
            </h3>
            <div className="quiz-stats">
              <span>답변 {answerCount}</span>
              <span>정답 {correctCount}</span>
              <span>{phase === 'settling' ? '정답 후보' : '정답자'} {phase === 'settling' ? correctCount : state.quiz.winners.length}/{state.quiz.winnerCount}</span>
            </div>
          </div>
          <QuizPrizeCard image={state.quiz.prizeImageFile} label="퀴즈 상품" />
        </div>
      </div>

      {orderedWinners.length ? (
        <div className="quiz-winner-list wall-stack">
          {orderedWinners.map((winner) => (
            <span key={`${winner.quizId}-${winner.id}`}>
              {winner.rank}등 {winner.author} {[winner.group, winner.department].filter(Boolean).length ? `(${[winner.group, winner.department].filter(Boolean).join(' · ')})` : ''}
            </span>
          ))}
        </div>
      ) : null}

      <div className="quiz-answer-stream" aria-live="polite" aria-label="오답 및 기타 답변">
        {answerHistory.length ? (
          answerHistory.map((item) => (
            <article className={`quiz-answer-message ${item.correct ? 'correct' : ''}`} key={`${item.quizId}-${item.id}`}>
              <strong>
                <span>{[item.author, item.group || 'ID 없음', item.department].filter(Boolean).join(' · ')}</span>
                {item.rank ? <em>{item.rank}등 정답</em> : item.correct ? <em>정답</em> : null}
              </strong>
              <p>{item.text}</p>
            </article>
          ))
        ) : (
          <p className="empty-state compact">
            {orderedWinners.length ? '아직 오답 또는 기타 답변이 없습니다.' : state.copy.quizAnswerEmpty}
          </p>
        )}
      </div>
    </section>
  )
}

function QuizWinnerSpotlight({ winner }: { winner: QuizAnswer }) {
  return (
    <div className="quiz-winner-spotlight" role="status" aria-live="assertive">
      <div>
        <Sparkles size={30} />
        <span>정답!</span>
        <strong>{winner.author}</strong>
        {[winner.group, winner.department].filter(Boolean).length ? <p>{[winner.group, winner.department].filter(Boolean).join(' · ')}</p> : null}
        {winner.rank ? <em>{winner.rank}번째 정답자</em> : null}
      </div>
    </div>
  )
}

function QuizPrizeCard({ image, label }: { image?: string; label: string }) {
  const [open, setOpen] = useState(false)

  if (!image) return null

  return (
    <div className="quiz-prize-card">
      <button type="button" onClick={() => setOpen(true)} aria-label={`${label} 크게 보기`}>
        <span>
          <Gift size={16} />
          {label}
        </span>
        <img src={image} alt="" />
      </button>
      {open ? (
        <div className="prize-image-overlay global" role="dialog" aria-modal="true" aria-label={label}>
          <div>
            <button type="button" onClick={() => setOpen(false)} aria-label={`${label} 닫기`}>
              <X size={18} />
            </button>
            <img src={image} alt={label} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function QuizAdminPanel({
  state,
  post,
  onOpen,
  onEndQuiz,
  detail = false,
}: {
  state: EventState
  post: PostEventState
  onOpen?: () => void
  onEndQuiz?: () => void | Promise<void>
  detail?: boolean
}) {
  const enabledQuizzes = state.quizBank.filter((quiz) => quiz.enabled)
  const availableQuizzes = enabledQuizzes.length ? enabledQuizzes : fallbackQuizBank
  const initialQuiz = availableQuizzes.find((quiz) => quiz.id === state.quiz.selectedQuizId) || availableQuizzes[0]
  const [selectedQuizId, setSelectedQuizId] = useState(initialQuiz.id)
  const selectedQuiz = availableQuizzes.find((quiz) => quiz.id === selectedQuizId) || initialQuiz
  const [question, setQuestion] = useState(selectedQuiz.question)
  const [answer, setAnswer] = useState(selectedQuiz.answer)
  const [prizeImageFile, setPrizeImageFile] = useState(selectedQuiz.prizeImageFile)
  const [winnerCount, setWinnerCount] = useState(selectedQuiz.winnerCount)
  const [prizeStatus, setPrizeStatus] = useState('')
  const now = useQuizClock(state.quiz, state.serverTime, state.receivedAt)
  const phase = getQuizDisplayPhase(state.quiz, now)
  const settlementValue = getQuizSettlementValue(state.quiz, now)
  const answerCount = state.quiz.answers.length
  const correctCount = state.quiz.answers.filter((item) => item.correct).length
  const quizWinnerHistory = buildQuizWinnerHistory(state)

  const selectQuiz = (quizId: string) => {
    const nextQuiz = availableQuizzes.find((quiz) => quiz.id === quizId) || initialQuiz
    setSelectedQuizId(nextQuiz.id)
    setQuestion(nextQuiz.question)
    setAnswer(nextQuiz.answer)
    setPrizeImageFile(nextQuiz.prizeImageFile)
    setWinnerCount(nextQuiz.winnerCount)
  }

  const updatePrizeImage = (value: string) => {
    setPrizeImageFile(normalizeLogoSourceValue(value))
  }

  const uploadPrizeImage = async (file: File | undefined) => {
    if (!file) return

    try {
      const dataUrl = await readLogoFileAsDataUrl(file)
      setPrizeImageFile(dataUrl)
      setPrizeStatus('이번 퀴즈 상품 이미지를 불러왔습니다.')
    } catch (error) {
      setPrizeStatus(error instanceof Error ? error.message : '이미지 파일을 불러오지 못했습니다.')
    }
  }

  const openQuiz = async () => {
    await post('/api/quiz/open', {
      quizId: selectedQuiz.id,
      question,
      answer,
      acceptedAnswers: selectedQuiz.acceptedAnswers,
      prizeImageFile,
      winnerCount,
    })
  }

  const closeQuiz = () => {
    post('/api/quiz/close', {})
  }

  const clearQuiz = async () => {
    if (onEndQuiz) {
      await onEndQuiz()
      return
    }

    await post('/api/quiz/clear', {})
  }

  return (
    <section className={`quiz-admin-panel ${detail ? 'detail' : ''}`} aria-label="퀴즈 운영 패널">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Live Quiz</p>
          <h2>퀴즈 운영</h2>
        </div>
        {onOpen ? (
          <button type="button" className="panel-open-button" onClick={onOpen}>
            <Maximize2 size={14} />
            전체화면
          </button>
        ) : null}
      </div>

      <div className="quiz-admin-status">
        <span className={`quiz-mode-pill ${phase}`}>
          {phase === 'open'
            ? '진행 중'
            : phase === 'settling'
              ? '정답 확인 중'
            : phase === 'countdown' || phase === 'intro'
              ? '카운트다운'
              : phase === 'closed'
                ? '마감'
                : phase === 'standby'
                  ? '준비 중'
                  : '대기'}
        </span>
        <strong>답변 {answerCount}</strong>
        <strong>정답 {correctCount}</strong>
        <strong>{phase === 'settling' ? '정답 후보' : '정답자'} {phase === 'settling' ? correctCount : state.quiz.winners.length}/{state.quiz.winnerCount}</strong>
      </div>

      {phase === 'settling' ? (
        <div className="quiz-admin-settlement" role="status" aria-live="assertive">
          <strong>정답 확인 중...</strong>
          <span>{settlementValue}초 후 보정 제출시각 기준으로 최종 정답자를 확정합니다.</span>
        </div>
      ) : null}

      <div className="quiz-control-panel admin">
        <label>
          <span>준비된 퀴즈 선택</span>
          <select value={selectedQuizId} onChange={(event) => selectQuiz(event.target.value)}>
            {availableQuizzes.map((quiz, index) => (
              <option key={quiz.id} value={quiz.id}>
                {index + 1}. {quiz.title || quiz.question}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>문제</span>
          <textarea value={question} maxLength={180} onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <div className="quiz-control-grid">
          <label>
            <span>정답</span>
            <input value={answer} maxLength={120} onChange={(event) => setAnswer(event.target.value)} />
          </label>
          <label>
            <span>선착순</span>
            <input
              type="number"
              min={1}
              max={10}
              value={winnerCount}
              onChange={(event) => setWinnerCount(clamp(Number(event.target.value) || 1, 1, 10))}
            />
          </label>
        </div>
        <ImageSourceField
          label="이번 퀴즈 상품 이미지"
          description="준비된 퀴즈 상품을 바꾸거나, 현장에서 바로 다른 상품 이미지를 지정할 수 있습니다."
          value={prizeImageFile}
          previewLabel="이번 퀴즈 상품 이미지 미리보기"
          onRawChange={setPrizeImageFile}
          onChange={updatePrizeImage}
          onUpload={uploadPrizeImage}
          onClear={() => setPrizeImageFile('')}
        />
        {prizeStatus ? <p className="quiz-accepted-answers">{prizeStatus}</p> : null}
        {selectedQuiz.acceptedAnswers.length ? (
          <p className="quiz-accepted-answers">추가 인정 답: {selectedQuiz.acceptedAnswers.join(', ')}</p>
        ) : null}
        <div className="quiz-actions">
          <button type="button" className="primary-action" onClick={openQuiz} disabled={!question.trim() || !answer.trim()}>
            출제 / 다음 문제
          </button>
          <button type="button" onClick={closeQuiz} disabled={state.quiz.mode === 'idle' || state.quiz.mode === 'standby'}>
            답변 마감
          </button>
          <button type="button" onClick={clearQuiz} disabled={state.quiz.mode === 'idle'}>
            퀴즈 종료 / 투표 복귀
          </button>
        </div>
        <p className="quiz-accepted-answers">
          답변 마감은 현재 문제 입력만 닫고, 퀴즈 종료는 참가자를 투표 화면으로 돌려보냅니다.
        </p>
      </div>

      <div className="quiz-admin-current">
        <p className="section-kicker">Current Question</p>
        <h3>{state.quiz.question || '퀴즈 대기 중입니다. 준비된 문제를 선택해 출제하세요.'}</h3>
        {state.quiz.winners.length ? (
          <div className="quiz-winner-list">
            {state.quiz.winners.map((winner) => (
              <span key={`${winner.quizId}-${winner.id}`}>
                {winner.rank}등 {winner.author} {[winner.group, winner.department].filter(Boolean).length ? `(${[winner.group, winner.department].filter(Boolean).join(' · ')})` : ''}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {detail ? (
        <div className="quiz-answer-stream admin" aria-live="polite">
          {state.quiz.answers.length ? (
            state.quiz.answers.map((item) => (
              <article className={`quiz-answer-message ${item.correct ? 'correct' : ''}`} key={`${item.quizId}-${item.id}`}>
                <strong>
                  <span>{[item.author, item.group || 'ID 없음', item.department].filter(Boolean).join(' · ')}</span>
                  {item.rank ? <em>{item.rank}등 정답</em> : item.correct ? <em>정답</em> : null}
                </strong>
                <p>{item.text}</p>
              </article>
            ))
          ) : (
            <p className="empty-state compact">아직 도착한 답변이 없습니다.</p>
          )}
        </div>
      ) : null}
      {detail && quizWinnerHistory.length ? (
        <div className="quiz-history-panel">
          <p className="section-kicker">Quiz History</p>
          <h3>진행한 퀴즈 정답자 기록</h3>
          {quizWinnerHistory.map((record) => (
            <article key={record.id}>
              <strong>{record.question}</strong>
              <span>{formatMessageTime(record.createdAt)}</span>
              <div>
                {record.winners.map((winner) => (
                  <em key={`${record.id}-${winner.id}-${winner.rank ?? 0}`}>
                    {winner.rank ? `${winner.rank}등 ` : ''}
                    {winner.name}
                    {[winner.group, winner.department].filter(Boolean).length ? ` (${[winner.group, winner.department].filter(Boolean).join(' · ')})` : ''}
                  </em>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function PublicCheerBoard({
  state,
  selectedTeamId,
  onSelectAll,
  cheerNameMode,
  large = false,
}: {
  state: EventState
  selectedTeamId: string
  onSelectAll: () => void
  cheerNameMode: CheerNameMode
  large?: boolean
}) {
  const [focusedCheerId, setFocusedCheerId] = useState<number | null>(null)
  const teamMap = useMemo(() => new Map(state.teams.map((team) => [team.id, team])), [state.teams])
  const visibleCheers = state.cheers.filter((message) => !message.hidden)
  const selectedCheers = visibleCheers
    .filter((message) => selectedTeamId === 'all' || message.teamId === selectedTeamId)
    .slice(0, large ? 80 : 36)
  const selectedTeam = selectedTeamId === 'all' ? null : teamMap.get(selectedTeamId)
  const focusedCheer = focusedCheerId
    ? selectedCheers.find((message) => message.id === focusedCheerId) || visibleCheers.find((message) => message.id === focusedCheerId) || null
    : null
  const toggleCheerMessage = (messageId: number) => {
    setFocusedCheerId((current) => (current === messageId ? null : messageId))
  }

  return (
    <section
      className={`public-cheer-board ${large ? 'large' : ''} ${selectedTeam ? 'has-team-preview' : ''} ${focusedCheer ? 'has-expanded-message' : ''}`}
      style={selectedTeam ? ({ '--team-color': selectedTeam.color, ...getTeamPhotoStyle(selectedTeam) } as CSSProperties) : undefined}
      aria-label="응원 메시지 보드"
    >
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">{state.copy.wallCheerEyeline}</p>
          <h2>{selectedTeam ? `${selectedTeam.name} ${state.copy.wallSelectedCheerSuffix}` : state.copy.wallCheerTitle}</h2>
        </div>
        <button type="button" className="panel-open-button" onClick={onSelectAll}>
          전체
        </button>
      </div>

      <div className="public-cheer-stream" aria-live="polite">
        {selectedCheers.length ? (
          selectedCheers.map((message) => {
            const team = teamMap.get(message.teamId) ?? state.teams[0]
            const authorLabel = formatCheerAuthor(message.author, cheerNameMode)
            const isFocused = focusedCheerId === message.id
            return (
              <button
                type="button"
                className={`public-cheer-message ${isFocused ? 'is-focused-source' : ''}`}
                key={message.id}
                style={{ '--team-color': team.color } as CSSProperties}
                aria-expanded={isFocused}
                title={isFocused ? '클릭해서 응원 메시지 접기' : '클릭해서 전체 응원 메시지 보기'}
                onClick={() => toggleCheerMessage(message.id)}
              >
                <strong>
                  <span className="cheer-route-author">{authorLabel}</span>
                  <span className="cheer-route-arrow" aria-hidden="true">
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </span>
                  <span className="cheer-route-team">{team.name}</span>
                </strong>
                <p>{message.text}</p>
              </button>
            )
          })
        ) : (
          <p className="empty-state">아직 표시할 응원 메시지가 없습니다.</p>
        )}
      </div>
      {selectedTeam ? (
        <button
          type="button"
          className="selected-team-preview"
          style={{ '--team-color': selectedTeam.color, ...getTeamPhotoStyle(selectedTeam) } as CSSProperties}
          onClick={onSelectAll}
          aria-label={`${selectedTeam.name} 선택 해제`}
        >
          <TeamPhotoPreview team={selectedTeam} />
          <div className="selected-team-copy">
            <strong>{selectedTeam.name}</strong>
            <p>{selectedTeam.title}</p>
            <span>{selectedTeam.members.length ? selectedTeam.members.join(' · ') : '팀원 미등록'}</span>
          </div>
        </button>
      ) : null}
    </section>
  )
}

function getAdminPanelTitle(panel: AdminPanel) {
  if (panel === 'arena') return '실시간 별 현황 전체화면'
  if (panel === 'participants') return '실참여자 전체 리스트'
  if (panel === 'messages') return '응원 메시지 전체 관리'
  if (panel === 'teams') return '운영 콘텐츠 관리'
  if (panel === 'quiz') return '퀴즈 운영'
  if (panel === 'export') return '결과 내보내기'
  return '행운권 추첨 쇼업'
}

function AdminDetailPanel({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="admin-detail-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <section className="admin-detail-panel">
        <div className="detail-toolbar">
          <div>
            <p className="section-kicker">Admin Panel</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="패널 닫기">
            <X size={18} />
            닫기
          </button>
        </div>
        <div className="detail-scroll">{children}</div>
      </section>
    </div>
  )
}

function ArenaDetailPanel({
  state,
  starBudget,
  maxStarsPerTeam,
}: {
  state: EventState
  starBudget: number
  maxStarsPerTeam: number
}) {
  const totalStars = state.teams.reduce((sum, team) => sum + team.totalStars, 0)
  const totalVoters = state.teams.reduce((sum, team) => sum + team.voters, 0)

  return (
    <section className="arena-detail" aria-label="실시간 별 현황 전체화면">
      <div className="arena-detail-summary">
        <div>
          <span>전체 별</span>
          <strong>{totalStars}</strong>
        </div>
        <div>
          <span>참여 기록</span>
          <strong>{totalVoters}</strong>
        </div>
        <div>
          <span>1위 환산점수</span>
          <strong>{formatPointScore(state.teams[0]?.score ?? 0)}점</strong>
        </div>
      </div>

      <div className="arena-detail-list">
        {state.teams.map((team) => {
          const recentEvent = state.voteEvents.find((event) => event.teamId === team.id)
          return <TeamRow key={team.id} team={team} recentEvent={recentEvent} starBudget={starBudget} maxStarsPerTeam={maxStarsPerTeam} compact />
        })}
      </div>
    </section>
  )
}

function TeamRow({
  team,
  recentEvent,
  starBudget,
  maxStarsPerTeam,
  compact = false,
  showScore = true,
  showVoteAuthor = true,
  showScoreStack = true,
  showEventLabel = true,
  showMembersInline = false,
  selected = false,
  onSelect,
}: {
  team: Team
  recentEvent?: VoteEvent
  starBudget: number
  maxStarsPerTeam: number
  compact?: boolean
  showScore?: boolean
  showVoteAuthor?: boolean
  showScoreStack?: boolean
  showEventLabel?: boolean
  showMembersInline?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const burstCount = recentEvent ? Math.min(starBudget, maxStarsPerTeam, Math.abs(recentEvent.delta)) : 0
  const rankDelta = team.rankDelta ?? 0
  const rankMoveClass = rankDelta > 0 ? 'up' : rankDelta < 0 ? 'down' : 'same'
  const normalizedScore = formatPointScore(team.score ?? team.share / 10)
  const scoreShare = clamp(((team.score ?? 0) / 10) * 100, 0, 100)
  const progressLabel = showScore ? `${normalizedScore}점` : `${team.totalStars}★`
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    onSelect()
  }

  return (
    <div
      className={`team-row ${compact ? 'compact-row' : ''} ${showScoreStack ? '' : 'no-score-stack'} rank-${rankMoveClass} ${onSelect ? 'is-clickable' : ''} ${selected ? 'is-selected' : ''}`}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      style={
        {
          '--team-color': team.color,
          '--share': `${scoreShare}%`,
        } as CSSProperties
      }
    >
      <div className={`rank-badge ${rankMoveClass}`}>
        <strong>{team.rank}</strong>
        <span>{rankDelta > 0 ? '▲' : rankDelta < 0 ? '▼' : '•'}</span>
      </div>
      <LogoMark team={team} />
      <div className="team-meta">
        <div>
          <h3>
            {team.name}
            {showMembersInline && team.members.length ? <span className="team-members-inline">{team.members.join(' · ')}</span> : null}
          </h3>
          <p>{team.title}</p>
        </div>
        <div className="progress-line">
          <div className="progress-track" aria-hidden="true">
            <span />
          </div>
          <em>{progressLabel}</em>
        </div>
      </div>
      {showScoreStack ? (
        <div className="score-stack">
          <div className="score-main">
            <strong>{team.totalStars}</strong>
          </div>
          <span>stars</span>
        </div>
      ) : null}

      {recentEvent && burstCount > 0 ? (
        <div
          className={`star-burst ${recentEvent.delta > 0 ? 'gain' : 'loss'}`}
          key={recentEvent.id}
          aria-hidden="true"
        >
          {showEventLabel ? <small>{showVoteAuthor ? recentEvent.author : recentEvent.delta > 0 ? '별 추가' : '별 회수'}</small> : null}
          <div>
            {Array.from({ length: burstCount }).map((_, index) => (
              <span key={index} style={{ '--i': index } as CSSProperties}>
                ★
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="stat-popover" role="tooltip">
        <strong>{team.name}</strong>
        <span>총 별 {team.totalStars}개</span>
        <span>참여자 {team.voters}명</span>
        {showScore ? <span>환산점수 {normalizedScore}점</span> : null}
        <div className="popover-members">
          <em>팀원</em>
          <span>{team.members.length ? team.members.join(' · ') : '팀원 미등록'}</span>
        </div>
      </div>
    </div>
  )
}

function CheerWall({ state, onOpen }: { state: EventState; onOpen: () => void }) {
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))
  const visibleCheers = state.cheers.filter((message) => !message.hidden)

  return (
    <section className="message-wall" aria-label="응원 메시지">
      <button type="button" className="message-wall-open" onClick={onOpen}>
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Cheer Bubble</p>
            <h2>응원 메시지</h2>
          </div>
          <span>Showup</span>
        </div>
        <div className="bubble-stream">
          {visibleCheers.map((message) => {
            const team = teamMap.get(message.teamId) ?? state.teams[0]
            return (
              <div className="bubble" key={message.id} style={{ '--team-color': team.color } as CSSProperties}>
                <strong>{team.name}</strong>
                <span>{message.text}</span>
                <small>{message.author}</small>
              </div>
            )
          })}
        </div>
      </button>
    </section>
  )
}

function VoteActivityFeed({ state }: { state: EventState }) {
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))

  return (
    <section className="vote-feed-panel" aria-label="실시간 별 움직임">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Star Motion</p>
          <h2>별 움직임</h2>
        </div>
        <Star size={20} />
      </div>

      <div className="vote-event-list" aria-live="polite">
        {state.voteEvents.length ? (
          state.voteEvents.slice(0, 18).map((event) => {
            const team = teamMap.get(event.teamId) ?? state.teams[0]

            return (
              <div
                className={`vote-event-row ${event.delta > 0 ? 'gain' : 'loss'}`}
                key={event.id}
                style={{ '--team-color': team.color } as CSSProperties}
              >
                <strong>{event.delta > 0 ? `+${event.delta}★` : `${event.delta}★`}</strong>
                <span>{team.name}</span>
                <small>{event.author}</small>
              </div>
            )
          })
        ) : (
          <p className="empty-state compact">아직 별 이동이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function ParticipantListPanel({ state, onOpen }: { state: EventState; onOpen: () => void }) {
  const participants = useMemo(() => getParticipantSummaries(state), [state])
  const activeCount = participants.filter((person) => person.spent > 0 || person.cheers.total > 0).length

  return (
    <section className="participant-panel" aria-label="실참여자 리스트">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Live Participants</p>
          <h2>실참여자 리스트</h2>
        </div>
        <div className="participant-counts">
          <span>{participants.length} 등록</span>
          <span>{activeCount} 참여</span>
          <button type="button" onClick={onOpen}>
            <Maximize2 size={13} />
            전체
          </button>
        </div>
      </div>

      <div className="participant-list">
        {participants.length ? (
          participants.map((person) => (
            <article className={`participant-row ${person.statusClass}`} key={person.id}>
              <div className="participant-identity">
                <strong>{person.name}</strong>
                <span>{person.group}</span>
              </div>
              <div className="participant-metrics" aria-label={`${person.name} 참여 현황`}>
                <span>
                  <Star size={13} />
                  {person.spent}
                </span>
                <span>
                  <Megaphone size={13} />
                  {person.cheers.visible}/{person.cheers.total}
                </span>
              </div>
              <p>{person.allocationSummary}</p>
              <div className="participant-foot">
                <small>최근 {formatMessageTime(person.updatedAt)} · ID {person.id.slice(-6)}</small>
                <em>{person.status}</em>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state compact">아직 등록된 참여자가 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function ParticipantDetailPanel({
  state,
  post,
}: {
  state: EventState
  post: PostEventState
}) {
  const participants = useMemo(() => getParticipantSummaries(state), [state])
  const resetParticipant = (person: ParticipantSummary) => {
    if (!window.confirm(`${person.name}님의 투표와 응원 메시지를 초기화할까요? 등록 정보는 유지됩니다.`)) return
    void post('/api/participant/reset', { participantId: person.id })
  }
  const deleteParticipant = (person: ParticipantSummary) => {
    if (!window.confirm(`${person.name}님을 참여자 리스트에서 삭제할까요? 투표, 응원 메시지, 퀴즈 답변도 함께 정리됩니다.`)) return
    void post('/api/participant/delete', { participantId: person.id })
  }

  return (
    <div className="detail-list participant-detail-list">
      {participants.length ? (
        participants.map((person) => (
          <article className={`participant-row detail ${person.statusClass}`} key={person.id}>
            <div className="participant-identity">
              <strong>{person.name}</strong>
              <span>{person.group}{person.department ? ` · ${person.department}` : ''}</span>
            </div>
            <div className="participant-metrics" aria-label={`${person.name} 참여 현황`}>
              <span>
                <Star size={13} />
                {person.spent}
              </span>
              <span>
                <Megaphone size={13} />
                {person.cheers.visible}/{person.cheers.total}
              </span>
            </div>
            <p>{person.allocationSummary}</p>
            <div className="participant-allocation-bars">
              {person.allocationsList.length ? (
                person.allocationsList.map(([teamId, value]) => {
                  const team = state.teams.find((item) => item.id === teamId)
                  return (
                    <span key={teamId} style={{ '--team-color': team?.color ?? '#A50034', '--share': `${Math.min(100, value * 10)}%` } as CSSProperties}>
                      <em>{team?.name ?? '팀'}</em>
                      <i />
                      <strong>{value}★</strong>
                    </span>
                  )
                })
              ) : (
                <small>아직 별을 사용하지 않았습니다.</small>
              )}
            </div>
            <div className="participant-foot">
              <small>최근 {formatMessageTime(person.updatedAt)} · ID {person.id}</small>
              <em>{person.status}</em>
            </div>
            <div className="participant-admin-actions" aria-label={`${person.name} 관리`}>
              <button type="button" onClick={() => resetParticipant(person)} disabled={person.spent <= 0 && person.cheers.total <= 0}>
                <RefreshCcw size={14} />
                투표/응원 Reset
              </button>
              <button type="button" className="danger" onClick={() => deleteParticipant(person)}>
                <Trash2 size={14} />
                참여자 삭제
              </button>
            </div>
          </article>
        ))
      ) : (
        <p className="empty-state">아직 등록된 참여자가 없습니다.</p>
      )}
    </div>
  )
}

function CheerModerationPanel({
  state,
  post,
  onOpen,
}: {
  state: EventState
  post: PostEventState
  onOpen: () => void
}) {
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))
  const visibleCount = state.cheers.filter((message) => !message.hidden).length
  const hiddenCount = state.cheers.length - visibleCount

  const toggleMessage = (message: CheerMessage) => {
    post('/api/cheer/moderate', {
      messageId: message.id,
      hidden: !message.hidden,
    })
  }

  return (
    <section className="moderation-panel" aria-label="응원 메시지 관리">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Message Control</p>
          <h2>메시지 관리</h2>
        </div>
        <div className="moderation-counts">
          <span>{visibleCount} 공개</span>
          <span>{hiddenCount} 숨김</span>
          <button type="button" onClick={onOpen}>
            <Maximize2 size={13} />
            관리
          </button>
        </div>
      </div>

      <div className="moderation-list">
        {state.cheers.length ? (
          state.cheers.map((message) => {
            const team = teamMap.get(message.teamId) ?? state.teams[0]

            return (
              <div
                className={`moderation-item ${message.hidden ? 'hidden' : ''}`}
                key={message.id}
                style={{ '--team-color': team.color } as CSSProperties}
              >
                <div>
                  <strong>{message.author}</strong>
                  <span>{team.name}</span>
                </div>
                <p>{message.text}</p>
                <button type="button" onClick={() => toggleMessage(message)}>
                  {message.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  {message.hidden ? '공개' : '숨김'}
                </button>
              </div>
            )
          })
        ) : (
          <p className="empty-state">아직 관리할 응원 메시지가 없습니다.</p>
        )}
      </div>
    </section>
  )
}

function MessageManagerDetail({
  state,
  post,
}: {
  state: EventState
  post: PostEventState
}) {
  const [keyword, setKeyword] = useState('')
  const teamMap = useMemo(() => new Map(state.teams.map((team) => [team.id, team])), [state.teams])
  const filteredMessages = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return state.cheers.filter((message) => {
      if (!normalizedKeyword) return true

      const team = teamMap.get(message.teamId)
      return [message.author, message.text, team?.name, team?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedKeyword))
    })
  }, [keyword, state.cheers, teamMap])
  const visibleFilteredCount = filteredMessages.filter((message) => !message.hidden).length
  const hiddenFilteredCount = filteredMessages.length - visibleFilteredCount

  const toggleMessage = (message: CheerMessage) => {
    post('/api/cheer/moderate', {
      messageId: message.id,
      hidden: !message.hidden,
    })
  }

  const bulkAction = (action: 'hide' | 'show' | 'delete') => {
    const messageIds = filteredMessages.map((message) => message.id)
    if (!messageIds.length) return
    if (action === 'delete' && !window.confirm(`필터된 메시지 ${messageIds.length}개를 삭제할까요?`)) return

    post('/api/cheer/bulk', { action, messageIds })
  }

  return (
    <div className="message-manager-detail">
      <div className="message-filter-bar">
        <label>
          <Search size={17} />
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="작성자, 팀명, 메시지 키워드로 필터"
          />
        </label>
        <div className="bulk-actions">
          <span>{filteredMessages.length}개 결과 · {visibleFilteredCount} 공개 · {hiddenFilteredCount} 숨김</span>
          <button type="button" onClick={() => bulkAction('hide')} disabled={!visibleFilteredCount}>
            <EyeOff size={15} />
            필터 숨김
          </button>
          <button type="button" onClick={() => bulkAction('show')} disabled={!hiddenFilteredCount}>
            <Eye size={15} />
            필터 공개
          </button>
          <button type="button" className="danger" onClick={() => bulkAction('delete')} disabled={!filteredMessages.length}>
            <Trash2 size={15} />
            필터 삭제
          </button>
        </div>
      </div>

      <div className="detail-list message-detail-list">
        {filteredMessages.length ? (
          filteredMessages.map((message) => {
            const team = teamMap.get(message.teamId) ?? state.teams[0]

            return (
              <article
                className={`moderation-item detail ${message.hidden ? 'hidden' : ''}`}
                key={message.id}
                style={{ '--team-color': team.color } as CSSProperties}
              >
                <div>
                  <strong>{message.author}</strong>
                  <span>{team.name}</span>
                  <time>{formatMessageTime(message.createdAt)}</time>
                </div>
                <p>{message.text}</p>
                <button type="button" onClick={() => toggleMessage(message)}>
                  {message.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  {message.hidden ? '공개' : '숨김'}
                </button>
              </article>
            )
          })
        ) : (
          <p className="empty-state">필터 조건에 맞는 메시지가 없습니다.</p>
        )}
      </div>
    </div>
  )
}

function TeamConfigPanel({ state, onOpen }: { state: EventState; onOpen: () => void }) {
  return (
    <section className="team-config-panel" aria-label="운영 콘텐츠 관리">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">{state.copy.contentPanelEyeline}</p>
          <h2>{state.copy.contentPanelTitle}</h2>
        </div>
        <button type="button" className="panel-open-button" onClick={onOpen}>
          <Settings2 size={14} />
          관리
        </button>
      </div>
      <div className="config-summary">
        <strong>{state.teams.length}개 팀</strong>
        <span>{state.copy.contentPanelSummary}</span>
      </div>
    </section>
  )
}

function ResultExportPanel({ state, onOpen }: { state: EventState; onOpen?: () => void }) {
  const totalStars = state.teams.reduce((sum, team) => sum + team.totalStars, 0)

  return (
    <section className="result-export-panel" aria-label="결과 내보내기">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Export</p>
          <h2>결과 내보내기</h2>
        </div>
        <div className="result-export-actions">
          {onOpen ? (
            <button type="button" className="panel-open-button" onClick={onOpen}>
              <Maximize2 size={14} />
              열기
            </button>
          ) : null}
          <button type="button" className="panel-open-button" onClick={() => exportResultsWorkbook(state)}>
            <FileSpreadsheet size={14} />
            XLSX
          </button>
        </div>
      </div>
      <div className="config-summary">
        <strong>{totalStars}개 별</strong>
        <span>팀별 결과, 참여자, 응원 메시지, 추첨 결과를 엑셀 파일로 저장합니다.</span>
      </div>
    </section>
  )
}

function ResultExportDetailPanel({ state }: { state: EventState }) {
  const participants = useMemo(() => getParticipantSummaries(state), [state])
  const totalStars = state.teams.reduce((sum, team) => sum + team.totalStars, 0)
  const visibleCheers = state.cheers.filter((message) => !message.hidden).length
  const hiddenCheers = state.cheers.length - visibleCheers

  return (
    <div className="result-export-detail">
      <div className="export-summary-grid" aria-label="내보내기 요약">
        <div>
          <span>팀</span>
          <strong>{state.teams.length}</strong>
        </div>
        <div>
          <span>참여자</span>
          <strong>{participants.length}</strong>
        </div>
        <div>
          <span>누적 별</span>
          <strong>{totalStars}</strong>
        </div>
        <div>
          <span>응원 메시지</span>
          <strong>{visibleCheers}/{state.cheers.length}</strong>
        </div>
      </div>
      <button type="button" className="export-primary-button" onClick={() => exportResultsWorkbook(state)}>
        <FileSpreadsheet size={18} />
        엑셀 파일로 저장
      </button>
      <p className="config-help">
        행사 요약, 팀별 결과, 참여자, 응원 메시지, 추첨 결과, 퀴즈 답변이 한 파일에 들어갑니다.
        숨김 메시지는 별도 상태로 표시되며 삭제된 참여자는 내보내기 대상에서 제외됩니다.
      </p>
      <div className="export-preview-list" aria-label="내보내기 미리보기">
        {participants.slice(0, 12).map((person) => (
          <span key={person.id}>
            <strong>{person.name}</strong>
            <em>{person.group}</em>
            <small>{person.status} · {person.spent}★</small>
          </span>
        ))}
        {participants.length > 12 ? <span className="more">외 {participants.length - 12}명</span> : null}
      </div>
      {hiddenCheers ? <p className="config-status">{hiddenCheers}개의 숨김 메시지도 상태값과 함께 내보냅니다.</p> : null}
    </div>
  )
}

function TeamConfigDetail({
  state,
  post,
}: {
  state: EventState
  post: PostEventState
}) {
  const [draftCopy, setDraftCopy] = useState<EventCopy>(() => ({ ...fallbackCopy, ...state.copy }))
  const [draftTeams, setDraftTeams] = useState(() => createTeamDrafts(state.teams))
  const [draftQuizzes, setDraftQuizzes] = useState(() => createQuizDrafts(state.quizBank))
  const [statusText, setStatusText] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const saveTarget = getConfigSaveTarget()

  const updateCopy = (key: keyof EventCopy, value: string) => {
    setDraftCopy((current) => ({ ...current, [key]: value }))
  }

  const updateCopyImage = (key: EventCopyImageKey, value: string) => {
    updateCopy(key, normalizeLogoSourceValue(value))
  }

  const updateTeam = (index: number, field: string, value: string) => {
    setDraftTeams((current) =>
      current.map((team, teamIndex) => (teamIndex === index ? { ...team, [field]: value } : team)),
    )
  }

  const updateTeamLogo = (index: number, value: string) => {
    updateTeam(index, 'logoFile', normalizeLogoSourceValue(value))
  }

  const uploadTeamLogo = async (index: number, file: File | undefined) => {
    if (!file) return

    try {
      const dataUrl = await readLogoFileAsDataUrl(file)
      updateTeam(index, 'logoFile', dataUrl)
      setStatusText(`${draftTeams[index]?.name || `Team ${index + 1}`} 로고/사진 파일을 불러왔습니다.`)
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : '이미지 파일을 불러오지 못했습니다.')
    }
  }

  const uploadCopyImage = async (key: EventCopyImageKey, file: File | undefined) => {
    if (!file) return

    try {
      const dataUrl = await readLogoFileAsDataUrl(file)
      updateCopy(key, dataUrl)
      setStatusText(`${copyLabels[key]} 파일을 불러왔습니다.`)
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : '이미지 파일을 불러오지 못했습니다.')
    }
  }

  const updateQuiz = (index: number, field: string, value: string | boolean) => {
    setDraftQuizzes((current) =>
      current.map((quiz, quizIndex) => (quizIndex === index ? { ...quiz, [field]: value } : quiz)),
    )
  }

  const updateQuizPrizeImage = (index: number, value: string) => {
    updateQuiz(index, 'prizeImageFile', normalizeLogoSourceValue(value))
  }

  const uploadQuizPrizeImage = async (index: number, file: File | undefined) => {
    if (!file) return

    try {
      const dataUrl = await readLogoFileAsDataUrl(file)
      updateQuiz(index, 'prizeImageFile', dataUrl)
      setStatusText(`${draftQuizzes[index]?.title || `퀴즈 ${index + 1}`} 상품 이미지를 불러왔습니다.`)
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : '이미지 파일을 불러오지 못했습니다.')
    }
  }

  const saveConfig = async () => {
    if (savingConfig) return

    setSavingConfig(true)
    setStatusText(`${saveTarget.label}에 저장하고 열린 화면에 반영하는 중입니다...`)

    try {
      const response = await saveTeamConfigPayload(post, {
        copy: normalizeCopyForSave(draftCopy),
        teams: draftTeams.map((team, index) => teamDraftToConfig(team, index)),
        quizzes: draftQuizzes.map((quiz, index) => quizDraftToConfig(quiz, index)),
      })

      if (response) {
        setDraftCopy({ ...fallbackCopy, ...response.copy })
        setDraftTeams(createTeamDrafts(response.teams))
        setDraftQuizzes(createQuizDrafts(response.quizBank))
        setStatusText(getConfigSavedStatus(response))
        return
      }

      setStatusText(getConfigSaveFailureMessage(new Error('no response'), saveTarget))
    } catch (error) {
      setStatusText(getConfigSaveFailureMessage(error, saveTarget))
    } finally {
      setSavingConfig(false)
    }
  }

  const importConfig = async (file: File | undefined) => {
    if (!file) return

    try {
      const parsed = await parseTeamInfoFile(file)
      setSavingConfig(true)
      setStatusText(`${file.name}을 ${saveTarget.label}에 적용하는 중입니다...`)
      const response = await saveTeamConfigPayload(post, parsed)

      if (response) {
        setDraftCopy({ ...fallbackCopy, ...response.copy })
        setDraftTeams(createTeamDrafts(response.teams))
        setDraftQuizzes(createQuizDrafts(response.quizBank))
        setStatusText(`${file.name}을 적용했습니다. ${getConfigSavedStatus(response)}`)
      } else {
        setStatusText(getConfigSaveFailureMessage(new Error('no response'), saveTarget))
      }
    } catch (error) {
      setStatusText(
        error instanceof SyntaxError
          ? '업로드한 JSON 파일을 읽지 못했습니다. 파일 형식을 확인해주세요.'
          : getConfigSaveFailureMessage(error, saveTarget),
      )
    } finally {
      setSavingConfig(false)
    }
  }

  return (
    <div className="team-config-detail">
      <div className="config-toolbar">
        <label className={`file-import-button ${savingConfig ? 'is-disabled' : ''}`} aria-disabled={savingConfig}>
          <Upload size={16} />
          team_infos.zip / JSON 업로드
          <input
            type="file"
            accept=".zip,.json,application/json,application/zip"
            disabled={savingConfig}
            onChange={(event) => {
              importConfig(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
        <button type="button" onClick={() => downloadTeamInfoJson({ copy: draftCopy, teams: draftTeams, quizzes: draftQuizzes })}>
          <Download size={16} />
          로컬 JSON 저장
        </button>
        <button type="button" className="primary-action" onClick={saveConfig} disabled={savingConfig}>
          <Save size={16} />
          {savingConfig ? '저장 중...' : saveTarget.primaryLabel}
        </button>
      </div>

      <div className="config-save-mode" data-mode={saveTarget.kind}>
        <strong>현재 저장 대상: {saveTarget.label}</strong>
        <span>{saveTarget.description}</span>
      </div>
      <p className="config-help">
        ZIP 구조는 <code>team_infos/team_info.json</code>과 <code>team_infos/logos/T1-logo.png</code> 형식을 권장합니다.
        로고는 png, jpg, webp, svg, ico를 받을 수 있습니다. 사내망에서 outbound 요청이 막히면 먼저 <strong>로컬 JSON 저장</strong>으로 백업한 뒤,
        인터넷 연결이 가능한 관리자 PC에서 다시 업로드하세요.
      </p>
      {statusText ? <p className={`config-status ${savingConfig ? 'is-pending' : ''}`}>{statusText}</p> : null}

      <section className="visual-config-grid" aria-label="브랜드와 상품 이미지 관리">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Visual Assets</p>
            <h2>브랜드/상품 이미지</h2>
          </div>
        </div>
        <div className="visual-config-list">
          <ImageSourceField
            label="상단 로고"
            description="/vote, /wall, /admin 좌측 상단 V 로고 자리에 표시됩니다."
            value={draftCopy.appLogoFile}
            previewLabel="로고 미리보기"
            onRawChange={(value) => updateCopy('appLogoFile', value)}
            onChange={(value) => updateCopyImage('appLogoFile', value)}
            onUpload={(file) => uploadCopyImage('appLogoFile', file)}
            onClear={() => updateCopy('appLogoFile', '')}
          />
          <ImageTuningControls
            title="상단 로고 표시 방식"
            description="저장 전에도 아래 미리보기에서 상단 아이콘의 프레임, 맞춤, 확대, 초점을 바로 확인할 수 있습니다."
            preview={
              <div className="brand-logo-live-preview">
                <div className="stage-preview-topbar">
                  <BrandLogoFrameEditor
                    copy={draftCopy}
                    onChange={(field, value) => {
                      const keyByField: Record<ImageTuningField, keyof EventCopy> = {
                        shape: 'appLogoShape',
                        frame: 'appLogoFrame',
                        fit: 'appLogoFit',
                        width: 'appLogoWidth',
                        height: 'appLogoHeight',
                        zoom: 'appLogoZoom',
                        focusX: 'appLogoFocusX',
                        focusY: 'appLogoFocusY',
                      }
                      updateCopy(keyByField[field], value)
                    }}
                    onUpload={(file) => uploadCopyImage('appLogoFile', file)}
                  />
                  <div>
                    <span>{draftCopy.wallEyeline || draftCopy.audienceEyeline}</span>
                    <strong>{draftCopy.appTitle}</strong>
                  </div>
                </div>
                <small>
                  현재 프레임 {getAppLogoFrameLabel(draftCopy)} · {normalizeImageFit(draftCopy.appLogoFit, 'cover') === 'contain' ? '전체보이기' : '채우기'}
                </small>
              </div>
            }
            values={{
              shape: draftCopy.appLogoShape,
              frame: draftCopy.appLogoFrame,
              fit: draftCopy.appLogoFit,
              size: draftCopy.appLogoSize,
              width: draftCopy.appLogoWidth,
              height: draftCopy.appLogoHeight,
              zoom: draftCopy.appLogoZoom,
              focusX: draftCopy.appLogoFocusX,
              focusY: draftCopy.appLogoFocusY,
            }}
            widthRange={[36, 220]}
            heightRange={[32, 120]}
            onChange={(field, value) => {
              const keyByField: Record<ImageTuningField, keyof EventCopy> = {
                shape: 'appLogoShape',
                frame: 'appLogoFrame',
                fit: 'appLogoFit',
                width: 'appLogoWidth',
                height: 'appLogoHeight',
                zoom: 'appLogoZoom',
                focusX: 'appLogoFocusX',
                focusY: 'appLogoFocusY',
              }
              updateCopy(keyByField[field], value)
            }}
          />
          {rafflePrizeImageFields.map((field) => (
            <ImageSourceField
              key={field.key}
              label={field.label}
              description={field.description}
              value={draftCopy[field.key]}
              previewLabel="상품 이미지 미리보기"
              onRawChange={(value) => updateCopy(field.key, value)}
              onChange={(value) => updateCopyImage(field.key, value)}
              onUpload={(file) => uploadCopyImage(field.key, file)}
              onClear={() => updateCopy(field.key, '')}
            />
          ))}
          <div className="prize-name-config">
            <div className="logo-source-head">
              <span>행운권 상품 이름</span>
              <small>추첨 화면, 당첨 안내, 내 수상 이력에서 상품 이름을 함께 표시합니다.</small>
            </div>
            <div className="prize-name-grid">
              {rafflePrizeNameFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    value={draftCopy[field.key]}
                    placeholder={field.description}
                    onChange={(event) => updateCopy(field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="copy-config-grid" aria-label="화면 문구 관리">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Screen Copy</p>
            <h2>화면별 문구 관리</h2>
          </div>
        </div>
        {copyGroups.map((group) => (
          <article className="copy-config-group" key={group.id}>
            <div className="copy-group-heading">
              <p className="section-kicker">{group.eyeline}</p>
              <h3>{group.title}</h3>
              <span>{group.description}</span>
            </div>
            <div className="copy-field-grid">
              {group.keys.map((key) => (
                <label key={key}>
                  <span>
                    <strong>{copyLabels[key]}</strong>
                    {copyHelp[key] ? <em>{copyHelp[key]}</em> : null}
                  </span>
                  <textarea value={draftCopy[key]} onChange={(event) => updateCopy(key, event.target.value)} />
                </label>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="team-editor-list" aria-label="팀별 정보 편집">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Teams</p>
            <h2>팀별 정보</h2>
          </div>
        </div>
        {draftTeams.map((team, index) => (
          <article className="team-editor-card" key={`team-editor-${team.sortOrder}-${index}`}>
            <div className="team-editor-head">
              <LogoMark team={teamEditorPreview(team)} />
              <div>
                <strong>{team.name || `Team ${index + 1}`}</strong>
                <span>{team.title || '프로젝트명 미정'}</span>
              </div>
              <a
                className="team-self-link"
                href={getTeamEditPath(team.id || `team-${index + 1}`, team.code, team.editKey)}
                target="_blank"
                rel="noreferrer"
              >
                <Link2 size={14} />
                팀 편집 링크
              </a>
            </div>

            <div className="team-editor-grid">
              <label>
                <span>내부 ID</span>
                <input value={team.id} readOnly title="투표/응원 기록 연결에 쓰이는 내부 ID입니다. 행사 중에는 수정하지 않습니다." />
              </label>
              <label>
                <span>팀 편집 키</span>
                <input value={team.editKey} onChange={(event) => updateTeam(index, 'editKey', event.target.value)} />
              </label>
              <label>
                <span>코드</span>
                <input value={team.code} onChange={(event) => updateTeam(index, 'code', event.target.value)} />
              </label>
              <label>
                <span>팀명</span>
                <input value={team.name} onChange={(event) => updateTeam(index, 'name', event.target.value)} />
              </label>
              <label>
                <span>프로젝트명</span>
                <input value={team.title} onChange={(event) => updateTeam(index, 'title', event.target.value)} />
              </label>
              <label className="wide">
                <span>팀원</span>
                <textarea value={team.membersText} onChange={(event) => updateTeam(index, 'membersText', event.target.value)} />
              </label>
              <LogoSourceField
                team={team}
                index={index}
                onChange={(value) => updateTeamLogo(index, value)}
                onRawChange={(value) => updateTeam(index, 'logoFile', value)}
                onUpload={(file) => uploadTeamLogo(index, file)}
                onClear={() => updateTeam(index, 'logoFile', '')}
                onTuningChange={(field, value) => updateTeam(index, field, value)}
              />
              <ColorField value={team.color} onChange={(value) => updateTeam(index, 'color', value)} />
              <label>
                <span>기본 로고</span>
                <select value={team.logo} onChange={(event) => updateTeam(index, 'logo', event.target.value)}>
                  {logoKinds.map((logo) => (
                    <option key={logo} value={logo}>{logo}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>테스트 기본 별</span>
                <input value={team.baseStars} onChange={(event) => updateTeam(index, 'baseStars', event.target.value)} />
              </label>
              <label>
                <span>테스트 기본 투표자</span>
                <input value={team.baseVoters} onChange={(event) => updateTeam(index, 'baseVoters', event.target.value)} />
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="quiz-editor-list" aria-label="퀴즈 정보 편집">
        <div className="section-heading compact">
          <div>
            <p className="section-kicker">Quiz Bank</p>
            <h2>미리 준비한 퀴즈</h2>
          </div>
          <span className="config-count">{draftQuizzes.length}/15</span>
        </div>
        {draftQuizzes.map((quiz, index) => (
          <article className="quiz-editor-card" key={`quiz-editor-${index}`}>
            <div className="quiz-editor-head">
              <strong>{index + 1}. {quiz.title || '제목 없음'}</strong>
              <label className="quiz-enabled-toggle">
                <input
                  type="checkbox"
                  checked={quiz.enabled}
                  onChange={(event) => updateQuiz(index, 'enabled', event.target.checked)}
                />
                사용
              </label>
            </div>
            <div className="quiz-editor-grid">
              <label>
                <span>ID</span>
                <input value={quiz.id} onChange={(event) => updateQuiz(index, 'id', event.target.value)} />
              </label>
              <label>
                <span>제목</span>
                <input value={quiz.title} onChange={(event) => updateQuiz(index, 'title', event.target.value)} />
              </label>
              <label>
                <span>선착순</span>
                <input value={quiz.winnerCount} onChange={(event) => updateQuiz(index, 'winnerCount', event.target.value)} />
              </label>
              <label className="wide">
                <span>문제</span>
                <textarea value={quiz.question} onChange={(event) => updateQuiz(index, 'question', event.target.value)} />
              </label>
              <label>
                <span>정답</span>
                <input value={quiz.answer} onChange={(event) => updateQuiz(index, 'answer', event.target.value)} />
              </label>
              <label>
                <span>추가 인정 답</span>
                <textarea value={quiz.acceptedAnswersText} onChange={(event) => updateQuiz(index, 'acceptedAnswersText', event.target.value)} />
              </label>
              <ImageSourceField
                label="퀴즈 상품 이미지"
                description="이 문제를 출제했을 때 /wall과 참가자 화면에 보여줄 상품 이미지입니다."
                value={quiz.prizeImageFile}
                previewLabel="퀴즈 상품 이미지 미리보기"
                onRawChange={(value) => updateQuiz(index, 'prizeImageFile', value)}
                onChange={(value) => updateQuizPrizeImage(index, value)}
                onUpload={(file) => uploadQuizPrizeImage(index, file)}
                onClear={() => updateQuiz(index, 'prizeImageFile', '')}
              />
            </div>
          </article>
        ))}
        {draftQuizzes.length < 15 ? (
          <button
            type="button"
            className="add-quiz-button"
            onClick={() =>
              setDraftQuizzes((current) => [
                ...current,
                createBlankQuizDraft(current.length),
              ])
            }
          >
            <Sparkles size={16} />
            퀴즈 추가
          </button>
        ) : null}
      </section>
    </div>
  )
}

function TeamSelfEditView({
  state,
  post,
}: {
  state: EventState
  post: PostEventState
}) {
  const routeTeamId = getTeamEditRouteId()
  const routeTeamKey = getTeamEditRouteKey()
  const teamIndex = state.teams.findIndex((team) => team.id === routeTeamId || team.code.toLowerCase() === routeTeamId.toLowerCase())
  const matchedTeam = teamIndex >= 0 ? state.teams[teamIndex] : null
  const team =
    matchedTeam && routeTeamKey === getTeamEditKey(matchedTeam.id, matchedTeam.code, matchedTeam.editKey)
      ? matchedTeam
      : null
  const [draftTeam, setDraftTeam] = useState<TeamConfigDraft | null>(() => (team ? createTeamDraft(team, getConfigOrder(team)) : null))
  const [statusText, setStatusText] = useState('')

  const updateDraft = (field: string, value: string) => {
    setDraftTeam((current) => (current ? { ...current, [field]: value } : current))
  }

  const updateLogo = (value: string) => {
    updateDraft('logoFile', normalizeLogoSourceValue(value))
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return

    try {
      const dataUrl = await readLogoFileAsDataUrl(file)
      updateDraft('logoFile', dataUrl)
      setStatusText('이미지 파일을 불러왔습니다. 저장하면 즉시 반영됩니다.')
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : '이미지 파일을 불러오지 못했습니다.')
    }
  }

  const saveTeam = async () => {
    if (!team || !draftTeam) return

    const response = await post('/api/team-self-config', {
      teamId: team.id,
      teamKey: getTeamEditKey(team.id, team.code, team.editKey),
      team: teamDraftToSelfConfig(draftTeam),
    })

    const updatedTeam = response?.teams.find((item) => item.id === team.id)
    if (response && updatedTeam) {
      setDraftTeam(createTeamDraft(updatedTeam, getConfigOrder(updatedTeam)))
      setStatusText('팀 정보가 저장되고 관객 화면과 송출 화면에 바로 반영되었습니다.')
      return
    }

    setStatusText('팀 정보 저장에 실패했습니다. 잠시 뒤 다시 시도해주세요.')
  }

  if (!team || !draftTeam) {
    return (
      <section className="team-self-edit-view">
        <div className="team-self-card missing">
          <p className="section-kicker">Team Setup</p>
          <h2>팀 편집 링크를 확인해주세요.</h2>
          <p>주소의 팀 ID 또는 편집 키가 일치하지 않습니다. 운영자에게 받은 팀별 링크로 다시 접속해주세요.</p>
          <a className="role-nav-link" href="/vote">
            <Radio size={15} />
            관객 화면으로 이동
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="team-self-edit-view">
      <div className="team-self-card">
        <div className="team-self-heading">
          <div>
            <p className="section-kicker">Team Setup</p>
            <h2>{draftTeam.name || team.name} 표시 정보 편집</h2>
            <p>이 링크에서는 이 팀의 이름, 프로젝트 문구, 팀원, 사진과 표시 방식만 수정할 수 있습니다. 코드는 운영자만 바꿀 수 있습니다.</p>
          </div>
          <button type="button" className="primary-action" onClick={saveTeam}>
            <Save size={16} />
            저장 및 바로 반영
          </button>
        </div>

        {statusText ? <p className="config-status">{statusText}</p> : null}

        <div className="team-self-preview-grid">
          <div className="team-logo-live-preview">
            <div className="team-logo-row-preview">
              <LogoMark team={teamEditorPreview(draftTeam)} />
              <div>
                <strong>{draftTeam.name || team.name}</strong>
                <span>{draftTeam.title || '프로젝트명 미정'}</span>
              </div>
            </div>
          <TeamPhotoPreview team={teamEditorPreview(draftTeam)} />
          </div>
          <div className="team-self-link-panel">
            <span>현재 팀 링크</span>
            <strong>{window.location.href}</strong>
          </div>
        </div>

        <div className="team-editor-grid team-self-grid">
          <label>
            <span>팀 ID</span>
            <input value={team.id} readOnly />
          </label>
          <label>
            <span>코드</span>
            <input value={team.code} readOnly />
          </label>
          <label>
            <span>팀명</span>
            <input value={draftTeam.name} onChange={(event) => updateDraft('name', event.target.value)} />
          </label>
          <label className="wide">
            <span>프로젝트명 / 표시 문구</span>
            <input value={draftTeam.title} onChange={(event) => updateDraft('title', event.target.value)} />
          </label>
          <label className="wide">
            <span>팀원</span>
            <textarea value={draftTeam.membersText} onChange={(event) => updateDraft('membersText', event.target.value)} />
          </label>
          <LogoSourceField
            team={draftTeam}
            index={teamIndex}
            onChange={updateLogo}
            onRawChange={(value) => updateDraft('logoFile', value)}
            onUpload={uploadLogo}
            onClear={() => updateDraft('logoFile', '')}
            onTuningChange={updateDraft}
          />
          <ColorField value={draftTeam.color} onChange={(value) => updateDraft('color', value)} />
          <label>
            <span>사진이 없을 때 기본 로고</span>
            <select value={draftTeam.logo} onChange={(event) => updateDraft('logo', event.target.value)}>
              {logoKinds.map((logo) => (
                <option key={logo} value={logo}>{logo}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  )
}

function LogoSourceField({
  team,
  index,
  onChange,
  onRawChange,
  onUpload,
  onClear,
  onTuningChange,
}: {
  team: TeamConfigDraft
  index: number
  onChange: (value: string) => void
  onRawChange: (value: string) => void
  onUpload: (file: File | undefined) => void
  onClear: () => void
  onTuningChange: (field: string, value: string) => void
}) {
  const preview = teamEditorPreview(team)

  return (
    <div className="logo-source-field">
      <div className="logo-source-head">
        <span>로고/팀 사진</span>
        <small>인터넷 이미지 주소, Google Drive 공유 링크, 내 PC 이미지 파일을 사용할 수 있습니다.</small>
      </div>
      <div className="logo-source-row">
        <input
          value={team.logoFile}
          placeholder="https://... 또는 /team-logos/T1-logo.png"
          onChange={(event) => onRawChange(event.target.value)}
          onBlur={(event) => onChange(event.target.value)}
          aria-label={`${team.name || `Team ${index + 1}`} 로고 또는 팀 사진 주소`}
        />
        <button type="button" onClick={() => onChange(team.logoFile)}>
          <Link2 size={14} />
          링크 정리
        </button>
        <label className="logo-file-button">
          <ImagePlus size={14} />
          파일
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            onChange={(event) => {
              onUpload(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
        {team.logoFile ? (
          <button type="button" onClick={onClear}>
            <X size={14} />
            비우기
          </button>
        ) : null}
      </div>
      <div className="logo-source-preview">
        <div className="team-logo-live-preview">
          <div className="team-logo-row-preview">
            <LogoMark team={preview} />
            <div>
              <strong>{preview.name || `Team ${index + 1}`}</strong>
              <span>{team.title || '프로젝트명 미정'}</span>
            </div>
          </div>
          <TeamPhotoFrameEditor team={preview} onChange={onTuningChange} onUpload={onUpload} />
          <TeamWallPhotoPreview team={preview} title={team.title} membersText={team.membersText} />
        </div>
        <p>
          Google Drive 링크는 공개 공유된 파일 링크를 붙여넣으면 표시용 이미지 주소로 자동 정리됩니다. 아래 조절값은 저장 전에도
          이 미리보기에서 바로 반영됩니다. 작은 로고 프레임은 {getTeamLogoFrameLabel(preview)}, 송출 하단 사진 프레임은 {getTeamPhotoFrameLabel(preview)}입니다.
        </p>
      </div>
      <ImageTuningControls
        title="로고/팀 사진 표시 방식"
        description="실시간 별 현황과 투표 화면에 보이는 작은 로고 프레임의 가로·세로, 확대, 초점 위치를 조정합니다."
        values={{
          shape: team.logoShape,
          frame: team.logoFrame,
          fit: team.logoFit,
          size: team.logoSize,
          width: team.logoWidth,
          height: team.logoHeight,
          zoom: team.logoZoom,
          focusX: team.logoFocusX,
          focusY: team.logoFocusY,
        }}
        widthRange={[36, 180]}
        heightRange={[32, 132]}
        onChange={(field, value) => {
          const keyByField: Record<ImageTuningField, string> = {
            shape: 'logoShape',
            frame: 'logoFrame',
            fit: 'logoFit',
            width: 'logoWidth',
            height: 'logoHeight',
            zoom: 'logoZoom',
            focusX: 'logoFocusX',
            focusY: 'logoFocusY',
          }
          onTuningChange(keyByField[field], value)
        }}
      />
      <TeamPhotoTuningControls
        values={{
          photoFit: team.photoFit,
          photoShape: team.photoShape,
          photoFrame: team.photoFrame,
          photoWidth: team.photoWidth,
          photoHeight: team.photoHeight,
          photoRadius: team.photoRadius,
          photoZoom: team.photoZoom,
          photoFocusX: team.photoFocusX,
          photoFocusY: team.photoFocusY,
        }}
        onChange={(field, value) => onTuningChange(field, value)}
      />
    </div>
  )
}

function TeamWallPhotoPreview({ team, title, membersText }: { team: TeamVisual; title: string; membersText: string }) {
  const members = membersText
    .split(/[\n,]/)
    .map((member) => member.trim())
    .filter(Boolean)
    .slice(0, 3)

  return (
    <div className="wall-photo-live-preview" style={getTeamPhotoStyle(team)}>
      <span>Wall 하단 카드 표시</span>
      <div className="selected-team-preview wall-live-selected-team">
        <TeamPhotoPreview team={team} />
        <div className="selected-team-copy">
          <strong>{team.name}</strong>
          <p>{title || '프로젝트명 미정'}</p>
          {members.length ? <span>{members.join(' · ')}</span> : null}
        </div>
      </div>
    </div>
  )
}

type TeamPhotoEditMode = 'focus' | 'width' | 'height' | 'frame'

type TeamPhotoEditDrag = {
  mode: TeamPhotoEditMode
  startX: number
  startY: number
  width: number
  height: number
  focusX: number
  focusY: number
  renderedWidth: number
  renderedHeight: number
}

function TeamPhotoFrameEditor({
  team,
  onChange,
  onUpload,
}: {
  team: TeamVisual
  onChange: (field: string, value: string) => void
  onUpload?: (file: File | undefined) => void
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<TeamPhotoEditDrag | null>(null)
  const width = getImageDimensionValue(team.photoWidth, 560, 180, 820)
  const height = getImageDimensionValue(team.photoHeight, 300, 150, 460)
  const focusX = getPercentValue(team.photoFocusX, 50)
  const focusY = getPercentValue(team.photoFocusY, 50)
  const zoom = getZoomValue(team.photoZoom, 1)

  const beginDrag = (mode: TeamPhotoEditMode, event: ReactPointerEvent<HTMLElement>) => {
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds) return

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      width,
      height,
      focusX,
      focusY,
      renderedWidth: bounds.width,
      renderedHeight: bounds.height,
    }
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (drag.mode === 'focus') {
      onChange('photoFocusX', String(clamp(Math.round(drag.focusX + (deltaX / Math.max(1, drag.renderedWidth)) * 100), 0, 100)))
      onChange('photoFocusY', String(clamp(Math.round(drag.focusY + (deltaY / Math.max(1, drag.renderedHeight)) * 100), 0, 100)))
      return
    }

    const scaleX = drag.width / Math.max(1, drag.renderedWidth)
    const scaleY = drag.height / Math.max(1, drag.renderedHeight)

    if (drag.mode === 'width' || drag.mode === 'frame') {
      onChange('photoWidth', String(clamp(Math.round(drag.width + deltaX * scaleX), 180, 820)))
    }

    if (drag.mode === 'height' || drag.mode === 'frame') {
      onChange('photoHeight', String(clamp(Math.round(drag.height + deltaY * scaleY), 150, 460)))
    }
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be released by the browser.
    }
    dragRef.current = null
  }

  const adjustZoom = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!team.logoFile) return
    event.preventDefault()
    const step = event.deltaY < 0 ? 0.05 : -0.05
    onChange('photoZoom', String(Number(clamp(zoom + step, 1, 2.4).toFixed(2))))
  }

  const resetCrop = () => {
    onChange('photoFocusX', '50')
    onChange('photoFocusY', '50')
    onChange('photoZoom', '1')
  }

  return (
    <div
      className="photo-frame-editor"
      ref={frameRef}
      style={getTeamPhotoStyle(team)}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={adjustZoom}
      onDoubleClick={resetCrop}
    >
      <TeamPhotoPreview team={team} />
      {onUpload ? (
        <label className="photo-upload-hotspot" title="사진 파일 변경">
          <ImagePlus size={14} />
          사진 변경
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            onChange={(event) => {
              onUpload(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
      ) : null}
      {team.logoFile ? (
        <>
          <button
            type="button"
            className="photo-editor-surface"
            aria-label="사진 초점 이동"
            title="사진 초점 이동"
            onPointerDown={(event) => beginDrag('focus', event)}
          />
          <span
            className="photo-editor-focus"
            style={{ left: `${focusX}%`, top: `${focusY}%` }}
            aria-hidden="true"
          />
        </>
      ) : null}
      <button
        type="button"
        className="photo-resize-handle width"
        aria-label="사진 프레임 가로 조절"
        title="사진 프레임 가로 조절"
        onPointerDown={(event) => beginDrag('width', event)}
      />
      <button
        type="button"
        className="photo-resize-handle height"
        aria-label="사진 프레임 높이 조절"
        title="사진 프레임 높이 조절"
        onPointerDown={(event) => beginDrag('height', event)}
      />
      <button
        type="button"
        className="photo-resize-handle corner"
        aria-label="사진 프레임 크기 조절"
        title="사진 프레임 크기 조절"
        onPointerDown={(event) => beginDrag('frame', event)}
      />
    </div>
  )
}

function TeamPhotoTuningControls({
  values,
  onChange,
}: {
  values: Pick<TeamConfigDraft, 'photoFit' | 'photoShape' | 'photoFrame' | 'photoWidth' | 'photoHeight' | 'photoRadius' | 'photoZoom' | 'photoFocusX' | 'photoFocusY'>
  onChange: (field: string, value: string) => void
}) {
  const shape = normalizeImageShape(values.photoShape, 'wide')
  const frame = normalizeImageFrame(values.photoFrame, 'line')
  const height = getImageDimensionValue(values.photoHeight, 300, 150, 460)
  const width = getImageDimensionValue(values.photoWidth, 560, 180, 820)
  const radius = String(getImageDimensionValue(values.photoRadius, DEFAULT_TEAM_PHOTO_RADIUS, 0, 160))
  const zoom = String(getZoomValue(values.photoZoom, 1))
  const focusX = String(getPercentValue(values.photoFocusX, 50))
  const focusY = String(getPercentValue(values.photoFocusY, 50))

  return (
    <div className="photo-tuning-controls">
      <div className="image-tuning-head">
        <strong>와이드 팀 사진 표시 방식</strong>
        <span>응원 메시지 하단 팀 정보 카드처럼 넓게 보이는 사진의 프레임, 높이, 맞춤, 확대, 초점을 따로 조정합니다.</span>
      </div>
      <div className="image-tuning-grid">
        <label>
          <span>프레임 모양</span>
          <select value={shape} onChange={(event) => onChange('photoShape', event.target.value)}>
            {imageShapeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>테두리 효과</span>
          <select value={frame} onChange={(event) => onChange('photoFrame', event.target.value)}>
            {imageFrameOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>맞춤</span>
          <select value={normalizeImageFit(values.photoFit, 'cover')} onChange={(event) => onChange('photoFit', event.target.value)}>
            <option value="cover">채우기</option>
            <option value="contain">전체보이기</option>
          </select>
        </label>
        <label className="range-field">
          <span>사진 가로</span>
          <input
            type="range"
            min={180}
            max={820}
            value={width}
            onChange={(event) => onChange('photoWidth', event.target.value)}
          />
          <em>{width}px</em>
        </label>
        <label className="range-field">
          <span>사진 높이</span>
          <input
            type="range"
            min={150}
            max={460}
            value={height}
            onChange={(event) => onChange('photoHeight', event.target.value)}
          />
          <em>{height}px</em>
        </label>
        <label className="range-field">
          <span>둥근 정도</span>
          <input
            type="range"
            min={0}
            max={160}
            value={radius}
            onChange={(event) => onChange('photoRadius', event.target.value)}
          />
          <em>{radius}px</em>
        </label>
        <label className="range-field">
          <span>확대</span>
          <input
            type="range"
            min={1}
            max={2.4}
            step={0.05}
            value={zoom}
            onChange={(event) => onChange('photoZoom', event.target.value)}
          />
          <em>{formatRangeValue(zoom)}x</em>
        </label>
        <label className="range-field">
          <span>가로 초점</span>
          <input
            type="range"
            min={0}
            max={100}
            value={focusX}
            onChange={(event) => onChange('photoFocusX', event.target.value)}
          />
          <em>{focusX}%</em>
        </label>
        <label className="range-field">
          <span>세로 초점</span>
          <input
            type="range"
            min={0}
            max={100}
            value={focusY}
            onChange={(event) => onChange('photoFocusY', event.target.value)}
          />
          <em>{focusY}%</em>
        </label>
      </div>
    </div>
  )
}

function ImageSourceField({
  label,
  description,
  value,
  previewLabel,
  onChange,
  onRawChange,
  onUpload,
  onClear,
}: {
  label: string
  description: string
  value: string
  previewLabel: string
  onChange: (value: string) => void
  onRawChange: (value: string) => void
  onUpload: (file: File | undefined) => void
  onClear: () => void
}) {
  return (
    <div className="logo-source-field image-source-field">
      <div className="logo-source-head">
        <span>{label}</span>
        <small>{description}</small>
      </div>
      <div className="logo-source-row">
        <input
          value={value}
          placeholder="https://... 또는 Google Drive 공유 링크"
          onChange={(event) => onRawChange(event.target.value)}
          onBlur={(event) => onChange(event.target.value)}
          aria-label={`${label} 이미지 주소`}
        />
        <button type="button" onClick={() => onChange(value)}>
          <Link2 size={14} />
          링크 정리
        </button>
        <label className="logo-file-button">
          <ImagePlus size={14} />
          파일
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
            onChange={(event) => {
              onUpload(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
        {value ? (
          <button type="button" onClick={onClear}>
            <X size={14} />
            비우기
          </button>
        ) : null}
      </div>
      <div className="image-source-preview" aria-label={previewLabel}>
        {value ? (
          <img src={value} alt="" />
        ) : (
          <span>
            <ImagePlus size={18} />
            {previewLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function ImageTuningControls({
  title,
  description,
  preview,
  values,
  widthRange,
  heightRange,
  onChange,
}: {
  title: string
  description: string
  preview?: ReactNode
  values: ImageTuningValues
  widthRange: [number, number]
  heightRange: [number, number]
  onChange: (field: ImageTuningField, value: string) => void
}) {
  const shape = normalizeImageShape(values.shape, 'rounded')
  const fallbackSize = getImageSizeValue(values.size, widthRange[0] === 36 ? 52 : 48, 32, 180)
  const fallbackFrame = getDefaultImageFrameDimensions(shape, fallbackSize)
  const normalized = {
    shape,
    frame: normalizeImageFrame(values.frame, 'line'),
    fit: normalizeImageFit(values.fit, 'cover'),
    width: String(getImageDimensionValue(values.width, fallbackFrame.width, widthRange[0], widthRange[1])),
    height: String(getImageDimensionValue(values.height, fallbackFrame.height, heightRange[0], heightRange[1])),
    zoom: String(getZoomValue(values.zoom, 1)),
    focusX: String(getPercentValue(values.focusX, 50)),
    focusY: String(getPercentValue(values.focusY, 50)),
  }

  return (
    <div className="image-tuning-controls">
      <div className="logo-source-head">
        <span>{title}</span>
        <small>{description}</small>
      </div>
      {preview ? <div className="image-tuning-preview">{preview}</div> : null}
      <div className="image-tuning-grid">
        <label>
          <span>모양</span>
          <select value={normalized.shape} onChange={(event) => onChange('shape', event.target.value)}>
            {imageShapeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>테두리 효과</span>
          <select value={normalized.frame} onChange={(event) => onChange('frame', event.target.value)}>
            {imageFrameOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>맞춤</span>
          <select value={normalized.fit} onChange={(event) => onChange('fit', event.target.value)}>
            {imageFitOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <RangeField
          label="프레임 가로"
          value={normalized.width}
          min={widthRange[0]}
          max={widthRange[1]}
          step={1}
          suffix="px"
          onChange={(value) => onChange('width', value)}
        />
        <RangeField
          label="프레임 세로"
          value={normalized.height}
          min={heightRange[0]}
          max={heightRange[1]}
          step={1}
          suffix="px"
          onChange={(value) => onChange('height', value)}
        />
        <RangeField
          label="확대"
          value={normalized.zoom}
          min={1}
          max={2.4}
          step={0.05}
          suffix="x"
          onChange={(value) => onChange('zoom', value)}
        />
        <RangeField
          label="가로 초점"
          value={normalized.focusX}
          min={0}
          max={100}
          step={1}
          suffix="%"
          onChange={(value) => onChange('focusX', value)}
        />
        <RangeField
          label="세로 초점"
          value={normalized.focusY}
          min={0}
          max={100}
          step={1}
          suffix="%"
          onChange={(value) => onChange('focusY', value)}
        />
      </div>
    </div>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string
  value: string
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: string) => void
}) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
        <em>{formatRangeValue(value)}{suffix}</em>
      </div>
    </label>
  )
}

function ColorField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#A50034'

  return (
    <div className="color-field">
      <span>색상</span>
      <div className="color-input-row">
        <input type="color" value={normalized} onChange={(event) => onChange(event.target.value.toUpperCase())} aria-label="팀 색상 선택" />
        <input value={value} onChange={(event) => onChange(event.target.value)} onBlur={() => onChange(normalized.toUpperCase())} />
      </div>
      <div className="color-palette" aria-label="추천 색상 팔레트">
        {teamColorPalette.map((color) => (
          <button
            key={color}
            type="button"
            className={normalized.toUpperCase() === color ? 'active' : ''}
            style={{ '--swatch-color': color } as CSSProperties}
            onClick={() => onChange(color)}
            aria-label={`${color} 선택`}
          />
        ))}
      </div>
    </div>
  )
}

function CheerConstellation({
  state,
  starBudget,
  maxStarsPerTeam,
  onClose,
}: {
  state: EventState
  starBudget: number
  maxStarsPerTeam: number
  onClose: () => void
}) {
  const [openMessageId, setOpenMessageId] = useState<number | null>(null)
  const [dragPositions, setDragPositions] = useState<Record<string, Point>>({})
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    key: string
    teamId: string
    size: number
    pointerId: number
    offsetX: number
    offsetY: number
    moved: boolean
  } | null>(null)
  const recentDragRef = useRef<string | null>(null)
  const releaseTimersRef = useRef<Record<string, number>>({})
  const teamMap = useMemo(() => new Map(state.teams.map((team) => [team.id, team])), [state.teams])
  const participantMap = useMemo(
    () => new Map(state.participants.map((participant) => [participant.id, participant])),
    [state.participants],
  )

  useEffect(() => {
    const releaseTimers = releaseTimersRef.current

    return () => {
      for (const timer of Object.values(releaseTimers)) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  const teamCenters = useMemo(() => {
    const centers = [
      { x: 24, y: 28 },
      { x: 44, y: 27 },
      { x: 64, y: 29 },
      { x: 78, y: 42 },
      { x: 30, y: 50 },
      { x: 51, y: 50 },
      { x: 70, y: 55 },
      { x: 27, y: 70 },
      { x: 49, y: 72 },
      { x: 70, y: 72 },
    ]

    return new Map(
      state.teams.map((team) => {
        const index = fallbackTeamOrder.get(team.id) ?? 0
        return [team.id, centers[index % centers.length]]
      }),
    )
  }, [state.teams])

  const territoryCells = useMemo(() => buildTerritoryCells(state.teams, teamCenters), [state.teams, teamCenters])
  const keepPointInsideTeam = useCallback(
    (teamId: string, point: Point, size = 0) => constrainPercentPointToTerritory(teamId, point, territoryCells, teamCenters, size),
    [teamCenters, territoryCells],
  )

  const groupedBubbles = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        key: string
        teamId: string
        participantId?: string
        author: string
        messages: CheerMessage[]
      }
    >()

    for (const message of state.cheers.slice(0, 120)) {
      if (message.hidden) continue

      const participantKey = message.participantId || `anonymous-${message.author}`
      const key = `${message.teamId}:${participantKey}`
      const group = groupMap.get(key)

      if (group) {
        group.messages.push(message)
      } else {
        groupMap.set(key, {
          key,
          teamId: message.teamId,
          participantId: message.participantId,
          author: message.author,
          messages: [message],
        })
      }
    }

    const items = [...groupMap.values()].map((group) => {
      const team = teamMap.get(group.teamId) ?? state.teams[0]
      const participant = group.participantId ? participantMap.get(group.participantId) : undefined
      const starRange = Math.min(starBudget, maxStarsPerTeam)
      const starCount = Math.max(0, Math.min(starRange, participant?.allocations[group.teamId] ?? 0))
      const messageBonus = Math.min(Math.max(group.messages.length - 1, 0), 3) * 6
      const size = 72 + starCount * Math.max(18, 150 / starRange) + messageBonus

      return {
        ...group,
        authorGroup: participant?.group,
        latestMessage: group.messages[0],
        team,
        size,
        starCount,
      }
    })

    return layoutBubbleGroups(items, teamCenters, territoryCells)
  }, [maxStarsPerTeam, participantMap, starBudget, state.cheers, state.teams, teamCenters, teamMap, territoryCells])

  const getPointerPosition = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return null

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 5, 95),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 9, 91),
    }
  }, [])

  const startBubbleDrag = useCallback(
    (key: string, teamId: string, size: number, fallbackPosition: Point, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return

      const pointerPosition = getPointerPosition(event)
      if (!pointerPosition) return

      const timer = releaseTimersRef.current[key]
      if (timer) {
        window.clearTimeout(timer)
        delete releaseTimersRef.current[key]
      }

      const currentPosition = keepPointInsideTeam(teamId, dragPositions[key] ?? fallbackPosition, size)
      dragRef.current = {
        key,
        teamId,
        size,
        pointerId: event.pointerId,
        offsetX: currentPosition.x - pointerPosition.x,
        offsetY: currentPosition.y - pointerPosition.y,
        moved: false,
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Synthetic pointer events used in automated QA may not have an active pointer.
      }
      setDraggingKey(key)
    },
    [dragPositions, getPointerPosition, keepPointInsideTeam],
  )

  const moveBubbleDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      const pointerPosition = getPointerPosition(event)
      if (!pointerPosition) return

      const nextPosition = keepPointInsideTeam(
        drag.teamId,
        {
          x: clamp(pointerPosition.x + drag.offsetX, 5, 95),
          y: clamp(pointerPosition.y + drag.offsetY, 9, 91),
        },
        drag.size,
      )

      drag.moved = true
      setDragPositions((current) => ({ ...current, [drag.key]: nextPosition }))
    },
    [getPointerPosition, keepPointInsideTeam],
  )

  const endBubbleDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.moved) {
      recentDragRef.current = drag.key
      window.setTimeout(() => {
        if (recentDragRef.current === drag.key) {
          recentDragRef.current = null
        }
      }, 180)

      releaseTimersRef.current[drag.key] = window.setTimeout(() => {
        setDragPositions((current) => {
          const next = { ...current }
          delete next[drag.key]
          return next
        })
        delete releaseTimersRef.current[drag.key]
      }, 2600)
    }

    setDraggingKey(null)
    dragRef.current = null
  }, [])

  const toggleBubble = useCallback((key: string, messageId: number) => {
    if (recentDragRef.current === key) {
      recentDragRef.current = null
      return
    }

    setOpenMessageId((current) => (current === messageId ? null : messageId))
  }, [])

  return (
    <div className="cheer-constellation" role="dialog" aria-modal="true" aria-label="응원 메시지 쇼업">
      <div className="constellation-toolbar">
        <div>
          <p className="section-kicker">{state.copy.showupEyeline}</p>
          <h2>{state.copy.showupTitle}</h2>
        </div>
        <div className="constellation-actions">
          <button type="button" className="close-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      <div className="constellation-stage" ref={stageRef}>
        <svg className="territory-map" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="territory-warp" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="9" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" />
            </filter>
          </defs>
          <g className="territory-cells" filter="url(#territory-warp)">
            {territoryCells.map((cell) => (
              <path
                className="territory-cell"
                d={cell.path}
                key={cell.team.id}
                style={{ '--team-color': cell.team.color, opacity: 0.32 + cell.share * 0.28 } as CSSProperties}
              />
            ))}
          </g>
          <g className="territory-lines" filter="url(#territory-warp)">
            {territoryCells.map((cell) => (
              <path className="territory-line" d={cell.path} key={`${cell.team.id}-line`} />
            ))}
          </g>
        </svg>

        {state.teams.map((team) => {
          const center = teamCenters.get(team.id) ?? { x: 50, y: 50 }
          const count = state.cheers.filter((message) => message.teamId === team.id && !message.hidden).length
          const totalStars = Math.max(0, team.totalStars)

          return (
            <div
              className={`cluster-label ${count > 0 ? 'has-messages' : ''}`}
              key={team.id}
              style={
                {
                  '--team-color': team.color,
                  '--x': `${center.x}%`,
                  '--y': `${center.y}%`,
                } as CSSProperties
              }
            >
              <strong>{team.name}</strong>
              <small>{totalStars}★ · {count} messages</small>
            </div>
          )
        })}

        {groupedBubbles.map(
          ({ key, latestMessage, messages, author, authorGroup, team, x, y, size, starCount, depth, delay, drift, breathe, wobble }) => {
            const position = dragPositions[key] ?? { x, y }
            const isOpen = openMessageId === latestMessage.id
            const isDragging = draggingKey === key
            const displayPosition = isOpen ? constrainOpenBubblePoint(position) : position

            return (
              <button
                type="button"
                className={`floating-cheer ${depth} star-level-${starCount} ${isOpen ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''}`}
                key={key}
                onClick={() => toggleBubble(key, latestMessage.id)}
                onPointerDown={(event) => startBubbleDrag(key, team.id, size, { x, y }, event)}
                onPointerMove={moveBubbleDrag}
                onPointerUp={endBubbleDrag}
                onPointerCancel={endBubbleDrag}
                aria-label={isOpen ? `${author}의 응원 메시지` : `${team.name} 익명 응원 버블`}
                title={isOpen ? `${author}: ${latestMessage.text}` : '클릭해서 응원 메시지 보기'}
                style={
                  {
                    '--team-color': team.color,
                    '--x': `${displayPosition.x}%`,
                    '--y': `${displayPosition.y}%`,
                    '--bubble-size': `${size}px`,
                    '--delay': delay,
                    '--drift': drift,
                    '--breathe': breathe,
                    '--wobble': wobble,
                  } as CSSProperties
                }
              >
                <span className="bubble-sheen" aria-hidden="true" />
                {!isOpen ? (
                  <span className="sealed-star" aria-hidden="true">★</span>
                ) : (
                  <>
                    <strong>
                      {author}
                      {authorGroup ? <span>{authorGroup}</span> : null}
                    </strong>
                    <span className="bubble-message-list">
                      {messages.slice(0, 5).map((message) => (
                        <span key={message.id}>{message.text}</span>
                      ))}
                    </span>
                    <small>★{starCount}{messages.length > 1 ? ` · +${messages.length - 1}` : ''}</small>
                  </>
                )}
              </button>
            )
          },
        )}
      </div>
    </div>
  )
}

function RafflePanel({
  state,
  raffleRule,
  isDrawing,
  onRuleChange,
  onStart,
  onStop,
  onOpen,
}: {
  state: EventState
  raffleRule: RaffleRule
  isDrawing: boolean
  onRuleChange: (rule: RaffleRule) => void
  onStart: () => void
  onStop: () => void
  onOpen: () => void
}) {
  const previewCandidates = getRaffleCandidatesForRule(state, raffleRule)
  const previewNames = previewCandidates.slice(0, 10)
  const reelNames = previewNames.length
    ? previewNames
    : [{ id: 'standby', name: '후보 대기', group: '', allocations: {}, cheered: false, updatedAt: 0 }]

  return (
    <section className="raffle-panel" aria-label="행운권 추첨">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">{state.copy.rafflePanelEyeline}</p>
          <h2>{state.copy.rafflePanelTitle}</h2>
        </div>
        <button type="button" className="panel-open-button" onClick={onOpen}>
          <Maximize2 size={14} />
          Showup
        </button>
      </div>

      <div className="raffle-controls">
        <label>
          <span>추첨 룰</span>
          <select value={raffleRule} onChange={(event) => onRuleChange(event.target.value as RaffleRule)}>
            {raffleRuleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="raffle-action-row">
          <button type="button" className={`draw-button start ${isDrawing ? 'drawing' : ''}`} onClick={onStart} disabled={isDrawing}>
            <Sparkles size={17} />
            {state.copy.raffleStartButtonLabel}
          </button>
          <button type="button" className="draw-button stop" onClick={onStop} disabled={!isDrawing}>
            <Trophy size={17} />
            {state.copy.raffleStopButtonLabel}
          </button>
        </div>
      </div>

      <div className={`draw-stage compact ${isDrawing ? 'drawing' : ''}`}>
        <div>
          <span>후보</span>
          <strong>{state.lastRaffle?.candidates ?? getRaffleCandidatesForRule(state, raffleRule).length}명</strong>
        </div>
      </div>

      <div className="winner-list" aria-live="polite">
        {isDrawing ? (
          <div className="reel drawing-reel">
            <div className="draw-orbit" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <i key={index} style={{ '--i': index } as CSSProperties}>
                  ★
                </i>
              ))}
            </div>
            <div className="name-reel" aria-hidden="true">
              <div>
                {[...reelNames, ...reelNames, ...reelNames].map((person, index) => (
                  <span key={`${person.id}-${index}`}>{person.name}</span>
                ))}
              </div>
            </div>
            <strong>후보를 섞는 중...</strong>
          </div>
        ) : state.lastRaffle?.winners.length ? (
          state.lastRaffle.winners.map((winner) => (
            <div className="winner" key={winner.id}>
              <strong>{winner.name}</strong>
              <small>{[winner.group ? `ID ${winner.group}` : '', winner.department].filter(Boolean).join(' · ')}</small>
            </div>
          ))
        ) : (
          <p className="empty-state">룰과 인원을 정한 뒤 추첨을 시작하세요.</p>
        )}
      </div>
    </section>
  )
}

function RaffleDetailPanel({
  state,
  raffleRule,
  isDrawing,
  onRuleChange,
  onStart,
  onStop,
  publicMode = false,
}: {
  state: EventState
  raffleRule: RaffleRule
  isDrawing: boolean
  onRuleChange: (rule: RaffleRule) => void
  onStart: () => void
  onStop: () => void
  publicMode?: boolean
}) {
  const [showPrizeImage, setShowPrizeImage] = useState(false)
  const previewCandidates = getRaffleCandidatesForRule(state, raffleRule)
  const reelNames = previewCandidates.slice(0, 12)
  const rollingNames = reelNames.length
    ? reelNames
    : [{ id: 'standby', name: '후보 대기', group: '', allocations: {}, cheered: false, updatedAt: 0 }]
  const winners = !isDrawing ? (state.lastRaffle?.winners ?? []) : []
  const hasWinners = winners.length > 0
  const visualBallCount = rollingNames.length > 1 ? clamp(previewCandidates.length, 14, publicMode ? 30 : 22) : 14
  const candidateBalls = Array.from({ length: visualBallCount }, (_, index) => rollingNames[index % rollingNames.length])
  const prizeInfo = getRafflePrizeInfo(state.copy, raffleRule)
  const prizeImage = prizeInfo.image
  const ruleOptions = raffleRuleOptions.map((option, index) => ({
    ...option,
    displayLabel: publicMode ? getRaffleRulePublicLabel(option.value, index) : option.label,
  }))
  const revealRule = isDrawing || hasWinners
  const listedCandidates = previewCandidates.slice(0, publicMode ? 7 : 12)
  const hiddenCandidateCount = Math.max(0, previewCandidates.length - listedCandidates.length)

  return (
    <div className={`raffle-detail ${publicMode ? 'public-mode' : ''}`}>
      <section className={`raffle-showcase style-lotto ${isDrawing ? 'drawing' : ''} ${hasWinners ? 'has-winners' : ''}`} aria-live="polite">
        <CelebrationConfetti active={hasWinners} seedKey={state.lastRaffle?.createdAt ?? 0} />
        {prizeImage || prizeInfo.name ? (
          <>
            <button
              type="button"
              className="prize-image-trigger"
              onClick={() => setShowPrizeImage(true)}
              aria-label={`${prizeInfo.name} 상품 보기`}
            >
              <Gift size={22} />
            </button>
            {showPrizeImage ? (
              <div className="prize-image-overlay" role="dialog" aria-modal="true" aria-label={`${prizeInfo.name} 상품`}>
                <div>
                  <button type="button" onClick={() => setShowPrizeImage(false)} aria-label="상품 이미지 닫기">
                    <X size={18} />
                  </button>
                  <strong>{prizeInfo.name}</strong>
                  {prizeImage ? <img src={prizeImage} alt={prizeInfo.name} /> : <p>등록된 상품 이미지는 없습니다.</p>}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="lotto-machine" aria-hidden="true">
          <span className="lotto-stand left" />
          <span className="lotto-stand right" />
          <div className="lotto-bowl">
            <div className="lotto-vortex">
              <span />
              <span />
              <span />
            </div>
            {candidateBalls.map((person, index) => (
              <span
                className="lotto-ball"
                key={`${person.id}-ball-${index}`}
                style={
                  {
                    '--i': index,
                    '--x': `${22 + ((index * 37) % 56)}%`,
                    '--y': `${20 + ((index * 53) % 56)}%`,
                    '--dx': `${((index % 5) - 2) * 18}px`,
                    '--dy': `${((index % 7) - 3) * 13}px`,
                    '--ball-tone': `hsl(${(index * 47 + 342) % 360} 86% 61%)`,
                  } as CSSProperties
                }
              >
                <strong>{person.name}</strong>
              </span>
            ))}
          </div>
          <div className="lotto-chute">
            <span />
            <i />
          </div>
          <div className="lotto-result-tray">
            <div className="lotto-result-ball">
              <strong>{hasWinners ? winners[0]?.name : isDrawing ? '선정 중' : '대기'}</strong>
            </div>
          </div>
        </div>

        {hasWinners ? (
          <div className="raffle-winner-showcase">
            {winners.map((winner, index) => {
              const details = getRaffleWinnerDetails(state, winner)
              return (
                <article key={winner.id} style={{ '--i': index } as CSSProperties}>
                  <div>
                    <strong>{winner.name}</strong>
                    <small>
                      {[winner.group ? `ID ${winner.group}` : '', winner.department ? `소속 ${winner.department}` : '', winner.cheered ? '응원 메시지 참여' : '투표 참여']
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                    <em className="winner-prize-name">{prizeInfo.name}</em>
                  </div>
                  <div className="winner-detail-scroll">
                    <div className="winner-support-list">
                      <b>응원한 팀</b>
                      {details.supports.length ? (
                        details.supports.map((item) => (
                          <em key={item.teamId}>
                            {item.rank ? `${item.rank}위 ` : ''}{item.teamName} · {item.stars}★
                          </em>
                        ))
                      ) : (
                        <em>별 배분 기록이 없습니다.</em>
                      )}
                    </div>
                    <div className="winner-cheer-log">
                      <b>응원 메시지</b>
                      {details.cheers.length ? (
                        details.cheers.map((message, messageIndex) => (
                          <p key={`${message.teamId}-${message.createdAt}-${messageIndex}`}>
                            <span>{message.teamName}</span>
                            {' '}
                            {message.text}
                          </p>
                        ))
                      ) : (
                        <p>표시할 공개 응원 메시지가 없습니다.</p>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p>{isDrawing ? '후보 이름을 섞는 중입니다.' : '룰과 인원을 정한 뒤 추첨을 시작하세요.'}</p>
        )}

        {hasWinners ? (
          <button
            type="button"
            className="gift-agent"
            onClick={() => setShowPrizeImage(true)}
            aria-label={`${prizeInfo.name} 상품 정보 보기`}
          >
            <span className="agent-gift">
              <Gift size={34} />
            </span>
            <strong>{prizeInfo.name}</strong>
          </button>
        ) : null}
      </section>

      <aside className="raffle-detail-desk">
        <div className="raffle-controls">
          <label>
            <span>추첨 룰</span>
            <select value={raffleRule} onChange={(event) => onRuleChange(event.target.value as RaffleRule)}>
              {ruleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.displayLabel}
                </option>
              ))}
            </select>
          </label>
          <div className="raffle-action-row">
            <button type="button" className={`draw-button start ${isDrawing ? 'drawing' : ''}`} onClick={onStart} disabled={isDrawing}>
              <Sparkles size={17} />
              {state.copy.raffleStartButtonLabel}
            </button>
            <button type="button" className="draw-button stop" onClick={onStop} disabled={!isDrawing}>
              <Trophy size={17} />
              {state.copy.raffleStopButtonLabel}
            </button>
          </div>
        </div>

        <div className={`raffle-rule-reveal ${revealRule ? 'is-revealed' : ''}`}>
          <span>{revealRule ? '이번 추첨 조건' : '추첨 조건'}</span>
          <strong>{revealRule ? getRaffleRuleLabel(raffleRule) : publicMode ? '시작하면 공개됩니다' : getRaffleRuleLabel(raffleRule)}</strong>
        </div>

        <div className={`draw-stage compact ${isDrawing ? 'drawing' : ''}`}>
          <div>
            <span>후보</span>
            <strong>{previewCandidates.length}명</strong>
          </div>
        </div>

        <div className="candidate-strip">
          <strong>후보 {previewCandidates.length}명</strong>
          <div>
            {previewCandidates.length ? (
              listedCandidates.map((person) => (
                <span key={person.id}>{person.group ? `${person.name} · ${person.group}` : person.name}</span>
              ))
            ) : (
              <span>후보가 없습니다</span>
            )}
            {hiddenCandidateCount > 0 ? <span className="candidate-more">... 외 {hiddenCandidateCount}명</span> : null}
          </div>
        </div>

        <button type="button" className="raffle-prize-summary" onClick={() => setShowPrizeImage(true)}>
          {prizeImage ? <img src={prizeImage} alt="" /> : <Gift size={28} />}
          <span>상품</span>
          <strong>{prizeInfo.name}</strong>
        </button>
      </aside>
    </div>
  )
}

function CelebrationConfetti({ active, seedKey }: { active: boolean; seedKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const parent = canvas?.parentElement
    if (!canvas || !context || !parent) return

    let animationFrame = 0
    const startedAt = performance.now()
    const duration = 4600
    const colors = ['#A50034', '#FD312E', '#D05A67', '#2E6F9E', '#17816E', '#F4B942', '#6A4FB3']
    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * ratio)
      canvas.height = Math.floor(rect.height * ratio)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    resize()
    const bounds = parent.getBoundingClientRect()
    const particles = Array.from({ length: 150 }).map((_, index) => {
      const lane = index / 149
      const burst = index % 3 === 0
      return {
        x: bounds.width * (0.12 + lane * 0.76),
        y: burst ? bounds.height * 0.36 : -30 - (index % 24) * 11,
        vx: (Math.sin(index * 1.91) * 1.7) + (burst ? Math.cos(index) * 3.8 : 0),
        vy: burst ? -5.2 - (index % 8) * 0.35 : 1.5 + (index % 9) * 0.13,
        size: 5 + (index % 7),
        rotation: index * 0.61,
        spin: (index % 2 ? -1 : 1) * (0.055 + (index % 6) * 0.012),
        color: colors[index % colors.length],
        shape: index % 3,
        delay: (index % 20) * 28,
      }
    })

    const drawParticle = (particle: (typeof particles)[number], alpha: number) => {
      context.save()
      context.globalAlpha = alpha
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      context.fillStyle = particle.color

      if (particle.shape === 0) {
        context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.58)
      } else if (particle.shape === 1) {
        context.beginPath()
        context.arc(0, 0, particle.size * 0.42, 0, Math.PI * 2)
        context.fill()
      } else {
        context.beginPath()
        context.moveTo(0, -particle.size / 2)
        context.lineTo(particle.size / 2, particle.size / 2)
        context.lineTo(-particle.size / 2, particle.size / 2)
        context.closePath()
        context.fill()
      }

      context.restore()
    }

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const rect = parent.getBoundingClientRect()
      context.clearRect(0, 0, rect.width, rect.height)

      for (const particle of particles) {
        if (elapsed < particle.delay) continue

        const localTime = elapsed - particle.delay
        const fadeOut = Math.max(0, 1 - Math.max(0, localTime - duration * 0.62) / (duration * 0.38))
        const alpha = Math.min(1, localTime / 260) * fadeOut
        particle.vy += 0.035
        particle.x += particle.vx + Math.sin((localTime + particle.x) * 0.008) * 0.5
        particle.y += particle.vy
        particle.rotation += particle.spin

        if (particle.y > rect.height + 32) {
          particle.y = -24
          particle.x = rect.width * (0.08 + hashToUnit(`${seedKey}:${particle.x}:${particle.delay}`) * 0.84)
          particle.vy = 1.4 + hashToUnit(`${seedKey}:${particle.delay}:vy`) * 1.1
        }

        drawParticle(particle, alpha)
      }

      if (elapsed < duration) {
        animationFrame = window.requestAnimationFrame(tick)
      } else {
        context.clearRect(0, 0, rect.width, rect.height)
      }
    }

    window.addEventListener('resize', resize)
    animationFrame = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(animationFrame)
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [active, seedKey])

  return <canvas className="celebration-canvas" ref={canvasRef} aria-hidden="true" />
}

function getRaffleCandidatesForRule(state: EventState, rule: RaffleRule) {
  const leaderId = state.teams[0]?.id
  const topThreeIds = state.teams.slice(0, 3).map((team) => team.id)
  const rank456Ids = state.teams.slice(3, 6).map((team) => team.id)
  const rank7to10Ids = state.teams.slice(6, 10).map((team) => team.id)
  const longestCheerByParticipant = new Map<string, number>()

  if (rule === 'longestCheer') {
    for (const message of state.cheers) {
      if (!message.participantId || message.hidden) continue
      longestCheerByParticipant.set(
        message.participantId,
        Math.max(longestCheerByParticipant.get(message.participantId) ?? 0, message.text.trim().length),
      )
    }
  }

  const longestCheerLength = rule === 'longestCheer' ? Math.max(0, ...longestCheerByParticipant.values()) : 0

  return state.participants.filter((person) => {
    const spent = sumStars(person.allocations)
    if (spent <= 0) return false
    if (!person.cheered) return false
    const allocationValues = Object.values(person.allocations || {}).filter((value) => value > 0)

    if (rule === 'leader') return Boolean(leaderId && person.allocations[leaderId])
    if (rule === 'top3') return topThreeIds.every((teamId) => Boolean(person.allocations[teamId]))
    if (rule === 'rank456') return rank456Ids.length === 3 && rank456Ids.every((teamId) => Boolean(person.allocations[teamId]))
    if (rule === 'rank7to10Three') {
      return rank7to10Ids.length >= 3 && rank7to10Ids.filter((teamId) => Boolean(person.allocations[teamId])).length >= 3
    }
    if (rule === 'multi') return allocationValues.length >= 5
    if (rule === 'big') return allocationValues.some((value) => value >= 7)
    if (rule === 'longestCheer') return longestCheerLength > 0 && (longestCheerByParticipant.get(person.id) ?? 0) === longestCheerLength
    if (rule === 'cheer') return person.cheered
    return true
  })
}

function getRaffleWinnerDetails(state: EventState, winner: RaffleWinner) {
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))
  const participant = state.participants.find((person) => person.id === winner.id)

  const supports = winner.supportDetails?.length
    ? winner.supportDetails
    : Object.entries(participant?.allocations ?? {})
        .filter(([, stars]) => stars > 0)
        .map(([teamId, stars]) => {
          const team = teamMap.get(teamId)
          return {
            teamId,
            teamName: team?.name ?? teamId,
            stars,
            rank: team?.rank,
          }
        })
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))

  const cheers = winner.cheerDetails?.length
    ? winner.cheerDetails
    : state.cheers
        .filter((message) => message.participantId === winner.id && !message.hidden)
        .map((message) => {
          const team = teamMap.get(message.teamId)
          return {
            teamId: message.teamId,
            teamName: team?.name ?? message.teamId,
            text: message.text,
            createdAt: message.createdAt,
          }
        })
        .sort((a, b) => a.createdAt - b.createdAt)

  return { supports, cheers }
}

function buildParticipantAwardHistory(state: EventState, participantId: string) {
  const awards = new Map<string, AwardRecord>()

  for (const award of state.awardHistory ?? []) {
    if (award.participantId === participantId) awards.set(award.id, award)
  }

  if (state.lastRaffle) {
    for (const winner of state.lastRaffle.winners) {
      if (winner.id !== participantId) continue
      const id = `raffle-${state.lastRaffle.createdAt}-${winner.id}`
      if (!awards.has(id)) {
        awards.set(id, {
          id,
          participantId: winner.id,
          kind: 'raffle',
          rank: winner.rank,
          rule: state.lastRaffle.rule,
          prizeImageFile: state.lastRaffle.prizeImageFile || getRafflePrizeInfo(state.copy, state.lastRaffle.rule).image,
          prizeName: state.lastRaffle.prizeName || getRafflePrizeInfo(state.copy, state.lastRaffle.rule).name,
          createdAt: state.lastRaffle.createdAt,
        })
      }
    }
  }

  for (const winner of state.quiz.winners) {
    if (winner.participantId !== participantId) continue
    const id = `quiz-${winner.quizId}-${winner.id}-${winner.participantId}`
    if (!awards.has(id)) {
      awards.set(id, {
        id,
        participantId: winner.participantId,
        kind: 'quiz',
        rank: winner.rank,
        quizId: winner.quizId,
        question: state.quiz.question,
        prizeImageFile: state.quiz.prizeImageFile,
        prizeName: '퀴즈 상품',
        createdAt: winner.createdAt,
      })
    }
  }

  return [...awards.values()].sort((a, b) => b.createdAt - a.createdAt)
}

function getRaffleRuleLabel(rule: RaffleRule | undefined) {
  if (rule === 'cheer') return '공개 응원 메시지 참여자'
  return raffleRuleOptions.find((option) => option.value === rule)?.label ?? '행운권 추첨'
}

function getRaffleRulePublicLabel(rule: RaffleRule, index = raffleRuleOptions.findIndex((option) => option.value === rule)) {
  return `추첨룰 ${Math.max(1, index + 1)}`
}

function getRafflePrizeLabel(rule: RaffleRule | undefined) {
  if (!rule) return '행운권 상품'
  return rafflePrizeImageFields.find((field) => field.key === rafflePrizeImageKeyByRule[rule])?.label ?? '행운권 상품'
}

function getRafflePrizeInfo(copy: EventCopy, rule: RaffleRule | undefined) {
  if (!rule) {
    return {
      name: copy.rafflePrizeNameFile || '행운권 상품',
      image: copy.rafflePrizeImageFile,
    }
  }

  const nameKey = rafflePrizeNameKeyByRule[rule] || 'rafflePrizeNameFile'
  const imageKey = rafflePrizeImageKeyByRule[rule] || 'rafflePrizeImageFile'

  return {
    name: copy[nameKey] || copy.rafflePrizeNameFile || getRafflePrizeLabel(rule),
    image: copy[imageKey] || copy.rafflePrizeImageFile,
  }
}

function getParticipantSummaries(state: EventState): ParticipantSummary[] {
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))
  const cheerCounts = new Map<string, { total: number; visible: number }>()

  for (const message of state.cheers) {
    if (!message.participantId) continue

    const current = cheerCounts.get(message.participantId) ?? { total: 0, visible: 0 }
    current.total += 1
    if (!message.hidden) current.visible += 1
    cheerCounts.set(message.participantId, current)
  }

  return state.participants
    .map((person) => {
      const spent = sumStars(person.allocations)
      const cheers = cheerCounts.get(person.id) ?? { total: 0, visible: 0 }
      const allocationsList = Object.entries(person.allocations)
        .filter(([, value]) => value > 0)
        .sort(([, a], [, b]) => b - a)
      const allocationSummary = allocationsList.length
        ? allocationsList
            .slice(0, 3)
            .map(([teamId, value]) => `${teamMap.get(teamId)?.name ?? '팀'} ${value}★`)
            .join(' · ')
        : '아직 별을 사용하지 않았습니다'
      const status = spent > 0 && cheers.visible > 0 ? '응모 완료' : spent > 0 ? '투표 완료' : '등록만'
      const statusClass = spent > 0 && cheers.visible > 0 ? 'eligible' : spent > 0 ? 'voted' : 'registered'

      return {
        ...person,
        spent,
        cheers,
        allocationsList,
        allocationSummary,
        status,
        statusClass,
      }
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function StarWallet({
  remainingStars,
  spentStars,
  starBudget,
}: {
  remainingStars: number
  spentStars: number
  starBudget: number
}) {
  return (
    <div className="star-wallet" aria-live="polite">
      <span>남은 별</span>
      <strong>{remainingStars}</strong>
      <div className="wallet-stars" aria-hidden="true">
        {Array.from({ length: starBudget }).map((_, index) => (
          <Star key={index} className={index < spentStars ? 'spent' : 'filled'} size={18} />
        ))}
      </div>
    </div>
  )
}

function LogoMark({ team }: { team: TeamVisual }) {
  const fit = normalizeImageFit(team.logoFit, 'cover')
  const focusX = getPercentValue(team.logoFocusX, 50)
  const focusY = getPercentValue(team.logoFocusY, 50)

  return (
    <div
      className={`logo-mark ${team.logo} shape-${normalizeImageShape(team.logoShape, 'rounded')} frame-${normalizeImageFrame(team.logoFrame, 'line')}`}
      style={getTeamImageStyle(team)}
      aria-label={`${team.name} 로고 자리`}
    >
      {team.logoFile ? (
        <img
          src={team.logoFile}
          alt=""
          style={{
            objectFit: fit,
            objectPosition: `${focusX}% ${focusY}%`,
            transform: `scale(${getZoomValue(team.logoZoom, 1)})`,
            transformOrigin: `${focusX}% ${focusY}%`,
          }}
        />
      ) : null}
    </div>
  )
}

function TeamPhotoPreview({ team }: { team: TeamVisual }) {
  const fit = normalizeImageFit(team.photoFit, normalizeImageFit(team.logoFit, 'cover'))
  const focusX = getPercentValue(team.photoFocusX, getPercentValue(team.logoFocusX, 50))
  const focusY = getPercentValue(team.photoFocusY, getPercentValue(team.logoFocusY, 50))
  const panX = Number(((50 - focusX) * 0.42).toFixed(2))
  const panY = Number(((50 - focusY) * 0.42).toFixed(2))

  return (
    <div
      className={`team-photo-preview shape-${normalizeImageShape(team.photoShape, normalizeImageShape(team.logoShape, 'wide'))} frame-${normalizeImageFrame(team.photoFrame, normalizeImageFrame(team.logoFrame, 'line'))} ${team.logoFile ? 'has-photo' : ''}`}
      style={getTeamPhotoStyle(team)}
      aria-label={`${team.name} 로고 또는 팀 사진`}
    >
      {team.logoFile ? (
        <img
          src={team.logoFile}
          alt=""
          style={{
            objectFit: fit,
            objectPosition: `${focusX}% ${focusY}%`,
            transform: `translate3d(${panX}%, ${panY}%, 0) scale(${getZoomValue(team.photoZoom, getZoomValue(team.logoZoom, 1))})`,
            transformOrigin: 'center',
          }}
        />
      ) : <LogoMark team={team} />}
    </div>
  )
}

function FloatingStars() {
  return (
    <div className="floating-stars" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          style={
            {
              '--x': `${7 + ((index * 17) % 86)}%`,
              '--delay': `${(index % 9) * -0.8}s`,
              '--duration': `${7 + (index % 5)}s`,
            } as CSSProperties
          }
        >
          ★
        </span>
      ))}
    </div>
  )
}

function useAdminSession(enabled: boolean): AdminSessionState {
  const [ready, setReady] = useState(false)
  const [required, setRequired] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!enabled) return

    setLoading(true)

    try {
      const response = await fetch('/api/admin/status', { credentials: 'same-origin' })
      if (!response.ok) throw new Error('status failed')
      const next = (await response.json()) as { required?: boolean; authenticated?: boolean }
      setRequired(Boolean(next.required))
      setAuthenticated(Boolean(next.authenticated))
      setError('')
    } catch {
      setRequired(true)
      setAuthenticated(false)
      setError('관리자 인증 상태를 확인하지 못했습니다.')
    } finally {
      setReady(true)
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let active = true

    const checkSession = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/admin/status', { credentials: 'same-origin' })
        if (!response.ok) throw new Error('status failed')
        const next = (await response.json()) as { required?: boolean; authenticated?: boolean }
        if (!active) return
        setRequired(Boolean(next.required))
        setAuthenticated(Boolean(next.authenticated))
        setError('')
      } catch {
        if (!active) return
        setRequired(true)
        setAuthenticated(false)
        setError('관리자 인증 상태를 확인하지 못했습니다.')
      } finally {
        if (active) {
          setReady(true)
          setLoading(false)
        }
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [enabled])

  const login = useCallback(async (passcode: string) => {
    if (!enabled) return true

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ passcode }),
      })

      if (!response.ok) {
        setAuthenticated(false)
        setError('Passcode가 맞지 않습니다.')
        return false
      }

      const next = (await response.json()) as { required?: boolean; authenticated?: boolean }
      setRequired(Boolean(next.required))
      setAuthenticated(Boolean(next.authenticated))
      return Boolean(next.authenticated)
    } catch {
      setAuthenticated(false)
      setError('관리자 인증 요청에 실패했습니다.')
      return false
    } finally {
      setReady(true)
      setLoading(false)
    }
  }, [enabled])

  const logout = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) throw new Error('logout failed')
      const next = (await response.json()) as { required?: boolean; authenticated?: boolean }
      setRequired(Boolean(next.required))
      setAuthenticated(Boolean(next.authenticated))
    } catch {
      setAuthenticated(false)
      setError('관리자 로그아웃 요청에 실패했습니다.')
    } finally {
      setReady(true)
      setLoading(false)
    }
  }, [enabled])

  return {
    ready: enabled ? ready : true,
    required: enabled ? required : false,
    authenticated: enabled ? authenticated : true,
    loading: enabled ? loading : false,
    error: enabled ? error : '',
    login,
    logout,
    refresh,
  }
}

function useEventState(mode: AppMode, participantId?: string, enabled = true, allowProtectedRealtime = enabled) {
  const [state, setState] = useState<EventState>(() => getInitialEventState())
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [voteRealtime, setVoteRealtime] = useState(false)
  const lastRankStateRef = useRef<EventState | null>(null)

  const applyState = useCallback((nextState: EventState) => {
    const previousState = lastRankStateRef.current
    const previousRanks = previousState ? new Map(previousState.teams.map((team) => [team.id, team.rank])) : null
    const nextWithRankMovement = {
      ...nextState,
      copy: { ...fallbackCopy, ...(nextState.copy ?? {}) },
      settings: { ...fallbackState.settings, ...(nextState.settings ?? {}) },
      quiz: { ...fallbackState.quiz, ...(nextState.quiz ?? {}) },
      quizBank: Array.isArray(nextState.quizBank) && nextState.quizBank.length ? nextState.quizBank : fallbackQuizBank,
      configRevision: nextState.configRevision || fallbackState.configRevision,
      configUpdatedAt: nextState.configUpdatedAt || fallbackState.configUpdatedAt,
      serverTime: nextState.serverTime || Date.now(),
      receivedAt: Date.now(),
      teams: nextState.teams.map((team) => {
        const previousRank = previousRanks?.get(team.id)
        return {
          ...team,
          rankDelta: previousRank ? previousRank - team.rank : 0,
        }
      }),
    }

    lastRankStateRef.current = nextWithRankMovement
    setState(nextWithRankMovement)
    if (mode === 'vote' && participantId) {
      const currentParticipant = nextWithRankMovement.participants.find((person) => {
        return person.id === participantId || getParticipantDeviceIds(person).includes(participantId)
      })
      setVoteRealtime(Boolean(currentParticipant?.cheerSubmitted || currentParticipant?.visibleCheerCount || currentParticipant?.hiddenCheerCount))
    }
  }, [mode, participantId])

  useEffect(() => {
    if (!enabled) return

    let active = true
    let events: EventSource | null = null
    let pollTimer: number | undefined
    const realtime = allowProtectedRealtime && (mode === 'admin' || mode === 'wall' || mode === 'vote' || voteRealtime)
    const shouldPoll = mode === 'vote' || !realtime
    const roleQuery = `role=${encodeURIComponent(mode)}`

    const fetchState = async () => {
      try {
        const response = await fetch(`/api/state?${roleQuery}`, { credentials: 'same-origin' })
        if (!response.ok) throw new Error('state request failed')
        const nextState = (await response.json()) as EventState
        if (!active) return
        applyState(nextState)
        setConnection('live')

        if (shouldPoll && nextState.closed && pollTimer && mode !== 'vote') {
          window.clearInterval(pollTimer)
          pollTimer = undefined
        }
      } catch {
        if (active) setConnection('offline')
      }
    }

    const openEvents = () => {
      if (!realtime || events || document.hidden) return

      events = new EventSource(`/events?${roleQuery}`)
      events.onopen = () => setConnection('live')
      events.addEventListener('state', (event) => {
        applyState(JSON.parse((event as MessageEvent).data) as EventState)
        setConnection('live')
      })
      events.onerror = () => setConnection('offline')
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        events?.close()
        events = null
        return
      }

      fetchState()
      openEvents()
    }

    fetchState()
    openEvents()

    if (shouldPoll) {
      pollTimer = window.setInterval(fetchState, 15_000)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      events?.close()
      if (pollTimer) window.clearInterval(pollTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [allowProtectedRealtime, applyState, enabled, mode, voteRealtime])

  const post = useCallback(async (path: string, body: unknown, options: PostOptions = {}) => {
    if (!enabled || !allowProtectedRealtime) return null

    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let detail = `${path} failed (${response.status})`
        try {
          const payload = await response.json() as { error?: string }
          if (payload.error) detail = `${payload.error} (${response.status})`
        } catch {
          // Keep the generic message when the response is not JSON.
        }
        throw new Error(detail)
      }
      const nextState = (await response.json()) as EventState
      applyState(nextState)
      setConnection('live')
      return nextState
    } catch (error) {
      console.warn(`POST ${path} failed`, error)
      setConnection('offline')
      if (options.throwOnError) throw error
      return null
    }
  }, [allowProtectedRealtime, applyState, enabled])

  return { state, connection: enabled ? connection : 'connecting', post }
}

function getInitialEventState(): EventState {
  const storedTheme = normalizeStoredThemeMode(getStoredValue(themeModeKey))
  const initialTheme = storedTheme || fallbackState.settings.themeMode

  return {
    ...fallbackState,
    settings: {
      ...fallbackState.settings,
      themeMode: initialTheme,
    },
  }
}

function normalizeStoredThemeMode(value: string): ThemeMode | '' {
  return value === 'light' || value === 'stage' ? value : ''
}

type TeamConfigDraft = {
  id: string
  code: string
  editKey: string
  name: string
  title: string
  membersText: string
  logoFile: string
  color: string
  logo: string
  baseStars: string
  baseVoters: string
  logoShape: string
  logoFrame: string
  logoFit: string
  logoSize: string
  logoWidth: string
  logoHeight: string
  logoZoom: string
  logoFocusX: string
  logoFocusY: string
  photoFit: string
  photoShape: string
  photoFrame: string
  photoWidth: string
  photoHeight: string
  photoRadius: string
  photoZoom: string
  photoFocusX: string
  photoFocusY: string
  sortOrder: number
}

type QuizConfigDraft = {
  id: string
  title: string
  question: string
  answer: string
  acceptedAnswersText: string
  prizeImageFile: string
  winnerCount: string
  enabled: boolean
}

type TeamInfoUpload = {
  copy?: Partial<EventCopy>
  teams: Array<Record<string, unknown>>
  quizzes?: Array<Record<string, unknown>>
  logos?: Array<{
    fileName: string
    dataUrl: string
  }>
}

const logoUploadMaxDataUrlLength = 220_000

function normalizeLogoSourceValue(value: string) {
  const trimmed = value.trim()
  const driveId = extractGoogleDriveFileId(trimmed)

  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200`
  }

  return trimmed
}

function extractGoogleDriveFileId(value: string) {
  if (!value) return ''

  try {
    const url = new URL(value)
    if (!/(\.|^)google\.com$/i.test(url.hostname) && !/(\.|^)googleusercontent\.com$/i.test(url.hostname)) return ''

    const idParam = url.searchParams.get('id')
    if (idParam) return sanitizeDriveFileId(idParam)

    const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/i)
    if (fileMatch?.[1]) return sanitizeDriveFileId(fileMatch[1])

    const foldersMatch = url.pathname.match(/\/d\/([^/]+)/i)
    if (foldersMatch?.[1]) return sanitizeDriveFileId(foldersMatch[1])
  } catch {
    return ''
  }

  return ''
}

function sanitizeDriveFileId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
}

async function readLogoFileAsDataUrl(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.')
  }

  if (file.size <= 360_000 || file.type === 'image/svg+xml' || file.type === 'image/x-icon') {
    const rawDataUrl = await readFileAsDataUrl(file)
    if (rawDataUrl.length <= logoUploadMaxDataUrlLength) return rawDataUrl
    if (file.type === 'image/svg+xml' || file.type === 'image/x-icon') {
      throw new Error('이미지 파일이 너무 큽니다. 500KB 이하 파일이나 인터넷 URL을 사용해주세요.')
    }
  }

  return compressRasterImageFile(file)
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.'))
    image.src = src
  })
}

async function compressRasterImageFile(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImageElement(objectUrl)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지 변환을 지원하지 않는 브라우저입니다.')

    const attempts = [
      { maxSide: 1280, quality: 0.82 },
      { maxSide: 980, quality: 0.76 },
      { maxSide: 760, quality: 0.7 },
      { maxSide: 560, quality: 0.66 },
    ]

    for (const attempt of attempts) {
      const scale = Math.min(1, attempt.maxSide / Math.max(image.naturalWidth, image.naturalHeight))
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/jpeg', attempt.quality)
      if (dataUrl.length <= logoUploadMaxDataUrlLength) return dataUrl
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }

  throw new Error('이미지 파일이 너무 큽니다. 더 작은 파일이나 인터넷 URL을 사용해주세요.')
}

function createQuizDrafts(quizzes: QuizConfig[]): QuizConfigDraft[] {
  const source = quizzes.length ? quizzes : fallbackQuizBank
  return source.slice(0, 15).map((quiz, index) => ({
    id: quiz.id || `quiz-${index + 1}`,
    title: quiz.title,
    question: quiz.question,
    answer: quiz.answer,
    acceptedAnswersText: quiz.acceptedAnswers.join('\n'),
    prizeImageFile: quiz.prizeImageFile || '',
    winnerCount: String(quiz.winnerCount || 2),
    enabled: quiz.enabled !== false,
  }))
}

function createBlankQuizDraft(index: number): QuizConfigDraft {
  return {
    id: `quiz-${index + 1}`,
    title: `퀴즈 ${index + 1}`,
    question: '',
    answer: '',
    acceptedAnswersText: '',
    prizeImageFile: '',
    winnerCount: '2',
    enabled: true,
  }
}

function createTeamDrafts(teams: Team[]): TeamConfigDraft[] {
  return [...teams]
    .sort((a, b) => getConfigOrder(a) - getConfigOrder(b))
    .map((team, index) => createTeamDraft(team, team.sortOrder ?? index))
}

function createTeamDraft(team: Team, sortOrder = 0): TeamConfigDraft {
  return {
    id: team.id,
    code: team.code,
    editKey: team.editKey || getTeamEditKey(team.id, team.code),
    name: team.name,
    title: team.title,
    membersText: team.members.join('\n'),
    logoFile: team.logoFile || '',
    color: team.color,
    logo: team.logo,
    baseStars: String(team.baseStars ?? 0),
    baseVoters: String(team.baseVoters ?? 0),
    logoShape: team.logoShape || 'rounded',
    logoFrame: team.logoFrame || 'line',
    logoFit: team.logoFit || 'cover',
    logoSize: String(team.logoSize ?? 48),
    logoWidth: String(team.logoWidth ?? ''),
    logoHeight: String(team.logoHeight ?? ''),
    logoZoom: String(team.logoZoom ?? 1),
    logoFocusX: String(team.logoFocusX ?? 50),
    logoFocusY: String(team.logoFocusY ?? 50),
    photoFit: team.photoFit || 'cover',
    photoShape: team.photoShape || 'wide',
    photoFrame: team.photoFrame || team.logoFrame || 'line',
    photoWidth: String(team.photoWidth ?? 560),
    photoHeight: String(team.photoHeight ?? 300),
    photoRadius: String(team.photoRadius ?? DEFAULT_TEAM_PHOTO_RADIUS),
    photoZoom: String(team.photoZoom ?? 1),
    photoFocusX: String(team.photoFocusX ?? 50),
    photoFocusY: String(team.photoFocusY ?? 50),
    sortOrder,
  }
}

function getConfigOrder(team: Team) {
  return team.sortOrder ?? fallbackTeamOrder.get(team.id) ?? team.rank ?? 0
}

function teamDraftToConfig(team: TeamConfigDraft, index: number) {
  return {
    id: team.id,
    code: team.code,
    editKey: sanitizeClientSlug(team.editKey) || getTeamEditKey(team.id, team.code),
    name: team.name,
    title: team.title,
    members: team.membersText
      .split(/[\n,]/)
      .map((member) => member.trim())
      .filter(Boolean)
      .slice(0, 3),
    logoFile: normalizeLogoSourceValue(team.logoFile),
    logoShape: normalizeImageShape(team.logoShape, 'rounded'),
    logoFrame: normalizeImageFrame(team.logoFrame, 'line'),
    logoFit: normalizeImageFit(team.logoFit, 'cover'),
    logoSize: getImageSizeValue(team.logoSize, 48, 36, 88),
    logoWidth: getImageDimensionValue(team.logoWidth, getDefaultImageFrameDimensions(normalizeImageShape(team.logoShape, 'rounded'), getImageSizeValue(team.logoSize, 48, 36, 88)).width, 36, 180),
    logoHeight: getImageDimensionValue(team.logoHeight, getDefaultImageFrameDimensions(normalizeImageShape(team.logoShape, 'rounded'), getImageSizeValue(team.logoSize, 48, 36, 88)).height, 32, 132),
    logoZoom: getZoomValue(team.logoZoom, 1),
    logoFocusX: getPercentValue(team.logoFocusX, 50),
    logoFocusY: getPercentValue(team.logoFocusY, 50),
    photoFit: normalizeImageFit(team.photoFit, 'cover'),
    photoShape: normalizeImageShape(team.photoShape, 'wide'),
    photoFrame: normalizeImageFrame(team.photoFrame, 'line'),
    photoWidth: getImageDimensionValue(team.photoWidth, 560, 180, 820),
    photoHeight: getImageDimensionValue(team.photoHeight, 300, 150, 460),
    photoRadius: getImageDimensionValue(team.photoRadius, DEFAULT_TEAM_PHOTO_RADIUS, 0, 160),
    photoZoom: getZoomValue(team.photoZoom, 1),
    photoFocusX: getPercentValue(team.photoFocusX, 50),
    photoFocusY: getPercentValue(team.photoFocusY, 50),
    color: team.color,
    logo: logoKinds.includes(team.logo as LogoKind) ? team.logo : 'orbit',
    baseStars: Math.max(0, Math.floor(Number(team.baseStars) || 0)),
    baseVoters: Math.max(0, Math.floor(Number(team.baseVoters) || 0)),
    sortOrder: index,
  }
}

function teamDraftToSelfConfig(team: TeamConfigDraft) {
  const config = teamDraftToConfig(team, team.sortOrder)
  return {
    name: config.name,
    title: config.title,
    members: config.members,
    logoFile: config.logoFile,
    logoShape: config.logoShape,
    logoFrame: config.logoFrame,
    logoFit: config.logoFit,
    logoSize: config.logoSize,
    logoWidth: config.logoWidth,
    logoHeight: config.logoHeight,
    logoZoom: config.logoZoom,
    logoFocusX: config.logoFocusX,
    logoFocusY: config.logoFocusY,
    photoFit: config.photoFit,
    photoShape: config.photoShape,
    photoFrame: config.photoFrame,
    photoWidth: config.photoWidth,
    photoHeight: config.photoHeight,
    photoRadius: config.photoRadius,
    photoZoom: config.photoZoom,
    photoFocusX: config.photoFocusX,
    photoFocusY: config.photoFocusY,
    color: config.color,
    logo: config.logo,
  }
}

function quizDraftToConfig(quiz: QuizConfigDraft, index: number): QuizConfig {
  return {
    id: sanitizeClientSlug(quiz.id) || `quiz-${index + 1}`,
    title: quiz.title.trim().slice(0, 48) || `퀴즈 ${index + 1}`,
    question: quiz.question.trim().slice(0, 180),
    answer: quiz.answer.trim().slice(0, 120),
    acceptedAnswers: quiz.acceptedAnswersText
      .split(/[\n,]/)
      .map((item) => item.trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 8),
    prizeImageFile: normalizeLogoSourceValue(quiz.prizeImageFile),
    winnerCount: clamp(Math.floor(Number(quiz.winnerCount) || 2), 1, 10),
    enabled: quiz.enabled,
  }
}

const copyImageKeys: EventCopyImageKey[] = [
  'appLogoFile',
  'rafflePrizeImageFile',
  'rafflePrizeImageAll',
  'rafflePrizeImageLeader',
  'rafflePrizeImageTop3',
  'rafflePrizeImageRank456',
  'rafflePrizeImageLowerPack',
  'rafflePrizeImageMulti',
  'rafflePrizeImageBig',
  'rafflePrizeImageLongestCheer',
]

function normalizeCopyForSave(copy: EventCopy): EventCopy {
  const next = { ...copy }

  for (const key of copyImageKeys) {
    next[key] = normalizeLogoSourceValue(next[key])
  }

  return next
}

function getConfigSavedStatus(state: EventState) {
  const savedAt = state.configUpdatedAt || Date.now()
  const revision = Math.max(1, Math.floor(Number(state.configRevision) || 1))
  return `팀 정보가 저장되고 화면에 반영되었습니다. 저장 시각 ${formatMessageTime(savedAt)} · 반영 버전 ${revision}`
}

async function saveTeamConfigPayload(post: PostEventState, payload: TeamInfoUpload) {
  try {
    return await post('/api/team-config', payload, { throwOnError: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    if (!message.includes('(403)')) throw error
    return applyTeamConfigViaGet(payload)
  }
}

async function applyTeamConfigViaGet(payload: TeamInfoUpload) {
  const encoded = encodeConfigPayload(payload)
  const response = await fetch(`/api/team-config/apply?payload=${encoded}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let detail = `/api/team-config/apply failed (${response.status})`
    try {
      const errorPayload = (await response.json()) as { error?: string }
      if (errorPayload.error) detail = `${errorPayload.error} (${response.status})`
    } catch {
      // Keep the generic message when a proxy or gateway returns HTML.
    }
    throw new Error(detail)
  }

  return (await response.json()) as EventState
}

function encodeConfigPayload(payload: TeamInfoUpload) {
  const compressed = deflateSync(strToU8(JSON.stringify(payload)), { level: 9 })
  return bytesToBase64Url(compressed)
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getConfigSaveTarget() {
  const host = window.location.hostname.toLowerCase()
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)

  if (isLocal) {
    return {
      kind: 'local' as const,
      label: '로컬 Node 서버',
      primaryLabel: '로컬에 저장 및 반영',
      description: '이 화면의 저장은 현재 접속한 로컬/사내망 Node 서버의 teams.json을 갱신하고, 열린 /vote와 /wall에 즉시 방송합니다.',
    }
  }

  return {
    kind: 'cloudflare' as const,
    label: 'Cloudflare 운영 저장소',
    primaryLabel: 'Cloudflare 저장 및 반영',
    description:
      '이 화면의 저장은 배포 파일을 직접 수정하지 않고, 브라우저가 Cloudflare Durable Object 운영 저장소로 수정 내용을 업로드합니다.',
  }
}

function getConfigSaveFailureMessage(error: unknown, target: ReturnType<typeof getConfigSaveTarget>) {
  const detail = error instanceof Error ? error.message : String(error || '')
  const normalized = detail.toLowerCase()

  if (normalized.includes('admin authentication required') || normalized.includes('(401)')) {
    return `${target.label} 저장 실패: 관리자 인증이 만료되었거나 쿠키가 전달되지 않았습니다. 상단의 인증 확인을 누르거나 로그아웃 후 다시 로그인해주세요.`
  }

  if (normalized.includes('(403)')) {
    return target.kind === 'cloudflare'
      ? 'Cloudflare 저장 실패(403): 관리자 인증 문제가 아니라 현재 사내망/보안 프록시가 Cloudflare 저장 요청을 거절한 상태일 수 있습니다. 모바일/외부망에서는 저장이 되면 앱은 정상입니다. 로컬 JSON 저장으로 백업하거나 모바일 핫스팟/외부망에서 다시 저장해주세요.'
      : '로컬 서버 저장 실패(403): 현재 접속한 로컬 서버가 요청을 거절했습니다. 관리자 인증과 서버 접근 정책을 확인해주세요.'
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('no response')
  ) {
    return target.kind === 'cloudflare'
      ? 'Cloudflare 저장 실패: 이 브라우저에서 Cloudflare로 나가는 outbound HTTPS 요청이 막혔을 수 있습니다. 로컬 JSON 저장으로 백업한 뒤, 인터넷 연결이 가능한 관리자 PC에서 업로드하면 즉시 반영됩니다.'
      : '로컬 서버 저장 실패: 현재 접속한 로컬 Node 서버와 통신하지 못했습니다. 서버 실행 상태와 접속 주소를 확인해주세요.'
  }

  if (normalized.includes('request body too large') || normalized.includes('(413)')) {
    return `${target.label} 저장 실패: 업로드 내용이 너무 큽니다. 사진 파일 크기를 줄이거나 이미지 URL을 사용해주세요.`
  }

  if (normalized.includes('(414)')) {
    return `${target.label} 저장 실패: 사내망 우회 저장 URL이 너무 깁니다. 사진 파일 크기를 줄이거나 로컬 JSON 저장 후 모바일/외부망에서 업로드해주세요.`
  }

  if (normalized.includes('(400)')) {
    return `${target.label} 저장 실패: 팀 정보 형식이 올바르지 않습니다. 팀 목록과 JSON 구조를 확인해주세요. (${detail})`
  }

  return `${target.label} 저장 실패: ${detail || '원인을 알 수 없습니다.'}`
}

function teamEditorPreview(team: TeamConfigDraft): TeamVisual {
  return {
    name: team.name,
    logo: logoKinds.includes(team.logo as LogoKind) ? (team.logo as LogoKind) : 'orbit',
    color: /^#[0-9a-fA-F]{6}$/.test(team.color) ? team.color : '#A50034',
    logoFile: normalizeLogoSourceValue(team.logoFile),
    logoShape: normalizeImageShape(team.logoShape, 'rounded'),
    logoFrame: normalizeImageFrame(team.logoFrame, 'line'),
    logoFit: normalizeImageFit(team.logoFit, 'cover'),
    logoSize: getImageSizeValue(team.logoSize, 48, 36, 88),
    logoWidth: getImageDimensionValue(team.logoWidth, getDefaultImageFrameDimensions(normalizeImageShape(team.logoShape, 'rounded'), getImageSizeValue(team.logoSize, 48, 36, 88)).width, 36, 180),
    logoHeight: getImageDimensionValue(team.logoHeight, getDefaultImageFrameDimensions(normalizeImageShape(team.logoShape, 'rounded'), getImageSizeValue(team.logoSize, 48, 36, 88)).height, 32, 132),
    logoZoom: getZoomValue(team.logoZoom, 1),
    logoFocusX: getPercentValue(team.logoFocusX, 50),
    logoFocusY: getPercentValue(team.logoFocusY, 50),
    photoFit: normalizeImageFit(team.photoFit, 'cover'),
    photoShape: normalizeImageShape(team.photoShape, 'wide'),
    photoFrame: normalizeImageFrame(team.photoFrame, 'line'),
    photoWidth: getImageDimensionValue(team.photoWidth, 560, 180, 820),
    photoHeight: getImageDimensionValue(team.photoHeight, 300, 150, 460),
    photoRadius: getImageDimensionValue(team.photoRadius, DEFAULT_TEAM_PHOTO_RADIUS, 0, 160),
    photoZoom: getZoomValue(team.photoZoom, 1),
    photoFocusX: getPercentValue(team.photoFocusX, 50),
    photoFocusY: getPercentValue(team.photoFocusY, 50),
  }
}

async function parseTeamInfoFile(file: File): Promise<TeamInfoUpload> {
  const lowerName = file.name.toLowerCase()

  if (lowerName.endsWith('.json')) {
    const parsed = JSON.parse(await file.text()) as Record<string, unknown>
    return normalizeTeamInfoUpload(parsed)
  }

  if (!lowerName.endsWith('.zip')) {
    throw new Error('team_info.json 또는 team_infos.zip 파일만 업로드할 수 있습니다.')
  }

  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const entryNames = Object.keys(entries)
  const jsonEntryName =
    entryNames.find((name) => name.replace(/\\/g, '/').toLowerCase().endsWith('/team_info.json')) ||
    entryNames.find((name) => ['team_info.json', 'teams.json'].includes(name.replace(/\\/g, '/').toLowerCase()))

  if (!jsonEntryName) {
    throw new Error('ZIP 안에서 team_info.json 파일을 찾지 못했습니다.')
  }

  const parsed = JSON.parse(strFromU8(entries[jsonEntryName])) as Record<string, unknown>
  const logos = entryNames
    .map((name) => ({ name: name.replace(/\\/g, '/'), bytes: entries[name] }))
    .filter((entry) => /(^|\/)logos\/[^/]+\.(png|jpe?g|webp|svg|ico)$/i.test(entry.name))
    .slice(0, 20)
    .map((entry) => {
      const fileName = entry.name.split('/').pop() || ''
      return {
        fileName,
        dataUrl: bytesToDataUrl(entry.bytes, getLogoMimeType(fileName)),
      }
    })

  return normalizeTeamInfoUpload(parsed, logos)
}

function normalizeTeamInfoUpload(input: Record<string, unknown>, logos: TeamInfoUpload['logos'] = []): TeamInfoUpload {
  const sourceTeams = Array.isArray(input) ? input : Array.isArray(input.teams) ? input.teams : []
  if (!sourceTeams.length) {
    throw new Error('team_info.json 안에 teams 배열이 필요합니다.')
  }

  const teams = sourceTeams.slice(0, 20).map((team, index) => {
    const next = { ...(team as Record<string, unknown>) }
    const matchedLogo = findImportedLogoFile(next, index, logos)
    if (matchedLogo && !next.logoFile) {
      next.logoFile = `/team-logos/${matchedLogo.fileName}`
    }
    return next
  })

  return {
    copy: typeof input.copy === 'object' && input.copy ? (input.copy as Partial<EventCopy>) : undefined,
    teams,
    quizzes: Array.isArray(input.quizzes) ? (input.quizzes.slice(0, 15) as Array<Record<string, unknown>>) : undefined,
    logos,
  }
}

function findImportedLogoFile(team: Record<string, unknown>, index: number, logos: TeamInfoUpload['logos'] = []) {
  const keys = [
    `t${index + 1}`,
    String(team.code || '').toLowerCase(),
    String(team.id || '').toLowerCase(),
    String(team.name || '').toLowerCase().replace(/\s+/g, ''),
  ].filter(Boolean)

  return logos.find((logo) => {
    const baseName = logo.fileName.toLowerCase().replace(/\.(png|jpe?g|webp|svg|ico)$/i, '')
    return keys.some((key) => baseName === key || baseName === `${key}-logo` || baseName.startsWith(`${key}_`))
  })
}

function getLogoMimeType(fileName: string) {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  return 'image/png'
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }

  return `data:${mimeType};base64,${btoa(binary)}`
}

function downloadTeamInfoJson({ copy, teams, quizzes }: { copy: EventCopy; teams: TeamConfigDraft[]; quizzes: QuizConfigDraft[] }) {
  const payload = {
    copy: normalizeCopyForSave(copy),
    teams: teams.map((team, index) => teamDraftToConfig(team, index)),
    quizzes: quizzes.map((quiz, index) => quizDraftToConfig(quiz, index)),
  }

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    'team_info.json',
  )
}

function exportResultsWorkbook(state: EventState) {
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))
  const participants = getParticipantSummaries(state)
  const generatedAt = new Date()
  const totalStars = state.teams.reduce((sum, team) => sum + team.totalStars, 0)
  const eligibleCount = getRaffleCandidatesForRule(state, 'all').length
  const sheets = [
    {
      name: '행사요약',
      rows: [
        ['항목', '값'],
        ['생성시각', generatedAt.toLocaleString('ko-KR')],
        ['투표상태', state.closed ? '마감' : '진행 중'],
        ['세션', state.sessionId],
        ['참여자별 별 개수', state.settings.starBudget],
        ['팀당 최대 별', getMaxStarsPerTeam(state)],
        ['등록 인원', state.participants.length],
        ['총 별', totalStars],
        ['추첨 응모 완료', eligibleCount],
        ['마지막 추첨 후보', state.lastRaffle?.candidates ?? 0],
      ],
    },
    {
      name: '팀별결과',
      rows: [
        ['순위', '팀명', '프로젝트명', '팀원', '받은 별', '참여자', '점유율(%)', '환산점수', '테스트 기본 별', '테스트 기본 투표자'],
        ...state.teams.map((team) => [
          team.rank,
          team.name,
          team.title,
          team.members.join(', '),
          team.totalStars,
          team.voters,
          team.share,
          formatPointScore(team.score ?? 0),
          team.baseStars,
          team.baseVoters,
        ]),
      ],
    },
    {
      name: '참여자',
      rows: [
        ['이름', "Let's ID", '사용 별', '응모 상태', '공개 메시지', '숨김 메시지', '팀별 배분', '최근 업데이트'],
        ...participants.map((person) => [
          person.name,
          person.group,
          person.spent,
          person.status,
          person.cheers.visible,
          Math.max(0, person.cheers.total - person.cheers.visible),
          person.allocationSummary,
          new Date(person.updatedAt).toLocaleString('ko-KR'),
        ]),
      ],
    },
    {
      name: '응원메시지',
      rows: [
        ['작성시각', '팀명', '작성자', '상태', '메시지'],
        ...state.cheers.map((message) => [
          new Date(message.createdAt).toLocaleString('ko-KR'),
          teamMap.get(message.teamId)?.name ?? message.teamId,
          message.author,
          message.hidden ? '숨김' : '공개',
          message.text,
        ]),
      ],
    },
    {
      name: '추첨결과',
      rows: [
        ['추첨시각', '룰', '후보 수', '순번', '이름', "Let's ID", '응원 참여'],
        ...(state.lastRaffle?.winners ?? []).map((winner, index) => [
          state.lastRaffle ? new Date(state.lastRaffle.createdAt).toLocaleString('ko-KR') : '',
          state.lastRaffle?.rule ?? '',
          state.lastRaffle?.candidates ?? 0,
          index + 1,
          winner.name,
          winner.group ?? '',
          winner.cheered ? 'Y' : 'N',
        ]),
      ],
    },
    {
      name: '별이벤트',
      rows: [
        ['시각', '참여자', '팀명', '변화', '이전', '이후'],
        ...state.voteEvents.map((event) => [
          new Date(event.createdAt).toLocaleString('ko-KR'),
          event.author,
          teamMap.get(event.teamId)?.name ?? event.teamId,
          event.delta,
          event.previous,
          event.next,
        ]),
      ],
    },
  ]

  const workbook = buildXlsxWorkbook(sheets)
  const workbookBuffer = workbook.buffer.slice(workbook.byteOffset, workbook.byteOffset + workbook.byteLength) as ArrayBuffer
  const timestamp = generatedAt.toISOString().slice(0, 19).replace(/[-:T]/g, '')
  downloadBlob(
    new Blob([workbookBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `vibe-vote-results-${timestamp}.xlsx`,
  )
}

function buildXlsxWorkbook(sheets: Array<{ name: string; rows: Array<Array<string | number | boolean | null | undefined>> }>) {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(buildContentTypes(sheets.length)),
    '_rels/.rels': strToU8(buildRootRelationships()),
    'xl/workbook.xml': strToU8(buildWorkbookXml(sheets)),
    'xl/_rels/workbook.xml.rels': strToU8(buildWorkbookRelationships(sheets.length)),
    'xl/styles.xml': strToU8(buildStylesXml()),
  }

  sheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(buildWorksheetXml(sheet.rows))
  })

  return zipSync(files)
}

function buildContentTypes(sheetCount: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${Array.from({ length: sheetCount }).map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`
}

function buildRootRelationships() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
}

function buildWorkbookXml(sheets: Array<{ name: string }>) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}
</sheets>
</workbook>`
}

function buildWorkbookRelationships(sheetCount: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${Array.from({ length: sheetCount }).map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}
<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`
}

function buildWorksheetXml(rows: Array<Array<string | number | boolean | null | undefined>>) {
  const xmlRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => buildCellXml(value, columnIndex, rowIndex))
    return `<row r="${rowIndex + 1}">${cells.join('')}</row>`
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${xmlRows.join('')}</sheetData>
</worksheet>`
}

function buildCellXml(value: string | number | boolean | null | undefined, columnIndex: number, rowIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`
  }

  const text = value === null || value === undefined ? '' : String(value)
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`
}

function columnName(index: number) {
  let current = index + 1
  let name = ''

  while (current > 0) {
    const remainder = (current - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }

  return name
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

async function updateVote(
  post: PostEventState,
  sessionId: number,
  participantId: string,
  name: string,
  group: string,
  department: string,
  allocations: Record<string, number>,
) {
  await post('/api/vote', {
    sessionId,
    participantId,
    name: name.trim(),
    group: normalizeLetsIdDisplay(group),
    department,
    allocations,
  })
}

function getOrCreateParticipantId() {
  const existing = getCookie(storageKey) || localStorage.getItem(storageKey)
  if (existing) {
    storeValue(storageKey, existing)
    return existing
  }

  const next = createParticipantId()
  storeValue(storageKey, next)
  return next
}

function createParticipantId() {
  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `participant-${Date.now()}-${Math.random().toString(16).slice(2)}`

  return next
}

function isSameParticipantDevice(person: Participant, deviceId: string) {
  if (person.id === deviceId) return true
  if (getParticipantDeviceIds(person).includes(deviceId)) return true
  return false
}

function getParticipantDeviceIds(person: Participant) {
  return [...new Set([...(person.deviceIds ?? []), person.deviceId].filter(Boolean) as string[])]
}

function normalizeLetsIdDisplay(value: string) {
  return value
    .split('@')[0]
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLocaleLowerCase('en-US')
    .slice(0, 48)
}

function sanitizeClientSlug(value: string) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)
}

function getStoredValue(key: string) {
  return localStorage.getItem(key) || getCookie(key) || ''
}

function storeValue(key: string, value: string) {
  localStorage.setItem(key, value)
  setCookie(key, value)
}

function clearStoredValue(key: string) {
  localStorage.removeItem(key)
  clearCookie(key)
}

function getCookie(name: string) {
  const prefix = `${name}=`
  const item = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  return item ? decodeURIComponent(item.slice(prefix.length)) : ''
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
}

function sumStars(allocations: Record<string, number>) {
  return Object.values(allocations).reduce((sum, value) => sum + value, 0)
}

function getStarBudget(state: EventState) {
  return clamp(Math.floor(state.settings.starBudget || DEFAULT_STAR_BUDGET), 1, 20)
}

function getMaxStarsPerTeam(state: EventState) {
  return clamp(
    Math.floor(state.settings.maxStarsPerTeam || DEFAULT_MAX_STARS_PER_TEAM),
    1,
    MAX_CONFIGURABLE_STARS_PER_TEAM,
  )
}

function getDurationMinutes(state: EventState) {
  return normalizeDurationInput(state.settings.durationMinutes, DEFAULT_DURATION_MINUTES)
}

function normalizeDurationInput(value: unknown, fallback = DEFAULT_DURATION_MINUTES) {
  const number = Math.floor(Number(value))
  if (!Number.isFinite(number) || number < 1) return fallback
  return number
}

function normalizeTimeInput(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? value : ''
}

function formatKstTime(timestamp: number) {
  const date = new Date(timestamp + KST_OFFSET_MINUTES * 60 * 1000)
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function minutesUntilKstTime(value: string, now = Date.now()) {
  const target = getNextKstTimestampForTime(value, now)
  if (!target) return DEFAULT_DURATION_MINUTES
  return Math.max(1, Math.ceil((target - now) / 60_000))
}

function getNextKstTimestampForTime(value: string, now = Date.now()) {
  if (!normalizeTimeInput(value)) return 0

  const [hour, minute] = value.split(':').map(Number)
  const kstNow = new Date(now + KST_OFFSET_MINUTES * 60 * 1000)
  let target =
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), hour, minute) -
    KST_OFFSET_MINUTES * 60 * 1000

  if (target <= now) target += 24 * 60 * 60 * 1000
  return target
}

function getTimerMode(state: EventState): TimerMode {
  return state.settings.timerMode === 'targetTime' ? 'targetTime' : 'duration'
}

function getTargetTime(state: EventState) {
  return /^\d{2}:\d{2}$/.test(state.settings.targetTime || '') ? state.settings.targetTime : ''
}

function getMinScore(state: EventState) {
  return clamp(Number(state.settings.minScore ?? DEFAULT_MIN_SCORE), 0, 9.9)
}

function getCheerNameMode(state: EventState): CheerNameMode {
  return state.settings.cheerNameMode === 'real' ? 'real' : 'masked'
}

function normalizeImageShape(value: unknown, fallback: ImageShape): ImageShape {
  return value === 'circle' || value === 'rounded' || value === 'square' || value === 'wide' ? value : fallback
}

function normalizeImageFrame(value: unknown, fallback: ImageFrame): ImageFrame {
  return value === 'soft' || value === 'line' || value === 'glow' || value === 'clean' ? value : fallback
}

function normalizeImageFit(value: unknown, fallback: ImageFit): ImageFit {
  return value === 'cover' || value === 'contain' ? value : fallback
}

function getImageSizeValue(value: unknown, fallback: number, min = 32, max = 96) {
  return clamp(Math.round(Number(value) || fallback), min, max)
}

function getImageDimensionValue(value: unknown, fallback: number, min = 32, max = 220) {
  const number = Number(value)
  return clamp(Math.round(Number.isFinite(number) && number > 0 ? number : fallback), min, max)
}

function getZoomValue(value: unknown, fallback = 1) {
  return clamp(Number(value) || fallback, 1, 2.4)
}

function getPercentValue(value: unknown, fallback = 50) {
  return clamp(Math.round(Number(value) || fallback), 0, 100)
}

function formatRangeValue(value: string) {
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function getDefaultImageFrameDimensions(shape: ImageShape, size: number) {
  if (shape === 'wide') {
    return {
      width: Math.round(size * 1.56),
      height: size,
    }
  }

  return { width: size, height: size }
}

function getImageFrameMetrics(shape: ImageShape, width: number, height: number) {
  const shortestSide = Math.min(width, height)

  if (shape === 'circle') return { width, height, radius: 999 }
  if (shape === 'square') return { width, height, radius: Math.max(3, Math.round(shortestSide * 0.08)) }
  if (shape === 'wide') return { width, height, radius: Math.max(8, Math.round(shortestSide * 0.22)) }
  return { width, height, radius: Math.max(8, Math.round(shortestSide * 0.18)) }
}

function getAppLogoStyle(copy: EventCopy) {
  const shape = normalizeImageShape(copy.appLogoShape, 'circle')
  const size = getImageSizeValue(copy.appLogoSize, 52, 36, 92)
  const fallbackFrame = getDefaultImageFrameDimensions(shape, size)
  const width = getImageDimensionValue(copy.appLogoWidth, fallbackFrame.width, 36, 220)
  const height = getImageDimensionValue(copy.appLogoHeight, fallbackFrame.height, 32, 120)
  const metrics = getImageFrameMetrics(shape, width, height)

  return {
    '--app-logo-width': `${metrics.width}px`,
    '--app-logo-height': `${metrics.height}px`,
    '--app-logo-radius': `${metrics.radius}px`,
  } as CSSProperties
}

function getTeamImageStyle(team: TeamVisual) {
  const shape = normalizeImageShape(team.logoShape, 'rounded')
  const size = getImageSizeValue(team.logoSize, 48, 36, 88)
  const fallbackFrame = getDefaultImageFrameDimensions(shape, size)
  const width = getImageDimensionValue(team.logoWidth, fallbackFrame.width, 36, 180)
  const height = getImageDimensionValue(team.logoHeight, fallbackFrame.height, 32, 132)
  const metrics = getImageFrameMetrics(shape, width, height)

  return {
    '--team-color': team.color,
    '--team-logo-width': `${metrics.width}px`,
    '--team-logo-height': `${metrics.height}px`,
    '--team-logo-radius': `${metrics.radius}px`,
    '--team-image-fit': normalizeImageFit(team.logoFit, 'cover'),
    '--team-image-focus-x': `${getPercentValue(team.logoFocusX, 50)}%`,
    '--team-image-focus-y': `${getPercentValue(team.logoFocusY, 50)}%`,
    '--team-image-zoom': getZoomValue(team.logoZoom, 1),
  } as CSSProperties
}

function getTeamPhotoStyle(team: TeamVisual) {
  const shape = normalizeImageShape(team.photoShape, normalizeImageShape(team.logoShape, 'wide'))
  const height = getImageDimensionValue(team.photoHeight, 300, 150, 460)
  const width = getImageDimensionValue(team.photoWidth, 560, 180, 820)
  const metrics = getImageFrameMetrics(shape, width, height)
  const radius = getImageDimensionValue(team.photoRadius, DEFAULT_TEAM_PHOTO_RADIUS, 0, 160)
  const focusX = getPercentValue(team.photoFocusX, getPercentValue(team.logoFocusX, 50))
  const focusY = getPercentValue(team.photoFocusY, getPercentValue(team.logoFocusY, 50))
  const panX = Number(((50 - focusX) * 0.42).toFixed(2))
  const panY = Number(((50 - focusY) * 0.42).toFixed(2))

  return {
    '--team-color': team.color,
    '--team-photo-width': `${metrics.width}px`,
    '--team-photo-height': `${height}px`,
    '--team-photo-aspect-ratio': `${metrics.width} / ${height}`,
    '--team-photo-radius': `${radius}px`,
    '--team-image-fit': normalizeImageFit(team.photoFit, normalizeImageFit(team.logoFit, 'cover')),
    '--team-image-focus-x': `${focusX}%`,
    '--team-image-focus-y': `${focusY}%`,
    '--team-image-pan-x': `${panX}%`,
    '--team-image-pan-y': `${panY}%`,
    '--team-image-zoom': getZoomValue(team.photoZoom, getZoomValue(team.logoZoom, 1)),
  } as CSSProperties
}

function getAppLogoFrameLabel(copy: EventCopy) {
  const style = getAppLogoStyle(copy) as Record<string, string>
  return `${style['--app-logo-width'] || '52px'} × ${style['--app-logo-height'] || '52px'}`
}

function getTeamLogoFrameLabel(team: TeamVisual) {
  const style = getTeamImageStyle(team) as Record<string, string>
  return `${style['--team-logo-width'] || '48px'} × ${style['--team-logo-height'] || '48px'}`
}

function getTeamPhotoFrameLabel(team: TeamVisual) {
  const style = getTeamPhotoStyle(team) as Record<string, string>
  return `${style['--team-photo-width'] || '560px'} × ${style['--team-photo-height'] || '300px'}`
}

function getThemeMode(state: EventState): ThemeMode {
  return state.settings.themeMode === 'stage' ? 'stage' : 'light'
}

function getEditableConfigSignature(state: EventState) {
  return JSON.stringify({
    copy: state.copy,
    teams: state.teams.map((team) => ({
      id: team.id,
      code: team.code,
      editKey: team.editKey,
      name: team.name,
      title: team.title,
      members: team.members,
      logoFile: team.logoFile,
      logoShape: team.logoShape,
      logoFrame: team.logoFrame,
      logoFit: team.logoFit,
      logoSize: team.logoSize,
      logoWidth: team.logoWidth,
      logoHeight: team.logoHeight,
      logoZoom: team.logoZoom,
      logoFocusX: team.logoFocusX,
      logoFocusY: team.logoFocusY,
      photoFit: team.photoFit,
      photoShape: team.photoShape,
          photoFrame: team.photoFrame,
          photoWidth: team.photoWidth,
          photoHeight: team.photoHeight,
          photoRadius: team.photoRadius,
          photoZoom: team.photoZoom,
      photoFocusX: team.photoFocusX,
      photoFocusY: team.photoFocusY,
      color: team.color,
      logo: team.logo,
      baseStars: team.baseStars,
      baseVoters: team.baseVoters,
      sortOrder: team.sortOrder,
    })),
    quizzes: state.quizBank,
  })
}

function formatCheerAuthor(name: string, mode: CheerNameMode) {
  const cleanName = name.trim()
  if (!cleanName) return mode === 'real' ? '익명' : '익*'
  if (mode === 'real') return cleanName

  const letters = Array.from(cleanName.replace(/\s+/g, ''))
  if (!letters.length) return '익*'
  return `${letters[0]}${'*'.repeat(Math.max(1, Math.min(letters.length - 1, 3)))}`
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match))
}

function renderStarAccent(text: string) {
  const parts = text.split('★')
  if (parts.length === 1) return text

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {index > 0 ? <span className="star-text-accent">★</span> : null}
      {part}
    </span>
  ))
}

function formatPointScore(score: number) {
  score = clamp(score, 0, 10)
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function formatMessageTime(timestamp: number) {
  return messageTimeFormatter.format(timestamp)
}

function buildTerritoryCells(teams: Team[], centers: Map<string, Point>): TerritoryCell[] {
  const width = 1000
  const height = 600
  const maxStars = Math.max(...teams.map((team) => team.totalStars), 0)
  const baselineStars = Math.max(4, Math.round(maxStars * 0.18))
  const maxWeightedStars = Math.max(...teams.map((team) => team.totalStars + baselineStars), baselineStars)

  const sites = teams.map((team) => {
    const center = centers.get(team.id) ?? { x: 50, y: 50 }
    const weightedStars = team.totalStars + baselineStars
    const normalized = Math.sqrt(weightedStars / maxWeightedStars)
    const radius = 88 + normalized * 172

    return {
      team,
      x: (center.x / 100) * width,
      y: (center.y / 100) * height,
      power: radius * radius,
      share: Math.max(0.14, weightedStars / maxWeightedStars),
    }
  })

  return sites.map((site) => {
    let polygon: Point[] = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ]

    for (const other of sites) {
      if (other.team.id === site.team.id) continue

      const a = 2 * (other.x - site.x)
      const b = 2 * (other.y - site.y)
      const c = other.x * other.x + other.y * other.y - site.x * site.x - site.y * site.y + site.power - other.power
      polygon = clipPolygon(polygon, a, b, c)
    }

    return {
      team: site.team,
      share: site.share,
      polygon,
      path: polygonToPath(polygon),
    }
  })
}

function layoutBubbleGroups(items: BubbleGroupInput[], centers: Map<string, Point>, territories: TerritoryCell[]) {
  const fieldWidth = 1000
  const fieldHeight = 600
  const teamCounts = new Map<string, number>()
  const territoryByTeam = new Map(territories.map((cell) => [cell.team.id, cell]))
  const labelAnchors = [...centers.values()].map((center) => ({
    x: (center.x / 100) * fieldWidth,
    y: (center.y / 100) * fieldHeight,
  }))

  const layout = items.map((item, index) => {
    const center = centers.get(item.teamId) ?? { x: 50, y: 50 }
    const teamIndex = teamCounts.get(item.teamId) ?? 0
    teamCounts.set(item.teamId, teamIndex + 1)

    const baseAnchor = {
      x: (center.x / 100) * fieldWidth,
      y: (center.y / 100) * fieldHeight,
    }
    const anchor = constrainFieldPointToTerritory(baseAnchor, territoryByTeam.get(item.teamId), baseAnchor)
    const baseAngle = (fallbackTeamOrder.get(item.teamId) ?? 0) * 0.74 - 0.38
    const angle = baseAngle + teamIndex * 2.399963
    const spread = 104 + Math.sqrt(teamIndex) * 48
    const seededOffset = (hashToUnit(`${item.key}:layout`) - 0.5) * 34
    const initial = constrainFieldPointToTerritory(
      {
        x: anchor.x + Math.cos(angle) * (spread + seededOffset),
        y: anchor.y + Math.sin(angle) * (spread + seededOffset) * 0.72,
      },
      territoryByTeam.get(item.teamId),
      anchor,
    )

    return {
      ...item,
      anchorX: anchor.x,
      anchorY: anchor.y,
      angle,
      px: initial.x,
      py: initial.y,
      depth: `${index % 2 ? 'near' : 'far'}`,
      delay: `${-(index % 13) * 0.18}s`,
      drift: `${2.5 + (index % 7) * 0.28}s`,
      breathe: `${2.1 + (index % 5) * 0.22}s`,
      wobble: `${index % 2 ? -1 : 1}`,
    }
  })

  for (let iteration = 0; iteration < 96; iteration += 1) {
    for (const item of layout) {
      item.px += (item.anchorX - item.px) * 0.022
      item.py += (item.anchorY - item.py) * 0.022
    }

    for (let outer = 0; outer < layout.length; outer += 1) {
      for (let inner = outer + 1; inner < layout.length; inner += 1) {
        const a = layout[outer]
        const b = layout[inner]
        if (a.teamId !== b.teamId) continue

        const dx = b.px - a.px
        const dy = b.py - a.py
        const distance = Math.max(1, Math.hypot(dx, dy))
        const preferredDistance = (a.size + b.size) * 0.52 + 24

        if (distance > preferredDistance) {
          const pull = Math.min(8, (distance - preferredDistance) * 0.015)
          const pullX = (dx / distance) * pull
          const pullY = (dy / distance) * pull

          a.px += pullX
          a.py += pullY
          b.px -= pullX
          b.py -= pullY
        }
      }
    }

    for (let outer = 0; outer < layout.length; outer += 1) {
      for (let inner = outer + 1; inner < layout.length; inner += 1) {
        const a = layout[outer]
        const b = layout[inner]
        const dx = b.px - a.px
        const dy = b.py - a.py
        const distance = Math.max(1, Math.hypot(dx, dy))
        const minimumDistance = a.teamId === b.teamId ? (a.size + b.size) * 0.48 + 16 : (a.size + b.size) * 0.53 + 30

        if (distance < minimumDistance) {
          const push = ((minimumDistance - distance) / distance) * 0.52
          const pushX = dx * push
          const pushY = dy * push

          a.px -= pushX
          a.py -= pushY
          b.px += pushX
          b.py += pushY
        }
      }
    }

    for (const item of layout) {
      const margin = item.size * 0.48 + 14

      for (const label of labelAnchors) {
        const dx = item.px - label.x
        const dy = item.py - label.y
        const distanceFromLabel = Math.max(1, Math.hypot(dx, dy))
        const minimumFromLabel = 120 + item.size * 0.66

        if (distanceFromLabel < minimumFromLabel) {
          const nx = distanceFromLabel > 2 ? dx / distanceFromLabel : Math.cos(item.angle)
          const ny = distanceFromLabel > 2 ? dy / distanceFromLabel : Math.sin(item.angle)
          item.px = label.x + nx * minimumFromLabel
          item.py = label.y + ny * minimumFromLabel
        }
      }

      item.px = clamp(item.px, margin, fieldWidth - margin)
      item.py = clamp(item.py, margin, fieldHeight - margin)
      const constrained = constrainFieldPointToTerritory(
        { x: item.px, y: item.py },
        territoryByTeam.get(item.teamId),
        { x: item.anchorX, y: item.anchorY },
      )
      item.px = clamp(constrained.x, margin, fieldWidth - margin)
      item.py = clamp(constrained.y, margin, fieldHeight - margin)
    }
  }

  return layout.map((item) => ({
    ...item,
    x: (item.px / fieldWidth) * 100,
    y: (item.py / fieldHeight) * 100,
  }))
}

function constrainPercentPointToTerritory(
  teamId: string,
  point: Point,
  territories: TerritoryCell[],
  centers: Map<string, Point>,
  bubbleSize = 0,
) {
  const cell = territories.find((territory) => territory.team.id === teamId)
  const center = centers.get(teamId) ?? { x: 50, y: 50 }
  const fieldPoint = constrainFieldPointToStage(
    {
      x: (point.x / 100) * 1000,
      y: (point.y / 100) * 600,
    },
    bubbleSize,
  )
  const fallback = constrainFieldPointToStage(
    {
      x: (center.x / 100) * 1000,
      y: (center.y / 100) * 600,
    },
    bubbleSize,
  )
  const constrained = constrainFieldPointToStage(constrainFieldPointToTerritory(fieldPoint, cell, fallback), bubbleSize)
  const finalPoint = constrainFieldPointToStage(constrainFieldPointToTerritory(constrained, cell, fallback), bubbleSize)

  return {
    x: clamp((finalPoint.x / 1000) * 100, 4.5, 95.5),
    y: clamp((finalPoint.y / 600) * 100, 7, 93),
  }
}

function constrainOpenBubblePoint(point: Point) {
  return {
    x: clamp(point.x, 17, 83),
    y: clamp(point.y, 20, 80),
  }
}

function constrainFieldPointToStage(point: Point, bubbleSize: number) {
  const margin = bubbleSize ? bubbleSize * 0.52 + 10 : 0

  return {
    x: clamp(point.x, margin, 1000 - margin),
    y: clamp(point.y, margin, 600 - margin),
  }
}

function constrainFieldPointToTerritory(point: Point, cell: TerritoryCell | undefined, fallback: Point) {
  if (!cell?.polygon.length || pointInPolygon(point, cell.polygon)) {
    return point
  }

  const safeFallback = pointInPolygon(fallback, cell.polygon) ? fallback : getPolygonCentroid(cell.polygon)

  for (let step = 0; step <= 1; step += 0.05) {
    const candidate = {
      x: point.x + (safeFallback.x - point.x) * step,
      y: point.y + (safeFallback.y - point.y) * step,
    }

    if (pointInPolygon(candidate, cell.polygon)) {
      return candidate
    }
  }

  return safeFallback
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false

  for (let currentIndex = 0, previousIndex = polygon.length - 1; currentIndex < polygon.length; previousIndex = currentIndex, currentIndex += 1) {
    const current = polygon[currentIndex]
    const previous = polygon[previousIndex]
    const crosses =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y + Number.EPSILON) + current.x

    if (crosses) {
      inside = !inside
    }
  }

  return inside
}

function getPolygonCentroid(polygon: Point[]) {
  if (!polygon.length) return { x: 500, y: 300 }

  const sum = polygon.reduce(
    (total, point) => ({
      x: total.x + point.x,
      y: total.y + point.y,
    }),
    { x: 0, y: 0 },
  )

  return {
    x: sum.x / polygon.length,
    y: sum.y / polygon.length,
  }
}

function hashToUnit(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0) / 4294967295
}

function clipPolygon(polygon: Point[], a: number, b: number, c: number) {
  if (!polygon.length) return []

  const clipped: Point[] = []
  const isInside = (point: Point) => a * point.x + b * point.y <= c + 0.0001

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const previous = polygon[(index + polygon.length - 1) % polygon.length]
    const currentInside = isInside(current)
    const previousInside = isInside(previous)

    if (currentInside !== previousInside) {
      clipped.push(intersectSegmentWithLine(previous, current, a, b, c))
    }

    if (currentInside) {
      clipped.push(current)
    }
  }

  return clipped
}

function intersectSegmentWithLine(start: Point, end: Point, a: number, b: number, c: number) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const denominator = a * dx + b * dy
  const t = denominator === 0 ? 0 : (c - a * start.x - b * start.y) / denominator

  return {
    x: start.x + clamp(t, 0, 1) * dx,
    y: start.y + clamp(t, 0, 1) * dy,
  }
}

function polygonToPath(polygon: Point[]) {
  if (!polygon.length) return ''

  return `${polygon.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')} Z`
}

export default App
