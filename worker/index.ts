import rawConfig from '../teams.json'

const defaultStarBudget = 10
const defaultDurationMinutes = 10
const defaultMinScore = 5
const maxStarsPerTeam = 10
const participantCookieName = 'vibe-vote-participant'
const participantCookieMaxAge = 60 * 60 * 24 * 14
const snapshotKey = 'event-state-v1'
const settingsVersion = 3

type Env = {
  ARENA_ROOM: DurableObjectNamespace
  ASSETS: Fetcher
  ARENA_ROOM_NAME?: string
}

type LogoKind = 'orbit' | 'beam' | 'grid' | 'wave' | 'core'

type EventCopy = Record<keyof typeof defaultCopy, string>

type TeamConfig = {
  id: string
  code: string
  name: string
  title: string
  members: string[]
  logoFile: string
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

type RaffleRule = 'all' | 'leader' | 'top2' | 'top3' | 'multi' | 'big' | 'cheer'

type LastRaffle = {
  rule: RaffleRule
  winnerCount: number
  candidates: number
  winners: Array<{
    id: string
    name: string
    group: string
    cheered: boolean
  }>
  createdAt: number
}

type Settings = {
  showScoresToAudience: boolean
  starBudget: number
  durationMinutes: number
  minScore: number
}

type Snapshot = {
  participants: Participant[]
  cheers: CheerMessage[]
  voteEvents: VoteEvent[]
  closed: boolean
  closesAt: number
  lastRaffle: LastRaffle | null
  cheerId: number
  voteEventId: number
  sessionId: number
  testMode: boolean
  settings: Settings
  teams?: TeamConfig[]
  copy?: EventCopy
  settingsVersion?: number
}

type RequestBody = Record<string, unknown>

const defaultCopy = {
  appTitle: 'Vibe Vote Arena',
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
}

const defaultTeams: TeamConfig[] = [
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
    sortOrder: 0,
  },
]

const validLogos = new Set<LogoKind>(['orbit', 'beam', 'grid', 'wave', 'core'])
const initialConfig = loadConfig(rawConfig)
const encoder = new TextEncoder()

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return json({ ok: true, runtime: 'cloudflare-workers' })
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
  private clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
  private closed = false
  private closesAt = Date.now() + defaultDurationMinutes * 60 * 1000
  private lastRaffle: LastRaffle | null = null
  private cheerId = 1
  private voteEventId = 1
  private sessionId = 1
  private testMode = false
  private settings: Settings = {
    showScoresToAudience: true,
    starBudget: defaultStarBudget,
    durationMinutes: defaultDurationMinutes,
    minScore: defaultMinScore,
  }
  private teams: TeamConfig[] = initialConfig.teams
  private copy: EventCopy = initialConfig.copy
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
      return this.openEventStream()
    }

    if (request.method !== 'POST') {
      return json({ error: 'not found' }, 404)
    }

    const body = await readJson(request)
    return this.handleMutation(request, url.pathname, body)
  }

  private async load() {
    const snapshot = await this.state.storage.get<Snapshot>(snapshotKey)

    if (!snapshot) return

    this.participants = new Map(snapshot.participants.map((person) => [person.id, person]))
    this.cheers = snapshot.cheers || []
    this.voteEvents = snapshot.voteEvents || []
    this.closed = Boolean(snapshot.closed)
    this.closesAt = Number(snapshot.closesAt || Date.now() + defaultDurationMinutes * 60 * 1000)
    this.lastRaffle = snapshot.lastRaffle || null
    this.cheerId = Math.max(1, Number(snapshot.cheerId || 1))
    this.voteEventId = Math.max(1, Number(snapshot.voteEventId || 1))
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
      durationMinutes: clamp(Math.floor(Number(snapshot.settings?.durationMinutes || defaultDurationMinutes)), 1, 240),
      minScore: clamp(Number(snapshot.settings?.minScore ?? defaultMinScore), 0, 9.9),
    }
  }

  private async persist() {
    const snapshot: Snapshot = {
      participants: [...this.participants.values()],
      cheers: this.cheers,
      voteEvents: this.voteEvents,
      closed: this.closed,
      closesAt: this.closesAt,
      lastRaffle: this.lastRaffle,
      cheerId: this.cheerId,
      voteEventId: this.voteEventId,
      sessionId: this.sessionId,
      testMode: this.testMode,
      settings: this.settings,
      teams: this.teams,
      copy: this.copy,
      settingsVersion,
    }

    await this.state.storage.put(snapshotKey, snapshot)
  }

  private async handleMutation(request: Request, pathname: string, body: RequestBody) {
    if (pathname === '/api/vote') {
      if (this.closed) return json({ error: 'voting closed' }, 409)
      if (!this.isCurrentSession(body)) return json({ error: 'session expired' }, 409)

      const deviceId = this.getRequestDeviceId(request, body)
      const person = this.upsertParticipant(deviceId, body.name, body.group)
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
      const person = this.upsertParticipant(deviceId, body.name, body.group)
      const teamId = String(body.teamId || '')
      const text = sanitizeText(body.text, 64)

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
      this.cheers.splice(120)
      await this.commit()
      return json(this.getState(), 200, { 'Set-Cookie': participantCookieHeader(deviceId) })
    }

    if (pathname === '/api/cheer/moderate') {
      const messageId = Number(body.messageId)
      const message = this.cheers.find((item) => item.id === messageId)

      if (!message) return json({ error: 'message not found' }, 404)

      message.hidden = Boolean(body.hidden)
      this.lastRaffle = null
      await this.commit()
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
      await this.commit()
      return json(this.getState())
    }

    if (pathname === '/api/raffle') {
      const rule = isRaffleRule(body.rule) ? body.rule : 'all'
      const winnerCount = clamp(Math.floor(Number(body.winnerCount) || 4), 1, 8)
      const candidates = this.getRaffleCandidates(rule)
      const winners = shuffle(candidates)
        .slice(0, Math.min(winnerCount, candidates.length))
        .map((person) => ({
          id: person.id,
          name: person.name,
          group: person.group,
          cheered: person.cheered,
        }))

      this.lastRaffle = {
        rule,
        winnerCount,
        candidates: candidates.length,
        winners,
        createdAt: Date.now(),
      }

      await this.commit()
      return json(this.getState())
    }

    if (pathname === '/api/close') {
      this.closed = Boolean(body.closed)
      if (!this.closed && Date.now() > this.closesAt) {
        this.closesAt = Date.now() + this.settings.durationMinutes * 60 * 1000
      }
      await this.commit()
      return json(this.getState())
    }

    if (pathname === '/api/register') {
      if (!this.isCurrentSession(body)) return json({ error: 'session expired' }, 409)

      const deviceId = this.getRequestDeviceId(request, body)
      const person = this.upsertParticipant(deviceId, body.name, body.group)
      if (!person) return json({ error: 'name and group required' }, 400)

      await this.commit()
      return json(this.getState(), 200, { 'Set-Cookie': participantCookieHeader(deviceId) })
    }

    if (pathname === '/api/settings') {
      this.settings = {
        ...this.settings,
        showScoresToAudience:
          typeof body.showScoresToAudience === 'boolean'
            ? Boolean(body.showScoresToAudience)
            : this.settings.showScoresToAudience,
        starBudget: clamp(Math.floor(Number(body.starBudget) || this.settings.starBudget), 1, 20),
        durationMinutes: clamp(Math.floor(Number(body.durationMinutes) || this.settings.durationMinutes), 1, 240),
        minScore: clamp(Number(body.minScore ?? this.settings.minScore), 0, 9.9),
      }
      this.normalizeAllParticipantAllocations()
      this.closesAt = Date.now() + this.settings.durationMinutes * 60 * 1000
      this.closed = false
      this.lastRaffle = null
      await this.commit()
      return json(this.getState())
    }

    if (pathname === '/api/team-config') {
      const updated = this.applyTeamConfig(body)
      if (!updated) return json({ error: 'teams array required' }, 400)

      await this.commit()
      return json(this.getState())
    }

    if (pathname === '/api/reset') {
      await this.resetRuntimeState({ seed: Boolean(body.seed) })
      await this.commit()
      return json(this.getState())
    }

    return json({ error: 'not found' }, 404)
  }

  private getState() {
    if (!this.closed && Date.now() > this.closesAt) {
      this.closed = true
    }

    const participantList = [...this.participants.values()].map((person) => {
      const messages = this.cheers.filter((message) => message.participantId === person.id)
      const visibleCheerCount = messages.filter((message) => !message.hidden).length
      const hiddenCheerCount = messages.length - visibleCheerCount

      return {
        ...person,
        cheered: visibleCheerCount > 0,
        cheerSubmitted: Boolean(person.cheerSubmitted || messages.length),
        visibleCheerCount,
        hiddenCheerCount,
      }
    })

    const teamStats = this.teams
      .map((team) => {
        const baselineStars = this.testMode ? team.baseStars : 0
        const baselineVoters = this.testMode ? team.baseVoters : 0
        const dynamicStars = participantList.reduce((sum, person) => sum + (person.allocations[team.id] || 0), 0)
        const dynamicVoters = participantList.filter((person) => (person.allocations[team.id] || 0) > 0).length

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
      closed: this.closed,
      closesAt: this.closesAt,
      lastRaffle: this.lastRaffle,
      sessionId: this.sessionId,
      testMode: this.testMode,
      settings: this.settings,
      copy: this.copy,
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
    this.validTeamIds = new Set(this.teams.map((team) => team.id))
    this.cleanupInvalidTeamReferences()
    this.lastRaffle = null
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

  private openEventStream() {
    let controllerRef: ReadableStreamDefaultController<Uint8Array>
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controllerRef = controller
        this.clients.add(controller)
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

  private async commit() {
    await this.persist()
    this.broadcast()
  }

  private broadcast() {
    for (const client of this.clients) {
      this.sendState(client)
    }
  }

  private sendState(controller: ReadableStreamDefaultController<Uint8Array>) {
    try {
      controller.enqueue(encoder.encode(`event: state\ndata: ${JSON.stringify(this.getState())}\n\n`))
    } catch {
      this.clients.delete(controller)
    }
  }

  private normalizeAllocations(input: unknown) {
    const normalized: Record<string, number> = {}
    let remaining = this.settings.starBudget

    if (!input || typeof input !== 'object') return normalized

    for (const [teamId, rawValue] of Object.entries(input as Record<string, unknown>)) {
      if (!this.validTeamIds.has(teamId)) continue

      const value = Math.max(0, Math.floor(Number(rawValue) || 0))
      const next = Math.min(value, remaining, maxStarsPerTeam)

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

  private upsertParticipant(deviceIdValue: unknown, nameValue: unknown, groupValue: unknown) {
    const browserDeviceId = sanitizeIdentifier(deviceIdValue, 96)
    if (!browserDeviceId) return null

    const nextName = sanitizeText(nameValue, 18)
    const nextGroup = sanitizeLetsId(groupValue, 48)
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
        allocations: {},
        cheered: false,
        cheerSubmitted: false,
        updatedAt: Date.now(),
      } satisfies Participant)

    attachParticipantDevice(person, browserDeviceId)
    person.name = nextName
    person.group = nextGroup
    person.updatedAt = Date.now()
    this.participants.set(id, person)
    return person
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
    const leaderId = state.teams[0]?.id
    const topTwoIds = state.teams.slice(0, 2).map((team) => team.id)
    const topThreeIds = state.teams.slice(0, 3).map((team) => team.id)

    return state.participants.filter((person: ParticipantState) => {
      const spent = sumStars(person.allocations)
      if (spent <= 0) return false
      if (!person.cheered) return false
      const allocationValues = Object.values(person.allocations || {}).filter((value) => value > 0)

      if (rule === 'leader') return Boolean(person.allocations[leaderId])
      if (rule === 'top2') return topTwoIds.every((teamId) => Boolean(person.allocations[teamId]))
      if (rule === 'top3') return topThreeIds.every((teamId) => Boolean(person.allocations[teamId]))
      if (rule === 'multi') return allocationValues.length >= 3
      if (rule === 'big') return allocationValues.some((value) => value >= 7)
      if (rule === 'cheer') return person.cheered
      return true
    })
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

  private async resetRuntimeState({ seed = false } = {}) {
    this.participants.clear()
    this.cheers = []
    this.voteEvents = []
    this.cheerId = 1
    this.voteEventId = 1
    this.sessionId += 1
    this.testMode = Boolean(seed)
    this.closed = false
    this.closesAt = Date.now() + this.settings.durationMinutes * 60 * 1000
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
        group: '테스트',
        allocations: { 'team-aurora': Math.min(this.settings.starBudget, 5) },
        message: '검색 데모가 바로 써볼 수 있어 보여요',
      },
      {
        id: 'test-seoyeon',
        name: '서연',
        group: '테스트',
        allocations: { 'team-prism': Math.min(this.settings.starBudget, 4) },
        message: '현장 적용성이 좋아요',
      },
      {
        id: 'test-yuna',
        name: '유나',
        group: '테스트',
        allocations: { 'team-vector': Math.min(this.settings.starBudget, 5) },
        message: '리뷰 시간이 줄어들 것 같아요',
      },
      {
        id: 'test-hana',
        name: '하나',
        group: '테스트',
        allocations: { 'team-lattice': Math.min(this.settings.starBudget, 3) },
        message: '장애 리포트 연결이 인상적입니다',
      },
      {
        id: 'test-doyeon',
        name: '도연',
        group: '테스트',
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
  }
}

function normalizeCopy(input: unknown): EventCopy {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const next = { ...defaultCopy }

  for (const key of Object.keys(defaultCopy) as Array<keyof typeof defaultCopy>) {
    if (typeof source[key] === 'string') {
      next[key] = sanitizeText(source[key], 240)
    }
  }

  return next
}

function normalizeTeam(teamValue: unknown, fallback: TeamConfig, index: number): TeamConfig {
  const team = teamValue && typeof teamValue === 'object' ? (teamValue as Record<string, unknown>) : {}
  const members = Array.isArray(team.members)
    ? team.members.map((member) => sanitizeText(member, 18)).filter(Boolean).slice(0, 3)
    : fallback.members
  const logo = validLogos.has(team.logo as LogoKind) ? (team.logo as LogoKind) : fallback.logo

  return {
    id: sanitizeSlug(team.id) || fallback.id || `team-${index + 1}`,
    code: sanitizeText(team.code, 8) || fallback.code || `${index + 1}`,
    name: sanitizeText(team.name, 32) || fallback.name || `Team ${index + 1}`,
    title: sanitizeText(team.title, 64) || fallback.title || '프로젝트명 미정',
    members,
    logoFile: sanitizeLogoPath(String(team.logoFile || fallback.logoFile || '')),
    baseStars: Math.max(0, Math.floor(Number(team.baseStars ?? fallback.baseStars ?? 0))),
    baseVoters: Math.max(0, Math.floor(Number(team.baseVoters ?? fallback.baseVoters ?? 0))),
    color: sanitizeColor(team.color) || fallback.color || '#A50034',
    logo,
    sortOrder: Math.max(0, Math.floor(Number(team.sortOrder ?? index))),
  }
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

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
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
  const pathValue = value.trim()
  if (!pathValue) return ''
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon);base64,[a-zA-Z0-9+/=]+$/i.test(pathValue) && pathValue.length < 600_000) {
    return pathValue
  }
  if (!/^\/?team-logos\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp|svg|ico)$/i.test(pathValue)) return ''

  return pathValue.startsWith('/') ? pathValue : `/${pathValue}`
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

function participantCookieHeader(deviceId: string) {
  return `${participantCookieName}=${encodeURIComponent(deviceId)}; Max-Age=${participantCookieMaxAge}; Path=/; SameSite=Lax`
}

function isRaffleRule(value: unknown): value is RaffleRule {
  return (
    value === 'all' ||
    value === 'leader' ||
    value === 'top2' ||
    value === 'top3' ||
    value === 'multi' ||
    value === 'big' ||
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
