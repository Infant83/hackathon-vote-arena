import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const args = parseArgs(process.argv.slice(2))
const configPath = path.resolve(rootDir, args.config || process.env.EVENT_CONFIG_FILE || 'teams.json')
const auditAllConfigs = Boolean(args['all-configs'])
const targetUrl = normalizeBaseUrl(args.url || process.env.AUDIT_URL || 'http://127.0.0.1:5173')
const passcode = String(args.passcode || process.env.ADMIN_PASSCODE || '').trim()
const skipServer = Boolean(args['no-server'])
const strict = Boolean(args.strict)
const checks = []

main().catch((error) => {
  addCheck('audit-runner', 'fail', 'Audit 실행 중 오류가 발생했습니다.', error.message || String(error))
  printReport()
  process.exitCode = 1
})

async function main() {
  await auditStaticFiles(await getAuditConfigPaths())
  if (!skipServer) await auditRuntimeServer()

  printReport()
  const hasFail = checks.some((check) => check.status === 'fail')
  const hasWarn = checks.some((check) => check.status === 'warn')
  process.exitCode = hasFail || (strict && hasWarn) ? 1 : 0
}

async function auditStaticFiles(configPaths) {
  for (const currentConfigPath of configPaths) {
    const eventConfig = await readJsonFile(currentConfigPath)
    const relativeConfigPath = path.relative(rootDir, currentConfigPath) || path.basename(currentConfigPath)
    const prefix = getConfigCheckPrefix(relativeConfigPath)
    addCheck(
      `${prefix}:file`,
      eventConfig ? 'pass' : 'fail',
      eventConfig ? `행사 JSON을 읽었습니다: ${relativeConfigPath}` : `행사 JSON을 읽지 못했습니다: ${relativeConfigPath}`,
      auditAllConfigs ? 'event-configs 폴더의 JSON 파일을 확인하세요.' : 'EVENT_CONFIG_FILE 또는 --config 값을 확인하세요.',
    )

    if (eventConfig) auditEventConfig(eventConfig, relativeConfigPath)
  }

  const wrangler = await readJsonFile(path.join(rootDir, 'wrangler.jsonc'), { jsonc: true })
  addCheck(
    'wrangler-config',
    wrangler ? 'pass' : 'fail',
    wrangler ? 'wrangler.jsonc를 읽었습니다.' : 'wrangler.jsonc를 읽지 못했습니다.',
    'Cloudflare 배포 전에는 wrangler 설정 점검이 필요합니다.',
  )
  if (wrangler) auditWrangler(wrangler)
}

function auditEventConfig(config, relativeConfigPath) {
  const prefix = getConfigCheckPrefix(relativeConfigPath)
  const event = config.event && typeof config.event === 'object' ? config.event : {}
  const appTitle = String(config.copy?.appTitle || '')
  const wallPanels = normalizePanels(config.settings?.wallEnabledPanels)
  const teams = Array.isArray(config.teams) ? config.teams : []
  const quizzes = Array.isArray(config.quizzes) ? config.quizzes : []
  const enabledQuizCount = quizzes.filter((quiz) => quiz?.enabled !== false && quiz?.question && quiz?.answer).length
  const eventFeatures = getEventFeatures(config, wallPanels, teams.length, enabledQuizCount)
  const inlineMedia = collectInlineMedia(config)
  const remoteMedia = collectRemoteMedia(config)
  const inlineMediaTotal = inlineMedia.reduce((total, item) => total + item.bytes, 0)
  const largestInlineMedia = inlineMedia.reduce((largest, item) => item.bytes > largest.bytes ? item : largest, { path: '', bytes: 0 })
  const weakEditKeys = teams
    .map((team, index) => ({ index, id: team?.id || `team-${index + 1}`, editKey: String(team?.editKey || '').trim() }))
    .filter((team) => team.editKey && (team.editKey.length < 16 || team.editKey === 'ax-q2'))
  const insecureRemoteMedia = remoteMedia.filter((item) => item.protocol === 'http:')
  const photoReadyTeams = teams.filter((team) => hasPhotoDisplayConfig(team))
  const roomName = String(event.roomName || '').trim()
  const workerName = String(event.workerName || '').trim()
  const settingsFile = String(event.settingsFile || '').replace(/\\/g, '/').trim()

  addCheck(
    `${prefix}:event-title`,
    appTitle ? 'pass' : 'fail',
    appTitle ? `행사 제목: ${appTitle}` : '행사 제목이 비어 있습니다.',
    '관리자/관객/Wall 화면에서 같은 행사명을 볼 수 있어야 합니다.',
  )
  addCheck(
    `${prefix}:event-profile`,
    roomName && settingsFile ? (workerName && workerName !== roomName ? 'warn' : 'pass') : 'warn',
    `room=${roomName || '(없음)'} · worker=${workerName || '(없음)'}`,
    workerName && roomName && workerName !== roomName
      ? '동시 운영 행사에서는 workerName과 ARENA_ROOM_NAME을 같은 slug로 두는 것이 가장 추적하기 쉽습니다.'
      : `settingsFile=${settingsFile || '(없음)'}`,
  )
  addCheck(
    `${prefix}:feature-profile`,
    eventFeatures.length ? 'pass' : 'warn',
    `운영 기능: ${eventFeatures.join(', ') || '(추론 불가)'}`,
    'event.features가 있으면 audit가 vote/message/quiz/luckydraw 조합을 더 정확히 검사합니다.',
  )
  addCheck(
    `${prefix}:wall-panel-scope`,
    getWallPanelCheckStatus(eventFeatures, wallPanels),
    `행사 JSON wall 세션: ${wallPanels.join(', ') || '(없음)'}`,
    getWallPanelCheckDetail(eventFeatures, wallPanels),
  )
  addCheck(
    `${prefix}:team-count`,
    getTeamCountCheckStatus(eventFeatures, teams.length),
    `행사 JSON 팀/방 개수: ${teams.length}`,
    getTeamCountCheckDetail(eventFeatures),
  )
  addCheck(
    `${prefix}:quiz-bank`,
    eventFeatures.includes('quiz') && enabledQuizCount <= 0 ? 'fail' : enabledQuizCount > 0 ? 'pass' : 'warn',
    `사용 가능한 퀴즈: ${enabledQuizCount}개`,
    eventFeatures.includes('quiz') ? '퀴즈 세션을 열어둘 예정이면 최소 1개 이상의 문제와 정답이 필요합니다.' : '퀴즈를 쓰지 않는 행사라면 wallEnabledPanels에서 quiz를 빼도 됩니다.',
  )
  addCheck(
    `${prefix}:team-photo-controls`,
    teams.length && photoReadyTeams.length === teams.length ? 'pass' : teams.length ? 'warn' : 'fail',
    teams.length ? `사진 표시 조절값 보유 팀: ${photoReadyTeams.length}/${teams.length}` : '팀 정보가 없습니다.',
    '팀 사진/로고가 실제 wall 카드와 맞도록 photoFit/photoShape/photoFrame/photoWidth/photoHeight/photoFocus 값을 설정에 보관합니다.',
  )
  addCheck(
    `${prefix}:inline-media-total`,
    inlineMediaTotal > 1_000_000 ? 'fail' : inlineMediaTotal > 500_000 ? 'warn' : 'pass',
    `행사 JSON inline media 총량: ${formatBytes(inlineMediaTotal)}`,
    '큰 data URL 이미지는 상태 저장과 full 상태 전송을 무겁게 만듭니다.',
  )
  addCheck(
    `${prefix}:inline-media-largest`,
    largestInlineMedia.bytes > 500_000 ? 'warn' : 'pass',
    largestInlineMedia.bytes
      ? `가장 큰 inline media: ${largestInlineMedia.path} (${formatBytes(largestInlineMedia.bytes)})`
      : 'inline media가 없습니다.',
    '이미지는 가능하면 public/team-logos 파일 경로나 원격 URL로 둡니다.',
  )
  addCheck(
    `${prefix}:team-edit-key-strength`,
    weakEditKeys.length ? 'fail' : 'pass',
    weakEditKeys.length
      ? `짧거나 알려진 팀 편집 키: ${weakEditKeys.map((team) => `${team.id}(${team.editKey})`).join(', ')}`
      : '팀 편집 키가 짧은 공개형 값으로 남아 있지 않습니다.',
    '팀 편집 저장은 관리자 인증이 필요하지만, 기존 짧은 키가 남아 있으면 링크 오용과 회귀 위험이 커집니다.',
  )
  addCheck(
    `${prefix}:remote-media-https`,
    insecureRemoteMedia.length ? 'fail' : 'pass',
    insecureRemoteMedia.length
      ? `HTTP media URL: ${insecureRemoteMedia.map((item) => item.path).join(', ')}`
      : '원격 media URL은 HTTP를 사용하지 않습니다.',
    '행사장 HTTPS 페이지에서는 HTTP 이미지가 깨지거나 혼합 콘텐츠/추적 문제가 생길 수 있습니다.',
  )
}

async function getAuditConfigPaths() {
  if (!auditAllConfigs) return [configPath]

  const eventConfigDir = path.join(rootDir, 'event-configs')
  const entries = await readdir(eventConfigDir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => path.join(eventConfigDir, entry.name))
    .sort((left, right) => left.localeCompare(right))
}

function getConfigCheckPrefix(relativeConfigPath) {
  return `config:${path.basename(relativeConfigPath, '.json').replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function getEventFeatures(config, wallPanels, teamsCount, enabledQuizCount) {
  const explicitFeatures = normalizeFeatures(config.event?.features || config.features)
  if (explicitFeatures.length) return explicitFeatures

  const inferred = new Set()
  if (wallPanels.includes('qna')) inferred.add('message')
  if (wallPanels.includes('quiz') || enabledQuizCount > 0) inferred.add('quiz')
  if (wallPanels.includes('raffle')) inferred.add('luckydraw')
  if (wallPanels.includes('overview') || wallPanels.includes('showup') || teamsCount > 1) inferred.add('vote')
  return [...inferred]
}

function normalizeFeatures(value) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const aliases = new Map([
    ['qna', 'message'],
    ['message', 'message'],
    ['messages', 'message'],
    ['vote', 'vote'],
    ['voting', 'vote'],
    ['quiz', 'quiz'],
    ['quize', 'quiz'],
    ['luckydraw', 'luckydraw'],
    ['lucky-draw', 'luckydraw'],
    ['raffle', 'luckydraw'],
  ])
  return [...new Set(raw.map((item) => aliases.get(String(item || '').trim().toLowerCase())).filter(Boolean))]
}

function getWallPanelCheckStatus(features, wallPanels) {
  if (!wallPanels.length) return 'fail'
  const problems = getWallPanelProblems(features, wallPanels)
  if (problems.some((problem) => problem.status === 'fail')) return 'fail'
  if (problems.length) return 'warn'
  return 'pass'
}

function getWallPanelCheckDetail(features, wallPanels) {
  const problems = getWallPanelProblems(features, wallPanels)
  if (problems.length) return problems.map((problem) => problem.detail).join(' ')
  return '운영 기능과 wall 표시 세션이 일관됩니다.'
}

function getWallPanelProblems(features, wallPanels) {
  const problems = []
  if (features.includes('message') && !wallPanels.includes('qna')) {
    problems.push({ status: 'fail', detail: 'message/Q&A 행사는 qna wall 세션이 필요합니다.' })
  }
  if (features.includes('quiz') && !wallPanels.includes('quiz')) {
    problems.push({ status: 'fail', detail: 'quiz 행사는 quiz wall 세션이 필요합니다.' })
  }
  if (features.includes('luckydraw') && !wallPanels.includes('raffle')) {
    problems.push({ status: 'fail', detail: 'luckydraw 행사는 raffle wall 세션이 필요합니다.' })
  }
  if (features.includes('vote') && !wallPanels.includes('overview')) {
    problems.push({ status: 'warn', detail: 'vote 행사는 overview 세션을 열어두면 운영자가 별 흐름을 확인하기 쉽습니다.' })
  }
  if (!features.includes('luckydraw') && wallPanels.includes('raffle')) {
    problems.push({ status: 'warn', detail: 'luckydraw를 쓰지 않는 행사라면 raffle 세션을 닫는 편이 안전합니다.' })
  }
  if (!features.includes('vote') && (wallPanels.includes('overview') || wallPanels.includes('showup'))) {
    problems.push({ status: 'warn', detail: 'vote를 쓰지 않는 행사라면 overview/showup 세션은 불필요할 수 있습니다.' })
  }
  return problems
}

function getTeamCountCheckStatus(features, teamCount) {
  if (!teamCount) return 'fail'
  if (features.includes('vote')) return teamCount >= 2 ? 'pass' : 'fail'
  return teamCount <= 3 ? 'pass' : 'warn'
}

function getTeamCountCheckDetail(features) {
  if (features.includes('vote')) return '투표형 행사는 비교 대상 팀/트랙이 2개 이상이어야 합니다.'
  return 'Q&A/퀴즈 중심 행사는 방/그룹 카드만 남기고 해커톤 팀 목록을 섞지 않는 편이 안전합니다.'
}

function hasPhotoDisplayConfig(team) {
  if (!team || typeof team !== 'object') return false
  return Boolean(
    team.photoFit &&
    team.photoShape &&
    team.photoFrame &&
    Number.isFinite(Number(team.photoWidth)) &&
    Number.isFinite(Number(team.photoHeight)) &&
    Number.isFinite(Number(team.photoFocusX)) &&
    Number.isFinite(Number(team.photoFocusY)),
  )
}

function auditWrangler(config) {
  const roomName = String(config.vars?.ARENA_ROOM_NAME || '')
  const cpuMs = Number(config.limits?.cpu_ms || 0)
  const observability = Boolean(config.observability?.enabled)

  addCheck(
    'cloudflare-room',
    roomName && roomName !== 'default' ? 'pass' : 'fail',
    roomName ? `ARENA_ROOM_NAME=${roomName}` : 'ARENA_ROOM_NAME이 비어 있습니다.',
    '행사별 Durable Object room을 분리해야 이전 행사 상태와 섞이지 않습니다.',
  )
  addCheck(
    'cloudflare-cpu-limit',
    cpuMs >= 300_000 ? 'pass' : cpuMs >= 30_000 ? 'warn' : 'fail',
    `Wrangler CPU limit: ${cpuMs || '(미설정)'} ms`,
    'Paid plan 운영에서는 CPU limit을 300000ms까지 열어두고 실제 사용량은 로그/metrics로 감시합니다.',
  )
  addCheck(
    'cloudflare-observability',
    observability ? 'pass' : 'warn',
    observability ? 'Cloudflare observability가 켜져 있습니다.' : 'Cloudflare observability가 꺼져 있습니다.',
    '운영 중 exceededCpu, exceededMemory, request/duration 추적을 위해 켜두는 것이 좋습니다.',
  )
}

async function auditRuntimeServer() {
  const health = await fetchJson('/api/health')
  if (!health.ok) {
    addCheck(
      'runtime-health',
      'warn',
      `실행 중 서버 확인 실패: ${targetUrl}`,
      '서버를 띄운 뒤 같은 명령을 다시 실행하면 payload와 SSE 상태까지 확인합니다.',
    )
    return
  }

  addCheck(
    'runtime-health',
    'pass',
    `실행 중 서버 확인: ${health.data.runtime || 'unknown'}`,
    health.data.configFile ? `configFile=${health.data.configFile}` : health.data.arenaRoomName ? `arenaRoomName=${health.data.arenaRoomName}` : '',
  )

  const cookie = await loginForAudit(health.data)
  if (!cookie) return

  await auditRuntimeSecurityBoundaries(cookie)

  const audit = await fetchJson('/api/ops/audit', { cookie })
  if (!audit.ok) {
    addCheck('runtime-ops-audit', 'warn', '보호된 운영 audit endpoint를 읽지 못했습니다.', audit.error)
    return
  }

  addCheck(
    'runtime-ops-audit',
    audit.data.status === 'fail' ? 'fail' : audit.data.status === 'warn' ? 'warn' : 'pass',
    `운영 audit endpoint 상태: ${audit.data.status}`,
    `appTitle=${audit.data.appTitle || ''}`,
  )

  for (const check of audit.data.checks || []) {
    addCheck(`runtime:${check.id}`, check.status, check.summary, check.detail)
  }
}

async function loginForAudit(health) {
  if (!health.adminPasscodeConfigured) {
    addCheck('runtime-admin-login', 'fail', '실행 중 서버에 ADMIN_PASSCODE가 설정되어 있지 않습니다.', '운영 전 passcode를 반드시 설정하세요.')
    return ''
  }

  if (!passcode) {
    addCheck('runtime-admin-login', 'warn', 'ADMIN_PASSCODE가 없어 보호된 audit endpoint를 건너뜁니다.', '환경변수 ADMIN_PASSCODE 또는 --passcode 값을 넘기세요.')
    return ''
  }

  const response = await fetch(`${targetUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: targetUrl },
    body: JSON.stringify({ passcode }),
  }).catch((error) => ({ ok: false, error }))

  if (!response.ok) {
    addCheck('runtime-admin-login', 'fail', '관리자 로그인에 실패했습니다.', response.error?.message || `HTTP ${response.status}`)
    return ''
  }

  const cookie = response.headers.get('set-cookie')?.split(';')[0] || ''
  addCheck('runtime-admin-login', cookie ? 'pass' : 'fail', cookie ? '관리자 audit 로그인 성공.' : '관리자 쿠키를 받지 못했습니다.', '')
  return cookie
}

async function auditRuntimeSecurityBoundaries(cookie) {
  const publicState = await fetchJson('/api/state?media=slim')
  addCheck(
    'runtime:public-state-edit-key',
    publicState.ok && !containsObjectKey(publicState.data, 'editKey') ? 'pass' : 'fail',
    publicState.ok
      ? '공개 state에 team editKey가 노출되지 않습니다.'
      : '공개 state를 읽지 못했습니다.',
    publicState.ok ? '비관리자 /api/state 응답에는 팀 편집 키가 없어야 합니다.' : publicState.error,
  )

  const invalidRoleState = await fetchJson('/api/state?role=team&media=slim')
  addCheck(
    'runtime:invalid-role-is-public',
    invalidRoleState.ok && !containsObjectKey(invalidRoleState.data, 'editKey') ? 'pass' : 'fail',
    invalidRoleState.ok
      ? '알 수 없는 role 요청이 관리자 state로 승격되지 않습니다.'
      : '알 수 없는 role state를 읽지 못했습니다.',
    'role 파라미터가 비어 있거나 잘못되어도 공개 vote 범위로만 처리되어야 합니다.',
  )

  const teamSelfWithoutAuth = await fetchJson('/api/team-self-config', {
    method: 'POST',
    body: {
      teamId: 'ax-group',
      teamKey: 'ax-q2',
      team: { name: 'audit-probe' },
    },
  })
  addCheck(
    'runtime:team-self-auth',
    teamSelfWithoutAuth.status === 401 ? 'pass' : 'fail',
    `비인증 팀 셀프 설정 저장 응답: HTTP ${teamSelfWithoutAuth.status || 'n/a'}`,
    '팀 셀프 설정 저장은 관리자 인증 없이 성공하면 안 됩니다.',
  )

  const csrfProbe = await fetchJson('/api/team-self-config', {
    method: 'POST',
    cookie,
    body: {
      teamId: 'ax-group',
      teamKey: 'ax-q2',
      team: { name: 'audit-probe' },
    },
  })
  addCheck(
    'runtime:admin-same-origin',
    csrfProbe.status === 403 ? 'pass' : 'fail',
    `Origin/Referer 없는 관리자 mutation 응답: HTTP ${csrfProbe.status || 'n/a'}`,
    '관리자 쿠키가 있더라도 Origin/Referer 없는 상태 변경 요청은 거절되어야 합니다.',
  )
}

async function fetchJson(route, options = {}) {
  try {
    const headers = { ...(options.headers || {}) }
    if (options.cookie) headers.Cookie = options.cookie
    let body
    if (options.body !== undefined) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      body = JSON.stringify(options.body)
    }
    const response = await fetch(`${targetUrl}${route}`, {
      method: options.method || 'GET',
      headers,
      body,
    })
    const data = await response.json().catch(() => ({}))
    return response.ok
      ? { ok: true, status: response.status, data }
      : { ok: false, status: response.status, error: data.error || `HTTP ${response.status}`, data }
  } catch (error) {
    return { ok: false, status: 0, error: error.message || String(error), data: {} }
  }
}

async function readJsonFile(filePath, options = {}) {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(options.jsonc ? stripJsonComments(raw) : raw)
  } catch {
    return null
  }
}

function collectInlineMedia(value, currentPath = '$', out = []) {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) out.push({ path: currentPath, bytes: Buffer.byteLength(value, 'utf8') })
    return out
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectInlineMedia(item, `${currentPath}[${index}]`, out))
    return out
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectInlineMedia(child, `${currentPath}.${key}`, out)
    }
  }

  return out
}

function collectRemoteMedia(value, currentPath = '$', out = []) {
  if (typeof value === 'string') {
    try {
      const url = new URL(value)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        out.push({ path: currentPath, protocol: url.protocol, url: value })
      }
    } catch {
      // Non-URL strings are not remote media.
    }
    return out
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRemoteMedia(item, `${currentPath}[${index}]`, out))
    return out
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectRemoteMedia(child, `${currentPath}.${key}`, out)
    }
  }

  return out
}

function containsObjectKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => containsObjectKey(item, key))
  if (!value || typeof value !== 'object') return false
  if (Object.prototype.hasOwnProperty.call(value, key)) return true
  return Object.values(value).some((item) => containsObjectKey(item, key))
}

function normalizePanels(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function addCheck(id, status, summary, detail = '') {
  checks.push({ id, status, summary, detail })
}

function printReport() {
  const statusRank = { fail: 0, warn: 1, pass: 2 }
  const sorted = [...checks].sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.id.localeCompare(b.id))
  const overall = checks.some((check) => check.status === 'fail')
    ? 'FAIL'
    : checks.some((check) => check.status === 'warn')
      ? 'WARN'
      : 'PASS'

  console.log(`\nVibe Vote Arena 운영 Audit: ${overall}`)
  console.log(`Config: ${auditAllConfigs ? 'event-configs/*.json' : path.relative(rootDir, configPath) || configPath}`)
  console.log(`Server: ${skipServer ? '(skipped)' : targetUrl}\n`)

  for (const check of sorted) {
    const marker = check.status === 'pass' ? '[PASS]' : check.status === 'warn' ? '[WARN]' : '[FAIL]'
    console.log(`${marker} ${check.id} - ${check.summary}`)
    if (check.detail) console.log(`       ${check.detail}`)
  }
}

function parseArgs(values) {
  const parsed = {}
  for (const item of values) {
    if (!item.startsWith('--')) continue
    const [rawKey, ...rawValue] = item.slice(2).split('=')
    parsed[rawKey] = rawValue.length ? rawValue.join('=') : true
  }
  return parsed
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '')
}

function stripJsonComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}
