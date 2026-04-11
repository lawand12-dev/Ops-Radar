import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../lib/supabase-server'
import {
  researchAgency,
  type AgencyResearch,
} from '../../../lib/website-research-agent'
import { normalizeWebsiteUrlInput } from '../../../lib/website-intel'

const RESEARCH_TIMEOUT_MS = 15_000
const CACHE_TTL_DAYS = 7

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(fallback)
      })
  })
}

async function getCached(url: string): Promise<AgencyResearch | null> {
  if (!hasServerSupabaseClient()) return null
  try {
    const supabase = getServerSupabaseClient()
    const { data, error } = await supabase
      .from('research_cache')
      .select('research_data, expires_at')
      .eq('url', url)
      .maybeSingle()

    if (error || !data) return null
    const expiresAt = new Date(data.expires_at as string).getTime()
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return null
    return data.research_data as AgencyResearch
  } catch {
    return null
  }
}

async function setCached(url: string, research: AgencyResearch): Promise<void> {
  if (!hasServerSupabaseClient()) return
  if (research.errors.length > 0 && !research.homepage.headline) return
  try {
    const supabase = getServerSupabaseClient()
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('research_cache')
      .upsert(
        { url, research_data: research, fetched_at: new Date().toISOString(), expires_at: expiresAt },
        { onConflict: 'url' },
      )
  } catch {
    // cache failures shouldn't block the preview
  }
}

function buildPreviewBullets(research: AgencyResearch): string[] {
  const bullets: string[] = []

  // Headline observation
  if (research.homepage.headline) {
    bullets.push(`Homepage headline: "${research.homepage.headline}"`)
  }

  // Tech stack highlights
  const stackHighlights: string[] = []
  if (research.techStack.cms) stackHighlights.push(research.techStack.cms)
  if (research.techStack.crm) stackHighlights.push(research.techStack.crm)
  if (research.techStack.booking) stackHighlights.push(research.techStack.booking)
  if (research.techStack.chat) stackHighlights.push(research.techStack.chat)
  if (research.techStack.payment) stackHighlights.push(research.techStack.payment)
  stackHighlights.push(...research.techStack.analytics.slice(0, 2))
  stackHighlights.push(...research.techStack.automation.slice(0, 2))
  if (stackHighlights.length > 0) {
    bullets.push(`Detected stack: ${[...new Set(stackHighlights)].slice(0, 6).join(', ')}`)
  }

  // Top weakness
  if (research.weaknessSignals.length > 0) {
    bullets.push(research.weaknessSignals[0])
  }

  // Top strength (only if we don't already have 4 bullets)
  if (bullets.length < 4 && research.strengthSignals.length > 0) {
    bullets.push(research.strengthSignals[0])
  }

  // Fallback if bullets thin
  if (bullets.length === 0) {
    bullets.push('Site fetched — no distinctive signals extracted yet. The full audit will still use what we have.')
  }

  return bullets.slice(0, 4)
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = applyRateLimit(request, 'research-preview')
    if (rateLimitResponse) return rateLimitResponse

    const body = (await request.json().catch(() => null)) as { url?: unknown } | null
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request payload' }, { status: 400 })
    }

    const rawUrl = typeof body.url === 'string' ? sanitizeString(body.url, 500) : ''
    const normalized = normalizeWebsiteUrlInput(rawUrl)
    if (!normalized) {
      return Response.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const cached = await getCached(normalized)
    const research = cached ??
      (await withTimeout(researchAgency(normalized), RESEARCH_TIMEOUT_MS, null))

    if (!research) {
      return Response.json({
        url: normalized,
        ok: false,
        bullets: ['We couldn\'t fetch your site in time — your audit will still run on the form inputs.'],
      })
    }

    if (!cached) {
      void setCached(normalized, research)
    }

    const bullets = buildPreviewBullets(research)
    const fetchFailed = research.errors.length > 0 && !research.homepage.headline

    return Response.json({
      url: normalized,
      ok: !fetchFailed,
      bullets,
    })
  } catch (err) {
    console.error('research-preview error:', err)
    return serverErrorResponse()
  }
}
