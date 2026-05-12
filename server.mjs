import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT || 5173)
const host = process.env.HOST || '0.0.0.0'
const defaultStarBudget = 20
const defaultDurationMinutes = 10
const defaultMinScore = 5
const maxStarsPerTeam = 10
const participantCookieName = 'vibe-vote-participant'
const participantCookieMaxAge = 60 * 60 * 24 * 14
const teamsConfigPath = path.join(__dirname, 'teams.json')
const teamLogoDir = path.join(__dirname, 'public', 'team-logos')
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
  cheerButtonLabel: '응원 메시지 보내기',
  wallEyeline: 'Audience Wall',
  wallMetricStars: '누적 별',
  wallMetricCheers: '응원 메시지',
  wallOverviewLabel: '실시간 현황',
  wallCheerLabel: '응원메세지',
  wallRaffleLabel: '행운권추첨',
  wallShowupLabel: '말풍선 Showup',
  wallArenaEyeline: 'Live Arena Wall',
  wallArenaTitle: '실시간 별 현황',
  wallCheerEyeline: 'Cheer Board',
  wallCheerTitle: '응원 메시지',
  wallSelectedCheerSuffix: '응원 메시지',
  wallRaffleEyeline: 'Lucky Draw Showup',
  wallRaffleTitle: '행운권 추첨',
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

const appConfig = loadConfig()
let teams = appConfig.teams
let copy = appConfig.copy
let validTeamIds = new Set(teams.map((team) => team.id))
const participants = new Map()
const cheers = []
const voteEvents = []
const clients = new Set()

let closed = false
let closesAt = Date.now() + defaultDurationMinutes * 60 * 1000
let lastRaffle = null
let cheerId = 1
let voteEventId = 1
let sessionId = 1
let testMode = false
let settings = {
  showScoresToAudience: true,
  starBudget: defaultStarBudget,
  durationMinutes: defaultDurationMinutes,
  minScore: defaultMinScore,
  cheerNameMode: 'masked',
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
    }
  } catch (error) {
    console.warn(`teams.json을 읽지 못해 기본 팀 정보를 사용합니다: ${error.message}`)
    return {
      teams: defaultTeams.map(normalizeTeam),
      copy: defaultCopy,
    }
  }
}

function normalizeCopy(input) {
  const next = { ...defaultCopy }

  for (const key of Object.keys(defaultCopy)) {
    if (typeof input?.[key] === 'string') {
      next[key] = sanitizeText(input[key], 240)
    }
  }

  return next
}

function normalizeTeam(team, fallback = defaultTeams[0], index = 0) {
  const validLogos = new Set(['orbit', 'beam', 'grid', 'wave', 'core'])
  const members = Array.isArray(team?.members)
    ? team.members.map((member) => sanitizeText(member, 18)).filter(Boolean).slice(0, 3)
    : fallback.members || []
  const logo = validLogos.has(team?.logo) ? team.logo : fallback.logo || 'orbit'

  return {
    id: sanitizeSlug(team?.id) || fallback.id || `team-${index + 1}`,
    code: sanitizeText(team?.code, 8) || fallback.code || `${index + 1}`,
    name: sanitizeText(team?.name, 32) || fallback.name || `Team ${index + 1}`,
    title: sanitizeText(team?.title, 64) || fallback.title || '프로젝트명 미정',
    members,
    logoFile: sanitizeLogoPath(team?.logoFile || fallback.logoFile || ''),
    baseStars: Math.max(0, Math.floor(Number(team?.baseStars ?? fallback.baseStars ?? 0))),
    baseVoters: Math.max(0, Math.floor(Number(team?.baseVoters ?? fallback.baseVoters ?? 0))),
    color: sanitizeColor(team?.color) || fallback.color || '#A50034',
    logo,
    sortOrder: Math.max(0, Math.floor(Number(team?.sortOrder ?? index))),
  }
}

function sanitizeSlug(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48)
}

function sanitizeLogoPath(value) {
  const pathValue = String(value || '').trim()
  if (!pathValue || pathValue.includes('..')) return ''
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml|x-icon);base64,[a-zA-Z0-9+/=]+$/i.test(pathValue) && pathValue.length < 600_000) {
    return pathValue
  }
  if (!/^\/?[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|svg|ico)$/i.test(pathValue)) return ''
  return pathValue.startsWith('/') ? pathValue : `/${pathValue}`
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
  validTeamIds = new Set(teams.map((team) => team.id))
  cleanupInvalidTeamReferences()
  lastRaffle = null
  await persistTeamConfig()
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
    teams: teams
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((team, index) => ({
        id: team.id,
        code: team.code,
        name: team.name,
        title: team.title,
        members: team.members,
        logoFile: team.logoFile.startsWith('data:') ? '' : team.logoFile,
        color: team.color,
        logo: team.logo,
        baseStars: team.baseStars,
        baseVoters: team.baseVoters,
        sortOrder: team.sortOrder ?? index,
      })),
  }

  await writeFile(teamsConfigPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function getState() {
  if (!closed && Date.now() > closesAt) {
    closed = true
  }

  const participantList = [...participants.values()].map((person) => {
    const messages = cheers.filter((message) => message.participantId === person.id)
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
  const teamStats = teams
    .map((team) => {
      const baselineStars = testMode ? team.baseStars : 0
      const baselineVoters = testMode ? team.baseVoters : 0
      const dynamicStars = participantList.reduce((sum, person) => sum + (person.allocations[team.id] || 0), 0)
      const dynamicVoters = participantList.filter((person) => (person.allocations[team.id] || 0) > 0).length
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

  return {
    teams: rankedTeams,
    participants: participantList,
    cheers: cheers.slice(0, 120),
    voteEvents: voteEvents.slice(0, 100),
    closed,
    closesAt,
    lastRaffle,
    sessionId,
    testMode,
    settings,
    copy,
  }
}

function normalizeAllocations(input) {
  const normalized = {}
  let remaining = settings.starBudget

  for (const [teamId, rawValue] of Object.entries(input || {})) {
    if (!validTeamIds.has(teamId)) continue

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

function normalizeAllParticipantAllocations() {
  for (const person of participants.values()) {
    person.allocations = normalizeAllocations(person.allocations)
    person.updatedAt = Date.now()
  }
}

function upsertParticipant(deviceId, name, group) {
  const browserDeviceId = sanitizeIdentifier(deviceId, 96)
  if (!browserDeviceId) return null

  const nextName = sanitizeText(name, 18)
  const nextGroup = sanitizeLetsId(group, 48)
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
      allocations: {},
      cheered: false,
      cheerSubmitted: false,
      updatedAt: Date.now(),
    }

  attachParticipantDevice(person, browserDeviceId)
  person.name = nextName
  person.group = nextGroup
  person.updatedAt = Date.now()
  participants.set(id, person)
  return person
}

function getRaffleCandidates(rule) {
  const state = getState()
  const leaderId = state.teams[0]?.id
  const topTwoIds = state.teams.slice(0, 2).map((team) => team.id)
  const topThreeIds = state.teams.slice(0, 3).map((team) => team.id)

  return state.participants.filter((person) => {
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

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function sumStars(allocations) {
  return Object.values(allocations || {}).reduce((sum, value) => sum + value, 0)
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

function isCurrentSession(body) {
  return Number(body.sessionId) === sessionId
}

function participantCookieHeader(deviceId) {
  return `${participantCookieName}=${encodeURIComponent(deviceId)}; Max-Age=${participantCookieMaxAge}; Path=/; SameSite=Lax`
}

function resetRuntimeState({ seed = false } = {}) {
  participants.clear()
  cheers.splice(0)
  voteEvents.splice(0)
  cheerId = 1
  voteEventId = 1
  sessionId += 1
  testMode = Boolean(seed)
  closed = false
  closesAt = Date.now() + settings.durationMinutes * 60 * 1000
  lastRaffle = null

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
      group: '테스트',
      allocations: { 'team-aurora': Math.min(settings.starBudget, 5) },
      messages: ['검색 데모가 바로 써볼 수 있어 보여요', '발표 때 반응 좋을 것 같아요'],
    },
    {
      id: 'test-seoyeon',
      name: '서연',
      group: '테스트',
      allocations: { 'team-prism': Math.min(settings.starBudget, 4) },
      messages: ['현장 적용성이 좋아요'],
    },
    {
      id: 'test-yuna',
      name: '유나',
      group: '테스트',
      allocations: { 'team-vector': Math.min(settings.starBudget, 5) },
      messages: ['리뷰 요약이 선명해요'],
    },
    {
      id: 'test-hana',
      name: '하나',
      group: '테스트',
      allocations: { 'team-lattice': Math.min(settings.starBudget, 3) },
      messages: ['장애 원인 추적 기대됩니다'],
    },
    {
      id: 'test-doyeon',
      name: '도연',
      group: '테스트',
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

function broadcast() {
  const payload = `event: state\ndata: ${JSON.stringify(getState())}\n\n`

  for (const response of clients) {
    response.write(payload)
  }
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/state') {
    sendJson(response, 200, getState())
    return
  }

  if (request.method === 'GET' && url.pathname === '/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    response.write(`event: state\ndata: ${JSON.stringify(getState())}\n\n`)
    clients.add(response)
    request.on('close', () => clients.delete(response))
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 404, { error: 'not found' })
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
    const person = upsertParticipant(deviceId, body.name, body.group)
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
    sendJson(response, 200, getState(), { 'Set-Cookie': participantCookieHeader(deviceId) })
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
    const person = upsertParticipant(deviceId, body.name, body.group)
    const teamId = String(body.teamId || '')
    const text = sanitizeText(body.text, 64)

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
    cheers.splice(120)
    broadcast()
    sendJson(response, 200, getState(), { 'Set-Cookie': participantCookieHeader(deviceId) })
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
    broadcast()
    sendJson(response, 200, getState())
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
    broadcast()
    sendJson(response, 200, getState())
    return
  }

  if (url.pathname === '/api/raffle') {
    const rule = ['all', 'leader', 'top2', 'top3', 'multi', 'big', 'cheer'].includes(body.rule) ? body.rule : 'all'
    const winnerCount = Math.max(1, Math.min(8, Number(body.winnerCount) || 4))
    const candidates = getRaffleCandidates(rule)
    const winners = shuffle(candidates)
      .slice(0, Math.min(winnerCount, candidates.length))
      .map((person) => ({
        id: person.id,
        name: person.name,
        group: person.group,
        cheered: person.cheered,
      }))

    lastRaffle = {
      rule,
      winnerCount,
      candidates: candidates.length,
      winners,
      createdAt: Date.now(),
    }

    broadcast()
    sendJson(response, 200, getState())
    return
  }

  if (url.pathname === '/api/close') {
    closed = Boolean(body.closed)
    if (!closed && Date.now() > closesAt) {
      closesAt = Date.now() + settings.durationMinutes * 60 * 1000
    }
    broadcast()
    sendJson(response, 200, getState())
    return
  }

  if (url.pathname === '/api/register') {
    if (!isCurrentSession(body)) {
      sendJson(response, 409, { error: 'session expired' })
      return
    }

    const deviceId = getRequestDeviceId(request, body)
    const person = upsertParticipant(deviceId, body.name, body.group)
    if (!person) {
      sendJson(response, 400, { error: 'name and group required' })
      return
    }

    broadcast()
    sendJson(response, 200, getState(), { 'Set-Cookie': participantCookieHeader(deviceId) })
    return
  }

  if (url.pathname === '/api/settings') {
      const nextStarBudget = Math.max(1, Math.min(20, Math.floor(Number(body.starBudget) || settings.starBudget)))
      const nextDurationMinutes = Math.max(1, Math.min(240, Math.floor(Number(body.durationMinutes) || settings.durationMinutes)))
      const nextMinScore = clamp(Number(body.minScore ?? settings.minScore), 0, 9.9)

    settings = {
      ...settings,
      showScoresToAudience:
        typeof body.showScoresToAudience === 'boolean' ? Boolean(body.showScoresToAudience) : settings.showScoresToAudience,
      starBudget: nextStarBudget,
      durationMinutes: nextDurationMinutes,
      minScore: nextMinScore,
      cheerNameMode: normalizeCheerNameMode(body.cheerNameMode, settings.cheerNameMode),
    }
    normalizeAllParticipantAllocations()
    closed = false
    closesAt = Date.now() + settings.durationMinutes * 60 * 1000
    broadcast()
    sendJson(response, 200, getState())
    return
  }

  if (url.pathname === '/api/team-config') {
    try {
      await applyTeamConfig(body)
      broadcast()
      sendJson(response, 200, getState())
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'invalid team config' })
    }
    return
  }

  if (url.pathname === '/api/reset') {
    resetRuntimeState({ seed: Boolean(body.seed) })
    broadcast()
    sendJson(response, 200, getState())
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
  for (const response of clients) {
    response.write(': ping\n\n')
  }
}, 25_000)

server.listen(port, host, () => {
  console.log(`${copy.appTitle} running at http://${host}:${port}`)
})
