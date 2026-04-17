import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const ENV_PATH = path.join(ROOT_DIR, '.env.local')
const BASE_URL = 'https://www.opsradar.co'
const REQUESTED_TESTS = new Set(process.argv.slice(2))

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const match = rawLine.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) {
      continue
    }

    const [, key, rawValue] = match
    if (process.env[key]) {
      continue
    }

    let value = rawValue
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '')
    }

    process.env[key] = value.replace(/\\n/g, '\n')
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function truncate(value, maxLength = 1200) {
  if (typeof value !== 'string') {
    return value
  }

  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}…`
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  return {
    status: response.status,
    headers: response.headers,
    text,
    json: safeJsonParse(text),
  }
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function pick(object, keys) {
  const result = {}
  for (const key of keys) {
    result[key] = object?.[key] ?? null
  }
  return result
}

function buildIp(octet) {
  return `203.0.113.${octet}`
}

function shouldRunTest(testName) {
  return REQUESTED_TESTS.size === 0 || REQUESTED_TESTS.has(testName)
}

async function main() {
  loadEnvFile(ENV_PATH)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  expect(supabaseUrl, 'Missing NEXT_PUBLIC_SUPABASE_URL in local environment')
  expect(supabaseServiceRoleKey, 'Missing SUPABASE_SERVICE_ROLE_KEY in local environment')

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startedAt = Date.now() - 10_000

  const summary = {
    baseUrl: BASE_URL,
    executedAt: new Date().toISOString(),
    runId,
    tests: {},
  }

  if (shouldRunTest('buildRequest')) {
    const buildRequestPayload = {
      audit_id: null,
      automation_title: `Prod verification build request ${runId}`,
      name: 'Codex Production Test',
      email: `opsradar-build-${runId}@example.com`,
      budget: '$5k-$10k',
      timeline: 'Within 30 days',
      notes: `Production verification run ${runId}`,
      startedAt,
      companyWebsite: '',
    }

    const buildResponse = await fetchJson(`${BASE_URL}/api/build-request`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': buildIp(31),
      },
      body: JSON.stringify(buildRequestPayload),
    })

    let buildRow = null
    let buildError = null
    try {
      expect(buildResponse.status === 200, `Expected 200, got ${buildResponse.status}`)
      const { data, error } = await supabase
        .from('build_requests')
        .select('id, audit_id, automation_title, name, email, budget, timeline, notes, created_at')
        .eq('automation_title', buildRequestPayload.automation_title)
        .eq('email', buildRequestPayload.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      expect(data, 'No matching build_requests row found')
      expect(data.name === buildRequestPayload.name, 'Stored build request name mismatch')
      expect(data.email === buildRequestPayload.email, 'Stored build request email mismatch')
      expect(data.budget === buildRequestPayload.budget, 'Stored build request budget mismatch')
      expect(data.timeline === buildRequestPayload.timeline, 'Stored build request timeline mismatch')
      expect(data.notes === buildRequestPayload.notes, 'Stored build request notes mismatch')

      buildRow = data
    } catch (error) {
      buildError = error instanceof Error ? error.message : String(error)
    }

    summary.tests.buildRequest = {
      pass: buildResponse.status === 200 && !buildError,
      httpStatus: buildResponse.status,
      responseBody: buildResponse.json ?? truncate(buildResponse.text),
      dbRow: buildRow,
      error: buildError,
    }
  }

  if (shouldRunTest('chatConversations')) {
    const sessionIp = buildIp(41)
    const initialConversationResponse = await fetchJson(`${BASE_URL}/api/chat-conversations?view=initial`, {
      headers: {
        accept: 'application/json',
        'x-forwarded-for': sessionIp,
      },
    })

    const sessionCookie = initialConversationResponse.headers.get('set-cookie')
    const cookieHeader = sessionCookie ? sessionCookie.split(';')[0] : ''
    const visitorId = initialConversationResponse.json?.visitorId ?? null

    const conversationMessages = [
      {
        role: 'user',
        content: `Production conversation test message ${runId}`,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: 'Acknowledged for production verification.',
        timestamp: new Date(Date.now() + 1000).toISOString(),
      },
    ]

    const conversationPayload = {
      visitorEmail: `opsradar-chat-${runId}@example.com`,
      messages: conversationMessages,
    }

    const conversationResponse = await fetchJson(`${BASE_URL}/api/chat-conversations`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        cookie: cookieHeader,
        'x-forwarded-for': sessionIp,
      },
      body: JSON.stringify(conversationPayload),
    })

    let conversationRow = null
    let conversationError = null
    try {
      expect(initialConversationResponse.status === 200, `Session bootstrap returned ${initialConversationResponse.status}`)
      expect(cookieHeader, 'No session cookie returned from GET /api/chat-conversations')
      expect(visitorId, 'No visitorId returned from GET /api/chat-conversations')
      expect(conversationResponse.status === 200, `Expected 200 from POST /api/chat-conversations, got ${conversationResponse.status}`)
      expect(conversationResponse.status !== 503, 'POST /api/chat-conversations returned 503')

      const conversationId = conversationResponse.json?.conversationId
      expect(conversationId, 'No conversationId returned from POST /api/chat-conversations')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, visitor_id, visitor_email, messages, created_at, updated_at')
        .eq('id', conversationId)
        .maybeSingle()

      if (error) {
        throw error
      }

      expect(data, 'No matching chat_conversations row found')
      expect(data.visitor_id === visitorId, 'Stored chat visitor_id mismatch')
      expect(data.visitor_email === conversationPayload.visitorEmail, 'Stored visitor_email mismatch')
      expect(Array.isArray(data.messages), 'Stored chat messages is not an array')
      expect(data.messages.length === conversationMessages.length, 'Stored chat message count mismatch')
      expect(data.messages[0]?.content === conversationMessages[0].content, 'Stored first chat message mismatch')

      conversationRow = {
        ...data,
        messages: data.messages,
      }
    } catch (error) {
      conversationError = error instanceof Error ? error.message : String(error)
    }

    summary.tests.chatConversations = {
      pass: initialConversationResponse.status === 200 && conversationResponse.status === 200 && !conversationError,
      bootstrapStatus: initialConversationResponse.status,
      bootstrapBody: initialConversationResponse.json ?? truncate(initialConversationResponse.text),
      httpStatus: conversationResponse.status,
      responseBody: conversationResponse.json ?? truncate(conversationResponse.text),
      dbRow: conversationRow,
      error: conversationError,
    }
  }

  if (shouldRunTest('auditGeneration')) {
    const auditPayload = {
      name: 'Codex Production Test',
      email: `opsradar-audit-${runId}@example.com`,
      company: `Northstar Growth ${runId}`,
      agencyType: 'Performance marketing agency',
      teamSize: '16-30 employees',
      revenue: '$1M-$3M annual revenue',
      activeClients: '25-40 active clients',
      tools: ['HubSpot', 'Google Analytics 4', 'Meta Ads Manager', 'Google Ads', 'Slack', 'Asana'],
      toolSignals: 'Reporting still requires manual exports from GA4 and ad platforms | Leads still need manual assignment in HubSpot | Client updates are copied between Slack, Asana, and email',
      websiteUrl: 'https://www.webfx.com',
      crmTool: 'HubSpot is live, but lead routing and pipeline hygiene still need manual intervention every day.',
      timeHeavy: ['Weekly client reporting', 'Lead follow-up assignment', 'Internal status updates'],
      leadEntry: 'New leads come through web forms, referrals, and Clutch, then an ops manager manually dedupes, enriches, and assigns them in HubSpot.',
      onboarding: ['Manual kickoff setup', 'Asset collection over email', 'Project template creation'],
      progressTracking: 'Account managers track delivery in Asana, then manually turn that work into client-facing updates in Slack and Google Slides.',
      automationWish: 'Automate weekly client reporting and the lead handoff from inbound forms into HubSpot and Asana.',
      processFrequency: 'Daily lead routing and weekly reporting',
      processOwner: 'Operations manager and account managers',
      failureImpact: 'Late reporting and slow follow-up are hurting client retention and causing sales-qualified leads to cool off before the team responds.',
      futureVision: 'Reporting is generated automatically every Monday, lead routing happens instantly, and account managers spend their time on strategy instead of spreadsheets.',
      startedAt,
      companyWebsite: '',
    }

    const auditResponse = await fetchJson(`${BASE_URL}/api/generate-audit`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-forwarded-for': buildIp(51),
      },
      body: JSON.stringify(auditPayload),
    })

    let auditRow = null
    let auditResultResponse = null
    let auditError = null
    try {
      expect(auditResponse.status === 200, `Expected 200 from POST /api/generate-audit, got ${auditResponse.status}`)
      const storedAuditId = auditResponse.json?.id ?? auditResponse.json?.storedAuditId ?? null
      const accessToken = auditResponse.json?.accessToken ?? null

      expect(storedAuditId, 'Missing storedAuditId/id in generate-audit response')
      expect(accessToken, 'Missing accessToken in generate-audit response')

      const { data, error } = await supabase
        .from('audits')
        .select('id, company, name, email, access_token, created_at, answers, result')
        .eq('id', storedAuditId)
        .maybeSingle()

      if (error) {
        throw error
      }

      expect(data, 'No matching audits row found')
      expect(data.email === auditPayload.email, 'Stored audit email mismatch')
      expect(data.company === auditPayload.company, 'Stored audit company mismatch')
      expect(Boolean(data.access_token), 'Stored audit access_token is empty')
      expect(data.access_token === accessToken, 'Stored audit access_token does not match response')

      auditRow = {
        ...pick(data, ['id', 'company', 'name', 'email', 'access_token', 'created_at']),
        resultKeys: data.result && typeof data.result === 'object' ? Object.keys(data.result).slice(0, 12) : [],
      }

      auditResultResponse = await fetchJson(
        `${BASE_URL}/api/audit-result?id=${encodeURIComponent(storedAuditId)}&token=${encodeURIComponent(accessToken)}`,
        {
          headers: {
            accept: 'application/json',
            'x-forwarded-for': buildIp(52),
          },
        },
      )

      expect(auditResultResponse.status === 200, `Expected 200 from GET /api/audit-result, got ${auditResultResponse.status}`)
      expect(Boolean(auditResultResponse.json?.audit), 'Audit result response did not include audit data')
    } catch (error) {
      auditError = error instanceof Error ? error.message : String(error)
    }

    summary.tests.auditGeneration = {
      pass: auditResponse.status === 200 && !auditError,
      httpStatus: auditResponse.status,
      responseBody: auditResponse.json
        ? {
            ...auditResponse.json,
            accessToken: auditResponse.json.accessToken ? '[redacted]' : null,
          }
        : truncate(auditResponse.text),
      dbRow: auditRow
        ? {
            ...auditRow,
            access_token: auditRow.access_token ? '[redacted]' : null,
          }
        : null,
      auditResultStatus: auditResultResponse?.status ?? null,
      auditResultBody: auditResultResponse?.json
        ? {
            hasAudit: Boolean(auditResultResponse.json.audit),
            meta: auditResultResponse.json.meta ?? null,
          }
        : auditResultResponse
          ? truncate(auditResultResponse.text)
          : null,
      error: auditError,
    }
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    fatal: true,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
  }, null, 2))
  process.exit(1)
})
