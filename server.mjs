import { createServer } from 'node:http'
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync, strFromU8 } from 'fflate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT || 5173)
const host = process.env.HOST || '0.0.0.0'
const adminPasscode = String(process.env.ADMIN_PASSCODE || '').trim()
const defaultStarBudget = 10
const defaultMaxStarsPerTeam = 5
const maxConfigurableStarsPerTeam = 10
const defaultDurationMinutes = 10
const defaultMinScore = 5
const defaultRaffleCheerWeight = 0.2
const raffleRules = new Set(['all', 'leader', 'top3', 'rank456', 'rank789Cheer', 'rank10Cheer', 'multi', 'big', 'longestCheer', 'cheer'])
const kstOffsetMinutes = 9 * 60
const cheerMessageMaxLength = 5000
const maxStoredCheerMessages = 5000
const defaultTeamPhotoRadius = 18
const quizQuestionMaxLength = 180
const quizAnswerMaxLength = 120
const quizIntroMs = 2400
const quizCountdownMs = 3600
const quizSettlementMs = 3000
const quizClientSubmitSkewLimitMs = quizSettlementMs
const maxStoredQuizAnswers = 1000
const imageShapes = new Set(['circle', 'rounded', 'square', 'wide'])
const imageFrames = new Set(['soft', 'line', 'glow', 'clean'])
const imageFits = new Set(['cover', 'contain'])
const participantCookieName = 'vibe-vote-participant'
const participantCookieMaxAge = 60 * 60 * 24 * 14
const adminCookieName = 'vibe-vote-admin'
const adminCookieMaxAge = 60 * 60 * 8
const teamsConfigPath = path.join(__dirname, 'teams.json')
const teamLogoDir = path.join(__dirname, 'public', 'team-logos')
const defaultCopy = {
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
  wallShowupLabel: '말풍선',
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
  quizStandbySubhead: '',
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
  rafflePrizeImageRank10: '',
  rafflePrizeImageMulti: '',
  rafflePrizeImageBig: '',
  rafflePrizeImageLongestCheer: '',
  rafflePrizeNameFile: '',
  rafflePrizeNameAll: '',
  rafflePrizeNameLeader: '',
  rafflePrizeNameTop3: '',
  rafflePrizeNameRank456: '',
  rafflePrizeNameLowerPack: '',
  rafflePrizeNameRank10: '',
  rafflePrizeNameMulti: '',
  rafflePrizeNameBig: '',
  rafflePrizeNameLongestCheer: '',
  raffleRuleLabelAll: '공개 응원 메시지 참여자',
  raffleRuleLabelLeader: '현재 1위 팀에 별을 준 참여자',
  raffleRuleLabelTop3: '현재 1·2·3위 팀 모두에 별을 준 참여자',
  raffleRuleLabelRank456: '현재 4·5·6위 팀 모두에 별을 준 참여자',
  raffleRuleLabelRank789Cheer: '현재 7·8·9위 팀 모두에게 응원 메시지를 보낸 참여자',
  raffleRuleLabelRank10Cheer: '현재 10위 팀에게 응원 메시지를 보낸 참여자',
  raffleRuleLabelMulti: '5개 이상 팀에 별을 나눠 준 참여자',
  raffleRuleLabelBig: '한 팀에 최대 별을 모두 준 참여자',
  raffleRuleLabelLongestCheer: '가장 긴 응원 메시지를 남긴 참여자',
  raffleStartButtonLabel: '추첨 시작',
  raffleStopButtonLabel: '정지',
  awardHistoryNotice: '당첨 선물은 행사 종료 후 운영진 확인을 거쳐 순차적으로 전달됩니다.',
}

const defaultTeams = [
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
  },
]

const defaultQuizBank = [
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

const rafflePrizeImageKeyByRule = {
  all: 'rafflePrizeImageAll',
  leader: 'rafflePrizeImageLeader',
  top3: 'rafflePrizeImageTop3',
  rank456: 'rafflePrizeImageRank456',
  rank789Cheer: 'rafflePrizeImageLowerPack',
  rank10Cheer: 'rafflePrizeImageRank10',
  multi: 'rafflePrizeImageMulti',
  big: 'rafflePrizeImageBig',
  longestCheer: 'rafflePrizeImageLongestCheer',
  cheer: 'rafflePrizeImageAll',
}

const rafflePrizeNameKeyByRule = {
  all: 'rafflePrizeNameAll',
  leader: 'rafflePrizeNameLeader',
  top3: 'rafflePrizeNameTop3',
  rank456: 'rafflePrizeNameRank456',
  rank789Cheer: 'rafflePrizeNameLowerPack',
  rank10Cheer: 'rafflePrizeNameRank10',
  multi: 'rafflePrizeNameMulti',
  big: 'rafflePrizeNameBig',
  longestCheer: 'rafflePrizeNameLongestCheer',
  cheer: 'rafflePrizeNameAll',
}

const appConfig = loadConfig()
let teams = appConfig.teams
let copy = appConfig.copy
let quizBank = appConfig.quizBank
let configRevision = 1
let configUpdatedAt = Date.now()
let validTeamIds = new Set(teams.map((team) => team.id))
const participants = new Map()
const cheers = []
const voteEvents = []
const awardHistory = []
const clients = new Map()
const emptyQuizState = {
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
}

let closed = false
let closesAt = Date.now() + defaultDurationMinutes * 60 * 1000
let lastRaffle = null
let raffleStage = {
  active: false,
  rule: 'all',
  drawing: false,
  updatedAt: Date.now(),
}
let cheerId = 1
let voteEventId = 1
let quizAnswerId = 1
let sessionId = 1
let testMode = false
let quiz = { ...emptyQuizState }
let quizAnswerKeys = []
let quizSettlementTimer = null
let settings = {
  showScoresToAudience: true,
  starBudget: defaultStarBudget,
  maxStarsPerTeam: defaultMaxStarsPerTeam,
  durationMinutes: defaultDurationMinutes,
  timerMode: 'duration',
  targetTime: '',
  minScore: defaultMinScore,
  raffleCheerWeight: defaultRaffleCheerWeight,
  cheerNameMode: 'masked',
  themeMode: 'stage',
}

function loadConfig() {
  try {
    const parsed = JSON.parse(readFileSync(teamsConfigPath, 'utf8'))
    const teamSource = Array.isArray(parsed) ? parsed : parsed?.teams
    const teams = Array.isArray(teamSource) && teamSource.length
      ? teamSource.map((team, index) => normalizeTeam(team, defaultTeams[index] || defaultTeams[0], index))
      : defaultTeams.map(normalizeTeam)

    return {
      teams,
      copy: normalizeCopy(Array.isArray(parsed) ? {} : parsed?.copy),
      quizBank: normalizeQuizBank(Array.isArray(parsed) ? undefined : parsed?.quizzes),
    }
  } catch (error) {
    console.warn(`teams.json을 읽지 못해 기본 팀 정보를 사용합니다: ${error.message}`)
    return {
      teams: defaultTeams.map((team, index) => normalizeTeam(team, team, index)),
      copy: defaultCopy,
      quizBank: defaultQuizBank.map((quiz, index) => normalizeQuizConfig(quiz, quiz, index)),
    }
  }
}

function normalizeCopy(input) {
  const next = { ...defaultCopy }

  for (const key of Object.keys(defaultCopy)) {
    if (typeof input?.[key] === 'string') {
      next[key] = isImageCopyKey(key)
        ? sanitizeLogoPath(input[key])
        : sanitizeText(input[key], 240)
    }
  }

  return next
}

function normalizeTeam(team, fallback = defaultTeams[0], index = 0) {
  const validLogos = new Set(['orbit', 'beam', 'grid', 'wave', 'core'])
  const hasLogoFile = Object.prototype.hasOwnProperty.call(team || {}, 'logoFile')
  const members = Array.isArray(team?.members)
    ? team.members.map((member) => sanitizeText(member, 80)).filter(Boolean).slice(0, 3)
    : fallback.members || []
  const logo = validLogos.has(team?.logo) ? team.logo : fallback.logo || 'orbit'

  return {
    id: sanitizeSlug(team?.id) || fallback.id || `team-${index + 1}`,
    code: sanitizeText(team?.code, 8) || fallback.code || `${index + 1}`,
    editKey: sanitizeSlug(team?.editKey) || sanitizeSlug(fallback.editKey) || '',
    name: sanitizeText(team?.name, 32) || fallback.name || `Team ${index + 1}`,
    title: sanitizeText(team?.title, 64) || fallback.title || '프로젝트명 미정',
    members,
    logoFile: sanitizeLogoPath(hasLogoFile ? team?.logoFile : fallback.logoFile || ''),
    logoShape: sanitizeImageShape(team?.logoShape, fallback.logoShape || 'rounded'),
    logoFrame: sanitizeImageFrame(team?.logoFrame, fallback.logoFrame || 'line'),
    logoFit: sanitizeImageFit(team?.logoFit, fallback.logoFit || 'cover'),
    logoSize: clampNumber(team?.logoSize ?? fallback.logoSize ?? 48, 36, 88, 48),
    logoWidth: clampNumber(team?.logoWidth ?? fallback.logoWidth ?? 48, 36, 180, 48),
    logoHeight: clampNumber(team?.logoHeight ?? fallback.logoHeight ?? 48, 32, 132, 48),
    logoZoom: clampNumber(team?.logoZoom ?? fallback.logoZoom ?? 1, 1, 2.4, 1),
    logoFocusX: clampNumber(team?.logoFocusX ?? fallback.logoFocusX ?? 50, 0, 100, 50),
    logoFocusY: clampNumber(team?.logoFocusY ?? fallback.logoFocusY ?? 50, 0, 100, 50),
    photoFit: sanitizeImageFit(team?.photoFit, fallback.photoFit || 'cover'),
    photoShape: sanitizeImageShape(team?.photoShape, fallback.photoShape || 'wide'),
    photoFrame: sanitizeImageFrame(team?.photoFrame, fallback.photoFrame || fallback.logoFrame || 'line'),
    photoWidth: clampNumber(team?.photoWidth ?? fallback.photoWidth ?? 560, 180, 820, 560),
    photoHeight: clampNumber(team?.photoHeight ?? fallback.photoHeight ?? 300, 150, 460, 300),
    photoRadius: clampNumber(team?.photoRadius ?? fallback.photoRadius ?? defaultTeamPhotoRadius, 0, 160, defaultTeamPhotoRadius),
    photoZoom: clampNumber(team?.photoZoom ?? fallback.photoZoom ?? 1, 1, 2.4, 1),
    photoFocusX: clampNumber(team?.photoFocusX ?? fallback.photoFocusX ?? 50, 0, 100, 50),
    photoFocusY: clampNumber(team?.photoFocusY ?? fallback.photoFocusY ?? 50, 0, 100, 50),
    baseStars: Math.max(0, Math.floor(Number(team?.baseStars ?? fallback.baseStars ?? 0))),
    baseVoters: Math.max(0, Math.floor(Number(team?.baseVoters ?? fallback.baseVoters ?? 0))),
    color: sanitizeColor(team?.color) || fallback.color || '#A50034',
    logo,
    sortOrder: Math.max(0, Math.floor(Number(team?.sortOrder ?? index))),
  }
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback))
}

function sanitizeImageShape(value, fallback = 'rounded') {
  return imageShapes.has(value) ? value : fallback
}

function sanitizeImageFrame(value, fallback = 'line') {
  return imageFrames.has(value) ? value : fallback
}

function sanitizeImageFit(value, fallback = 'cover') {
  return imageFits.has(value) ? value : fallback
}

function normalizeQuizBank(input, fallback = defaultQuizBank) {
  const source = Array.isArray(input) && input.length ? input.slice(0, 15) : fallback
  const normalized = source
    .map((quiz, index) => normalizeQuizConfig(quiz, fallback[index] || defaultQuizBank[index] || defaultQuizBank[0], index))
    .filter((quiz) => quiz.question && quiz.answer)

  return normalized.length ? normalized.slice(0, 15) : defaultQuizBank.map((quiz, index) => normalizeQuizConfig(quiz, quiz, index))
}

function normalizeQuizConfig(input, fallback = defaultQuizBank[0], index = 0) {
  const source = input && typeof input === 'object' ? input : {}
  const id = sanitizeSlug(source.id) || sanitizeSlug(fallback.id) || `quiz-${index + 1}`
  const answer = sanitizeText(source.answer ?? fallback.answer, quizAnswerMaxLength)
  const acceptedSource = Array.isArray(source.acceptedAnswers) ? source.acceptedAnswers : fallback.acceptedAnswers
  const acceptedAnswers = [...new Set((acceptedSource || []).map((value) => sanitizeText(value, quizAnswerMaxLength)).filter(Boolean))]

  return {
    id,
    title: sanitizeText(source.title ?? fallback.title, 48) || `퀴즈 ${index + 1}`,
    question: sanitizeText(source.question ?? fallback.question, quizQuestionMaxLength),
    answer,
    acceptedAnswers: acceptedAnswers.slice(0, 8),
    prizeImageFile: sanitizeLogoPath(source.prizeImageFile ?? fallback.prizeImageFile ?? ''),
    winnerCount: Math.max(1, Math.min(10, Math.floor(Number(source.winnerCount ?? fallback.winnerCount ?? 2)))),
    enabled: source.enabled === false ? false : fallback.enabled !== false,
  }
}

function isImageCopyKey(key) {
  return key === 'appLogoFile' || key.startsWith('rafflePrizeImage')
}

function sanitizeSlug(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)
}

function sanitizeLogoPath(value) {
  const pathValue = normalizeLogoSourceValue(String(value || '').trim())
  if (!pathValue) return ''
  if (isRemoteLogoUrl(pathValue)) return pathValue
  if (pathValue.includes('..')) return ''
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon);base64,[a-zA-Z0-9+/=]+$/i.test(pathValue) && pathValue.length < 600_000) {
    return pathValue
  }
  if (!/^\/?[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|svg|ico)$/i.test(pathValue)) return ''
  return pathValue.startsWith('/') ? pathValue : `/${pathValue}`
}

function normalizeLogoSourceValue(value) {
  const trimmed = String(value || '').trim()
  const driveId = extractGoogleDriveFileId(trimmed)
  return driveId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200` : trimmed
}

function extractGoogleDriveFileId(value) {
  if (!value) return ''

  try {
    const url = new URL(value)
    if (!/(\.|^)google\.com$/i.test(url.hostname) && !/(\.|^)googleusercontent\.com$/i.test(url.hostname)) return ''

    const idParam = url.searchParams.get('id')
    if (idParam) return sanitizeDriveFileId(idParam)

    const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/i)
    if (fileMatch?.[1]) return sanitizeDriveFileId(fileMatch[1])

    const shortMatch = url.pathname.match(/\/d\/([^/]+)/i)
    if (shortMatch?.[1]) return sanitizeDriveFileId(shortMatch[1])
  } catch {
    return ''
  }

  return ''
}

function sanitizeDriveFileId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
}

function isRemoteLogoUrl(value) {
  if (String(value || '').length > 2000) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function sanitizeColor(value) {
  const color = String(value || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : ''
}

async function applyTeamConfig(body) {
  const nextTeams = normalizeTeamConfig(body?.teams)
  if (!nextTeams.length) {
    throw new Error('teams array required')
  }

  await saveLogoAssets(body?.logos)
  teams = nextTeams
  copy = normalizeCopy({ ...copy, ...(body?.copy || {}) })
  if (Array.isArray(body?.quizzes) || Array.isArray(body?.quizBank)) {
    quizBank = normalizeQuizBank(body?.quizzes || body?.quizBank, quizBank)
  }
  validTeamIds = new Set(teams.map((team) => team.id))
  cleanupInvalidTeamReferences()
  touchConfig()
  await persistTeamConfig()
}

async function applyTeamSelfConfig(body) {
  const teamId = String(body?.teamId || '').trim()
  const index = teams.findIndex((team) => team.id === teamId)
  if (index < 0) {
    throw new Error('team not found')
  }

  const current = teams[index]
  if (String(body?.teamKey || '') !== getTeamEditKey(current)) {
    throw new Error('team key mismatch')
  }
  const input = body?.team && typeof body.team === 'object' && !Array.isArray(body.team) ? body.team : {}
  const prepared = {
    ...current,
    ...input,
    id: current.id,
    code: current.code,
    baseStars: current.baseStars,
    baseVoters: current.baseVoters,
    sortOrder: current.sortOrder ?? index,
  }

  teams = teams.map((team, teamIndex) => (teamIndex === index ? normalizeTeam(prepared, current, index) : team))
  validTeamIds = new Set(teams.map((team) => team.id))
  touchConfig()
  await persistTeamConfig()
}

function touchConfig() {
  configRevision += 1
  configUpdatedAt = Date.now()
}

function getTeamEditKey(team) {
  if (sanitizeSlug(team.editKey)) return sanitizeSlug(team.editKey)
  return hashIdentity(`${team.id}|${team.code}|vibe-team-edit`)
}

function normalizeTeamConfig(input) {
  const source = Array.isArray(input) ? input.slice(0, 20) : []
  if (!source.length) return []

  return source.map((team, index) => {
    const fallback = teams[index] || defaultTeams[index] || defaultTeams[0]
    const prepared = {
      ...team,
      id: team?.id || `team-${index + 1}`,
      code: team?.code || `T${index + 1}`,
    }

    return normalizeTeam(prepared, fallback, index)
  })
}

async function saveLogoAssets(input) {
  const logos = Array.isArray(input) ? input : []
  if (!logos.length) return

  await mkdir(teamLogoDir, { recursive: true })

  for (const logo of logos.slice(0, 20)) {
    const fileName = sanitizeLogoFileName(logo?.fileName)
    const payload = decodeLogoDataUrl(logo?.dataUrl)
    if (!fileName || !payload) continue

    await writeFile(path.join(teamLogoDir, fileName), payload)
  }
}

function sanitizeLogoFileName(value) {
  const fileName = path.basename(String(value || '')).replace(/[^a-zA-Z0-9._-]/g, '')
  return /\.(png|jpe?g|webp|svg|ico)$/i.test(fileName) ? fileName.slice(0, 80) : ''
}

function decodeLogoDataUrl(value) {
  const match = String(value || '').match(/^data:image\/(?:png|jpeg|jpg|webp|svg\+xml|x-icon);base64,([a-zA-Z0-9+/=]+)$/i)
  if (!match) return null

  const buffer = Buffer.from(match[1], 'base64')
  return buffer.length <= 500_000 ? buffer : null
}

function cleanupInvalidTeamReferences() {
  for (const person of participants.values()) {
    person.allocations = Object.fromEntries(
      Object.entries(person.allocations || {}).filter(([teamId]) => validTeamIds.has(teamId)),
    )
  }

  for (let index = cheers.length - 1; index >= 0; index -= 1) {
    if (!validTeamIds.has(cheers[index].teamId)) cheers.splice(index, 1)
  }

  for (let index = voteEvents.length - 1; index >= 0; index -= 1) {
    if (!validTeamIds.has(voteEvents[index].teamId)) voteEvents.splice(index, 1)
  }
}

async function persistTeamConfig() {
  const payload = {
    copy,
    quizzes: quizBank.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      question: quiz.question,
      answer: quiz.answer,
      acceptedAnswers: quiz.acceptedAnswers,
      prizeImageFile: quiz.prizeImageFile,
      winnerCount: quiz.winnerCount,
      enabled: quiz.enabled,
    })),
    teams: teams
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((team, index) => ({
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
        sortOrder: team.sortOrder ?? index,
      })),
  }

  await writeFile(teamsConfigPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function getRuntimeSettings(source = settings) {
  return {
    ...source,
    starBudget: clamp(Math.floor(Number(source.starBudget) || defaultStarBudget), 1, 20),
    maxStarsPerTeam: clamp(
      Math.floor(Number(source.maxStarsPerTeam) || defaultMaxStarsPerTeam),
      1,
      maxConfigurableStarsPerTeam,
    ),
    durationMinutes: normalizeDurationMinutes(source.durationMinutes, defaultDurationMinutes),
    timerMode: normalizeTimerMode(source.timerMode, 'duration'),
    targetTime: normalizeTargetTime(source.targetTime),
    minScore: clamp(Number(source.minScore ?? defaultMinScore), 0, 9.9),
    raffleCheerWeight: clamp(Number(source.raffleCheerWeight ?? defaultRaffleCheerWeight), 0, 1),
    cheerNameMode: normalizeCheerNameMode(source.cheerNameMode, 'masked'),
    themeMode: normalizeThemeMode(source.themeMode, 'stage'),
  }
}

function getState(options = {}) {
  const serverTime = Date.now()

  if (!closed && serverTime > closesAt) {
    closed = true
  }

  const cheerCountsByParticipant = new Map()
  for (const message of cheers) {
    if (!message.participantId) continue

    const current = cheerCountsByParticipant.get(message.participantId) || { visible: 0, hidden: 0, total: 0 }
    if (message.hidden) current.hidden += 1
    else current.visible += 1
    current.total += 1
    cheerCountsByParticipant.set(message.participantId, current)
  }

  const participantList = [...participants.values()].map((person) => {
    const counts = cheerCountsByParticipant.get(person.id) || { visible: 0, hidden: 0, total: 0 }

    return {
      ...person,
      cheered: counts.visible > 0,
      cheerSubmitted: Boolean(person.cheerSubmitted || counts.total),
      visibleCheerCount: counts.visible,
      hiddenCheerCount: counts.hidden,
    }
  })
  const dynamicStarsByTeam = new Map()
  const dynamicVotersByTeam = new Map()
  for (const person of participantList) {
    for (const [teamId, stars] of Object.entries(person.allocations || {})) {
      const value = Number(stars) || 0
      if (value <= 0) continue

      dynamicStarsByTeam.set(teamId, (dynamicStarsByTeam.get(teamId) || 0) + value)
      dynamicVotersByTeam.set(teamId, (dynamicVotersByTeam.get(teamId) || 0) + 1)
    }
  }
  const teamStats = teams
    .map((team) => {
      const baselineStars = testMode ? team.baseStars : 0
      const baselineVoters = testMode ? team.baseVoters : 0
      const dynamicStars = dynamicStarsByTeam.get(team.id) || 0
      const dynamicVoters = dynamicVotersByTeam.get(team.id) || 0
      return {
        ...team,
        totalStars: baselineStars + dynamicStars,
        voters: baselineVoters + dynamicVoters,
        rank: 0,
        share: 0,
      }
    })
    .sort((a, b) => b.totalStars - a.totalStars)

  const starTotals = teamStats.map((team) => team.totalStars)
  const maxStars = Math.max(...starTotals, 0)
  const minStars = starTotals.length ? Math.min(...starTotals) : 0
  const rankedTeams = teamStats.map((team, index) => ({
    ...team,
    rank: index + 1,
    score: calculateLinearScore(team.totalStars, minStars, maxStars, settings.minScore),
    share: maxStars > 0 ? Math.max(8, Math.round((team.totalStars / maxStars) * 100)) : 0,
  }))

  const state = {
    teams: rankedTeams,
    participants: participantList,
    cheers: cheers.slice(0, 120),
    voteEvents: voteEvents.slice(0, 100),
    awardHistory: awardHistory.slice(0, 200),
    closed,
    closesAt,
    lastRaffle,
    raffleStage,
    quiz: sanitizeQuizState(),
    quizBank,
    serverTime,
    sessionId,
    testMode,
    settings: getRuntimeSettings(),
    copy,
    configRevision,
    configUpdatedAt,
  }

  const mediaState = options.slimMedia ? slimStateMedia(state) : state
  return shapeStateForRole(mediaState, options)
}

function shapeStateForRole(state, options = {}) {
  if (options.role !== 'vote') return state

  const participantId = String(options.participantId || '')
  const ownParticipants = participantId
    ? state.participants.filter((person) => person.id === participantId || getParticipantDeviceIds(person).includes(participantId))
    : []
  const ownParticipantIds = new Set(ownParticipants.map((person) => person.id))
  const ownAwardHistory = ownParticipantIds.size
    ? state.awardHistory.filter((record) => ownParticipantIds.has(record.participantId))
    : []
  const ownQuizAnswers = ownParticipantIds.size
    ? state.quiz.answers.filter((answer) => ownParticipantIds.has(answer.participantId))
    : []
  const visibleOrOwnCheers = state.cheers.filter((message) => {
    if (!message.hidden) return true
    return ownParticipantIds.has(message.participantId)
  })

  return {
    ...state,
    participants: ownParticipants,
    cheers: visibleOrOwnCheers,
    voteEvents: [],
    awardHistory: ownAwardHistory,
    quiz: {
      ...state.quiz,
      answers: ownQuizAnswers,
    },
  }
}

function slimStateMedia(state) {
  return {
    ...state,
    copy: slimCopyMedia(state.copy),
    teams: state.teams.map((team) => slimTeamMedia(team)),
    quizBank: state.quizBank.map((quiz) => slimQuizConfigMedia(quiz)),
  }
}

function slimCopyMedia(source) {
  const next = { ...source }

  for (const key of Object.keys(next)) {
    if (isImageCopyKey(key) && isLargeInlineImageSource(next[key])) {
      delete next[key]
    }
  }

  return next
}

function slimTeamMedia(team) {
  if (!isLargeInlineImageSource(team.logoFile)) return team
  const { logoFile, ...rest } = team
  return rest
}

function slimQuizConfigMedia(quiz) {
  if (!isLargeInlineImageSource(quiz.prizeImageFile)) return quiz
  const { prizeImageFile, ...rest } = quiz
  return rest
}

function isLargeInlineImageSource(value) {
  return typeof value === 'string' && /^data:image\//i.test(value) && value.length > 4096
}

function normalizeAllocations(input) {
  const normalized = {}
  const runtimeSettings = getRuntimeSettings()
  const perTeamLimit = Math.min(runtimeSettings.starBudget, runtimeSettings.maxStarsPerTeam)
  let remaining = runtimeSettings.starBudget

  for (const [teamId, rawValue] of Object.entries(input || {})) {
    if (!validTeamIds.has(teamId)) continue

    const value = Math.max(0, Math.floor(Number(rawValue) || 0))
    const next = Math.min(value, remaining, perTeamLimit)

    if (next > 0) {
      normalized[teamId] = next
      remaining -= next
    }

    if (remaining <= 0) break
  }

  return normalized
}

function normalizeAllParticipantAllocations() {
  for (const person of participants.values()) {
    person.allocations = normalizeAllocations(person.allocations)
    person.updatedAt = Date.now()
  }
}

function upsertParticipant(deviceId, name, group, department = '') {
  const browserDeviceId = sanitizeIdentifier(deviceId, 96)
  if (!browserDeviceId) return null

  const nextName = sanitizeText(name, 18)
  const nextGroup = sanitizeLetsId(group, 48)
  const nextDepartment = sanitizeText(department, 40)
  if (!nextName || !nextGroup) return null

  const identityKey = getParticipantIdentityKey(browserDeviceId, nextName, nextGroup)
  const nextId = `participant-${hashIdentity(identityKey)}`
  const existing = participants.get(nextId) || findParticipantByNormalizedIdentity(browserDeviceId, nextName, nextGroup)
  const id = existing?.id || nextId
  const person =
    existing ||
    {
      id,
      deviceId: browserDeviceId,
      deviceIds: [browserDeviceId],
      name: nextName,
      group: nextGroup,
      department: nextDepartment,
      allocations: {},
      cheered: false,
      cheerSubmitted: false,
      updatedAt: Date.now(),
    }

  attachParticipantDevice(person, browserDeviceId)
  person.name = nextName
  person.group = nextGroup
  if (nextDepartment || !person.department) {
    person.department = nextDepartment
  }
  person.updatedAt = Date.now()
  participants.set(id, person)
  return person
}

function cleanupParticipantReferences(participantId) {
  const id = sanitizeIdentifier(participantId, 128)
  if (!id) return

  for (let index = cheers.length - 1; index >= 0; index -= 1) {
    if (cheers[index].participantId === id) cheers.splice(index, 1)
  }

  for (let index = voteEvents.length - 1; index >= 0; index -= 1) {
    if (voteEvents[index].participantId === id) voteEvents.splice(index, 1)
  }

  for (let index = awardHistory.length - 1; index >= 0; index -= 1) {
    if (awardHistory[index].participantId === id) awardHistory.splice(index, 1)
  }

  if (quiz.answers.some((answer) => answer.participantId === id) || quiz.winners.some((answer) => answer.participantId === id)) {
    quiz = {
      ...quiz,
      answers: quiz.answers.filter((answer) => answer.participantId !== id),
      winners: quiz.winners.filter((answer) => answer.participantId !== id),
      updatedAt: Date.now(),
    }
  }

  lastRaffle = null
}

function resetParticipant(participantId) {
  const id = sanitizeIdentifier(participantId, 128)
  const person = participants.get(id)
  if (!person) return false

  person.allocations = {}
  person.cheered = false
  person.cheerSubmitted = false
  person.updatedAt = Date.now()
  cleanupParticipantReferences(id)
  return true
}

function deleteParticipant(participantId) {
  const id = sanitizeIdentifier(participantId, 128)
  if (!participants.has(id)) return false

  participants.delete(id)
  cleanupParticipantReferences(id)
  return true
}

function getRaffleCandidates(rule) {
  const state = getState()
  const raffleAwardedParticipantIds = new Set(
    awardHistory
      .filter((record) => record.kind === 'raffle')
      .map((record) => record.participantId)
      .filter(Boolean),
  )
  const leaderId = state.teams[0]?.id
  const topThreeIds = state.teams.slice(0, 3).map((team) => team.id)
  const rank456Ids = state.teams.slice(3, 6).map((team) => team.id)
  const rank789Ids = state.teams.slice(6, 9).map((team) => team.id)
  const rank10Id = state.teams[9]?.id
  const runtimeSettings = getRuntimeSettings()
  const bigThreshold = Math.min(runtimeSettings.starBudget, runtimeSettings.maxStarsPerTeam)
  const cheeredTeamIdsByParticipant = new Map()
  const longestCheerByParticipant = new Map()

  if (rule === 'longestCheer' || rule === 'rank789Cheer' || rule === 'rank10Cheer') {
    for (const message of cheers) {
      if (!message.participantId || message.hidden) continue
      if (rule === 'rank789Cheer' || rule === 'rank10Cheer') {
        const teamIds = cheeredTeamIdsByParticipant.get(message.participantId) || new Set()
        teamIds.add(message.teamId)
        cheeredTeamIdsByParticipant.set(message.participantId, teamIds)
      }
      if (rule === 'longestCheer') {
        longestCheerByParticipant.set(
          message.participantId,
          Math.max(longestCheerByParticipant.get(message.participantId) || 0, message.text.trim().length),
        )
      }
    }
  }

  const longestCheerLength = rule === 'longestCheer' ? Math.max(0, ...longestCheerByParticipant.values()) : 0

  return state.participants.filter((person) => {
    if (raffleAwardedParticipantIds.has(person.id)) return false
    const spent = sumStars(person.allocations)
    if (spent <= 0) return false
    if (!person.cheered) return false
    const allocationValues = Object.values(person.allocations || {}).filter((value) => value > 0)

    if (rule === 'leader') return Boolean(person.allocations[leaderId])
    if (rule === 'top3') return topThreeIds.every((teamId) => Boolean(person.allocations[teamId]))
    if (rule === 'rank456') return rank456Ids.length === 3 && rank456Ids.every((teamId) => Boolean(person.allocations[teamId]))
    if (rule === 'rank789Cheer') return rank789Ids.length === 3 && rank789Ids.every((teamId) => cheeredTeamIdsByParticipant.get(person.id)?.has(teamId))
    if (rule === 'rank10Cheer') return Boolean(rank10Id && cheeredTeamIdsByParticipant.get(person.id)?.has(rank10Id))
    if (rule === 'multi') return allocationValues.length >= 5
    if (rule === 'big') return allocationValues.some((value) => value >= bigThreshold)
    if (rule === 'longestCheer') return longestCheerLength > 0 && (longestCheerByParticipant.get(person.id) || 0) === longestCheerLength
    if (rule === 'cheer') return person.cheered
    return true
  })
}

function getRaffleSupportDetails(person) {
  const state = getState()
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))

  return Object.entries(person.allocations || {})
    .filter(([, stars]) => Number(stars) > 0)
    .map(([teamId, stars]) => {
      const team = teamMap.get(teamId)
      return {
        teamId,
        teamName: team?.name || teamId,
        stars: Number(stars),
        rank: team?.rank,
      }
    })
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
}

function getRaffleCheerDetails(person) {
  const state = getState()
  const teamMap = new Map(state.teams.map((team) => [team.id, team]))

  return cheers
    .filter((message) => message.participantId === person.id && !message.hidden)
    .map((message) => {
      const team = teamMap.get(message.teamId)
      return {
        teamId: message.teamId,
        teamName: team?.name || message.teamId,
        text: message.text,
        createdAt: message.createdAt,
      }
    })
    .sort((a, b) => a.createdAt - b.createdAt)
}

function addAwardRecord(record) {
  awardHistory.unshift(record)
  awardHistory.splice(200)
}

function getRafflePrizeImage(rule) {
  const imageKey = rafflePrizeImageKeyByRule[rule] || 'rafflePrizeImageFile'
  return copy[imageKey] || copy.rafflePrizeImageFile || ''
}

function getRafflePrizeName(rule) {
  const nameKey = rafflePrizeNameKeyByRule[rule] || 'rafflePrizeNameFile'
  return copy[nameKey] || copy.rafflePrizeNameFile || '행운권 상품'
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickWeightedRaffleWinners(candidates, winnerCount) {
  const pool = shuffle(candidates)
  const weights = buildRaffleCandidateWeights(pool)
  const winners = []

  while (pool.length && winners.length < winnerCount) {
    const totalWeight = pool.reduce((sum, person) => sum + (weights.get(person.id) ?? 1), 0)
    let cursor = Math.random() * Math.max(totalWeight, 1)
    let selectedIndex = 0

    for (let index = 0; index < pool.length; index += 1) {
      cursor -= weights.get(pool[index].id) ?? 1
      if (cursor <= 0) {
        selectedIndex = index
        break
      }
    }

    winners.push(...pool.splice(selectedIndex, 1))
  }

  return winners
}

function buildRaffleCandidateWeights(candidates) {
  const cheerWeight = clamp(Number(settings.raffleCheerWeight ?? defaultRaffleCheerWeight), 0, 1)
  if (cheerWeight <= 0) return new Map(candidates.map((person) => [person.id, 1]))

  const cheerStats = new Map()
  cheers.forEach((message) => {
    if (message.hidden) return
    const current = cheerStats.get(message.participantId) ?? { count: 0, chars: 0 }
    current.count += 1
    current.chars += Array.from(String(message.text ?? '')).length
    cheerStats.set(message.participantId, current)
  })

  return new Map(
    candidates.map((person) => {
      const stats = cheerStats.get(person.id) ?? { count: 0, chars: 0 }
      const countBoost = Math.sqrt(stats.count)
      const textBoost = Math.sqrt(Math.min(stats.chars, 3000) / 100)
      const combinedBoost = Math.min(4, (countBoost + textBoost) / 2)
      return [person.id, 1 + combinedBoost * cheerWeight]
    }),
  )
}

function sumStars(allocations) {
  return Object.values(allocations || {}).reduce((sum, value) => sum + value, 0)
}

function sanitizeQuizState() {
  advanceQuizPhase()

  return {
    ...quiz,
    answers: quiz.answers.slice(0, 80),
    winners: quiz.winners.slice(0, quiz.winnerCount),
  }
}

function advanceQuizPhase(now = Date.now()) {
  if (quiz.mode === 'countdown' && quiz.opensAt > 0 && now >= quiz.opensAt) {
    quiz = {
      ...quiz,
      mode: 'open',
      updatedAt: now,
    }
  }
  if (quiz.mode === 'settling' && quiz.settlementDeadlineAt > 0 && now >= quiz.settlementDeadlineAt) {
    finalizeQuizSettlement(now)
  }
}

function clearQuizSettlementTimer() {
  if (!quizSettlementTimer) return

  clearTimeout(quizSettlementTimer)
  quizSettlementTimer = null
}

function scheduleQuizSettlement() {
  clearQuizSettlementTimer()
  if (quiz.mode !== 'settling' || !quiz.settlementDeadlineAt) return

  const delay = Math.max(0, quiz.settlementDeadlineAt - Date.now())
  quizSettlementTimer = setTimeout(() => {
    quizSettlementTimer = null
    if (!finalizeQuizSettlement(Date.now())) return
    broadcast({ audience: true })
  }, delay)
}

function finalizeQuizSettlement(now = Date.now()) {
  if (quiz.mode !== 'settling') return false

  const rankedWinners = quiz.answers
    .filter((answer) => answer.correct)
    .sort(compareQuizAnswerPriority)
    .slice(0, quiz.winnerCount)
    .map((answer, index) => ({ ...answer, rank: index + 1 }))
  const winnerRankById = new Map(rankedWinners.map((answer) => [answer.id, answer.rank]))

  quiz = {
    ...quiz,
    mode: 'open',
    answers: quiz.answers.map((answer) => ({
      ...answer,
      rank: winnerRankById.get(answer.id),
    })),
    winners: rankedWinners,
    settlementStartedAt: 0,
    settlementDeadlineAt: 0,
    updatedAt: now,
  }

  for (const winner of rankedWinners) {
    addAwardRecord({
      id: `quiz-${winner.quizId}-${winner.id}-${winner.participantId}`,
      participantId: winner.participantId,
      participantName: winner.author,
      participantGroup: winner.group,
      participantDepartment: winner.department || '',
      kind: 'quiz',
      rank: winner.rank,
      quizId: winner.quizId,
      question: quiz.question,
      prizeImageFile: quiz.prizeImageFile,
      prizeName: '퀴즈 상품',
      createdAt: quiz.updatedAt,
    })
  }

  return true
}

function compareQuizAnswerPriority(left, right) {
  return (
    (left.estimatedSubmittedAt || left.serverReceivedAt || left.createdAt) -
      (right.estimatedSubmittedAt || right.serverReceivedAt || right.createdAt) ||
    (left.serverReceivedAt || left.createdAt) - (right.serverReceivedAt || right.createdAt) ||
    left.id - right.id
  )
}

function prepareQuiz() {
  advanceQuizPhase()
  if (quiz.mode !== 'idle') return

  clearQuizSettlementTimer()
  const now = Date.now()
  quiz = {
    ...emptyQuizState,
    mode: 'standby',
    createdAt: now,
    updatedAt: now,
  }
  quizAnswerKeys = []
  quizAnswerId = 1
}

function resetQuizTo(mode) {
  clearQuizSettlementTimer()
  const now = Date.now()
  quiz = {
    ...emptyQuizState,
    id: quiz.id,
    round: quiz.round,
    mode,
    createdAt: mode === 'standby' ? now : 0,
    updatedAt: now,
  }
  quizAnswerKeys = []
  quizAnswerId = 1
}

function openQuiz(body) {
  clearQuizSettlementTimer()
  const selectedQuizId = sanitizeSlug(body.quizId)
  const selectedQuiz = selectedQuizId ? quizBank.find((item) => item.id === selectedQuizId && item.enabled !== false) : null
  const question = sanitizeText(body.question ?? selectedQuiz?.question, quizQuestionMaxLength)
  const answer = sanitizeText(body.answer ?? selectedQuiz?.answer, quizAnswerMaxLength)
  const acceptedAnswers = Array.isArray(body.acceptedAnswers)
    ? body.acceptedAnswers.map((value) => sanitizeText(value, quizAnswerMaxLength)).filter(Boolean)
    : selectedQuiz?.acceptedAnswers || []
  const prizeImageFile = sanitizeLogoPath(body.prizeImageFile ?? selectedQuiz?.prizeImageFile ?? '')
  const winnerCount = Math.max(1, Math.min(10, Math.floor(Number(body.winnerCount ?? selectedQuiz?.winnerCount) || 2)))
  const answerKeys = normalizeQuizAnswerKeys([answer, ...acceptedAnswers].join('\n'))
  const now = Date.now()

  if (!question || !answerKeys.length) return false

  quiz = {
    id: quiz.id + 1,
    round: quiz.round + 1,
    mode: 'countdown',
    selectedQuizId: selectedQuiz?.id || selectedQuizId || '',
    question,
    prizeImageFile,
    winnerCount,
    answers: [],
    winners: [],
    introEndsAt: now + quizIntroMs,
    opensAt: now + quizIntroMs + quizCountdownMs,
    settlementStartedAt: 0,
    settlementDeadlineAt: 0,
    createdAt: now,
    updatedAt: now,
  }
  quizAnswerKeys = answerKeys
  quizAnswerId = 1
  return true
}

function closeQuiz() {
  if (quiz.mode === 'idle' || quiz.mode === 'standby') return
  resetQuizTo('standby')
}

function clearQuiz() {
  resetQuizTo('idle')
}

function submitQuizAnswer(person, textValue, body = {}) {
  const text = sanitizeText(textValue, quizAnswerMaxLength)
  const serverReceivedAt = Date.now()
  advanceQuizPhase(serverReceivedAt)
  if (!person || (quiz.mode !== 'open' && quiz.mode !== 'settling') || !quiz.id || !text) return null
  if (Number(body.quizId) && Number(body.quizId) !== quiz.id) return null
  if (quiz.answers.filter((answer) => answer.participantId === person.id).length >= 5) return null

  const normalized = normalizeQuizAnswer(text)
  const correct = quizAnswerKeys.includes(normalized)
  const estimatedSubmittedAt = estimateQuizSubmittedAt(body, serverReceivedAt)
  const answer = {
    id: quizAnswerId++,
    quizId: quiz.id,
    participantId: person.id,
    author: person.name,
    group: person.group,
    department: person.department || '',
    text,
    correct,
    rank: undefined,
    clientSubmittedAt: Number(body.clientSubmittedAt) || 0,
    clientServerOffsetMs: Number(body.clientServerOffsetMs) || 0,
    estimatedSubmittedAt,
    serverReceivedAt,
    createdAt: serverReceivedAt,
  }

  quiz.answers.unshift(answer)
  quiz.answers.splice(maxStoredQuizAnswers)

  if (correct && quiz.mode === 'open' && quiz.winners.length === 0) {
    quiz = {
      ...quiz,
      mode: 'settling',
      settlementStartedAt: serverReceivedAt,
      settlementDeadlineAt: serverReceivedAt + quizSettlementMs,
    }
    scheduleQuizSettlement()
  }

  quiz = {
    ...quiz,
    updatedAt: Date.now(),
  }

  return answer
}

function estimateQuizSubmittedAt(body, serverReceivedAt) {
  const clientSubmittedAt = Number(body.clientSubmittedAt)
  const clientServerOffsetMs = Number(body.clientServerOffsetMs)
  const rawEstimate =
    Number.isFinite(clientSubmittedAt) && clientSubmittedAt > 0 && Number.isFinite(clientServerOffsetMs)
      ? clientSubmittedAt + clientServerOffsetMs
      : serverReceivedAt
  const minSubmittedAt = Math.max(quiz.opensAt || quiz.createdAt || serverReceivedAt, serverReceivedAt - quizClientSubmitSkewLimitMs)
  return clamp(rawEstimate, minSubmittedAt, serverReceivedAt)
}

function getQuizAnswerRejectionReason(person, textValue, body = {}) {
  const text = sanitizeText(textValue, quizAnswerMaxLength)
  advanceQuizPhase()

  if (!person) return '참가자 등록이 필요합니다.'
  if (!text) return '답변을 입력해주세요.'
  if (!quiz.id || quiz.mode === 'idle' || quiz.mode === 'standby') return '퀴즈가 아직 출제되지 않았습니다.'
  if (quiz.mode === 'countdown') return '문제가 공개되면 답변을 제출해주세요.'
  if (Number(body.quizId) && Number(body.quizId) !== quiz.id) return '이미 다른 문제가 진행 중입니다.'
  if (quiz.mode !== 'open' && quiz.mode !== 'settling') return '정답자 선정이 마감되었습니다.'
  if (quiz.answers.filter((answer) => answer.participantId === person.id).length >= 5) {
    return '이 문제는 최대 5번까지만 제출할 수 있습니다.'
  }

  return '답변을 접수하지 못했습니다.'
}

function normalizeQuizAnswerKeys(value) {
  return String(value || '')
    .split(/[,|\n]/)
    .map((item) => normalizeQuizAnswer(item))
    .filter(Boolean)
}

function normalizeQuizAnswer(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/gu, '')
}

function recordVoteEvents(person, previousAllocations, nextAllocations) {
  const teamIds = new Set([...Object.keys(previousAllocations || {}), ...Object.keys(nextAllocations || {})])
  const now = Date.now()

  for (const teamId of teamIds) {
    if (!validTeamIds.has(teamId)) continue

    const previous = previousAllocations?.[teamId] || 0
    const next = nextAllocations?.[teamId] || 0
    const delta = next - previous

    if (delta === 0) continue

    voteEvents.unshift({
      id: voteEventId++,
      participantId: person.id,
      author: person.name,
      teamId,
      delta,
      previous,
      next,
      createdAt: now,
    })
  }

  voteEvents.splice(100)
}

function removeCheersForClearedTeams(person, previousAllocations, nextAllocations) {
  const clearedTeamIds = Object.keys(previousAllocations || {}).filter(
    (teamId) => (previousAllocations[teamId] || 0) > 0 && (nextAllocations[teamId] || 0) <= 0,
  )

  if (!clearedTeamIds.length) return 0

  const cleared = new Set(clearedTeamIds)
  let removed = 0

  for (let index = cheers.length - 1; index >= 0; index -= 1) {
    const message = cheers[index]
    if (message.participantId !== person.id || !cleared.has(message.teamId)) continue

    cheers.splice(index, 1)
    removed += 1
  }

  const hasRemainingMessages = cheers.some((message) => message.participantId === person.id)
  person.cheered = hasRemainingMessages
  person.cheerSubmitted = hasRemainingMessages
  return removed
}

function sanitizeText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function sanitizeIdentifier(value, maxLength) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, maxLength)
}

function sanitizeLetsId(value, maxLength) {
  return String(value || '')
    .split('@')[0]
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLocaleLowerCase('en-US')
    .slice(0, maxLength)
}

function normalizeNameIdentity(value, maxLength) {
  return sanitizeText(value, maxLength).normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase('ko-KR')
}

function normalizeGroupIdentity(value, maxLength) {
  return sanitizeLetsId(value, maxLength)
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/gu, '')
}

function findParticipantByNormalizedIdentity(deviceId, name, group) {
  const browserDeviceId = sanitizeIdentifier(deviceId, 96)
  const normalizedName = normalizeNameIdentity(name, 18)
  const normalizedGroup = normalizeGroupIdentity(group, 48)

  for (const person of participants.values()) {
    const deviceIds = getParticipantDeviceIds(person)
    if (deviceIds.includes(browserDeviceId)) return person
    if (normalizeNameIdentity(person.name, 18) !== normalizedName) continue
    if (normalizeGroupIdentity(person.group, 48) !== normalizedGroup) continue
    return person
  }

  return null
}

function getParticipantIdentityKey(deviceId, name, group) {
  return [
    normalizeNameIdentity(name, 18),
    normalizeGroupIdentity(group, 48),
  ].join('|')
}

function getParticipantDeviceIds(person) {
  const ids = Array.isArray(person.deviceIds) ? person.deviceIds : []
  const legacyId = sanitizeIdentifier(person.deviceId, 96)
  return [...new Set([...ids, legacyId].filter(Boolean))]
}

function attachParticipantDevice(person, deviceId) {
  const browserDeviceId = sanitizeIdentifier(deviceId, 96)
  const deviceIds = getParticipantDeviceIds(person)
  if (browserDeviceId && !deviceIds.includes(browserDeviceId)) deviceIds.push(browserDeviceId)
  person.deviceIds = deviceIds
  person.deviceId = deviceIds[0] || browserDeviceId
}

function hashIdentity(value) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function calculateLinearScore(totalStars, minStars, maxStars, minScore) {
  if (maxStars <= 0) return 0
  if (maxStars === minStars) return 10

  const normalized = (totalStars - minStars) / (maxStars - minStars)
  return Math.round((minScore + normalized * (10 - minScore)) * 10) / 10
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeCheerNameMode(value, fallback = 'masked') {
  return value === 'real' ? 'real' : value === 'masked' ? 'masked' : fallback
}

function normalizeThemeMode(value, fallback = 'light') {
  return value === 'stage' ? 'stage' : value === 'light' ? 'light' : fallback
}

function normalizeTimerMode(value, fallback = 'duration') {
  return value === 'targetTime' ? 'targetTime' : value === 'duration' ? 'duration' : fallback
}

function normalizeTargetTime(value, fallback = '') {
  const text = String(value || '').trim()
  if (!/^\d{2}:\d{2}$/.test(text)) return fallback
  const [hour, minute] = text.split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? text : fallback
}

function normalizeDurationMinutes(value, fallback = defaultDurationMinutes) {
  const minutes = Math.floor(Number(value))
  return Number.isFinite(minutes) && minutes >= 1 ? minutes : fallback
}

function formatKstTime(timestamp) {
  const date = new Date(timestamp + kstOffsetMinutes * 60 * 1000)
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function minutesUntilKstTime(value, now = Date.now()) {
  const target = getNextKstTimestampForTime(value, now)
  return target ? Math.max(1, Math.ceil((target - now) / 60_000)) : defaultDurationMinutes
}

function getNextKstTimestampForTime(value, now = Date.now()) {
  const targetTime = normalizeTargetTime(value, '')
  if (!targetTime) return 0

  const [hour, minute] = targetTime.split(':').map(Number)
  const kstNow = new Date(now + kstOffsetMinutes * 60 * 1000)
  let target =
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), hour, minute, 0, 0) -
    kstOffsetMinutes * 60 * 1000

  if (target <= now) target += 24 * 60 * 60 * 1000
  return target
}

function calculateClosesAt(nextSettings = settings, now = Date.now()) {
  if (nextSettings.timerMode === 'targetTime' && nextSettings.targetTime) {
    return getNextKstTimestampForTime(nextSettings.targetTime, now) || now + nextSettings.durationMinutes * 60 * 1000
  }

  return now + nextSettings.durationMinutes * 60 * 1000
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf('=')
        if (separator < 0) return [item, '']

        return [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))]
      }),
  )
}

function getRequestDeviceId(request, body) {
  const cookies = parseCookies(request.headers.cookie)
  return cookies[participantCookieName] || body.participantId
}

function getAdminSessionStatus(request) {
  return {
    required: Boolean(adminPasscode),
    authenticated: isAdminAuthenticated(request),
  }
}

function isAdminAuthenticated(request) {
  if (!adminPasscode) return true

  const cookies = parseCookies(request.headers.cookie)
  return safeEquals(cookies[adminCookieName] || '', adminSessionToken())
}

function isAdminProtectedPath(pathname) {
  return new Set([
    '/api/cheer/moderate',
    '/api/cheer/bulk',
    '/api/raffle',
    '/api/raffle/stage',
    '/api/quiz/open',
    '/api/quiz/prepare',
    '/api/quiz/close',
    '/api/quiz/clear',
    '/api/close',
    '/api/participant/reset',
    '/api/participant/delete',
    '/api/settings',
    '/api/team-config',
    '/api/reset',
  ]).has(pathname)
}

function isAdminEventRequest(url) {
  return url.searchParams.get('role') === 'admin'
}

function adminSessionToken() {
  return createHash('sha256').update(`vibe-vote-admin:${adminPasscode}`).digest('hex')
}

function adminCookieHeader() {
  return `${adminCookieName}=${encodeURIComponent(adminSessionToken())}; Max-Age=${adminCookieMaxAge}; Path=/; SameSite=Lax; HttpOnly`
}

function clearAdminCookieHeader() {
  return `${adminCookieName}=; Max-Age=0; Path=/; SameSite=Lax; HttpOnly`
}

function safeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left))
  const rightBuffer = Buffer.from(String(right))
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function isCurrentSession(body) {
  return Number(body.sessionId) === sessionId
}

function participantCookieHeader(deviceId) {
  return `${participantCookieName}=${encodeURIComponent(deviceId)}; Max-Age=${participantCookieMaxAge}; Path=/; SameSite=Lax`
}

function resetRuntimeState({ seed = false, keepParticipants = false } = {}) {
  const preservedParticipants = keepParticipants
    ? [...participants.values()].map((person) => ({
        ...person,
        allocations: {},
        cheered: false,
        cheerSubmitted: false,
        updatedAt: Date.now(),
      }))
    : []

  participants.clear()
  for (const person of preservedParticipants) {
    participants.set(person.id, person)
  }
  cheers.splice(0)
  voteEvents.splice(0)
  awardHistory.splice(0)
  cheerId = 1
  voteEventId = 1
  clearQuiz()
  if (!keepParticipants) sessionId += 1
  testMode = Boolean(seed)
  closed = false
  closesAt = calculateClosesAt(settings)
  lastRaffle = null
  raffleStage = {
    active: false,
    rule: 'all',
    drawing: false,
    updatedAt: Date.now(),
  }

  if (seed) {
    seedTestData()
  }
}

function seedTestData() {
  const now = Date.now()
  const samples = [
    {
      id: 'test-minjun',
      name: '민준',
      group: 'test',
      allocations: { 'team-aurora': Math.min(settings.starBudget, 5) },
      messages: ['검색 데모가 바로 써볼 수 있어 보여요', '발표 때 반응 좋을 것 같아요'],
    },
    {
      id: 'test-seoyeon',
      name: '서연',
      group: 'test',
      allocations: { 'team-prism': Math.min(settings.starBudget, 4) },
      messages: ['현장 적용성이 좋아요'],
    },
    {
      id: 'test-yuna',
      name: '유나',
      group: 'test',
      allocations: { 'team-vector': Math.min(settings.starBudget, 5) },
      messages: ['리뷰 요약이 선명해요'],
    },
    {
      id: 'test-hana',
      name: '하나',
      group: 'test',
      allocations: { 'team-lattice': Math.min(settings.starBudget, 3) },
      messages: ['장애 원인 추적 기대됩니다'],
    },
    {
      id: 'test-doyeon',
      name: '도연',
      group: 'test',
      allocations: { 'team-pulse': Math.min(settings.starBudget, 2) },
      messages: ['VOC 엔진 좋습니다'],
    },
  ]

  for (const sample of samples) {
    const person = upsertParticipant(sample.id, sample.name, sample.group)
    if (!person) continue

    const previousAllocations = { ...person.allocations }
    person.allocations = normalizeAllocations(sample.allocations)
    person.cheered = true
    person.cheerSubmitted = true
    recordVoteEvents(person, previousAllocations, person.allocations)

    for (const [index, text] of sample.messages.entries()) {
      cheers.unshift({
        id: cheerId++,
        teamId: Object.keys(person.allocations)[0] || teams[0].id,
        participantId: person.id,
        author: person.name,
        text,
        createdAt: now - (samples.length * 2 - index) * 15_000,
        hidden: false,
      })
    }
  }
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  let body = ''

  for await (const chunk of request) {
    body += chunk
    if (body.length > 8_000_000) {
      throw new Error('request body too large')
    }
  }

  return body ? JSON.parse(body) : {}
}

function decodeTeamConfigPayload(value) {
  const text = String(value || '').trim()
  if (!text) throw new Error('payload required')

  try {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
    const compressed = Buffer.from(base64, 'base64')
    if (compressed.length > 1_000_000) throw new Error('payload too large')

    return JSON.parse(strFromU8(inflateSync(new Uint8Array(compressed))))
  } catch (error) {
    throw new Error(`payload decode failed: ${error.message || 'invalid compressed config'}`, { cause: error })
  }
}

function broadcast({ audience = false, fullMedia = false } = {}) {
  const payloadCache = new Map()
  const getPayload = (client) => {
    const cacheKey = `${client.role}:${client.participantId || ''}:${fullMedia ? 'full' : 'slim'}`
    if (!payloadCache.has(cacheKey)) {
      payloadCache.set(
        cacheKey,
        `event: state\ndata: ${JSON.stringify(getState({ slimMedia: !fullMedia, role: client.role, participantId: client.participantId }))}\n\n`,
      )
    }
    return payloadCache.get(cacheKey)
  }

  for (const [response, client] of clients.entries()) {
    if (client.role === 'vote' && !audience) continue

    try {
      response.write(getPayload(client))
    } catch {
      clients.delete(response)
    }
  }
}

function getRequestParticipantCookie(request) {
  const cookies = parseCookies(request.headers.cookie)
  return cookies[participantCookieName] || ''
}

function getRequestRoleFromHeaders(request, fallback = 'admin') {
  const referer = request.headers.referer || ''
  try {
    const pathname = new URL(referer).pathname
    if (pathname.startsWith('/vote')) return 'vote'
    if (pathname.startsWith('/wall')) return 'wall'
    if (pathname.startsWith('/admin')) return 'admin'
  } catch {
    // Requests without a referer keep the explicit fallback.
  }

  return fallback
}

function getStateForRequest(request, options = {}) {
  const role = options.role || getRequestRoleFromHeaders(request)
  return getState({
    ...options,
    role,
    participantId: options.participantId ?? getRequestParticipantCookie(request),
  })
}

function getEventRole(url) {
  const role = url.searchParams.get('role')
  return role === 'vote' || role === 'wall' || role === 'admin' ? role : 'admin'
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/admin/status') {
    sendJson(response, 200, getAdminSessionStatus(request))
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readJson(request)
    const passcode = String(body.passcode || '').trim()

    if (!adminPasscode) {
      sendJson(response, 200, getAdminSessionStatus(request), { 'Set-Cookie': clearAdminCookieHeader() })
      return
    }

    if (!safeEquals(passcode, adminPasscode)) {
      sendJson(response, 401, { error: 'invalid admin passcode' })
      return
    }

    sendJson(response, 200, { required: true, authenticated: true }, { 'Set-Cookie': adminCookieHeader() })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
    sendJson(response, 200, { required: Boolean(adminPasscode), authenticated: !adminPasscode }, { 'Set-Cookie': clearAdminCookieHeader() })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/state') {
    const role = getEventRole(url)
    sendJson(response, 200, getState({ slimMedia: url.searchParams.get('media') === 'slim', role, participantId: getRequestParticipantCookie(request) }))
    return
  }

  if (request.method === 'GET' && url.pathname === '/events') {
    if (isAdminEventRequest(url) && !isAdminAuthenticated(request)) {
      sendJson(response, 401, { error: 'admin authentication required' })
      return
    }

    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const role = getEventRole(url)
    const participantId = getRequestParticipantCookie(request)
    response.write(`event: state\ndata: ${JSON.stringify(getState({ role, participantId }))}\n\n`)
    clients.set(response, { role, participantId })
    request.on('close', () => clients.delete(response))
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/team-config/apply') {
    if (!isAdminAuthenticated(request)) {
      sendJson(response, 401, { error: 'admin authentication required' })
      return
    }

    try {
      await applyTeamConfig(decodeTeamConfigPayload(url.searchParams.get('payload')))
      broadcast({ audience: true, fullMedia: true })
      sendJson(response, 200, getStateForRequest(request))
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'invalid team config payload' })
    }
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 404, { error: 'not found' })
    return
  }

  if (isAdminProtectedPath(url.pathname) && !isAdminAuthenticated(request)) {
    sendJson(response, 401, { error: 'admin authentication required' })
    return
  }

  const body = await readJson(request)

  if (url.pathname === '/api/vote') {
    if (closed) {
      sendJson(response, 409, { error: 'voting closed' })
      return
    }
    if (!isCurrentSession(body)) {
      sendJson(response, 409, { error: 'session expired' })
      return
    }

    const deviceId = getRequestDeviceId(request, body)
    if (!sanitizeText(body.department, 40)) {
      sendJson(response, 400, { error: 'name, group, and department required' })
      return
    }
    const person = upsertParticipant(deviceId, body.name, body.group, body.department)
    if (!person) {
      sendJson(response, 400, { error: 'name, group, and device required' })
      return
    }

    const previousAllocations = { ...person.allocations }
    const nextAllocations = normalizeAllocations(body.allocations)
    person.allocations = nextAllocations
    recordVoteEvents(person, previousAllocations, nextAllocations)
    removeCheersForClearedTeams(person, previousAllocations, nextAllocations)
    lastRaffle = null
    broadcast()
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }), { 'Set-Cookie': participantCookieHeader(deviceId) })
    return
  }

  if (url.pathname === '/api/cheer') {
    if (closed) {
      sendJson(response, 409, { error: 'voting closed' })
      return
    }
    if (!isCurrentSession(body)) {
      sendJson(response, 409, { error: 'session expired' })
      return
    }

    const deviceId = getRequestDeviceId(request, body)
    if (!sanitizeText(body.department, 40)) {
      sendJson(response, 400, { error: 'name, group, and department required' })
      return
    }
    const person = upsertParticipant(deviceId, body.name, body.group, body.department)
    const teamId = String(body.teamId || '')
    const text = sanitizeText(body.text, cheerMessageMaxLength)

    if (!person || !validTeamIds.has(teamId) || !text) {
      sendJson(response, 400, { error: 'invalid cheer' })
      return
    }
    if ((person.allocations[teamId] || 0) <= 0) {
      sendJson(response, 409, { error: 'star allocation required' })
      return
    }

    person.cheered = true
    person.cheerSubmitted = true
    cheers.unshift({
      id: cheerId++,
      teamId,
      participantId: person.id,
      author: person.name,
      text,
      createdAt: Date.now(),
      hidden: false,
    })
    cheers.splice(maxStoredCheerMessages)
    broadcast()
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }), { 'Set-Cookie': participantCookieHeader(deviceId) })
    return
  }

  if (url.pathname === '/api/cheer/moderate') {
    const messageId = Number(body.messageId)
    const message = cheers.find((item) => item.id === messageId)

    if (!message) {
      sendJson(response, 404, { error: 'message not found' })
      return
    }

    message.hidden = Boolean(body.hidden)
    lastRaffle = null
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/cheer/bulk') {
    const messageIds = new Set((Array.isArray(body.messageIds) ? body.messageIds : []).map((id) => Number(id)).filter(Boolean))
    const action = body.action === 'delete' ? 'delete' : body.action === 'show' ? 'show' : 'hide'

    if (!messageIds.size) {
      sendJson(response, 400, { error: 'messageIds required' })
      return
    }

    if (action === 'delete') {
      for (let index = cheers.length - 1; index >= 0; index -= 1) {
        if (messageIds.has(cheers[index].id)) {
          cheers.splice(index, 1)
        }
      }
    } else {
      for (const message of cheers) {
        if (messageIds.has(message.id)) {
          message.hidden = action === 'hide'
        }
      }
    }

    lastRaffle = null
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/raffle') {
    const rule = raffleRules.has(body.rule) ? body.rule : 'all'
    const winnerCount = 1
    const candidates = getRaffleCandidates(rule)
    const createdAt = Date.now()
    const prizeImageFile = getRafflePrizeImage(rule)
    const prizeName = getRafflePrizeName(rule)
    const winners = pickWeightedRaffleWinners(candidates, winnerCount)
      .slice(0, Math.min(winnerCount, candidates.length))
      .map((person, index) => ({
        id: person.id,
        name: person.name,
        group: person.group,
        department: person.department || '',
        cheered: person.cheered,
        rank: index + 1,
        supportDetails: getRaffleSupportDetails(person),
        cheerDetails: getRaffleCheerDetails(person),
      }))

    lastRaffle = {
      rule,
      winnerCount,
      candidates: candidates.length,
      winners,
      prizeImageFile,
      prizeName,
      createdAt,
    }

    for (const winner of winners) {
      addAwardRecord({
        id: `raffle-${createdAt}-${winner.id}`,
        participantId: winner.id,
        participantName: winner.name,
        participantGroup: winner.group,
        participantDepartment: winner.department || '',
        kind: 'raffle',
        rank: winner.rank,
        rule,
        prizeImageFile,
        prizeName,
        createdAt,
      })
    }

    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/raffle/stage') {
    const active = body.active === undefined ? true : Boolean(body.active)
    const rule = raffleRules.has(body.rule) ? body.rule : raffleStage.rule
    raffleStage = {
      active,
      rule,
      drawing: active ? Boolean(body.drawing) : false,
      updatedAt: Date.now(),
    }
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/quiz/open') {
    if (!openQuiz(body)) {
      sendJson(response, 400, { error: 'quiz question and answer required' })
      return
    }

    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/quiz/prepare') {
    prepareQuiz()
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/quiz/answer') {
    if (!isCurrentSession(body)) {
      sendJson(response, 409, { error: 'session expired' })
      return
    }

    const deviceId = getRequestDeviceId(request, body)
    const person = upsertParticipant(deviceId, body.name, body.group, body.department)
    const answer = submitQuizAnswer(person, body.text, body)

    if (!answer) {
      sendJson(
        response,
        200,
        {
          ...getStateForRequest(request, { slimMedia: true }),
          quizSubmission: {
            accepted: false,
            reason: getQuizAnswerRejectionReason(person, body.text, body),
          },
        },
        { 'Set-Cookie': participantCookieHeader(deviceId) },
      )
      return
    }

    broadcast({ audience: true })
    sendJson(
      response,
      200,
      {
        ...getStateForRequest(request, { slimMedia: true }),
        quizSubmission: {
          accepted: true,
          answerId: answer.id,
          text: answer.text,
          correct: answer.correct,
          rank: answer.rank,
        },
      },
      { 'Set-Cookie': participantCookieHeader(deviceId) },
    )
    return
  }

  if (url.pathname === '/api/quiz/close') {
    closeQuiz()
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/quiz/clear') {
    clearQuiz()
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/close') {
    closed = Boolean(body.closed)
    if (!closed && Date.now() > closesAt) {
      closesAt = calculateClosesAt(settings)
    }
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/register') {
    if (!isCurrentSession(body)) {
      sendJson(response, 409, { error: 'session expired' })
      return
    }

    const deviceId = getRequestDeviceId(request, body)
    if (!sanitizeText(body.department, 40)) {
      sendJson(response, 400, { error: 'name, group, and department required' })
      return
    }
    const person = upsertParticipant(deviceId, body.name, body.group, body.department)
    if (!person) {
      sendJson(response, 400, { error: 'name, group, and department required' })
      return
    }

    broadcast()
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }), { 'Set-Cookie': participantCookieHeader(deviceId) })
    return
  }

  if (url.pathname === '/api/participant/reset') {
    if (!resetParticipant(body.participantId)) {
      sendJson(response, 404, { error: 'participant not found' })
      return
    }

    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/participant/delete') {
    if (!deleteParticipant(body.participantId)) {
      sendJson(response, 404, { error: 'participant not found' })
      return
    }

    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/settings') {
    const nextStarBudget = Math.max(1, Math.min(20, Math.floor(Number(body.starBudget) || settings.starBudget)))
    const nextMaxStarsPerTeam = clamp(
      Math.floor(Number(body.maxStarsPerTeam) || settings.maxStarsPerTeam || defaultMaxStarsPerTeam),
      1,
      maxConfigurableStarsPerTeam,
    )
    const nextMinScore = clamp(Number(body.minScore ?? settings.minScore), 0, 9.9)
    const nextRaffleCheerWeight = clamp(Number(body.raffleCheerWeight ?? settings.raffleCheerWeight ?? defaultRaffleCheerWeight), 0, 1)
    const nextTimerMode = normalizeTimerMode(body.timerMode, settings.timerMode)
    const rawDurationMinutes = normalizeDurationMinutes(body.durationMinutes, settings.durationMinutes)
    const rawTargetTime = normalizeTargetTime(body.targetTime, settings.targetTime)
    const nextTargetTime =
      nextTimerMode === 'duration'
        ? formatKstTime(Date.now() + rawDurationMinutes * 60 * 1000)
        : rawTargetTime || formatKstTime(Date.now() + rawDurationMinutes * 60 * 1000)
    const nextDurationMinutes =
      nextTimerMode === 'targetTime' ? minutesUntilKstTime(nextTargetTime) : rawDurationMinutes

    settings = {
      ...settings,
      showScoresToAudience:
        typeof body.showScoresToAudience === 'boolean' ? Boolean(body.showScoresToAudience) : settings.showScoresToAudience,
      starBudget: nextStarBudget,
      maxStarsPerTeam: nextMaxStarsPerTeam,
      durationMinutes: nextDurationMinutes,
      timerMode: nextTimerMode,
      targetTime: nextTargetTime,
      minScore: nextMinScore,
      raffleCheerWeight: nextRaffleCheerWeight,
      cheerNameMode: normalizeCheerNameMode(body.cheerNameMode, settings.cheerNameMode),
      themeMode: normalizeThemeMode(body.themeMode, settings.themeMode),
    }
    normalizeAllParticipantAllocations()
    closed = false
    closesAt = calculateClosesAt(settings)
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  if (url.pathname === '/api/team-config') {
    try {
      await applyTeamConfig(body)
      broadcast({ audience: true, fullMedia: true })
      sendJson(response, 200, getStateForRequest(request))
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'invalid team config' })
    }
    return
  }

  if (url.pathname === '/api/team-self-config') {
    try {
      await applyTeamSelfConfig(body)
      broadcast({ audience: true, fullMedia: true })
      sendJson(response, 200, getStateForRequest(request))
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'invalid team config' })
    }
    return
  }

  if (url.pathname === '/api/reset') {
    resetRuntimeState({ seed: Boolean(body.seed), keepParticipants: Boolean(body.keepParticipants) && !body.seed })
    broadcast({ audience: true })
    sendJson(response, 200, getStateForRequest(request, { slimMedia: true }))
    return
  }

  sendJson(response, 404, { error: 'not found' })
}

async function serveStatic(request, response, url) {
  const pathname = decodeURIComponent(url.pathname)
  const requestedPath = pathname === '/' ? '/vote' : pathname
  const hasExtension = path.extname(requestedPath).length > 0
  const candidate = hasExtension ? requestedPath : '/index.html'
  const filePath = path.normalize(path.join(distDir, candidate))

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) throw new Error('not a file')

    const content = await readFile(filePath)
    response.writeHead(200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': hasExtension ? 'public, max-age=3600' : 'no-store',
    })
    response.end(content)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
}

function getContentType(filePath) {
  const extension = path.extname(filePath)
  if (extension === '.html') return 'text/html; charset=utf-8'
  if (extension === '.js') return 'text/javascript; charset=utf-8'
  if (extension === '.css') return 'text/css; charset=utf-8'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.png') return 'image/png'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.ico') return 'image/x-icon'
  return 'application/octet-stream'
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  try {
    if (url.pathname.startsWith('/api/') || url.pathname === '/events') {
      await handleApi(request, response, url)
      return
    }

    await serveStatic(request, response, url)
  } catch (error) {
    console.error(error)
    sendJson(response, 500, { error: 'internal server error' })
  }
})

setInterval(() => {
  for (const response of clients.keys()) {
    try {
      response.write(': ping\n\n')
    } catch {
      clients.delete(response)
    }
  }
}, 25_000)

server.listen(port, host, () => {
  console.log(`${copy.appTitle} running at http://${host}:${port}`)
})
