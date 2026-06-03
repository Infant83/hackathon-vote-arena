import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const args = parseArgs(process.argv.slice(2))
const configPath = path.resolve(rootDir, args.config || process.env.EVENT_CONFIG_FILE || 'teams.json')
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
  await auditStaticFiles()
  if (!skipServer) await auditRuntimeServer()

  printReport()
  const hasFail = checks.some((check) => check.status === 'fail')
  const hasWarn = checks.some((check) => check.status === 'warn')
  process.exitCode = hasFail || (strict && hasWarn) ? 1 : 0
}

async function auditStaticFiles() {
  const eventConfig = await readJsonFile(configPath)
  const relativeConfigPath = path.relative(rootDir, configPath) || path.basename(configPath)
  addCheck(
    'event-config-file',
    eventConfig ? 'pass' : 'fail',
    eventConfig ? `행사 JSON을 읽었습니다: ${relativeConfigPath}` : `행사 JSON을 읽지 못했습니다: ${relativeConfigPath}`,
    'EVENT_CONFIG_FILE 또는 --config 값을 확인하세요.',
  )

  if (eventConfig) auditEventConfig(eventConfig, relativeConfigPath)

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
  const appTitle = String(config.copy?.appTitle || '')
  const wallPanels = normalizePanels(config.settings?.wallEnabledPanels)
  const teams = Array.isArray(config.teams) ? config.teams : []
  const quizzes = Array.isArray(config.quizzes) ? config.quizzes : []
  const enabledQuizCount = quizzes.filter((quiz) => quiz?.enabled !== false && quiz?.question && quiz?.answer).length
  const inlineMedia = collectInlineMedia(config)
  const inlineMediaTotal = inlineMedia.reduce((total, item) => total + item.bytes, 0)
  const largestInlineMedia = inlineMedia.reduce((largest, item) => item.bytes > largest.bytes ? item : largest, { path: '', bytes: 0 })
  const isAxMeeting = appTitle.includes('AX') || relativeConfigPath.includes('2026_ax_group_q2')

  addCheck(
    'event-title',
    appTitle ? 'pass' : 'fail',
    appTitle ? `행사 제목: ${appTitle}` : '행사 제목이 비어 있습니다.',
    '관리자/관객/Wall 화면에서 같은 행사명을 볼 수 있어야 합니다.',
  )
  addCheck(
    'wall-panel-scope',
    isAxMeeting && panelsEqual(wallPanels, ['qna', 'quiz']) ? 'pass' : wallPanels.length <= 3 ? 'warn' : 'fail',
    `행사 JSON wall 세션: ${wallPanels.join(', ') || '(없음)'}`,
    '이번 AX 모임은 Q&A와 퀴즈만 기본 표시하는 구성이 가장 가볍습니다.',
  )
  addCheck(
    'team-count',
    teams.length > 0 && teams.length <= 3 ? 'pass' : teams.length ? 'warn' : 'fail',
    `행사 JSON 팀/방 개수: ${teams.length}`,
    '이번 QnA 중심 행사는 불필요한 Hackathon 팀 목록이 섞이지 않는지 확인합니다.',
  )
  addCheck(
    'quiz-bank',
    enabledQuizCount > 0 ? 'pass' : 'warn',
    `사용 가능한 퀴즈: ${enabledQuizCount}개`,
    '퀴즈 세션을 열어둘 예정이면 최소 1개 이상의 문제와 정답이 필요합니다.',
  )
  addCheck(
    'inline-media-total',
    inlineMediaTotal > 1_000_000 ? 'fail' : inlineMediaTotal > 500_000 ? 'warn' : 'pass',
    `행사 JSON inline media 총량: ${formatBytes(inlineMediaTotal)}`,
    '큰 data URL 이미지는 상태 저장과 full 상태 전송을 무겁게 만듭니다.',
  )
  addCheck(
    'inline-media-largest',
    largestInlineMedia.bytes > 500_000 ? 'warn' : 'pass',
    largestInlineMedia.bytes
      ? `가장 큰 inline media: ${largestInlineMedia.path} (${formatBytes(largestInlineMedia.bytes)})`
      : 'inline media가 없습니다.',
    '이미지는 가능하면 public/team-logos 파일 경로나 원격 URL로 둡니다.',
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
    headers: { 'Content-Type': 'application/json' },
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

async function fetchJson(route, options = {}) {
  try {
    const response = await fetch(`${targetUrl}${route}`, {
      headers: options.cookie ? { Cookie: options.cookie } : undefined,
    })
    const data = await response.json().catch(() => ({}))
    return response.ok ? { ok: true, data } : { ok: false, error: data.error || `HTTP ${response.status}`, data }
  } catch (error) {
    return { ok: false, error: error.message || String(error), data: {} }
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

function normalizePanels(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : []
}

function panelsEqual(left, right) {
  return left.length === right.length && right.every((panel) => left.includes(panel))
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
  console.log(`Config: ${path.relative(rootDir, configPath) || configPath}`)
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
