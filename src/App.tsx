import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import {
  Check,
  Clock3,
  Eye,
  EyeOff,
  Gift,
  Maximize2,
  Megaphone,
  Radio,
  Search,
  Sparkles,
  Star,
  Trophy,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import './App.css'

type LogoKind = 'orbit' | 'beam' | 'grid' | 'wave' | 'core'

type Team = {
  id: string
  code: string
  name: string
  title: string
  members: string[]
  logoFile?: string
  baseStars: number
  baseVoters: number
  color: string
  logo: LogoKind
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
  name: string
  group: string
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
  cheered: boolean
}

type LastRaffle = {
  rule: RaffleRule
  winnerCount: number
  candidates: number
  winners: RaffleWinner[]
  createdAt: number
}

type EventState = {
  teams: Team[]
  participants: Participant[]
  cheers: CheerMessage[]
  voteEvents: VoteEvent[]
  closed: boolean
  closesAt: number
  lastRaffle: LastRaffle | null
  sessionId: number
  settings: {
    showScoresToAudience: boolean
    starBudget: number
    durationMinutes: number
  }
  copy: EventCopy
}

type EventCopy = {
  appTitle: string
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
}

type RaffleRule = 'all' | 'leader' | 'top3' | 'cheer'
type ConnectionState = 'connecting' | 'live' | 'offline'
type AdminPanel = 'arena' | 'participants' | 'messages' | 'raffle'
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

const DEFAULT_STAR_BUDGET = 5
const DEFAULT_DURATION_MINUTES = 10
const MAX_STARS_PER_TEAM = 10
const storageKey = 'vibe-vote-participant'
const nameKey = 'vibe-vote-name'
const groupKey = 'vibe-vote-group'
const registeredKey = 'vibe-vote-registered'
const registeredSessionKey = 'vibe-vote-registered-session'
const cookieMaxAge = 60 * 60 * 24 * 14
const fallbackCopy: EventCopy = {
  appTitle: 'Vibe Vote Arena',
  audienceEyeline: 'Audience Vote',
  adminEyeline: 'Admin Arena Wall',
  audienceHeroTitle: '별 {starBudget}개를 원하는 팀에 나눠 담으세요.',
  audienceHeroSubtitle: '한 팀에는 최대 {maxStarsPerTeam}개까지, 마감 전까지 다시 조정할 수 있습니다.',
  adminHeroTitle: '관리자 모드에서 실시간 별 현황을 공개합니다.',
  adminHeroSubtitle: '모바일 사용자가 보낸 별과 응원 메시지가 이 화면에 즉시 반영됩니다.',
  checkInEyeline: 'Check In',
  checkInTitle: '먼저 이름과 소속(팀명)을 등록하세요.',
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
  registrationReady: '같은 기기에서 같은 이름과 소속으로 다시 접속하면 기존 참여 내역을 이어갑니다.',
  registrationConnecting: '행사 서버에 연결하는 중입니다.',
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
    color: '#D05A67',
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
    color: '#A66B2A',
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
    color: '#17816E',
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
    color: '#6A4FB3',
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
    color: '#D5643A',
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
    color: '#4F6B4A',
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
    color: '#C24D86',
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
    color: '#46515F',
    logo: 'core',
    totalStars: 57,
    voters: 22,
    rank: 10,
    share: 45,
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
  closed: false,
  closesAt: Date.now() + 10 * 60 * 1000,
  lastRaffle: null,
  sessionId: 0,
  settings: {
    showScoresToAudience: true,
    starBudget: DEFAULT_STAR_BUDGET,
    durationMinutes: DEFAULT_DURATION_MINUTES,
  },
  copy: fallbackCopy,
}

const fallbackTeamOrder = new Map(fallbackTeams.map((team, index) => [team.id, index]))
const messageTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

function App() {
  const mode = window.location.pathname.startsWith('/admin') ? 'admin' : 'vote'
  const { state, connection, post } = useEventState()
  const [participantId] = useState(getOrCreateParticipantId)
  const [name, setName] = useState(() => getStoredValue(nameKey))
  const [group, setGroup] = useState(() => getStoredValue(groupKey))

  const participant = state.participants.find((person) => isSameParticipantIdentity(person, participantId, name, group))
  const allocations = participant?.allocations ?? {}
  const starBudget = getStarBudget(state)
  const spentStars = sumStars(allocations)
  const remainingStars = Math.max(0, starBudget - spentStars)

  const saveName = (nextName: string) => {
    setName(nextName)
    storeValue(nameKey, nextName)
  }

  const saveGroup = (nextGroup: string) => {
    setGroup(nextGroup)
    storeValue(groupKey, nextGroup)
  }

  return (
    <main className="app-shell">
      <Header mode={mode} connection={connection} state={state} />
      {mode === 'admin' ? (
        <AdminView state={state} connection={connection} post={post} />
      ) : (
        <VoteView
          state={state}
          participantId={participantId}
          participant={participant}
          name={name}
          group={group}
          onNameChange={saveName}
          onGroupChange={saveGroup}
          allocations={allocations}
          spentStars={spentStars}
          remainingStars={remainingStars}
          starBudget={starBudget}
          post={post}
        />
      )}
    </main>
  )
}

function Header({ mode, connection, state }: { mode: 'admin' | 'vote'; connection: ConnectionState; state: EventState }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const secondsLeft = Math.max(0, Math.floor((state.closesAt - now) / 1000))

  return (
    <header className="topbar" aria-label="행사 상태">
      <div className="brand-lockup">
        <div className="lg-dot" aria-hidden="true">
          V
        </div>
        <div>
          <p className="eyeline">{mode === 'admin' ? state.copy.adminEyeline : state.copy.audienceEyeline}</p>
          <h1>{state.copy.appTitle}</h1>
        </div>
      </div>

      <div className="event-controls">
        <a className={mode === 'vote' ? 'mode-link active' : 'mode-link'} href="/vote">
          사용자
        </a>
        <a className={mode === 'admin' ? 'mode-link active' : 'mode-link'} href="/admin">
          관리자
        </a>
        <div className="short-url" aria-label="모바일 접속 주소">
          <Radio size={16} />
          <span>{window.location.host}/vote</span>
        </div>
        <div className={`timer ${state.closed ? 'closed' : ''}`}>
          <Clock3 size={18} />
          <span>{state.closed ? '투표 마감' : formatTime(secondsLeft)}</span>
        </div>
        <div className={`connection ${connection}`}>
          <span className="live-dot" />
          <span>{connection === 'live' ? 'Live' : connection === 'connecting' ? '연결 중' : '오프라인 데모'}</span>
        </div>
      </div>
    </header>
  )
}

function VoteView({
  state,
  participantId,
  participant,
  name,
  group,
  onNameChange,
  onGroupChange,
  allocations,
  spentStars,
  remainingStars,
  starBudget,
  post,
}: {
  state: EventState
  participantId: string
  participant: Participant | undefined
  name: string
  group: string
  onNameChange: (name: string) => void
  onGroupChange: (group: string) => void
  allocations: Record<string, number>
  spentStars: number
  remainingStars: number
  starBudget: number
  post: (path: string, body: unknown) => Promise<EventState | null>
}) {
  const [hasRegistered, setHasRegistered] = useState(() => getStoredValue(registeredKey) === '1')
  const [registeredSession, setRegisteredSession] = useState(() => getStoredValue(registeredSessionKey))
  const [cheerTexts, setCheerTexts] = useState<Record<string, string>>({})
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const cheerThreadRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const audienceTeams = useMemo(() => {
    return [...state.teams].sort((a, b) => (fallbackTeamOrder.get(a.id) ?? 0) - (fallbackTeamOrder.get(b.id) ?? 0))
  }, [state.teams])
  const hasRegistrationInfo = Boolean(name.trim() && group.trim())
  const sessionReady = state.sessionId > 0
  const sessionRegistered = hasRegistered && registeredSession === String(state.sessionId)
  const isRegistered = hasRegistrationInfo && (sessionRegistered || Boolean(participant))
  const canVote = sessionReady && isRegistered && !state.closed
  const perTeamStarLimit = Math.min(starBudget, MAX_STARS_PER_TEAM)
  const currentParticipantId = participant?.id ?? participantId
  const participantMessages = state.cheers.filter((message) => message.participantId === currentParticipantId)
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

  useEffect(() => {
    if (!expandedTeamId) return

    const thread = cheerThreadRefs.current[expandedTeamId]
    if (!thread) return

    window.requestAnimationFrame(() => {
      thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
    })
  }, [expandedTeamId, state.cheers.length])

  useEffect(() => {
    if (!sessionReady || !hasRegistrationInfo || !sessionRegistered || participant) return
    post('/api/register', {
      sessionId: state.sessionId,
      participantId,
      name: name.trim(),
      group: group.trim(),
    })
  }, [group, hasRegistrationInfo, name, participant, participantId, post, sessionReady, sessionRegistered, state.sessionId])

  const setTeamStars = async (teamId: string, targetStars: number) => {
    if (!canVote) return
    const current = allocations[teamId] ?? 0
    const target = Math.min(targetStars, perTeamStarLimit)
    const maxForTeam = Math.min(perTeamStarLimit, current + remainingStars)
    const nextStars = Math.min(current === target ? Math.max(0, target - 1) : target, maxForTeam)

    await updateVote(post, state.sessionId, participantId, name, group, { ...allocations, [teamId]: nextStars })
  }

  const registerParticipant = async () => {
    if (!sessionReady || !hasRegistrationInfo) return
    const response = await post('/api/register', {
      sessionId: state.sessionId,
      participantId,
      name: name.trim(),
      group: group.trim(),
    })
    if (response) {
      storeValue(registeredKey, '1')
      storeValue(registeredSessionKey, String(response.sessionId))
      setRegisteredSession(String(response.sessionId))
      setHasRegistered(true)
    }
  }

  const sendCheer = async (teamId: string) => {
    const text = (cheerTexts[teamId] ?? '').trim()
    if (!canVote || !teamId || !text || (allocations[teamId] ?? 0) <= 0) return

    const response = await post('/api/cheer', {
      sessionId: state.sessionId,
      participantId,
      name: name.trim(),
      group: group.trim(),
      teamId,
      text,
    })

    if (response) {
      setCheerTexts((current) => ({ ...current, [teamId]: '' }))
    }
  }

  const handleCheerKeyDown = (teamId: string, event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

    event.preventDefault()
    sendCheer(teamId)
  }

  return (
    <>
      <section className="hero-band audience">
        <div>
          <h2>{formatCopy(state.copy.audienceHeroTitle, { starBudget, maxStarsPerTeam: MAX_STARS_PER_TEAM })}</h2>
          <p>{formatCopy(state.copy.audienceHeroSubtitle, { starBudget, maxStarsPerTeam: MAX_STARS_PER_TEAM })}</p>
        </div>
        <StarWallet remainingStars={remainingStars} spentStars={spentStars} starBudget={starBudget} />
      </section>

      {!isRegistered ? (
        <section className="registration-shell" aria-label="참여자 등록">
          <div className="section-heading compact">
            <div>
              <p className="section-kicker">{state.copy.checkInEyeline}</p>
              <h2>{state.copy.checkInTitle}</h2>
            </div>
          </div>
          <div className="registration-form">
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
              <span>소속(팀명)</span>
              <input
                value={group}
                maxLength={24}
                onChange={(event) => onGroupChange(event.target.value)}
                placeholder="예: 품질혁신팀"
              />
            </label>
            <button type="button" onClick={registerParticipant} disabled={!hasRegistrationInfo || !sessionReady}>
              <Check size={17} />
              등록하고 투표 시작
            </button>
          </div>
          <p className="registration-note">
            {sessionReady ? state.copy.registrationReady : state.copy.registrationConnecting}
          </p>
        </section>
      ) : (
        <section className="direct-vote-grid">
          <section className="team-catalog direct" aria-label="팀별 별 투표">
            <div className="section-heading compact">
              <div>
                <p className="section-kicker">{state.copy.teamVoteEyeline}</p>
                <h2>{state.copy.teamVoteTitle}</h2>
              </div>
              <div className="participant-chip">
                <strong>{name}</strong>
                <span>{group}</span>
              </div>
            </div>

            <div className={`raffle-status ${raffleReady ? 'ready' : ''}`} aria-live="polite">
              <Gift size={18} />
              <span>{raffleStatusText}</span>
            </div>

            {state.closed ? <p className="inline-alert">{state.copy.voteClosedAlert}</p> : null}

            <div className="direct-team-list">
              {audienceTeams.map((team) => {
                const myStars = allocations[team.id] ?? 0
                const canCheerForTeam = canVote && myStars > 0
                const maxSelectable = Math.min(perTeamStarLimit, myStars + remainingStars)
                const expanded = expandedTeamId === team.id
                const teamCheers = state.cheers
                  .filter((message) => message.teamId === team.id && !message.hidden)
                  .sort((a, b) => a.createdAt - b.createdAt)
                  .slice(-6)

                return (
                  <article className={`direct-team ${myStars > 0 ? 'has-stars' : ''}`} key={team.id}>
                    <div className="direct-team-head">
                      <button
                        type="button"
                        className="direct-team-summary"
                        onClick={() => setExpandedTeamId(expanded ? null : team.id)}
                        aria-expanded={expanded}
                      >
                        <LogoMark team={team} />
                        <div className="direct-team-copy">
                          <strong>{team.name}</strong>
                          <span>{team.title}</span>
                        </div>
                        <small>{expanded ? '닫기' : '응원 메시지'}</small>
                      </button>

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
                        <span>{myStars} / {perTeamStarLimit}</span>
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
                                  <strong>{message.participantId === currentParticipantId ? '나' : message.author}</strong>
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
                            maxLength={64}
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
                            <Megaphone size={15} />
                            전송
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

function AdminView({
  state,
  connection,
  post,
}: {
  state: EventState
  connection: ConnectionState
  post: (path: string, body: unknown) => Promise<EventState | null>
}) {
  const [raffleRule, setRaffleRule] = useState<RaffleRule>('all')
  const [winnerCount, setWinnerCount] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showCheerConstellation, setShowCheerConstellation] = useState(
    () => new URLSearchParams(window.location.search).get('showCheer') === '1',
  )
  const [activePanel, setActivePanel] = useState<AdminPanel | null>(null)
  const starBudget = getStarBudget(state)
  const durationMinutes = getDurationMinutes(state)
  const totalRegistered = state.participants.length
  const totalDynamicVoters = state.participants.filter((person) => sumStars(person.allocations) > 0).length
  const totalDynamicStars = state.participants.reduce((sum, person) => sum + sumStars(person.allocations), 0)
  const totalEligibleParticipants = state.participants.filter((person) => {
    const spent = sumStars(person.allocations)
    if (spent <= 0) return false
    return state.cheers.some((message) => message.participantId === person.id && !message.hidden)
  }).length

  const drawWinners = async () => {
    setIsDrawing(true)
    await new Promise((resolve) => window.setTimeout(resolve, 1600))
    await post('/api/raffle', { rule: raffleRule, winnerCount })
    setIsDrawing(false)
  }

  const closeVote = () => {
    post('/api/close', { closed: !state.closed })
  }

  const applySettings = (form: HTMLFormElement) => {
    const data = new FormData(form)

    post('/api/settings', {
      starBudget: data.get('starBudget'),
      durationMinutes: data.get('durationMinutes'),
    })
  }

  const resetLive = () => {
    post('/api/reset', { seed: false })
  }

  const seedTestData = () => {
    post('/api/reset', { seed: true })
  }

  return (
    <>
      {showCheerConstellation ? (
        <CheerConstellation state={state} starBudget={starBudget} onClose={() => setShowCheerConstellation(false)} />
      ) : null}
      {activePanel ? (
        <AdminDetailPanel title={getAdminPanelTitle(activePanel)} onClose={() => setActivePanel(null)}>
          {activePanel === 'arena' ? <ArenaDetailPanel state={state} starBudget={starBudget} /> : null}
          {activePanel === 'participants' ? <ParticipantDetailPanel state={state} /> : null}
          {activePanel === 'messages' ? <MessageManagerDetail state={state} post={post} /> : null}
          {activePanel === 'raffle' ? (
            <RaffleDetailPanel
              state={state}
              raffleRule={raffleRule}
              winnerCount={winnerCount}
              isDrawing={isDrawing}
              onRuleChange={setRaffleRule}
              onWinnerCountChange={setWinnerCount}
              onDraw={drawWinners}
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
          key={`${starBudget}:${durationMinutes}`}
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
            <span>투표 타이머</span>
            <div className="inline-input">
              <input
                name="durationMinutes"
                type="number"
                min={1}
                max={240}
                defaultValue={durationMinutes}
              />
              <em>분</em>
            </div>
          </label>
          <button type="submit">
            <Clock3 size={16} />
            설정 적용
          </button>
          <button type="button" className="secondary-control" onClick={resetLive}>
            Reset
          </button>
          <button type="button" className="secondary-control" onClick={seedTestData}>
            테스트 데이터
          </button>
        </form>
        <p className="control-note">
          현재 중복 응모 방지는 브라우저 쿠키 기준입니다. 실제 행사에서는 사번/SSO 또는 1회용 QR 토큰으로 체크인하는 방식이 필요합니다.
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
              <button type="button" className="panel-open-button" onClick={() => setActivePanel('arena')}>
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
                return <TeamRow key={team.id} team={team} recentEvent={recentEvent} starBudget={starBudget} />
              })}
            </div>
          </div>
        </section>

        <aside className="admin-side">
          <CheerWall state={state} onOpen={() => setShowCheerConstellation(true)} />
          <VoteActivityFeed state={state} />
          <ParticipantListPanel state={state} onOpen={() => setActivePanel('participants')} />
          <CheerModerationPanel state={state} post={post} onOpen={() => setActivePanel('messages')} />
          <RafflePanel
            state={state}
            raffleRule={raffleRule}
            winnerCount={winnerCount}
            isDrawing={isDrawing}
            onRuleChange={setRaffleRule}
            onWinnerCountChange={setWinnerCount}
            onDraw={drawWinners}
            onOpen={() => setActivePanel('raffle')}
          />
        </aside>
      </section>
    </>
  )
}

function getAdminPanelTitle(panel: AdminPanel) {
  if (panel === 'arena') return '실시간 별 현황 전체화면'
  if (panel === 'participants') return '실참여자 전체 리스트'
  if (panel === 'messages') return '응원 메시지 전체 관리'
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

function ArenaDetailPanel({ state, starBudget }: { state: EventState; starBudget: number }) {
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
          return <TeamRow key={team.id} team={team} recentEvent={recentEvent} starBudget={starBudget} compact />
        })}
      </div>
    </section>
  )
}

function TeamRow({
  team,
  recentEvent,
  starBudget,
  compact = false,
}: {
  team: Team
  recentEvent?: VoteEvent
  starBudget: number
  compact?: boolean
}) {
  const burstCount = recentEvent ? Math.min(starBudget, MAX_STARS_PER_TEAM, Math.abs(recentEvent.delta)) : 0
  const rankDelta = team.rankDelta ?? 0
  const rankMoveClass = rankDelta > 0 ? 'up' : rankDelta < 0 ? 'down' : 'same'
  const normalizedScore = formatPointScore(team.score ?? team.share / 10)

  return (
    <div
      className={`team-row ${compact ? 'compact-row' : ''}`}
      style={
        {
          '--team-color': team.color,
          '--share': `${team.share}%`,
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
          <h3>{team.name}</h3>
          <p>{team.title}</p>
        </div>
        <div className="progress-line">
          <div className="progress-track" aria-hidden="true">
            <span />
          </div>
          <em>{normalizedScore}점</em>
        </div>
      </div>
      <div className="score-stack">
        <div className="score-main">
          <strong>{team.totalStars}</strong>
        </div>
        <span>stars</span>
      </div>

      {recentEvent && burstCount > 0 ? (
        <div
          className={`star-burst ${recentEvent.delta > 0 ? 'gain' : 'loss'}`}
          key={recentEvent.id}
          aria-hidden="true"
        >
          <small>{recentEvent.author}</small>
          <div>
            {Array.from({ length: burstCount }).map((_, index) => (
              <span key={index} style={{ '--i': index } as CSSProperties}>
                {recentEvent.delta > 0 ? '★' : '-'}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="stat-popover" role="tooltip">
        <strong>{team.name}</strong>
        <span>총 별 {team.totalStars}개</span>
        <span>참여자 {team.voters}명</span>
        <span>환산점수 {normalizedScore}점</span>
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

function ParticipantDetailPanel({ state }: { state: EventState }) {
  const participants = useMemo(() => getParticipantSummaries(state), [state])

  return (
    <div className="detail-list participant-detail-list">
      {participants.length ? (
        participants.map((person) => (
          <article className={`participant-row detail ${person.statusClass}`} key={person.id}>
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
  post: (path: string, body: unknown) => Promise<EventState | null>
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
  post: (path: string, body: unknown) => Promise<EventState | null>
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

function CheerConstellation({
  state,
  starBudget,
  onClose,
}: {
  state: EventState
  starBudget: number
  onClose: () => void
}) {
  const [openMessageId, setOpenMessageId] = useState<number | null>(null)
  const [dragPositions, setDragPositions] = useState<Record<string, Point>>({})
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [isScattering, setIsScattering] = useState(false)
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
  const scatterTimersRef = useRef<number[]>([])
  const scatterRoundRef = useRef(0)
  const teamMap = useMemo(() => new Map(state.teams.map((team) => [team.id, team])), [state.teams])
  const participantMap = useMemo(
    () => new Map(state.participants.map((participant) => [participant.id, participant])),
    [state.participants],
  )

  useEffect(() => {
    const releaseTimers = releaseTimersRef.current
    const scatterTimers = scatterTimersRef.current

    return () => {
      for (const timer of Object.values(releaseTimers)) {
        window.clearTimeout(timer)
      }
      for (const timer of scatterTimers) {
        window.clearTimeout(timer)
      }
    }
  }, [])

  const teamCenters = useMemo(() => {
    const centers = [
      { x: 18, y: 27 },
      { x: 39, y: 24 },
      { x: 62, y: 27 },
      { x: 81, y: 39 },
      { x: 28, y: 52 },
      { x: 51, y: 51 },
      { x: 73, y: 61 },
      { x: 20, y: 74 },
      { x: 48, y: 76 },
      { x: 74, y: 79 },
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
      const starRange = Math.min(starBudget, MAX_STARS_PER_TEAM)
      const starCount = Math.max(0, Math.min(starRange, participant?.allocations[group.teamId] ?? 0))
      const messageBonus = Math.min(Math.max(group.messages.length - 1, 0), 3) * 6
      const size = 72 + starCount * Math.max(18, 150 / starRange) + messageBonus

      return {
        ...group,
        latestMessage: group.messages[0],
        team,
        size,
        starCount,
      }
    })

    return layoutBubbleGroups(items, teamCenters, territoryCells)
  }, [participantMap, starBudget, state.cheers, state.teams, teamCenters, teamMap, territoryCells])

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

  const scatterBubbles = useCallback(() => {
    if (!groupedBubbles.length) return

    scatterRoundRef.current += 1
    setOpenMessageId(null)
    setIsScattering(true)

    for (const timer of Object.values(releaseTimersRef.current)) {
      window.clearTimeout(timer)
    }
    releaseTimersRef.current = {}

    for (const timer of scatterTimersRef.current) {
      window.clearTimeout(timer)
    }
    scatterTimersRef.current = []

    const round = scatterRoundRef.current
    const scattered = groupedBubbles.reduce<Record<string, Point>>((next, bubble, index) => {
      next[bubble.key] = getScatterPointForBubble(bubble.teamId, bubble.key, index, bubble.size, round, territoryCells, teamCenters)
      return next
    }, {})

    setDragPositions(scattered)

    scatterTimersRef.current.push(
      window.setTimeout(() => {
        setIsScattering(false)
      }, 900),
    )
    scatterTimersRef.current.push(
      window.setTimeout(() => {
        setDragPositions((current) => {
          const next = { ...current }
          for (const bubble of groupedBubbles) {
            delete next[bubble.key]
          }
          return next
        })
      }, 3900),
    )
  }, [groupedBubbles, teamCenters, territoryCells])

  return (
    <div className={`cheer-constellation ${isScattering ? 'is-scattering' : ''}`} role="dialog" aria-modal="true" aria-label="응원 메시지 쇼업">
      <div className="constellation-toolbar">
        <div>
          <p className="section-kicker">Cheer Showup</p>
          <h2>팀별 응원 메시지 구름</h2>
        </div>
        <div className="constellation-actions">
          <button type="button" className="shuffle-button" onClick={scatterBubbles}>
            <Sparkles size={16} />
            버블 섞기
          </button>
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
              <i aria-hidden="true" />
              <strong>{team.name}</strong>
              <small>{totalStars}★ · {count} messages</small>
            </div>
          )
        })}

        {groupedBubbles.map(
          ({ key, latestMessage, messages, author, team, x, y, size, starCount, depth, delay, drift, breathe, wobble }) => {
            const position = dragPositions[key] ?? { x, y }
            const isOpen = openMessageId === latestMessage.id
            const isDragging = draggingKey === key

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
                    '--x': `${position.x}%`,
                    '--y': `${position.y}%`,
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
                    <strong>{author}</strong>
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
  winnerCount,
  isDrawing,
  onRuleChange,
  onWinnerCountChange,
  onDraw,
  onOpen,
}: {
  state: EventState
  raffleRule: RaffleRule
  winnerCount: number
  isDrawing: boolean
  onRuleChange: (rule: RaffleRule) => void
  onWinnerCountChange: (count: number) => void
  onDraw: () => void
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
          <p className="section-kicker">Lucky Draw</p>
          <h2>행운권 추첨</h2>
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
            <option value="all">별 + 공개 응원 메시지 참여자</option>
            <option value="leader">현재 1위 팀에 별을 준 참여자</option>
            <option value="top3">현재 TOP3 모두에 별을 준 참여자</option>
            <option value="cheer">공개 응원 메시지 참여자</option>
          </select>
        </label>
        <label>
          <span>선발 인원</span>
          <input
            type="number"
            min={1}
            max={8}
            value={winnerCount}
            onChange={(event) => onWinnerCountChange(Number(event.target.value))}
          />
        </label>
        <button type="button" className={`draw-button ${isDrawing ? 'drawing' : ''}`} onClick={onDraw} disabled={isDrawing}>
          <Sparkles size={17} />
          {isDrawing ? '추첨 중' : '추첨 시작'}
        </button>
      </div>

      <div className={`draw-stage ${isDrawing ? 'drawing' : ''}`}>
        <div>
          <span>후보</span>
          <strong>{state.lastRaffle?.candidates ?? getRaffleCandidatesForRule(state, raffleRule).length}명</strong>
        </div>
        <div>
          <span>현재 1위</span>
          <strong>{state.teams[0]?.name ?? '-'}</strong>
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
          state.lastRaffle.winners.map((winner, index) => (
            <div className="winner" key={winner.id}>
              <span>{index + 1}</span>
              <strong>{winner.name}</strong>
              <small>{winner.group ? `${winner.group} · ` : ''}{winner.cheered ? '응원 메시지 참여' : '투표 참여'}</small>
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
  winnerCount,
  isDrawing,
  onRuleChange,
  onWinnerCountChange,
  onDraw,
}: {
  state: EventState
  raffleRule: RaffleRule
  winnerCount: number
  isDrawing: boolean
  onRuleChange: (rule: RaffleRule) => void
  onWinnerCountChange: (count: number) => void
  onDraw: () => void
}) {
  const previewCandidates = getRaffleCandidatesForRule(state, raffleRule)
  const reelNames = previewCandidates.slice(0, 12)
  const rollingNames = reelNames.length
    ? reelNames
    : [{ id: 'standby', name: '후보 대기', group: '', allocations: {}, cheered: false, updatedAt: 0 }]
  const winners = !isDrawing ? (state.lastRaffle?.winners ?? []) : []
  const hasWinners = winners.length > 0

  return (
    <div className="raffle-detail">
      <section className={`raffle-showcase ${isDrawing ? 'drawing' : ''} ${hasWinners ? 'has-winners' : ''}`} aria-live="polite">
        <CelebrationConfetti active={hasWinners} seedKey={state.lastRaffle?.createdAt ?? 0} />
        <div className="raffle-globe" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} style={{ '--i': index } as CSSProperties}>
              {index % 3 === 0 ? '★' : index % 3 === 1 ? '◆' : '•'}
            </span>
          ))}
          <div className="raffle-core">
            <Trophy size={54} />
            <strong>{isDrawing ? '추첨 중' : state.lastRaffle?.winners.length ? '당첨 확정' : '대기'}</strong>
          </div>
        </div>

        <div className="raffle-reel-large" aria-hidden="true">
          <div>
            {[...rollingNames, ...rollingNames, ...rollingNames].map((person, index) => (
              <span key={`${person.id}-${index}`}>{person.group ? `${person.name} · ${person.group}` : person.name}</span>
            ))}
          </div>
        </div>

        {hasWinners ? (
          <div className="raffle-winner-showcase">
            {winners.map((winner, index) => (
              <article key={winner.id} style={{ '--i': index } as CSSProperties}>
                <span>{index + 1}</span>
                <strong>{winner.name}</strong>
                <small>{winner.group ? `${winner.group} · ` : ''}{winner.cheered ? '응원 메시지 참여' : '투표 참여'}</small>
              </article>
            ))}
          </div>
        ) : (
          <p>{isDrawing ? '후보 이름을 섞는 중입니다.' : '룰과 인원을 정한 뒤 추첨을 시작하세요.'}</p>
        )}

        {hasWinners ? (
          <div className="gift-agent" aria-hidden="true">
            <span className="agent-head">V</span>
            <span className="agent-body" />
            <span className="agent-gift">
              <Gift size={34} />
            </span>
          </div>
        ) : null}
      </section>

      <aside className="raffle-detail-desk">
        <div className="raffle-controls">
          <label>
            <span>추첨 룰</span>
            <select value={raffleRule} onChange={(event) => onRuleChange(event.target.value as RaffleRule)}>
              <option value="all">별 + 공개 응원 메시지 참여자</option>
              <option value="leader">현재 1위 팀에 별을 준 참여자</option>
              <option value="top3">현재 TOP3 모두에 별을 준 참여자</option>
              <option value="cheer">공개 응원 메시지 참여자</option>
            </select>
          </label>
          <label>
            <span>선발 인원</span>
            <input
              type="number"
              min={1}
              max={8}
              value={winnerCount}
              onChange={(event) => onWinnerCountChange(Number(event.target.value))}
            />
          </label>
          <button type="button" className={`draw-button ${isDrawing ? 'drawing' : ''}`} onClick={onDraw} disabled={isDrawing}>
            <Sparkles size={17} />
            {isDrawing ? '추첨 중' : '추첨 시작'}
          </button>
        </div>

        <div className={`draw-stage ${isDrawing ? 'drawing' : ''}`}>
          <div>
            <span>후보</span>
            <strong>{previewCandidates.length}명</strong>
          </div>
          <div>
            <span>현재 1위</span>
            <strong>{state.teams[0]?.name ?? '-'}</strong>
          </div>
        </div>

        <div className="candidate-strip">
          {rollingNames.map((person) => (
            <span key={person.id}>{person.name}</span>
          ))}
        </div>
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

  return state.participants.filter((person) => {
    const spent = sumStars(person.allocations)
    if (spent <= 0) return false
    if (!person.cheered) return false

    if (rule === 'leader') return Boolean(leaderId && person.allocations[leaderId])
    if (rule === 'top3') return topThreeIds.every((teamId) => Boolean(person.allocations[teamId]))
    if (rule === 'cheer') return person.cheered
    return true
  })
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

function LogoMark({ team }: { team: Pick<Team, 'name' | 'logo' | 'color' | 'logoFile'> }) {
  return (
    <div
      className={`logo-mark ${team.logo}`}
      style={{ '--team-color': team.color } as CSSProperties}
      aria-label={`${team.name} 로고 자리`}
    >
      {team.logoFile ? <img src={team.logoFile} alt="" /> : null}
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

function useEventState() {
  const [state, setState] = useState<EventState>(fallbackState)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const lastRankStateRef = useRef<EventState | null>(null)

  const applyState = useCallback((nextState: EventState) => {
    const previousState = lastRankStateRef.current
    const previousRanks = previousState ? new Map(previousState.teams.map((team) => [team.id, team.rank])) : null
    const nextWithRankMovement = {
      ...nextState,
      copy: { ...fallbackCopy, ...(nextState.copy ?? {}) },
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
  }, [])

  useEffect(() => {
    let active = true

    fetch('/api/state')
      .then((response) => {
        if (!response.ok) throw new Error('state request failed')
        return response.json() as Promise<EventState>
      })
      .then((nextState) => {
        if (active) {
          applyState(nextState)
          setConnection('live')
        }
      })
      .catch(() => {
        if (active) setConnection('offline')
      })

    const events = new EventSource('/events')
    events.onopen = () => setConnection('live')
    events.addEventListener('state', (event) => {
      applyState(JSON.parse((event as MessageEvent).data) as EventState)
      setConnection('live')
    })
    events.onerror = () => setConnection('offline')

    return () => {
      active = false
      events.close()
    }
  }, [applyState])

  const post = useCallback(async (path: string, body: unknown) => {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error(`${path} failed`)
      const nextState = (await response.json()) as EventState
      applyState(nextState)
      setConnection('live')
      return nextState
    } catch {
      setConnection('offline')
      return null
    }
  }, [applyState])

  return { state, connection, post }
}

async function updateVote(
  post: (path: string, body: unknown) => Promise<EventState | null>,
  sessionId: number,
  participantId: string,
  name: string,
  group: string,
  allocations: Record<string, number>,
) {
  await post('/api/vote', {
    sessionId,
    participantId,
    name: name.trim(),
    group: group.trim(),
    allocations,
  })
}

function getOrCreateParticipantId() {
  const existing = getCookie(storageKey) || localStorage.getItem(storageKey)
  if (existing) {
    storeValue(storageKey, existing)
    return existing
  }

  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `participant-${Date.now()}-${Math.random().toString(16).slice(2)}`

  storeValue(storageKey, next)
  return next
}

function isSameParticipantIdentity(person: Participant, deviceId: string, name: string, group: string) {
  if (person.id === deviceId) return true

  return (
    person.deviceId === deviceId &&
    normalizeParticipantIdentityPart(person.name) === normalizeParticipantIdentityPart(name) &&
    normalizeParticipantIdentityPart(person.group) === normalizeParticipantIdentityPart(group)
  )
}

function normalizeParticipantIdentityPart(value: string) {
  return value.replace(/\s+/g, ' ').trim().normalize('NFKC').toLocaleLowerCase('ko-KR')
}

function getStoredValue(key: string) {
  return localStorage.getItem(key) || getCookie(key) || ''
}

function storeValue(key: string, value: string) {
  localStorage.setItem(key, value)
  setCookie(key, value)
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

function sumStars(allocations: Record<string, number>) {
  return Object.values(allocations).reduce((sum, value) => sum + value, 0)
}

function getStarBudget(state: EventState) {
  return clamp(Math.floor(state.settings.starBudget || DEFAULT_STAR_BUDGET), 1, 20)
}

function getDurationMinutes(state: EventState) {
  return clamp(Math.floor(state.settings.durationMinutes || DEFAULT_DURATION_MINUTES), 1, 240)
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match))
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
  const maxStars = Math.max(...teams.map((team) => team.totalStars), 1)
  const minStars = Math.min(...teams.map((team) => team.totalStars), maxStars)
  const starRange = Math.max(1, maxStars - minStars)

  const sites = teams.map((team) => {
    const center = centers.get(team.id) ?? { x: 50, y: 50 }
    const normalized = (team.totalStars - minStars) / starRange
    const radius = 122 + normalized * 86

    return {
      team,
      x: (center.x / 100) * width,
      y: (center.y / 100) * height,
      power: radius * radius,
      share: Math.max(0.16, team.totalStars / maxStars),
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
      delay: `${-(index % 13) * 0.28}s`,
      drift: `${4.8 + (index % 7) * 0.52}s`,
      breathe: `${3.2 + (index % 5) * 0.36}s`,
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

function constrainFieldPointToStage(point: Point, bubbleSize: number) {
  const margin = bubbleSize ? bubbleSize * 0.52 + 10 : 0

  return {
    x: clamp(point.x, margin, 1000 - margin),
    y: clamp(point.y, margin, 600 - margin),
  }
}

function getScatterPointForBubble(
  teamId: string,
  key: string,
  index: number,
  size: number,
  round: number,
  territories: TerritoryCell[],
  centers: Map<string, Point>,
) {
  const cell = territories.find((territory) => territory.team.id === teamId)
  const center = centers.get(teamId) ?? { x: 50, y: 50 }
  const labelPoint = {
    x: (center.x / 100) * 1000,
    y: (center.y / 100) * 600,
  }

  if (cell?.polygon.length) {
    const bounds = getPolygonBounds(cell.polygon)
    const minimumFromLabel = 78 + size * 0.44
    const stageMargin = size * 0.52 + 10

    for (let attempt = 0; attempt < 34; attempt += 1) {
      const seed = `${key}:${round}:${attempt}`
      const candidate = {
        x: bounds.minX + hashToUnit(`${seed}:x`) * (bounds.maxX - bounds.minX),
        y: bounds.minY + hashToUnit(`${seed}:y`) * (bounds.maxY - bounds.minY),
      }
      const isInsideStage =
        candidate.x >= stageMargin &&
        candidate.x <= 1000 - stageMargin &&
        candidate.y >= stageMargin &&
        candidate.y <= 600 - stageMargin

      if (isInsideStage && pointInPolygon(candidate, cell.polygon) && distance(candidate, labelPoint) > minimumFromLabel) {
        return {
          x: clamp((candidate.x / 1000) * 100, 4.5, 95.5),
          y: clamp((candidate.y / 600) * 100, 7, 93),
        }
      }
    }
  }

  const angle = hashToUnit(`${key}:${round}:angle`) * Math.PI * 2 + index * 0.68
  const radiusX = 16 + hashToUnit(`${key}:${round}:rx`) * 24
  const radiusY = 12 + hashToUnit(`${key}:${round}:ry`) * 20

  return constrainPercentPointToTerritory(
    teamId,
    {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY,
    },
    territories,
    centers,
    size,
  )
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

function getPolygonBounds(polygon: Point[]) {
  return polygon.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
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
