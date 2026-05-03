import { applyRateLimit } from '../../../lib/rate-limit'
import { sanitizeString, serverErrorResponse } from '../../../lib/security'
import {
  getServerSupabaseClient,
  hasServerSupabaseClient,
} from '../../../lib/supabase-server'
import type { Json } from '../../../lib/database.types'
import {
  researchAgency,
  buildWebsitePreview,
  type AgencyResearch,
  type WebsitePreview,
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
    return data.research_data as unknown as AgencyResearch
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
        { url, research_data: research as unknown as Json, fetched_at: new Date().toISOString(), expires_at: expiresAt },
        { onConflict: 'url' },
      )
  } catch {
    // cache failures shouldn't block the preview
  }
}

function fallbackPreview(url: string): WebsitePreview {
  return {
    url,
    ok: false,
    headline: null,
    subheadline: null,
    metaDescription: null,
    techStack: {
      framework: null,
      hosting: null,
      cms: null,
      crm: null,
      analytics: [],
      scheduling: null,
      payment: null,
      chat: null,
      auth: null,
    },
    pages: {
      pricing: false,
      caseStudies: false,
      blog: false,
      about: false,
      contact: false,
      team: false,
    },
    social: {
      linkedin: null,
      twitter: null,
      instagram: null,
      youtube: null,
      facebook: null,
      github: null,
      tiktok: null,
    },
    signals: [
      {
        type: 'neutral',
        text: "We couldn't fetch your site in time — your audit will still run on the form inputs.",
      },
    ],
    positioning: null,
    summary: "We couldn't fetch your site in time — your audit will still run on the form inputs.",
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, 'research-preview')
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
      return Response.json(fallbackPreview(normalized))
    }

    if (!cached) {
      void setCached(normalized, research)
    }

    const preview = buildWebsitePreview(research)
    // Ensure the URL on the response matches the normalized input.
    preview.url = normalized
    return Response.json(preview)
  } catch (err) {
    console.error('research-preview error:', err)
    return serverErrorResponse()
  }
}
