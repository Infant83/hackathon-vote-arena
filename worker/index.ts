import rawConfig from '../teams.json'
import { inflateSync, strFromU8 } from 'fflate'

const defaultStarBudget = 10
const defaultMaxStarsPerTeam = 5
const maxConfigurableStarsPerTeam = 10
const defaultDurationMinutes = 10
const defaultMinScore = 5
const defaultRaffleCheerWeight = 0.2
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
const snapshotKey = 'event-state-v1'
const settingsVersion = 5

type Env = {
  ARENA_ROOM: DurableObjectNamespace
  ASSETS: Fetcher
  ARENA_ROOM_NAME?: string
  ADMIN_PASSCODE?: string
}

type EventClientRole = 'admin' | 'wall' | 'vote'

type LogoKind = 'orbit' | 'beam' | 'grid' | 'wave' | 'core'

type EventCopy = Record<keyof typeof defaultCopy, string>

type TeamConfig = {
  id: string
  code: string
  editKey?: string
  name: string
  title: string
  members: string[]
  logoFile: string
  logoShape: string
  logoFrame: string
  logoFit: string
  logoSize: number
  logoWidth: number
  logoHeight: number
  logoZoom: number
  logoFocusX: number
  logoFocusY: number
  photoFit: string
  photoShape: string
  photoFrame: string
  photoWidth: number
  photoHeight: number
  photoRadius: number
  photoZoom: number
  photoFocusX: number
  photoFocusY: number
  baseStars: number
  baseVoters: number
  color: string
  logo: LogoKind
  sortOrder: number
}

type TeamState = TeamConfig & {
  totalStars: number
  voters: number
  rank: number
  share: number
  score: number
}

type Participant = {
  id: string
  deviceId: string
  deviceIds?: string[]
  name: string
  group: string
  department?: string
  allocations: Record<string, number>
  cheered: boolean
  cheerSubmitted: boolean
  updatedAt: number
}

type ParticipantState = Participant & {
  visibleCheerCount: number
  hiddenCheerCount: number
}

type CheerMessage = {
  id: number
  teamId: string
  participantId: string
  author: string
  text: string
  createdAt: number
  hidden: boolean
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

type RaffleRule = 'all' | 'leader' | 'top3' | 'rank456' | 'rank7to10Three' | 'multi' | 'big' | 'longestCheer' | 'cheer'

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

type LastRaffle = {
  rule: RaffleRule
  winnerCount: number
  candidates: number
  winners: Array<{
    id: string
    name: string
    group: string
    department?: string
    cheered: boolean
    rank?: number
    supportDetails?: RaffleSupportDetail[]
    cheerDetails?: RaffleCheerDetail[]
  }>
  prizeImageFile?: string
  prizeName?: string
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

type Settings = {
  showScoresToAudience: boolean
  starBudget: number
  maxStarsPerTeam: number
  durationMinutes: number
  timerMode: 'duration' | 'targetTime'
  targetTime: string
  minScore: number
  raffleCheerWeight: number
  cheerNameMode: 'masked' | 'real'
  themeMode: 'light' | 'stage'
}

type Snapshot = {
  participants: Participant[]
  cheers: CheerMessage[]
  voteEvents: VoteEvent[]
  closed: boolean
  closesAt: number
  lastRaffle: LastRaffle | null
  awardHistory?: AwardRecord[]
  quiz?: QuizState
  quizAnswerKeys?: string[]
  quizAnswerId?: number
  quizBank?: QuizConfig[]
  cheerId: number
  voteEventId: number
  sessionId: number
  testMode: boolean
  settings: Settings
  teams?: TeamConfig[]
  copy?: EventCopy
  configRevision?: number
  configUpdatedAt?: number
  settingsVersion?: number
}

type RequestBody = Record<string, unknown>

const emptyQuizState: QuizState = {
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
  awardHistoryNotice: '당첨 선물은 행사 종료 후 운영진 확인을 거쳐 현장에서 순차적으로 전달됩니다.',
}

const defaultTeams: TeamConfig[] = [
  {
    id: 'team-aurora',
    code: 'A1',
    name: 'Aurora Lab',
    title: '사내 지식 검색 Copilot',
    members: ['김도윤', '이서진', '박민재'],
    logoFile: '',
    logoShape: 'rounded',
    logoFrame: 'line',
    logoFit: 'cover',
    logoSize: 48,
    logoWidth: 48,
    logoHeight: 48,
    logoZoom: 1,
    logoFocusX: 50,
    logoFocusY: 50,
    photoFit: 'cover',
    photoShape: 'wide',
    photoFrame: 'line',
    photoWidth: 560,
    photoHeight: 300,
    photoRadius: defaultTeamPhotoRadius,
    photoZoom: 1,
    photoFocusX: 50,
    photoFocusY: 50,
    baseStars: 128,
    baseVoters: 46,
    color: '#A50034',
    logo: 'orbit',
    sortOrder: 0,
  },
]

const defaultQuizBank: QuizConfig[] = [
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

const rafflePrizeImageKeyByRule: Record<RaffleRule, keyof EventCopy> = {
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

const rafflePrizeNameKeyByRule: Record<RaffleRule, keyof EventCopy> = {
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

const validLogos = new Set<LogoKind>(['orbit', 'beam', 'grid', 'wave', 'core'])
const initialConfig = loadConfig(rawConfig)
const encoder = new TextEncoder()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const adminPasscode = String(env.ADMIN_PASSCODE || '').trim()

    if (url.pathname === '/api/health') {
      return json({ ok: true, runtime: 'cloudflare-workers' })
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/status') {
      return json({
        required: Boolean(adminPasscode),
        authenticated: await isAdminAuthenticated(request, adminPasscode),
      })
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/login') {
      const body = await readJson(request)
      const passcode = String(body.passcode || '').trim()

      if (!adminPasscode) {
        return json(
          { required: false, authenticated: true },
          200,
          { 'Set-Cookie': clearAdminCookieHeader(url.protocol === 'https:') },
        )
      }

      if (passcode !== adminPasscode) {
        return json({ error: 'invalid admin passcode' }, 401)
      }

      return json(
        { required: true, authenticated: true },
        200,
        { 'Set-Cookie': await adminCookieHeader(adminPasscode, url.protocol === 'https:') },
      )
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
      return json(
        { required: Boolean(adminPasscode), authenticated: !adminPasscode },
        200,
        { 'Set-Cookie': clearAdminCookieHeader(url.protocol === 'https:') },
      )
    }

    if (isAdminProtectedRequest(url, request.method) && !(await isAdminAuthenticated(request, adminPasscode))) {
      return json({ error: 'admin authentication required' }, 401)
    }

    if (url.pathname.startsWith('/api/') || url.pathname === '/events') {
      const roomName = env.ARENA_ROOM_NAME || 'default'
      const roomId = env.ARENA_ROOM.idFromName(roomName)
      return env.ARENA_ROOM.get(roomId).fetch(request)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

export class ArenaRoom {
  private participants = new Map<string, Participant>()
  private cheers: CheerMessage[] = []
  private voteEvents: VoteEvent[] = []
  private awardHistory: AwardRecord[] = []
  private clients = new Map<ReadableStreamDefaultController<Uint8Array>, EventClientRole>()
  private closed = false
  private closesAt = Date.now() + defaultDurationMinutes * 60 * 1000
  private lastRaffle: LastRaffle | null = null
  private quiz: QuizState = { ...emptyQuizState }
  private quizAnswerKeys: string[] = []
  private cheerId = 1
  private voteEventId = 1
  private quizAnswerId = 1
  private sessionId = 1
  private testMode = false
  private settings: Settings = {
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
  private teams: TeamConfig[] = initialConfig.teams
  private copy: EventCopy = initialConfig.copy
  private quizBank: QuizConfig[] = initialConfig.quizBank
  private configRevision = 1
  private configUpdatedAt = Date.now()
  private validTeamIds = new Set(initialConfig.teams.map((team) => team.id))
  private state: DurableObjectState
  private loaded: Promise<void>

  constructor(state: DurableObjectState) {
    this.state = state
    this.loaded = this.load()
  }

  async fetch(request: Request): Promise<Response> {
    await this.loaded

    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/api/state') {
      return json(this.getState())
    }

    if (request.method === 'GET' && url.pathname === '/events') {
      return this.openEventStream(url)
    }

    if (request.method === 'GET' && url.pathname === '/api/team-config/apply') {
      let updated: boolean
      try {
        updated = this.applyTeamConfig(decodeTeamConfigPayload(url.searchParams.get('payload')))
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'invalid team config payload' }, 400)
      }
      if (!updated) return json({ error: 'teams array required' }, 400)

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (request.method !== 'POST') {
      return json({ error: 'not found' }, 404)
    }

    const body = await readJson(request)
    return this.handleMutation(request, url.pathname, body)
  }

  async alarm() {
    await this.loaded
    if (!this.finalizeQuizSettlement(Date.now())) return

    await this.commit({ audience: true })
  }

  private async load() {
    const snapshot = await this.state.storage.get<Snapshot>(snapshotKey)

    if (!snapshot) return

    this.participants = new Map(snapshot.participants.map((person) => [person.id, person]))
    this.cheers = snapshot.cheers || []
    this.voteEvents = snapshot.voteEvents || []
    this.awardHistory = Array.isArray(snapshot.awardHistory) ? snapshot.awardHistory.filter(Boolean).slice(0, 200) : []
    this.closed = Boolean(snapshot.closed)
    this.closesAt = Number(snapshot.closesAt || Date.now() + defaultDurationMinutes * 60 * 1000)
    this.lastRaffle = snapshot.lastRaffle || null
    this.quiz = normalizeQuizState(snapshot.quiz)
    this.quizAnswerKeys = Array.isArray(snapshot.quizAnswerKeys) ? snapshot.quizAnswerKeys.filter(Boolean) : []
    this.quizBank = normalizeQuizBank(snapshot.quizBank, initialConfig.quizBank)
    this.configRevision = Math.max(1, Math.floor(Number(snapshot.configRevision || 1)))
    this.configUpdatedAt = Number(snapshot.configUpdatedAt || Date.now())
    this.cheerId = Math.max(1, Number(snapshot.cheerId || 1))
    this.voteEventId = Math.max(1, Number(snapshot.voteEventId || 1))
    this.quizAnswerId = Math.max(1, Number(snapshot.quizAnswerId || 1))
    this.sessionId = Math.max(1, Number(snapshot.sessionId || 1))
    this.testMode = Boolean(snapshot.testMode)
    this.teams = Array.isArray(snapshot.teams) && snapshot.teams.length
      ? snapshot.teams.map((team, index) => normalizeTeam(team, initialConfig.teams[index] || initialConfig.teams[0], index))
      : initialConfig.teams
    this.copy = normalizeCopy({ ...initialConfig.copy, ...(snapshot.copy || {}) })
    this.validTeamIds = new Set(this.teams.map((team) => team.id))
    const persistedSettingsVersion = Number(snapshot.settingsVersion || 1)
    const persistedStarBudget = Math.floor(Number(snapshot.settings?.starBudget || defaultStarBudget))
    const migratedStarBudget =
      persistedSettingsVersion < settingsVersion && [5, 20].includes(persistedStarBudget) ? defaultStarBudget : persistedStarBudget

    this.settings = {
      showScoresToAudience: Boolean(snapshot.settings?.showScoresToAudience ?? true),
      starBudget: clamp(migratedStarBudget, 1, 20),
      maxStarsPerTeam: clamp(
        Math.floor(Number(snapshot.settings?.maxStarsPerTeam) || defaultMaxStarsPerTeam),
        1,
        maxConfigurableStarsPerTeam,
      ),
      durationMinutes: normalizeDurationMinutes(snapshot.settings?.durationMinutes, defaultDurationMinutes),
      timerMode: normalizeTimerMode(snapshot.settings?.timerMode),
      targetTime: normalizeTargetTime(snapshot.settings?.targetTime),
      minScore: clamp(Number(snapshot.settings?.minScore ?? defaultMinScore), 0, 9.9),
      raffleCheerWeight: clamp(Number(snapshot.settings?.raffleCheerWeight ?? defaultRaffleCheerWeight), 0, 1),
      cheerNameMode: normalizeCheerNameMode(snapshot.settings?.cheerNameMode),
      themeMode: normalizeThemeMode(snapshot.settings?.themeMode),
    }
    if (this.quiz.mode === 'settling') {
      await this.scheduleQuizSettlementAlarm()
    }
  }

  private async persist() {
    const snapshot: Snapshot = {
      participants: [...this.participants.values()],
      cheers: this.cheers,
      voteEvents: this.voteEvents,
      awardHistory: this.awardHistory,
      closed: this.closed,
      closesAt: this.closesAt,
      lastRaffle: this.lastRaffle,
      quiz: this.quiz,
      quizAnswerKeys: this.quizAnswerKeys,
      quizAnswerId: this.quizAnswerId,
      quizBank: this.quizBank,
      cheerId: this.cheerId,
      voteEventId: this.voteEventId,
      sessionId: this.sessionId,
      testMode: this.testMode,
      settings: this.settings,
      teams: this.teams,
      copy: this.copy,
      configRevision: this.configRevision,
      configUpdatedAt: this.configUpdatedAt,
      settingsVersion,
    }

    await this.state.storage.put(snapshotKey, snapshot)
  }

  private async handleMutation(request: Request, pathname: string, body: RequestBody) {
    if (pathname === '/api/vote') {
      if (this.closed) return json({ error: 'voting closed' }, 409)
      if (!this.isCurrentSession(body)) return json({ error: 'session expired' }, 409)

      const deviceId = this.getRequestDeviceId(request, body)
      const person = this.upsertParticipant(deviceId, body.name, body.group, body.department)
      if (!person) return json({ error: 'name, group, and device required' }, 400)

      const previousAllocations = { ...person.allocations }
      const nextAllocations = this.normalizeAllocations(body.allocations)
      person.allocations = nextAllocations
      this.recordVoteEvents(person, previousAllocations, nextAllocations)
      this.removeCheersForClearedTeams(person, previousAllocations, nextAllocations)
      this.lastRaffle = null
      await this.commit()
      return json(this.getState(), 200, { 'Set-Cookie': participantCookieHeader(deviceId) })
    }

    if (pathname === '/api/cheer') {
      if (this.closed) return json({ error: 'voting closed' }, 409)
      if (!this.isCurrentSession(body)) return json({ error: 'session expired' }, 409)

      const deviceId = this.getRequestDeviceId(request, body)
      const person = this.upsertParticipant(deviceId, body.name, body.group, body.department)
      const teamId = String(body.teamId || '')
      const text = sanitizeText(body.text, cheerMessageMaxLength)

      if (!person || !this.validTeamIds.has(teamId) || !text) return json({ error: 'invalid cheer' }, 400)
      if ((person.allocations[teamId] || 0) <= 0) return json({ error: 'star allocation required' }, 409)

      person.cheered = true
      person.cheerSubmitted = true
      this.cheers.unshift({
        id: this.cheerId++,
        teamId,
        participantId: person.id,
        author: person.name,
        text,
        createdAt: Date.now(),
        hidden: false,
      })
      this.cheers.splice(maxStoredCheerMessages)
      await this.commit()
      return json(this.getState(), 200, { 'Set-Cookie': participantCookieHeader(deviceId) })
    }

    if (pathname === '/api/cheer/moderate') {
      const messageId = Number(body.messageId)
      const message = this.cheers.find((item) => item.id === messageId)

      if (!message) return json({ error: 'message not found' }, 404)

      message.hidden = Boolean(body.hidden)
      this.lastRaffle = null
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/cheer/bulk') {
      const messageIds = new Set(
        (Array.isArray(body.messageIds) ? body.messageIds : []).map((id) => Number(id)).filter(Boolean),
      )
      const action = body.action === 'delete' ? 'delete' : body.action === 'show' ? 'show' : 'hide'

      if (!messageIds.size) return json({ error: 'messageIds required' }, 400)

      if (action === 'delete') {
        this.cheers = this.cheers.filter((message) => !messageIds.has(message.id))
      } else {
        for (const message of this.cheers) {
          if (messageIds.has(message.id)) {
            message.hidden = action === 'hide'
          }
        }
      }

      this.lastRaffle = null
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/raffle') {
      const rule = isRaffleRule(body.rule) ? body.rule : 'all'
      const winnerCount = 1
      const candidates = this.getRaffleCandidates(rule)
      const createdAt = Date.now()
      const prizeImageFile = this.getRafflePrizeImage(rule)
      const prizeName = this.getRafflePrizeName(rule)
      const winners = this.pickWeightedRaffleWinners(candidates, winnerCount)
        .slice(0, Math.min(winnerCount, candidates.length))
        .map((person, index) => ({
          id: person.id,
          name: person.name,
          group: person.group,
          department: person.department || '',
          cheered: person.cheered,
          rank: index + 1,
          supportDetails: this.getRaffleSupportDetails(person),
          cheerDetails: this.getRaffleCheerDetails(person),
        }))

      this.lastRaffle = {
        rule,
        winnerCount,
        candidates: candidates.length,
        winners,
        prizeImageFile,
        prizeName,
        createdAt,
      }

      for (const winner of winners) {
        this.addAwardRecord({
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

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/quiz/open') {
      if (!this.openQuiz(body)) return json({ error: 'quiz question and answer required' }, 400)

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/quiz/prepare') {
      this.prepareQuiz()
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/quiz/answer') {
      if (!this.isCurrentSession(body)) return json({ error: 'session expired' }, 409)

      const deviceId = this.getRequestDeviceId(request, body)
      const person = this.upsertParticipant(deviceId, body.name, body.group, body.department)
      const answer = this.submitQuizAnswer(person, body.text, body)

      if (!answer) {
        return json(
          {
            ...this.getState(),
            quizSubmission: {
              accepted: false,
              reason: this.getQuizAnswerRejectionReason(person, body.text, body),
            },
          },
          200,
          { 'Set-Cookie': participantCookieHeader(deviceId) },
        )
      }

      await this.scheduleQuizSettlementAlarm()
      await this.commit({ audience: true })
      return json(
        {
          ...this.getState(),
          quizSubmission: {
            accepted: true,
            answerId: answer.id,
            text: answer.text,
            correct: answer.correct,
            rank: answer.rank,
          },
        },
        200,
        { 'Set-Cookie': participantCookieHeader(deviceId) },
      )
    }

    if (pathname === '/api/quiz/close') {
      this.closeQuiz()
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/quiz/clear') {
      this.clearQuiz()
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/close') {
      this.closed = Boolean(body.closed)
      if (!this.closed && Date.now() > this.closesAt) {
        this.closesAt = calculateClosesAt(this.settings)
      }
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/register') {
      if (!this.isCurrentSession(body)) return json({ error: 'session expired' }, 409)

      const deviceId = this.getRequestDeviceId(request, body)
      if (!sanitizeText(body.department, 40)) return json({ error: 'name, group, and department required' }, 400)
      const person = this.upsertParticipant(deviceId, body.name, body.group, body.department)
      if (!person) return json({ error: 'name, group, and department required' }, 400)

      await this.commit()
      return json(this.getState(), 200, { 'Set-Cookie': participantCookieHeader(deviceId) })
    }

    if (pathname === '/api/participant/reset') {
      if (!this.resetParticipant(body.participantId)) return json({ error: 'participant not found' }, 404)

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/participant/delete') {
      if (!this.deleteParticipant(body.participantId)) return json({ error: 'participant not found' }, 404)

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/settings') {
      const timerSettings = resolveTimerSettings(body, this.settings)
      this.settings = {
        ...this.settings,
        showScoresToAudience:
          typeof body.showScoresToAudience === 'boolean'
            ? Boolean(body.showScoresToAudience)
            : this.settings.showScoresToAudience,
        starBudget: clamp(Math.floor(Number(body.starBudget) || this.settings.starBudget), 1, 20),
        maxStarsPerTeam: clamp(
          Math.floor(Number(body.maxStarsPerTeam) || this.settings.maxStarsPerTeam || defaultMaxStarsPerTeam),
          1,
          maxConfigurableStarsPerTeam,
        ),
        durationMinutes: timerSettings.durationMinutes,
        timerMode: timerSettings.timerMode,
        targetTime: timerSettings.targetTime,
        minScore: clamp(Number(body.minScore ?? this.settings.minScore), 0, 9.9),
        raffleCheerWeight: clamp(Number(body.raffleCheerWeight ?? this.settings.raffleCheerWeight ?? defaultRaffleCheerWeight), 0, 1),
        cheerNameMode: normalizeCheerNameMode(body.cheerNameMode, this.settings.cheerNameMode),
        themeMode: normalizeThemeMode(body.themeMode, this.settings.themeMode),
      }
      this.normalizeAllParticipantAllocations()
      this.closesAt = calculateClosesAt(this.settings)
      this.closed = false
      this.lastRaffle = null
      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/team-config') {
      const updated = this.applyTeamConfig(body)
      if (!updated) return json({ error: 'teams array required' }, 400)

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/team-self-config') {
      const updated = this.applyTeamSelfConfig(body)
      if (!updated) return json({ error: 'team not found' }, 400)

      await this.commit({ audience: true })
      return json(this.getState())
    }

    if (pathname === '/api/reset') {
      await this.resetRuntimeState({ seed: Boolean(body.seed), keepParticipants: Boolean(body.keepParticipants) && !body.seed })
      await this.commit({ audience: true })
      return json(this.getState())
    }

    return json({ error: 'not found' }, 404)
  }

  private getState() {
    const serverTime = Date.now()

    if (!this.closed && serverTime > this.closesAt) {
      this.closed = true
    }

    const cheerCountsByParticipant = new Map<string, { visible: number; hidden: number; total: number }>()
    for (const message of this.cheers) {
      if (!message.participantId) continue

      const current = cheerCountsByParticipant.get(message.participantId) || { visible: 0, hidden: 0, total: 0 }
      if (message.hidden) current.hidden += 1
      else current.visible += 1
      current.total += 1
      cheerCountsByParticipant.set(message.participantId, current)
    }

    const participantList = [...this.participants.values()].map((person) => {
      const counts = cheerCountsByParticipant.get(person.id) || { visible: 0, hidden: 0, total: 0 }

      return {
        ...person,
        cheered: counts.visible > 0,
        cheerSubmitted: Boolean(person.cheerSubmitted || counts.total),
        visibleCheerCount: counts.visible,
        hiddenCheerCount: counts.hidden,
      }
    })
    const dynamicStarsByTeam = new Map<string, number>()
    const dynamicVotersByTeam = new Map<string, number>()
    for (const person of participantList) {
      for (const [teamId, stars] of Object.entries(person.allocations || {})) {
        const value = Number(stars) || 0
        if (value <= 0) continue

        dynamicStarsByTeam.set(teamId, (dynamicStarsByTeam.get(teamId) || 0) + value)
        dynamicVotersByTeam.set(teamId, (dynamicVotersByTeam.get(teamId) || 0) + 1)
      }
    }

    const teamStats = this.teams
      .map((team) => {
        const baselineStars = this.testMode ? team.baseStars : 0
        const baselineVoters = this.testMode ? team.baseVoters : 0
        const dynamicStars = dynamicStarsByTeam.get(team.id) || 0
        const dynamicVoters = dynamicVotersByTeam.get(team.id) || 0

        return {
          ...team,
          totalStars: baselineStars + dynamicStars,
          voters: baselineVoters + dynamicVoters,
          rank: 0,
          share: 0,
          score: 0,
        }
      })
      .sort((a, b) => b.totalStars - a.totalStars)

    const starTotals = teamStats.map((team) => team.totalStars)
    const maxStars = Math.max(...starTotals, 0)
    const minStars = starTotals.length ? Math.min(...starTotals) : 0
    const rankedTeams: TeamState[] = teamStats.map((team, index) => ({
      ...team,
      rank: index + 1,
      score: calculateLinearScore(team.totalStars, minStars, maxStars, this.settings.minScore),
      share: maxStars > 0 ? Math.max(8, Math.round((team.totalStars / maxStars) * 100)) : 0,
    }))

    return {
      teams: rankedTeams,
      participants: participantList,
      cheers: this.cheers.slice(0, 120),
      voteEvents: this.voteEvents.slice(0, 100),
      awardHistory: this.awardHistory.slice(0, 200),
      closed: this.closed,
      closesAt: this.closesAt,
      lastRaffle: this.lastRaffle,
      quiz: this.sanitizeQuizState(),
      quizBank: this.quizBank,
      serverTime,
      sessionId: this.sessionId,
      testMode: this.testMode,
      settings: this.getRuntimeSettings(),
      copy: this.copy,
      configRevision: this.configRevision,
      configUpdatedAt: this.configUpdatedAt,
    }
  }

  private getRuntimeSettings(source: Settings = this.settings): Settings {
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

  private applyTeamConfig(body: RequestBody) {
    const sourceTeams = Array.isArray(body.teams) ? body.teams.slice(0, 20) : []
    if (!sourceTeams.length) return false

    const logos = Array.isArray(body.logos) ? body.logos : []

    this.teams = sourceTeams.map((teamValue, index) => {
      const team = teamValue && typeof teamValue === 'object' ? { ...(teamValue as Record<string, unknown>) } : {}
      const logoDataUrl = resolveLogoDataUrl(team, index, logos)
      if (logoDataUrl) {
        team.logoFile = logoDataUrl
      }

      return normalizeTeam(team, this.teams[index] || initialConfig.teams[index] || initialConfig.teams[0], index)
    })
    this.copy = normalizeCopy({ ...this.copy, ...normalizeObject(body.copy) })
    if (Array.isArray(body.quizzes) || Array.isArray(body.quizBank)) {
      this.quizBank = normalizeQuizBank(body.quizzes || body.quizBank, this.quizBank)
    }
    this.validTeamIds = new Set(this.teams.map((team) => team.id))
    this.cleanupInvalidTeamReferences()
    this.touchConfig()
    return true
  }

  private applyTeamSelfConfig(body: RequestBody) {
    const teamId = String(body.teamId || '').trim()
    const index = this.teams.findIndex((team) => team.id === teamId)
    if (index < 0) return false

    const current = this.teams[index]
    if (String(body.teamKey || '') !== getTeamEditKey(current)) return false
    const input = normalizeObject(body.team)
    const prepared = {
      ...current,
      ...input,
      id: current.id,
      code: current.code,
      baseStars: current.baseStars,
      baseVoters: current.baseVoters,
      sortOrder: current.sortOrder ?? index,
    }

    this.teams = this.teams.map((team, teamIndex) => (teamIndex === index ? normalizeTeam(prepared, current, index) : team))
    this.validTeamIds = new Set(this.teams.map((team) => team.id))
    this.touchConfig()
    return true
  }

  private cleanupInvalidTeamReferences() {
    for (const person of this.participants.values()) {
      person.allocations = Object.fromEntries(
        Object.entries(person.allocations || {}).filter(([teamId]) => this.validTeamIds.has(teamId)),
      )
    }

    this.cheers = this.cheers.filter((message) => this.validTeamIds.has(message.teamId))
    this.voteEvents = this.voteEvents.filter((event) => this.validTeamIds.has(event.teamId))
  }

  private openEventStream(url: URL) {
    const role = getEventRole(url)
    let controllerRef: ReadableStreamDefaultController<Uint8Array>
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controllerRef = controller
        this.clients.set(controller, role)
        this.sendState(controller)
      },
      cancel: () => {
        this.clients.delete(controllerRef)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  }

  private async commit(options: { audience?: boolean } = {}) {
    this.advanceQuizPhase()
    await this.persist()
    this.broadcast(options)
  }

  private touchConfig() {
    this.configRevision += 1
    this.configUpdatedAt = Date.now()
  }

  private broadcast({ audience = false }: { audience?: boolean } = {}) {
    const payload = `event: state\ndata: ${JSON.stringify(this.getState())}\n\n`
    for (const [client, role] of this.clients.entries()) {
      if (role === 'vote' && !audience) continue
      this.sendState(client, payload)
    }
  }

  private sendState(controller: ReadableStreamDefaultController<Uint8Array>, payload?: string) {
    try {
      controller.enqueue(encoder.encode(payload || `event: state\ndata: ${JSON.stringify(this.getState())}\n\n`))
    } catch {
      this.clients.delete(controller)
    }
  }

  private normalizeAllocations(input: unknown) {
    const normalized: Record<string, number> = {}
    const runtimeSettings = this.getRuntimeSettings()
    const perTeamLimit = Math.min(runtimeSettings.starBudget, runtimeSettings.maxStarsPerTeam)
    let remaining = runtimeSettings.starBudget

    if (!input || typeof input !== 'object') return normalized

    for (const [teamId, rawValue] of Object.entries(input as Record<string, unknown>)) {
      if (!this.validTeamIds.has(teamId)) continue

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

  private normalizeAllParticipantAllocations() {
    for (const person of this.participants.values()) {
      person.allocations = this.normalizeAllocations(person.allocations)
      person.updatedAt = Date.now()
    }
  }

  private upsertParticipant(deviceIdValue: unknown, nameValue: unknown, groupValue: unknown, departmentValue: unknown = '') {
    const browserDeviceId = sanitizeIdentifier(deviceIdValue, 96)
    if (!browserDeviceId) return null

    const nextName = sanitizeText(nameValue, 18)
    const nextGroup = sanitizeLetsId(groupValue, 48)
    const nextDepartment = sanitizeText(departmentValue, 40)
    if (!nextName || !nextGroup) return null

    const identityKey = getParticipantIdentityKey(browserDeviceId, nextName, nextGroup)
    const nextId = `participant-${hashIdentity(identityKey)}`
    const existing = this.participants.get(nextId) || this.findParticipantByNormalizedIdentity(browserDeviceId, nextName, nextGroup)
    const id = existing?.id || nextId
    const person =
      existing ||
      ({
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
      } satisfies Participant)

    attachParticipantDevice(person, browserDeviceId)
    person.name = nextName
    person.group = nextGroup
    if (nextDepartment || !person.department) {
      person.department = nextDepartment
    }
    person.updatedAt = Date.now()
    this.participants.set(id, person)
    return person
  }

  private cleanupParticipantReferences(participantIdValue: unknown) {
    const participantId = sanitizeIdentifier(participantIdValue, 128)
    if (!participantId) return

    this.cheers = this.cheers.filter((message) => message.participantId !== participantId)
    this.voteEvents = this.voteEvents.filter((event) => event.participantId !== participantId)
    this.awardHistory = this.awardHistory.filter((award) => award.participantId !== participantId)

    if (
      this.quiz.answers.some((answer) => answer.participantId === participantId) ||
      this.quiz.winners.some((answer) => answer.participantId === participantId)
    ) {
      this.quiz = {
        ...this.quiz,
        answers: this.quiz.answers.filter((answer) => answer.participantId !== participantId),
        winners: this.quiz.winners.filter((answer) => answer.participantId !== participantId),
        updatedAt: Date.now(),
      }
    }

    this.lastRaffle = null
  }

  private resetParticipant(participantIdValue: unknown) {
    const participantId = sanitizeIdentifier(participantIdValue, 128)
    const person = this.participants.get(participantId)
    if (!person) return false

    person.allocations = {}
    person.cheered = false
    person.cheerSubmitted = false
    person.updatedAt = Date.now()
    this.cleanupParticipantReferences(participantId)
    return true
  }

  private deleteParticipant(participantIdValue: unknown) {
    const participantId = sanitizeIdentifier(participantIdValue, 128)
    if (!this.participants.has(participantId)) return false

    this.participants.delete(participantId)
    this.cleanupParticipantReferences(participantId)
    return true
  }

  private findParticipantByNormalizedIdentity(deviceId: string, name: string, group: string) {
    const browserDeviceId = sanitizeIdentifier(deviceId, 96)
    const normalizedName = normalizeNameIdentity(name, 18)
    const normalizedGroup = normalizeGroupIdentity(group, 48)

    for (const person of this.participants.values()) {
      const deviceIds = getParticipantDeviceIds(person)
      if (deviceIds.includes(browserDeviceId)) return person
      if (normalizeNameIdentity(person.name, 18) !== normalizedName) continue
      if (normalizeGroupIdentity(person.group, 48) !== normalizedGroup) continue
      return person
    }

    return null
  }

  private getRaffleCandidates(rule: RaffleRule) {
    const state = this.getState()
    const raffleAwardedParticipantIds = new Set(
      this.awardHistory
        .filter((record) => record.kind === 'raffle')
        .map((record) => record.participantId)
        .filter(Boolean),
    )
    const leaderId = state.teams[0]?.id
    const topThreeIds = state.teams.slice(0, 3).map((team) => team.id)
    const rank456Ids = state.teams.slice(3, 6).map((team) => team.id)
    const rank7to10Ids = state.teams.slice(6, 10).map((team) => team.id)
    const longestCheerByParticipant = new Map<string, number>()

    if (rule === 'longestCheer') {
      for (const message of this.cheers) {
        if (!message.participantId || message.hidden) continue
        longestCheerByParticipant.set(
          message.participantId,
          Math.max(longestCheerByParticipant.get(message.participantId) ?? 0, message.text.trim().length),
        )
      }
    }

    const longestCheerLength = rule === 'longestCheer' ? Math.max(0, ...longestCheerByParticipant.values()) : 0

    return state.participants.filter((person: ParticipantState) => {
      if (raffleAwardedParticipantIds.has(person.id)) return false
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

  private getRaffleSupportDetails(person: ParticipantState): RaffleSupportDetail[] {
    const state = this.getState()
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

  private getRaffleCheerDetails(person: ParticipantState): RaffleCheerDetail[] {
    const state = this.getState()
    const teamMap = new Map(state.teams.map((team) => [team.id, team]))

    return this.cheers
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

  private pickWeightedRaffleWinners(candidates: ParticipantState[], winnerCount: number) {
    const pool = shuffle(candidates)
    const weights = this.buildRaffleCandidateWeights(pool)
    const winners: ParticipantState[] = []

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

  private buildRaffleCandidateWeights(candidates: ParticipantState[]) {
    const cheerWeight = clamp(Number(this.settings.raffleCheerWeight ?? defaultRaffleCheerWeight), 0, 1)
    if (cheerWeight <= 0) return new Map(candidates.map((person) => [person.id, 1]))

    const cheerStats = new Map<string, { count: number; chars: number }>()
    this.cheers.forEach((message) => {
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

  private addAwardRecord(record: AwardRecord) {
    this.awardHistory.unshift(record)
    this.awardHistory.splice(200)
  }

  private getRafflePrizeImage(rule: RaffleRule) {
    const imageKey = rafflePrizeImageKeyByRule[rule] || 'rafflePrizeImageFile'
    return this.copy[imageKey] || this.copy.rafflePrizeImageFile || ''
  }

  private getRafflePrizeName(rule: RaffleRule) {
    const nameKey = rafflePrizeNameKeyByRule[rule] || 'rafflePrizeNameFile'
    return this.copy[nameKey] || this.copy.rafflePrizeNameFile || '행운권 상품'
  }

  private sanitizeQuizState(): QuizState {
    this.advanceQuizPhase()

    return {
      ...this.quiz,
      answers: this.quiz.answers.slice(0, 80),
      winners: this.quiz.winners.slice(0, this.quiz.winnerCount),
    }
  }

  private advanceQuizPhase(now = Date.now()) {
    if (this.quiz.mode === 'countdown' && this.quiz.opensAt > 0 && now >= this.quiz.opensAt) {
      this.quiz = {
        ...this.quiz,
        mode: 'open',
        updatedAt: now,
      }
    }
    if (this.quiz.mode === 'settling' && this.quiz.settlementDeadlineAt > 0 && now >= this.quiz.settlementDeadlineAt) {
      this.finalizeQuizSettlement(now)
    }
  }

  private async scheduleQuizSettlementAlarm() {
    if (this.quiz.mode !== 'settling' || !this.quiz.settlementDeadlineAt) {
      await this.state.storage.deleteAlarm()
      return
    }

    await this.state.storage.setAlarm(this.quiz.settlementDeadlineAt)
  }

  private finalizeQuizSettlement(now = Date.now()) {
    if (this.quiz.mode !== 'settling') return false

    const rankedWinners = this.quiz.answers
      .filter((answer) => answer.correct)
      .sort(compareQuizAnswerPriority)
      .slice(0, this.quiz.winnerCount)
      .map((answer, index) => ({ ...answer, rank: index + 1 }))
    const winnerRankById = new Map(rankedWinners.map((answer) => [answer.id, answer.rank]))

    this.quiz = {
      ...this.quiz,
      mode: 'closed',
      answers: this.quiz.answers.map((answer) => ({
        ...answer,
        rank: winnerRankById.get(answer.id),
      })),
      winners: rankedWinners,
      updatedAt: now,
    }

    for (const winner of rankedWinners) {
      this.addAwardRecord({
        id: `quiz-${winner.quizId}-${winner.id}-${winner.participantId}`,
        participantId: winner.participantId,
        participantName: winner.author,
        participantGroup: winner.group,
        participantDepartment: winner.department || '',
        kind: 'quiz',
        rank: winner.rank,
        quizId: winner.quizId,
        question: this.quiz.question,
        prizeImageFile: this.quiz.prizeImageFile,
        prizeName: '퀴즈 상품',
        createdAt: this.quiz.updatedAt,
      })
    }

    return true
  }

  private prepareQuiz() {
    this.advanceQuizPhase()
    if (this.quiz.mode !== 'idle') return

    const now = Date.now()
    this.quiz = {
      ...emptyQuizState,
      mode: 'standby',
      createdAt: now,
      updatedAt: now,
    }
    this.quizAnswerKeys = []
    this.quizAnswerId = 1
  }

  private resetQuizTo(mode: QuizMode) {
    const now = Date.now()
    this.quiz = {
      ...emptyQuizState,
      id: this.quiz.id,
      round: this.quiz.round,
      mode,
      createdAt: mode === 'standby' ? now : 0,
      updatedAt: now,
    }
    this.quizAnswerKeys = []
    this.quizAnswerId = 1
  }

  private openQuiz(body: RequestBody) {
    const selectedQuizId = sanitizeSlug(body.quizId)
    const selectedQuiz = selectedQuizId ? this.quizBank.find((item) => item.id === selectedQuizId && item.enabled !== false) : null
    const question = sanitizeText(body.question ?? selectedQuiz?.question, quizQuestionMaxLength)
    const answer = sanitizeText(body.answer ?? selectedQuiz?.answer, quizAnswerMaxLength)
    const acceptedAnswers = Array.isArray(body.acceptedAnswers)
      ? body.acceptedAnswers.map((value) => sanitizeText(value, quizAnswerMaxLength)).filter(Boolean)
      : selectedQuiz?.acceptedAnswers || []
    const prizeImageFile = sanitizeLogoPath(String(body.prizeImageFile ?? selectedQuiz?.prizeImageFile ?? ''))
    const winnerCount = clamp(Math.floor(Number(body.winnerCount ?? selectedQuiz?.winnerCount) || 2), 1, 10)
    const answerKeys = normalizeQuizAnswerKeys([answer, ...acceptedAnswers].join('\n'))
    const now = Date.now()

    if (!question || !answerKeys.length) return false

    this.quiz = {
      id: this.quiz.id + 1,
      round: this.quiz.round + 1,
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
    this.quizAnswerKeys = answerKeys
    this.quizAnswerId = 1
    return true
  }

  private closeQuiz() {
    if (this.quiz.mode === 'idle' || this.quiz.mode === 'standby') return

    this.resetQuizTo('standby')
  }

  private clearQuiz() {
    this.resetQuizTo('idle')
  }

  private submitQuizAnswer(person: Participant | null, textValue: unknown, body: RequestBody = {}) {
    const text = sanitizeText(textValue, quizAnswerMaxLength)
    const serverReceivedAt = Date.now()
    this.advanceQuizPhase(serverReceivedAt)
    if (!person || (this.quiz.mode !== 'open' && this.quiz.mode !== 'settling') || !this.quiz.id || !text) return null
    if (Number(body.quizId) && Number(body.quizId) !== this.quiz.id) return null
    if (this.quiz.answers.filter((answer) => answer.participantId === person.id).length >= 5) return null

    const normalized = normalizeQuizAnswer(text)
    const correct = this.quizAnswerKeys.includes(normalized)
    const estimatedSubmittedAt = this.estimateQuizSubmittedAt(body, serverReceivedAt)
    const answer: QuizAnswer = {
      id: this.quizAnswerId++,
      quizId: this.quiz.id,
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

    this.quiz.answers.unshift(answer)
    this.quiz.answers.splice(maxStoredQuizAnswers)

    if (correct && this.quiz.mode === 'open') {
      this.quiz = {
        ...this.quiz,
        mode: 'settling',
        settlementStartedAt: serverReceivedAt,
        settlementDeadlineAt: serverReceivedAt + quizSettlementMs,
      }
    }

    this.quiz = {
      ...this.quiz,
      updatedAt: Date.now(),
    }

    return answer
  }

  private estimateQuizSubmittedAt(body: RequestBody, serverReceivedAt: number) {
    const clientSubmittedAt = Number(body.clientSubmittedAt)
    const clientServerOffsetMs = Number(body.clientServerOffsetMs)
    const rawEstimate =
      Number.isFinite(clientSubmittedAt) && clientSubmittedAt > 0 && Number.isFinite(clientServerOffsetMs)
        ? clientSubmittedAt + clientServerOffsetMs
        : serverReceivedAt
    const minSubmittedAt = Math.max(this.quiz.opensAt || this.quiz.createdAt || serverReceivedAt, serverReceivedAt - quizClientSubmitSkewLimitMs)
    return clamp(rawEstimate, minSubmittedAt, serverReceivedAt)
  }

  private getQuizAnswerRejectionReason(person: Participant | null, textValue: unknown, body: RequestBody = {}) {
    const text = sanitizeText(textValue, quizAnswerMaxLength)
    this.advanceQuizPhase()

    if (!person) return '참가자 등록이 필요합니다.'
    if (!text) return '답변을 입력해주세요.'
    if (!this.quiz.id || this.quiz.mode === 'idle' || this.quiz.mode === 'standby') return '퀴즈가 아직 출제되지 않았습니다.'
    if (this.quiz.mode === 'countdown') return '문제가 공개되면 답변을 제출해주세요.'
    if (Number(body.quizId) && Number(body.quizId) !== this.quiz.id) return '이미 다른 문제가 진행 중입니다.'
    if (this.quiz.mode !== 'open' && this.quiz.mode !== 'settling') return '정답자 선정이 마감되었습니다.'
    if (this.quiz.answers.filter((answer) => answer.participantId === person.id).length >= 5) {
      return '이 문제는 최대 5번까지만 제출할 수 있습니다.'
    }

    return '답변을 접수하지 못했습니다.'
  }

  private recordVoteEvents(
    person: Participant,
    previousAllocations: Record<string, number>,
    nextAllocations: Record<string, number>,
  ) {
    const teamIds = new Set([...Object.keys(previousAllocations || {}), ...Object.keys(nextAllocations || {})])
    const now = Date.now()

    for (const teamId of teamIds) {
      if (!this.validTeamIds.has(teamId)) continue

      const previous = previousAllocations?.[teamId] || 0
      const next = nextAllocations?.[teamId] || 0
      const delta = next - previous

      if (delta === 0) continue

      this.voteEvents.unshift({
        id: this.voteEventId++,
        participantId: person.id,
        author: person.name,
        teamId,
        delta,
        previous,
        next,
        createdAt: now,
      })
    }

    this.voteEvents.splice(100)
  }

  private removeCheersForClearedTeams(
    person: Participant,
    previousAllocations: Record<string, number>,
    nextAllocations: Record<string, number>,
  ) {
    const clearedTeamIds = Object.keys(previousAllocations || {}).filter(
      (teamId) => (previousAllocations[teamId] || 0) > 0 && (nextAllocations[teamId] || 0) <= 0,
    )

    if (!clearedTeamIds.length) return 0

    const cleared = new Set(clearedTeamIds)
    let removed = 0

    this.cheers = this.cheers.filter((message) => {
      const shouldRemove = message.participantId === person.id && cleared.has(message.teamId)
      if (shouldRemove) removed += 1
      return !shouldRemove
    })

    const hasRemainingMessages = this.cheers.some((message) => message.participantId === person.id)
    person.cheered = hasRemainingMessages
    person.cheerSubmitted = hasRemainingMessages
    return removed
  }

  private async resetRuntimeState({ seed = false, keepParticipants = false } = {}) {
    const preservedParticipants = keepParticipants
      ? [...this.participants.values()].map((person) => ({
          ...person,
          allocations: {},
          cheered: false,
          cheerSubmitted: false,
          updatedAt: Date.now(),
        }))
      : []

    this.participants.clear()
    for (const person of preservedParticipants) {
      this.participants.set(person.id, person)
    }
    this.cheers = []
    this.voteEvents = []
    this.awardHistory = []
    this.cheerId = 1
    this.voteEventId = 1
    this.clearQuiz()
    if (!keepParticipants) this.sessionId += 1
    this.testMode = Boolean(seed)
    this.closed = false
    this.closesAt = calculateClosesAt(this.settings)
    this.lastRaffle = null

    if (seed) {
      this.seedTestData()
    }
  }

  private seedTestData() {
    const samples = [
      {
        id: 'test-minjun',
        name: '민준',
        group: 'test',
        allocations: { 'team-aurora': Math.min(this.settings.starBudget, 5) },
        message: '검색 데모가 바로 써볼 수 있어 보여요',
      },
      {
        id: 'test-seoyeon',
        name: '서연',
        group: 'test',
        allocations: { 'team-prism': Math.min(this.settings.starBudget, 4) },
        message: '현장 적용성이 좋아요',
      },
      {
        id: 'test-yuna',
        name: '유나',
        group: 'test',
        allocations: { 'team-vector': Math.min(this.settings.starBudget, 5) },
        message: '리뷰 시간이 줄어들 것 같아요',
      },
      {
        id: 'test-hana',
        name: '하나',
        group: 'test',
        allocations: { 'team-lattice': Math.min(this.settings.starBudget, 3) },
        message: '장애 리포트 연결이 인상적입니다',
      },
      {
        id: 'test-doyeon',
        name: '도연',
        group: 'test',
        allocations: { 'team-pulse': Math.min(this.settings.starBudget, 2) },
        message: '고객 목소리 우선순위가 명확해질 것 같아요',
      },
    ]

    for (const sample of samples) {
      const person = this.upsertParticipant(sample.id, sample.name, sample.group)
      if (!person) continue

      person.allocations = this.normalizeAllocations(sample.allocations)
      person.cheered = true
      person.cheerSubmitted = true
      this.cheers.unshift({
        id: this.cheerId++,
        teamId: Object.keys(person.allocations)[0] || this.teams[0].id,
        participantId: person.id,
        author: person.name,
        text: sample.message,
        createdAt: Date.now(),
        hidden: false,
      })
    }
  }

  private getRequestDeviceId(request: Request, body: RequestBody) {
    const cookies = parseCookies(request.headers.get('cookie') || '')
    return cookies[participantCookieName] || String(body.participantId || '')
  }

  private isCurrentSession(body: RequestBody) {
    return Number(body.sessionId) === this.sessionId
  }
}

function loadConfig(config: unknown) {
  const parsed = config && typeof config === 'object' ? (config as Record<string, unknown>) : {}
  const teamSource = Array.isArray(parsed) ? parsed : parsed.teams
  const teams = Array.isArray(teamSource) && teamSource.length
    ? teamSource.map((team, index) => normalizeTeam(team, defaultTeams[index] || defaultTeams[0], index))
    : defaultTeams.map((team, index) => normalizeTeam(team, team, index))

  return {
    teams,
    copy: normalizeCopy(Array.isArray(parsed) ? {} : parsed.copy),
    quizBank: normalizeQuizBank(Array.isArray(parsed) ? undefined : parsed.quizzes),
  }
}

function normalizeCopy(input: unknown): EventCopy {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const next = { ...defaultCopy }

  for (const key of Object.keys(defaultCopy) as Array<keyof typeof defaultCopy>) {
    if (typeof source[key] === 'string') {
      next[key] = isImageCopyKey(key)
        ? sanitizeLogoPath(source[key])
        : sanitizeText(source[key], 240)
    }
  }

  return next
}

function normalizeTeam(teamValue: unknown, fallback: TeamConfig, index: number): TeamConfig {
  const team = teamValue && typeof teamValue === 'object' ? (teamValue as Record<string, unknown>) : {}
  const hasLogoFile = Object.prototype.hasOwnProperty.call(team, 'logoFile')
  const members = Array.isArray(team.members)
    ? team.members.map((member) => sanitizeText(member, 80)).filter(Boolean).slice(0, 3)
    : fallback.members
  const logo = validLogos.has(team.logo as LogoKind) ? (team.logo as LogoKind) : fallback.logo

  return {
    id: sanitizeSlug(team.id) || fallback.id || `team-${index + 1}`,
    code: sanitizeText(team.code, 8) || fallback.code || `${index + 1}`,
    editKey: sanitizeSlug(team.editKey) || sanitizeSlug(fallback.editKey) || '',
    name: sanitizeText(team.name, 32) || fallback.name || `Team ${index + 1}`,
    title: sanitizeText(team.title, 64) || fallback.title || '프로젝트명 미정',
    members,
    logoFile: sanitizeLogoPath(String(hasLogoFile ? team.logoFile : fallback.logoFile || '')),
    logoShape: sanitizeImageShape(team.logoShape, fallback.logoShape || 'rounded'),
    logoFrame: sanitizeImageFrame(team.logoFrame, fallback.logoFrame || 'line'),
    logoFit: sanitizeImageFit(team.logoFit, fallback.logoFit || 'cover'),
    logoSize: clampNumber(team.logoSize ?? fallback.logoSize ?? 48, 36, 88, 48),
    logoWidth: clampNumber(team.logoWidth ?? fallback.logoWidth ?? 48, 36, 180, 48),
    logoHeight: clampNumber(team.logoHeight ?? fallback.logoHeight ?? 48, 32, 132, 48),
    logoZoom: clampNumber(team.logoZoom ?? fallback.logoZoom ?? 1, 1, 2.4, 1),
    logoFocusX: clampNumber(team.logoFocusX ?? fallback.logoFocusX ?? 50, 0, 100, 50),
    logoFocusY: clampNumber(team.logoFocusY ?? fallback.logoFocusY ?? 50, 0, 100, 50),
    photoFit: sanitizeImageFit(team.photoFit, fallback.photoFit || 'cover'),
    photoShape: sanitizeImageShape(team.photoShape, fallback.photoShape || 'wide'),
    photoFrame: sanitizeImageFrame(team.photoFrame, fallback.photoFrame || fallback.logoFrame || 'line'),
    photoWidth: clampNumber(team.photoWidth ?? fallback.photoWidth ?? 560, 180, 820, 560),
    photoHeight: clampNumber(team.photoHeight ?? fallback.photoHeight ?? 300, 150, 460, 300),
    photoRadius: clampNumber(team.photoRadius ?? fallback.photoRadius ?? defaultTeamPhotoRadius, 0, 160, defaultTeamPhotoRadius),
    photoZoom: clampNumber(team.photoZoom ?? fallback.photoZoom ?? 1, 1, 2.4, 1),
    photoFocusX: clampNumber(team.photoFocusX ?? fallback.photoFocusX ?? 50, 0, 100, 50),
    photoFocusY: clampNumber(team.photoFocusY ?? fallback.photoFocusY ?? 50, 0, 100, 50),
    baseStars: Math.max(0, Math.floor(Number(team.baseStars ?? fallback.baseStars ?? 0))),
    baseVoters: Math.max(0, Math.floor(Number(team.baseVoters ?? fallback.baseVoters ?? 0))),
    color: sanitizeColor(team.color) || fallback.color || '#A50034',
    logo,
    sortOrder: Math.max(0, Math.floor(Number(team.sortOrder ?? index))),
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback = min) {
  const number = Number(value)
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : fallback))
}

function sanitizeImageShape(value: unknown, fallback = 'rounded') {
  return imageShapes.has(String(value || '')) ? String(value) : fallback
}

function sanitizeImageFrame(value: unknown, fallback = 'line') {
  return imageFrames.has(String(value || '')) ? String(value) : fallback
}

function sanitizeImageFit(value: unknown, fallback = 'cover') {
  return imageFits.has(String(value || '')) ? String(value) : fallback
}

function normalizeQuizBank(input: unknown, fallback: QuizConfig[] = defaultQuizBank) {
  const source = Array.isArray(input) && input.length ? input.slice(0, 15) : fallback
  const normalized = source
    .map((quiz, index) => normalizeQuizConfig(quiz, fallback[index] || defaultQuizBank[index] || defaultQuizBank[0], index))
    .filter((quiz) => quiz.question && quiz.answer)

  return normalized.length ? normalized.slice(0, 15) : defaultQuizBank.map((quiz, index) => normalizeQuizConfig(quiz, quiz, index))
}

function normalizeQuizConfig(input: unknown, fallback: QuizConfig = defaultQuizBank[0], index = 0): QuizConfig {
  const source = normalizeObject(input)
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
    prizeImageFile: sanitizeLogoPath(String(source.prizeImageFile ?? fallback.prizeImageFile ?? '')),
    winnerCount: clamp(Math.floor(Number(source.winnerCount ?? fallback.winnerCount ?? 2)), 1, 10),
    enabled: source.enabled === false ? false : fallback.enabled !== false,
  }
}

function isImageCopyKey(key: string) {
  return key === 'appLogoFile' || key.startsWith('rafflePrizeImage')
}

function normalizeObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

async function readJson(request: Request): Promise<RequestBody> {
  try {
    return (await request.json()) as RequestBody
  } catch {
    return {}
  }
}

function decodeTeamConfigPayload(value: string | null): RequestBody {
  const text = String(value || '').trim()
  if (!text) throw new Error('payload required')

  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '='))
  const compressed = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    compressed[index] = binary.charCodeAt(index)
  }
  if (compressed.length > 1_000_000) throw new Error('payload too large')

  return JSON.parse(strFromU8(inflateSync(compressed))) as RequestBody
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function sanitizeIdentifier(value: unknown, maxLength: number) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, maxLength)
}

function sanitizeLetsId(value: unknown, maxLength: number) {
  return String(value || '')
    .split('@')[0]
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLocaleLowerCase('en-US')
    .slice(0, maxLength)
}

function sanitizeSlug(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function sanitizeLogoPath(value: string) {
  const pathValue = normalizeLogoSourceValue(value.trim())
  if (!pathValue) return ''
  if (isRemoteLogoUrl(pathValue)) return pathValue
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon);base64,[a-zA-Z0-9+/=]+$/i.test(pathValue) && pathValue.length < 600_000) {
    return pathValue
  }
  if (pathValue.includes('..') || !/^\/?[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|svg|ico)$/i.test(pathValue)) return ''

  return pathValue.startsWith('/') ? pathValue : `/${pathValue}`
}

function normalizeLogoSourceValue(value: string) {
  const trimmed = String(value || '').trim()
  const driveId = extractGoogleDriveFileId(trimmed)
  return driveId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1200` : trimmed
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

    const shortMatch = url.pathname.match(/\/d\/([^/]+)/i)
    if (shortMatch?.[1]) return sanitizeDriveFileId(shortMatch[1])
  } catch {
    return ''
  }

  return ''
}

function sanitizeDriveFileId(value: string) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)
}

function isRemoteLogoUrl(value: string) {
  if (String(value || '').length > 2000) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function resolveLogoDataUrl(team: Record<string, unknown>, index: number, logos: unknown[]) {
  const explicitPath = String(team.logoFile || '').split('/').pop()?.toLowerCase() || ''
  const keys = [
    explicitPath,
    `t${index + 1}-logo`,
    `t${index + 1}`,
    String(team.code || '').toLowerCase(),
    String(team.id || '').toLowerCase(),
    String(team.name || '').toLowerCase().replace(/\s+/g, ''),
  ].filter(Boolean)

  for (const logoValue of logos) {
    const logo = normalizeObject(logoValue)
    const fileName = String(logo.fileName || '').toLowerCase()
    const baseName = fileName.replace(/\.(png|jpe?g|webp|svg|ico)$/i, '')

    if (!keys.some((key) => fileName === key || baseName === key || baseName === `${key}-logo` || baseName.startsWith(`${key}_`))) {
      continue
    }

    const dataUrl = sanitizeLogoPath(String(logo.dataUrl || ''))
    if (dataUrl) return dataUrl
  }

  return ''
}

function sanitizeColor(value: unknown) {
  const color = String(value || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : ''
}

function normalizeNameIdentity(value: unknown, maxLength: number) {
  return sanitizeText(value, maxLength).normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase('ko-KR')
}

function normalizeGroupIdentity(value: unknown, maxLength: number) {
  return sanitizeLetsId(value, maxLength)
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/gu, '')
}

function getParticipantIdentityKey(_deviceId: string, name: string, group: string) {
  return [
    normalizeNameIdentity(name, 18),
    normalizeGroupIdentity(group, 48),
  ].join('|')
}

function getParticipantDeviceIds(person: Participant) {
  const ids = Array.isArray(person.deviceIds) ? person.deviceIds : []
  const legacyId = sanitizeIdentifier(person.deviceId, 96)
  return [...new Set([...ids, legacyId].filter(Boolean))]
}

function attachParticipantDevice(person: Participant, deviceId: string) {
  const browserDeviceId = sanitizeIdentifier(deviceId, 96)
  const deviceIds = getParticipantDeviceIds(person)
  if (browserDeviceId && !deviceIds.includes(browserDeviceId)) deviceIds.push(browserDeviceId)
  person.deviceIds = deviceIds
  person.deviceId = deviceIds[0] || browserDeviceId
}

function calculateLinearScore(totalStars: number, minStars: number, maxStars: number, minScore: number) {
  if (maxStars <= 0) return 0
  if (maxStars === minStars) return 10

  const normalized = (totalStars - minStars) / (maxStars - minStars)
  return Math.round((minScore + normalized * (10 - minScore)) * 10) / 10
}

function hashIdentity(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36)
}

function getTeamEditKey(team: TeamConfig) {
  if (sanitizeSlug(team.editKey)) return sanitizeSlug(team.editKey)
  return hashIdentity(`${team.id}|${team.code}|vibe-team-edit`)
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

function isAdminProtectedRequest(url: URL, method: string) {
  if (method === 'GET' && url.pathname === '/events') {
    return url.searchParams.get('role') === 'admin'
  }

  if (method === 'GET' && url.pathname === '/api/team-config/apply') {
    return true
  }

  if (method !== 'POST') return false

  return new Set([
    '/api/cheer/moderate',
    '/api/cheer/bulk',
    '/api/raffle',
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
  ]).has(url.pathname)
}

function getEventRole(url: URL): EventClientRole {
  const role = url.searchParams.get('role')
  return role === 'vote' || role === 'wall' || role === 'admin' ? role : 'admin'
}

async function isAdminAuthenticated(request: Request, adminPasscode: string) {
  if (!adminPasscode) return true

  const cookies = parseCookies(request.headers.get('cookie') || '')
  return cookies[adminCookieName] === await adminSessionToken(adminPasscode)
}

async function adminCookieHeader(adminPasscode: string, secure: boolean) {
  const secureFlag = secure ? '; Secure' : ''
  return `${adminCookieName}=${encodeURIComponent(await adminSessionToken(adminPasscode))}; Max-Age=${adminCookieMaxAge}; Path=/; SameSite=Lax; HttpOnly${secureFlag}`
}

function clearAdminCookieHeader(secure: boolean) {
  const secureFlag = secure ? '; Secure' : ''
  return `${adminCookieName}=; Max-Age=0; Path=/; SameSite=Lax; HttpOnly${secureFlag}`
}

async function adminSessionToken(adminPasscode: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`vibe-vote-admin:${adminPasscode}`))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function participantCookieHeader(deviceId: string) {
  return `${participantCookieName}=${encodeURIComponent(deviceId)}; Max-Age=${participantCookieMaxAge}; Path=/; SameSite=Lax`
}

function isRaffleRule(value: unknown): value is RaffleRule {
  return (
    value === 'all' ||
    value === 'leader' ||
    value === 'top3' ||
    value === 'rank456' ||
    value === 'rank7to10Three' ||
    value === 'multi' ||
    value === 'big' ||
    value === 'longestCheer' ||
    value === 'cheer'
  )
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function sumStars(allocations: Record<string, number>) {
  return Object.values(allocations || {}).reduce((sum, value) => sum + value, 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeCheerNameMode(value: unknown, fallback: Settings['cheerNameMode'] = 'masked'): Settings['cheerNameMode'] {
  return value === 'real' ? 'real' : value === 'masked' ? 'masked' : fallback
}

function normalizeThemeMode(value: unknown, fallback: Settings['themeMode'] = 'light'): Settings['themeMode'] {
  return value === 'stage' ? 'stage' : value === 'light' ? 'light' : fallback
}

function normalizeTimerMode(value: unknown, fallback: Settings['timerMode'] = 'duration'): Settings['timerMode'] {
  return value === 'targetTime' ? 'targetTime' : value === 'duration' ? 'duration' : fallback
}

function normalizeTargetTime(value: unknown, fallback = '') {
  const text = String(value || '').trim()
  if (!/^\d{2}:\d{2}$/.test(text)) return fallback
  const [hour, minute] = text.split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? text : fallback
}

function normalizeDurationMinutes(value: unknown, fallback = defaultDurationMinutes) {
  const minutes = Math.floor(Number(value))
  return Number.isFinite(minutes) && minutes >= 1 ? minutes : fallback
}

function resolveTimerSettings(body: RequestBody, current: Settings) {
  const timerMode = normalizeTimerMode(body.timerMode, current.timerMode)
  const rawDurationMinutes = normalizeDurationMinutes(body.durationMinutes, current.durationMinutes)
  const rawTargetTime = normalizeTargetTime(body.targetTime, current.targetTime)
  const targetTime =
    timerMode === 'duration'
      ? formatKstTime(Date.now() + rawDurationMinutes * 60 * 1000)
      : rawTargetTime || formatKstTime(Date.now() + rawDurationMinutes * 60 * 1000)
  const durationMinutes = timerMode === 'targetTime' ? minutesUntilKstTime(targetTime) : rawDurationMinutes

  return { durationMinutes, timerMode, targetTime }
}

function formatKstTime(timestamp: number) {
  const date = new Date(timestamp + kstOffsetMinutes * 60 * 1000)
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function minutesUntilKstTime(value: string, now = Date.now()) {
  const target = getNextKstTimestampForTime(value, now)
  return target ? Math.max(1, Math.ceil((target - now) / 60_000)) : defaultDurationMinutes
}

function getNextKstTimestampForTime(value: string, now = Date.now()) {
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

function calculateClosesAt(settings: Settings, now = Date.now()) {
  if (settings.timerMode === 'targetTime' && settings.targetTime) {
    return getNextKstTimestampForTime(settings.targetTime, now) || now + settings.durationMinutes * 60 * 1000
  }

  return now + settings.durationMinutes * 60 * 1000
}

function normalizeQuizState(value: unknown): QuizState {
  const source = normalizeObject(value)
  const mode: QuizMode =
    source.mode === 'standby' ||
    source.mode === 'countdown' ||
    source.mode === 'open' ||
    source.mode === 'settling' ||
    source.mode === 'closed'
      ? source.mode
      : 'idle'
  const winnerCount = clamp(Math.floor(Number(source.winnerCount) || 2), 1, 10)
  const answers = Array.isArray(source.answers) ? source.answers.map(normalizeQuizAnswerRecord).filter(Boolean) as QuizAnswer[] : []
  const winners = Array.isArray(source.winners) ? source.winners.map(normalizeQuizAnswerRecord).filter(Boolean) as QuizAnswer[] : []

  return {
    id: Math.max(0, Math.floor(Number(source.id) || 0)),
    round: Math.max(0, Math.floor(Number(source.round) || 0)),
    mode,
    selectedQuizId: sanitizeSlug(source.selectedQuizId),
    question: sanitizeText(source.question, quizQuestionMaxLength),
    prizeImageFile: sanitizeLogoPath(String(source.prizeImageFile || '')),
    winnerCount,
    answers: answers.slice(0, maxStoredQuizAnswers),
    winners: winners.slice(0, winnerCount),
    introEndsAt: Math.max(0, Number(source.introEndsAt) || 0),
    opensAt: Math.max(0, Number(source.opensAt) || 0),
    settlementStartedAt: Math.max(0, Number(source.settlementStartedAt) || 0),
    settlementDeadlineAt: Math.max(0, Number(source.settlementDeadlineAt) || 0),
    createdAt: Math.max(0, Number(source.createdAt) || 0),
    updatedAt: Math.max(0, Number(source.updatedAt) || 0),
  }
}

function normalizeQuizAnswerRecord(value: unknown): QuizAnswer | null {
  const source = normalizeObject(value)
  const id = Math.floor(Number(source.id) || 0)
  const quizId = Math.floor(Number(source.quizId) || 0)
  const participantId = sanitizeIdentifier(source.participantId, 96)
  const author = sanitizeText(source.author, 18)
  const text = sanitizeText(source.text, quizAnswerMaxLength)

  if (!id || !quizId || !participantId || !author || !text) return null

  const rankValue = Math.floor(Number(source.rank) || 0)
  return {
    id,
    quizId,
    participantId,
    author,
    group: sanitizeLetsId(source.group, 48),
    department: sanitizeText(source.department, 40),
    text,
    correct: Boolean(source.correct),
    rank: rankValue > 0 ? rankValue : undefined,
    clientSubmittedAt: Math.max(0, Number(source.clientSubmittedAt) || 0),
    clientServerOffsetMs: Number(source.clientServerOffsetMs) || 0,
    estimatedSubmittedAt: Math.max(0, Number(source.estimatedSubmittedAt) || 0),
    serverReceivedAt: Math.max(0, Number(source.serverReceivedAt) || 0),
    createdAt: Math.max(0, Number(source.createdAt) || 0),
  }
}

function compareQuizAnswerPriority(left: QuizAnswer, right: QuizAnswer) {
  return (
    (left.estimatedSubmittedAt || left.serverReceivedAt || left.createdAt) -
      (right.estimatedSubmittedAt || right.serverReceivedAt || right.createdAt) ||
    (left.serverReceivedAt || left.createdAt) - (right.serverReceivedAt || right.createdAt) ||
    left.id - right.id
  )
}

function normalizeQuizAnswerKeys(value: unknown) {
  return String(value || '')
    .split(/[,|\n]/)
    .map((item) => normalizeQuizAnswer(item))
    .filter(Boolean)
}

function normalizeQuizAnswer(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/gu, '')
}
