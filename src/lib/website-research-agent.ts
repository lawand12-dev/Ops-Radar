import * as cheerio from 'cheerio'
import { openai } from './openai'
import { sanitizeString } from './security'
import { normalizeWebsiteUrlInput } from './website-intel'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgencyResearch {
  url: string
  fetchedAt: string
  framework: string | null
  hosting: string | null
  homepage: {
    headline: string | null
    subheadline: string | null
    tagline: string | null
    metaDescription: string | null
    ogTitle: string | null
    ogDescription: string | null
    hasLogo: boolean
    primaryCTA: string | null
    socialProofMentioned: string[]
  }
  pages: {
    aboutFound: boolean
    servicesFound: boolean
    pricingFound: boolean
    caseStudiesFound: boolean
    teamPageFound: boolean
    blogFound: boolean
    contactFound: boolean
  }
  services: string[]
  techStack: {
    cms: string | null
    crm: string | null
    analytics: string[]
    marketing: string[]
    booking: string | null
    payment: string | null
    chat: string | null
    automation: string[]
    auth: string | null
    other: string[]
  }
  social: {
    linkedin: string | null
    twitter: string | null
    instagram: string | null
    youtube: string | null
    facebook: string | null
    github: string | null
    tiktok: string | null
  }
  socialHandles: {
    linkedin: string | null
    twitter: string | null
    instagram: string | null
    youtube: string | null
    facebook: string | null
    github: string | null
    tiktok: string | null
  }
  positioning: PositioningAnalysis | null
  errors: string[]
}

export type PositioningProofStrength = 'weak' | 'medium' | 'strong'

export interface PositioningAnalysis {
  icp: string | null
  positioning: string | null
  proofStrength: PositioningProofStrength | null
  positioningGaps: string[]
  wedgeAngle: string | null
}

export type LinkedInJobSignal = string

// ─── Constants ──────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 5000
// Needs to accommodate WordPress/Elementor sites that inline critical CSS before the first h1.
const MAX_HTML_CHARS = 800_000
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OpsRadarBot/1.0 (+https://opsradar.ai)'
const HEADLINE_MAX_CHARS = 120

type PageKey =
  | 'about'
  | 'services'
  | 'pricing'
  | 'caseStudies'
  | 'team'
  | 'blog'
  | 'contact'

const PAGE_KEYWORDS: Record<PageKey, string[]> = {
  about: ['about', 'who-we-are', 'our-story', 'company'],
  services: ['services', 'what-we-do', 'solutions', 'offerings', 'capabilities', 'work-with-us'],
  pricing: ['pricing', 'plans', 'packages', 'investment'],
  caseStudies: ['case-studies', 'case-study', 'customers', 'work', 'portfolio', 'results', 'clients', 'success-stories'],
  team: ['team', 'our-team', 'people', 'leadership'],
  blog: ['blog', 'insights', 'articles', 'news', 'resources'],
  contact: ['contact', 'get-in-touch', 'reach-us', 'book', 'demo'],
}

// Common page paths to probe when nav links are missing. Kept short so we don't
// hammer sites — we cap the number of parallel probe fetches in researchAgency.
const PROBE_PATHS: Record<PageKey, string[]> = {
  pricing: ['/pricing', '/plans'],
  caseStudies: ['/case-studies', '/customers', '/work', '/portfolio', '/clients'],
  about: ['/about', '/about-us', '/team'],
  blog: ['/blog', '/resources'],
  contact: ['/contact', '/book', '/demo'],
  services: ['/services', '/solutions'],
  team: ['/team', '/about/team'],
}

// Tech stack fingerprints — matched against HTML + headers.
// First-match wins per category; multiple matches are allowed for list-style
// categories (analytics, marketing, automation, other).
type FingerprintCategory =
  | 'framework'
  | 'hosting'
  | 'cms'
  | 'crm'
  | 'analytics'
  | 'marketing'
  | 'booking'
  | 'payment'
  | 'chat'
  | 'automation'
  | 'auth'
  | 'other'

type Fingerprint = {
  name: string
  category: FingerprintCategory
  regex: RegExp
}

const FINGERPRINTS: Fingerprint[] = [
  // Frameworks (first match wins)
  { name: 'Next.js', category: 'framework', regex: /\/_next\/static|__NEXT_DATA__|id=["']__next["']/i },
  { name: 'Nuxt', category: 'framework', regex: /__NUXT__|\/_nuxt\/|id=["']__nuxt["']/i },
  { name: 'Remix', category: 'framework', regex: /__remixContext|__REMIX_MANIFEST|remix:manifest/i },
  { name: 'Astro', category: 'framework', regex: /astro-island|data-astro-cid|\/_astro\//i },
  { name: 'SvelteKit', category: 'framework', regex: /__sveltekit_|\/_app\/immutable\//i },
  { name: 'Gatsby', category: 'framework', regex: /___gatsby|gatsby-chunk-mapping|data-gatsby-head/i },
  { name: 'Vite', category: 'framework', regex: /\/@vite\/client|__vite_plugin_react|vite\/dist\/client/i },
  { name: 'React', category: 'framework', regex: /data-reactroot|_reactRootContainer|react-dom@/i },

  // Hosting — detected from headers (headerSignature line) or inline assets
  { name: 'Vercel', category: 'hosting', regex: /x-vercel-(id|cache|execution-region)|server:\s*Vercel|__vercel_/i },
  { name: 'Netlify', category: 'hosting', regex: /x-nf-request-id|server:\s*Netlify|netlify\.app/i },
  { name: 'Cloudflare Pages', category: 'hosting', regex: /cf-ray|server:\s*cloudflare|pages\.dev/i },
  { name: 'GitHub Pages', category: 'hosting', regex: /server:\s*GitHub\.com|github\.io/i },
  { name: 'AWS CloudFront', category: 'hosting', regex: /x-amz-cf-id|via:\s*[^|]*CloudFront|cloudfront\.net/i },
  { name: 'Fastly', category: 'hosting', regex: /x-served-by:\s*cache-|fastly/i },

  // CMS / site builder
  { name: 'WordPress', category: 'cms', regex: /wp-content|wp-includes|wp-json/i },
  { name: 'Webflow', category: 'cms', regex: /webflow\.(js|css)|w-webflow-badge|data-wf-page/i },
  { name: 'Framer', category: 'cms', regex: /framerusercontent\.com|framer\.static/i },
  { name: 'Shopify', category: 'cms', regex: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme/i },
  { name: 'Squarespace', category: 'cms', regex: /static\.squarespace\.com|squarespace-cdn/i },
  { name: 'Wix', category: 'cms', regex: /static\.wixstatic\.com|wix\.com\/_api/i },
  { name: 'Sanity', category: 'cms', regex: /cdn\.sanity\.io|@sanity\/client/i },
  { name: 'Contentful', category: 'cms', regex: /cdn\.contentful\.com|images\.ctfassets\.net/i },
  { name: 'Notion', category: 'cms', regex: /notion\.so|notion-static\.com/i },

  // CRM / marketing automation (single selection — crm field)
  { name: 'HubSpot', category: 'crm', regex: /js\.hs-scripts\.com|hsforms\.net|hsforms\.com|js\.hs-analytics\.net|hubspot/i },
  { name: 'Salesforce', category: 'crm', regex: /salesforce\.com|force\.com|pardot/i },
  { name: 'Marketo', category: 'crm', regex: /munchkin\.marketo\.net|mktoresp\.com/i },
  { name: 'GoHighLevel', category: 'crm', regex: /msgsndr\.com|leadconnectorhq\.com|go-highlevel/i },

  // Analytics (list)
  { name: 'Google Analytics (GA4)', category: 'analytics', regex: /googletagmanager\.com\/gtag\/js\?id=G-|gtag\(['"]config['"],\s*['"]G-/i },
  { name: 'Google Tag Manager', category: 'analytics', regex: /googletagmanager\.com\/gtm\.js\?id=GTM-/i },
  { name: 'Mixpanel', category: 'analytics', regex: /cdn\.mxpnl\.com|api\.mixpanel\.com|mixpanel\.init/i },
  { name: 'Hotjar', category: 'analytics', regex: /static\.hotjar\.com|_hjSettings/i },
  { name: 'PostHog', category: 'analytics', regex: /app\.posthog\.com|posthog\.init|us\.i\.posthog\.com|eu\.i\.posthog\.com/i },
  { name: 'Plausible', category: 'analytics', regex: /plausible\.io\/js/i },
  { name: 'Fathom', category: 'analytics', regex: /cdn\.usefathom\.com/i },
  { name: 'Segment', category: 'analytics', regex: /cdn\.segment\.com\/analytics/i },
  { name: 'Amplitude', category: 'analytics', regex: /cdn\.amplitude\.com|amplitude\.getInstance/i },
  { name: 'Meta Pixel', category: 'analytics', regex: /connect\.facebook\.net\/.*fbevents\.js|fbq\(['"]init['"]/i },

  // Marketing / email (list)
  { name: 'Mailchimp', category: 'marketing', regex: /list-manage\.com|mailchimp|mcjs/i },
  { name: 'ActiveCampaign', category: 'marketing', regex: /trackcmp\.net|activehosted\.com/i },
  { name: 'Klaviyo', category: 'marketing', regex: /static\.klaviyo\.com|_learnq/i },
  { name: 'ConvertKit', category: 'marketing', regex: /convertkit\.com\/forms|ck\.convertkit/i },

  // Booking
  { name: 'Calendly', category: 'booking', regex: /assets\.calendly\.com|calendly-inline-widget|data-calendly-url|calendly\.com/i },
  { name: 'Cal.com', category: 'booking', regex: /cal\.com\/embed|app\.cal\.com/i },
  { name: 'SavvyCal', category: 'booking', regex: /savvycal\.com/i },
  { name: 'Acuity', category: 'booking', regex: /acuityscheduling\.com/i },

  // Payment
  { name: 'Stripe', category: 'payment', regex: /js\.stripe\.com\/v3|checkout\.stripe\.com/i },
  { name: 'Paddle', category: 'payment', regex: /cdn\.paddle\.com/i },
  { name: 'PayPal', category: 'payment', regex: /paypalobjects\.com/i },

  // Chat
  { name: 'Intercom', category: 'chat', regex: /js\.intercomcdn\.com|widget\.intercom\.io|intercomSettings/i },
  { name: 'Drift', category: 'chat', regex: /js\.driftt\.com|drift\.load/i },
  { name: 'Crisp', category: 'chat', regex: /client\.crisp\.chat/i },
  { name: 'Tawk.to', category: 'chat', regex: /embed\.tawk\.to/i },
  { name: 'Zendesk', category: 'chat', regex: /static\.zdassets\.com|widget-mediator\.zendesk/i },

  // Auth
  { name: 'Clerk', category: 'auth', regex: /clerk\.accounts\.dev|@clerk\/|clerk-js/i },
  { name: 'Auth0', category: 'auth', regex: /cdn\.auth0\.com|auth0\.com\/authorize|auth0-spa-js/i },
  { name: 'Supabase', category: 'auth', regex: /supabase\.co\/auth|@supabase\/auth|supabase-js/i },
  { name: 'Firebase Auth', category: 'auth', regex: /firebaseapp\.com\/__\/auth|identitytoolkit\.googleapis/i },

  // Scheduling / CRM-adjacent utility
  { name: 'Lemon Squeezy', category: 'payment', regex: /lemonsqueezy\.com|lemon\.url/i },
  { name: 'Paddle Billing', category: 'payment', regex: /paddle\.com\/paddle\.js|paddle\.com\/v2/i },

  // Automation (list)
  { name: 'Zapier', category: 'automation', regex: /zapier\.com\/embed|zapier-app/i },
  { name: 'n8n', category: 'automation', regex: /n8n\.io|n8n-webhook/i },
  { name: 'Make.com', category: 'automation', regex: /make\.com\/hook|integromat/i },

  // Other
  { name: 'Typeform', category: 'other', regex: /embed\.typeform\.com|widget\.typeform\.com/i },
  { name: 'Cloudflare', category: 'other', regex: /cloudflareinsights\.com/i },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyResearch(url: string): AgencyResearch {
  return {
    url,
    fetchedAt: new Date().toISOString(),
    framework: null,
    hosting: null,
    homepage: {
      headline: null,
      subheadline: null,
      tagline: null,
      metaDescription: null,
      ogTitle: null,
      ogDescription: null,
      hasLogo: false,
      primaryCTA: null,
      socialProofMentioned: [],
    },
    pages: {
      aboutFound: false,
      servicesFound: false,
      pricingFound: false,
      caseStudiesFound: false,
      teamPageFound: false,
      blogFound: false,
      contactFound: false,
    },
    services: [],
    techStack: {
      cms: null,
      crm: null,
      analytics: [],
      marketing: [],
      booking: null,
      payment: null,
      chat: null,
      automation: [],
      auth: null,
      other: [],
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
    socialHandles: {
      linkedin: null,
      twitter: null,
      instagram: null,
      youtube: null,
      facebook: null,
      github: null,
      tiktok: null,
    },
    positioning: null,
    errors: [],
  }
}

type FetchedPage = {
  url: string
  html: string
  headerSignature: string
}

async function fetchPage(rawUrl: string): Promise<FetchedPage | null> {
  const normalized = normalizeWebsiteUrlInput(rawUrl)
  if (!normalized) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(normalized, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': USER_AGENT,
      },
      cache: 'no-store',
    })

    if (!response.ok) return null
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('text/html')) return null

    const html = (await response.text()).slice(0, MAX_HTML_CHARS)
    // Capture headers as "header-name: value" lines so fingerprint regexes
    // can match both the name and the value.
    const HEADER_KEYS = [
      'x-powered-by',
      'server',
      'x-generator',
      'x-vercel-id',
      'x-vercel-cache',
      'x-vercel-execution-region',
      'x-nf-request-id',
      'cf-ray',
      'x-amz-cf-id',
      'via',
      'x-served-by',
    ]
    const headerSignature = HEADER_KEYS
      .map((key) => {
        const value = response.headers.get(key)
        return value ? `${key}: ${value}` : null
      })
      .filter((v): v is string => Boolean(v))
      .join(' | ')

    return {
      url: response.url || normalized,
      html,
      headerSignature,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Sitemap discovery ──────────────────────────────────────────────────────

const SITEMAP_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const SITEMAP_MAX_URLS = 15
const SITEMAP_FETCH_TIMEOUT_MS = 4000
const SITEMAP_MAX_BYTES = 2_000_000 // 2 MB cap on sitemap payload
const SITEMAP_MAX_CHILDREN = 3 // follow at most 3 nested <sitemap> entries from an index

type SitemapCacheEntry = {
  urls: string[]
  cachedAt: number
}

// Module-level in-memory cache. Keyed by origin. Simple and sufficient since
// a server process handles many requests and the TTL is short.
const sitemapCache = new Map<string, SitemapCacheEntry>()

async function fetchSitemapXml(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SITEMAP_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'application/xml,text/xml,*/*;q=0.8',
        'User-Agent': USER_AGENT,
      },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
    // Some servers return text/html for missing sitemaps; reject those.
    if (contentType.includes('text/html')) return null
    const text = (await response.text()).slice(0, SITEMAP_MAX_BYTES)
    // Sanity check: must look like XML.
    if (!/<\?xml|<urlset|<sitemapindex/i.test(text.slice(0, 400))) return null
    return text
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function extractLocsFromXml(xml: string, tag: 'url' | 'sitemap'): string[] {
  // Minimal regex-based parser — we only need <loc> values inside <url> or
  // <sitemap> blocks. This avoids pulling in an XML parser dependency and is
  // resilient to both sitemap and sitemap-index formats.
  const openTag = `<${tag}>`
  const closeTag = `</${tag}>`
  const locs: string[] = []
  let idx = 0
  while (idx < xml.length) {
    const open = xml.indexOf(openTag, idx)
    if (open === -1) break
    const close = xml.indexOf(closeTag, open)
    if (close === -1) break
    const block = xml.slice(open + openTag.length, close)
    const locMatch = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)
    if (locMatch && locMatch[1]) {
      locs.push(locMatch[1].trim())
    }
    idx = close + closeTag.length
    if (locs.length >= 500) break // hard cap — we'll prioritize below
  }
  return locs
}

async function parseSitemap(xml: string, origin: string, depth = 0): Promise<string[]> {
  // If this is a sitemap index, recursively pull in child sitemaps (one level).
  if (/<sitemapindex[\s>]/i.test(xml) && depth < 1) {
    const children = extractLocsFromXml(xml, 'sitemap').slice(0, SITEMAP_MAX_CHILDREN)
    const all: string[] = []
    for (const childUrl of children) {
      if (!childUrl.startsWith(origin)) continue
      const childXml = await fetchSitemapXml(childUrl)
      if (!childXml) continue
      const childUrls = await parseSitemap(childXml, origin, depth + 1)
      all.push(...childUrls)
      if (all.length >= 500) break
    }
    return all
  }
  // Otherwise it's a urlset — just extract <url>/<loc>.
  return extractLocsFromXml(xml, 'url')
}

/**
 * Discover URLs from /sitemap.xml (fallback: /sitemap_index.xml). Returns
 * same-origin URLs only. In-memory cached for 1 hour per origin.
 */
async function discoverSitemapUrls(homepageUrl: string): Promise<string[]> {
  let origin: string
  try {
    origin = new URL(homepageUrl).origin
  } catch {
    return []
  }

  const cached = sitemapCache.get(origin)
  if (cached && Date.now() - cached.cachedAt < SITEMAP_CACHE_TTL_MS) {
    return cached.urls
  }

  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  let urls: string[] = []
  for (const candidate of candidates) {
    const xml = await fetchSitemapXml(candidate)
    if (!xml) continue
    const parsed = await parseSitemap(xml, origin)
    if (parsed.length > 0) {
      urls = parsed
      break
    }
  }

  // Filter to same-origin only, dedupe, strip fragments.
  const seen = new Set<string>()
  const sameOrigin: string[] = []
  for (const raw of urls) {
    try {
      const parsed = new URL(raw)
      if (parsed.origin !== origin) continue
      const clean = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '') || `${parsed.origin}/`
      if (seen.has(clean)) continue
      seen.add(clean)
      sameOrigin.push(clean)
    } catch {
      // skip malformed
    }
  }

  sitemapCache.set(origin, { urls: sameOrigin, cachedAt: Date.now() })
  return sameOrigin
}

// Patterns we skip when picking URLs from a sitemap — individual blog posts,
// pagination, tag/category pages, author archives, etc.
const SITEMAP_SKIP_PATTERNS: RegExp[] = [
  /\/blog\/[^/]+\/?$/i, // individual blog post (but /blog itself is kept)
  /\/posts?\/[^/]+\/?$/i,
  /\/articles?\/[^/]+\/?$/i,
  /\/news\/[^/]+\/?$/i,
  /\/page\/\d+\/?/i, // pagination
  /\/tag\//i,
  /\/tags\//i,
  /\/category\//i,
  /\/categories\//i,
  /\/author\//i,
  /\/archive/i,
  /\.(xml|json|rss|atom|pdf|zip|png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i,
  /\/wp-(admin|includes|content)\//i,
  /\/feed\/?$/i,
  /\/amp\/?$/i,
]

type CategorizedSitemapUrl = {
  url: string
  key: PageKey | null
  score: number
}

function categorizeSitemapUrl(rawUrl: string): CategorizedSitemapUrl | null {
  let path: string
  try {
    path = new URL(rawUrl).pathname.toLowerCase()
  } catch {
    return null
  }

  for (const pattern of SITEMAP_SKIP_PATTERNS) {
    if (pattern.test(path)) return null
  }

  // Homepage gets the top priority.
  if (path === '/' || path === '') {
    return { url: rawUrl, key: null, score: 100 }
  }

  // Match against PAGE_KEYWORDS. First hit wins — order matters (pricing first).
  // Scores reflect business importance for our positioning analysis.
  const priority: Record<PageKey, number> = {
    pricing: 90,
    caseStudies: 85,
    services: 80,
    about: 75,
    team: 70,
    contact: 60,
    blog: 50,
  }

  for (const key of Object.keys(PAGE_KEYWORDS) as PageKey[]) {
    const kws = PAGE_KEYWORDS[key]
    if (kws.some((kw) => path.includes(kw))) {
      // Slight penalty for deeply nested URLs — prefer top-level /pricing over /x/y/pricing.
      const depth = path.split('/').filter(Boolean).length
      return { url: rawUrl, key, score: priority[key] - depth }
    }
  }

  // Uncategorized but top-level (one path segment) — still useful for LLM context.
  const depth = path.split('/').filter(Boolean).length
  if (depth === 1) {
    return { url: rawUrl, key: null, score: 20 }
  }

  return null
}

/**
 * Select up to SITEMAP_MAX_URLS URLs from a raw sitemap list, prioritizing
 * homepage / pricing / case studies / services / about / team / contact / blog
 * index. Keeps at most one URL per category (except uncategorized) so we don't
 * burn the budget on 10 service sub-pages.
 */
function prioritizeSitemapUrls(rawUrls: string[]): CategorizedSitemapUrl[] {
  const categorized: CategorizedSitemapUrl[] = []
  const seenKeys = new Set<PageKey>()

  const scored = rawUrls
    .map((u) => categorizeSitemapUrl(u))
    .filter((u): u is CategorizedSitemapUrl => u !== null)
    .sort((a, b) => b.score - a.score)

  for (const item of scored) {
    if (item.key) {
      if (seenKeys.has(item.key)) continue
      seenKeys.add(item.key)
    }
    categorized.push(item)
    if (categorized.length >= SITEMAP_MAX_URLS) break
  }
  return categorized
}

function cleanText(value: string | null | undefined, maxLength = 300): string | null {
  if (!value) return null
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (!collapsed) return null
  return sanitizeString(collapsed, maxLength)
}

/**
 * Extract visible text from a cheerio element, inserting a space between
 * adjacent child elements so `<span>Product</span><span>development</span>`
 * becomes `"Product development"` rather than `"Productdevelopment"`.
 *
 * cheerio's built-in `.text()` concatenates text nodes without any separator,
 * which jams words together on sites that wrap each word of a headline in a
 * separate span (Linear, Framer, several animated-text libraries).
 */
function extractElementText(
  el: unknown,
  $: cheerio.CheerioAPI,
  maxLength = 300,
): string | null {
  if (!el) return null
  const parts: string[] = []
  // We walk the DOM manually; `any` is acceptable here because cheerio's node
  // type is intentionally loose and we only read `.type`, `.data`, `.children`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: any): void => {
    if (!node) return
    if (node.type === 'text') {
      if (typeof node.data === 'string') parts.push(node.data)
      return
    }
    if (node.type === 'tag' || node.type === 'root') {
      // Skip script/style/svg content entirely.
      const name = typeof node.name === 'string' ? node.name.toLowerCase() : ''
      if (name === 'script' || name === 'style' || name === 'noscript' || name === 'svg') {
        return
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child)
      }
      // Block-ish separator between sibling elements.
      parts.push(' ')
    }
  }
  try {
    // cheerio wraps node-refs; grab the first underlying node.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = ($(el as any).get(0) as any) ?? null
    walk(node)
  } catch {
    return null
  }
  const joined = parts.join('').replace(/\s+/g, ' ').trim()
  if (!joined) return null
  return sanitizeString(joined, maxLength)
}

/**
 * Collapse repeating content inside a headline. Sites often render the same
 * copy multiple times in a single <h1> — either for animated marquee effects
 * (Linear duplicates the h1 text 3x for a scroll effect) or because the brand
 * name is tiled as a visual header (Metalab). We detect exact A·A·A… repeats
 * with optional whitespace separators and collapse them to a single copy.
 */
function dedupeRepeats(value: string): string {
  let s = value.replace(/\s+/g, ' ').trim()
  if (s.length < 10) return s

  // Exact repeat detection: find the smallest prefix that, when repeated with
  // whitespace separators, reconstructs at least most of the string. We cap at
  // ~half the string so we don't collapse normal sentences.
  for (let unitLen = 1; unitLen <= Math.floor(s.length / 2); unitLen += 1) {
    const unit = s.slice(0, unitLen)
    // Require the unit to end at a word boundary so "The " isn't treated as a unit.
    if (!/\s$/.test(unit) && unitLen < s.length) continue
    const unitTrim = unit.trim()
    if (unitTrim.length < 3) continue
    // Walk the string in unit-sized chunks (allowing flexible whitespace).
    let pos = 0
    let repeatCount = 0
    while (pos < s.length) {
      const chunk = s.slice(pos, pos + unitLen)
      if (chunk === unit) {
        repeatCount += 1
        pos += unitLen
      } else {
        break
      }
    }
    // If the repeats consumed most of the string and we saw it at least twice,
    // collapse. The trailing slice is allowed to be a prefix of the unit (as in
    // Linear's case where the 3rd copy is clipped).
    const tail = s.slice(pos).trim()
    if (repeatCount >= 2 && (tail === '' || unitTrim.startsWith(tail))) {
      s = unitTrim
      break
    }
  }

  return s
}

/**
 * Dedupe a headline against a tagline/title so we don't show the same string twice
 * just because the site copy is baked into both the h1 and og:title.
 */
function truncateHeadline(value: string | null, maxLength = HEADLINE_MAX_CHARS): string | null {
  if (!value) return null
  const deduped = dedupeRepeats(value)
  const trimmed = deduped.trim()
  if (!trimmed) return null
  if (trimmed.length <= maxLength) return trimmed
  // Cut at a word boundary where possible.
  const sliced = trimmed.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced
  return `${cut}…`
}

function extractSocialHandle(href: string, platform: 'linkedin' | 'twitter' | 'instagram' | 'youtube' | 'facebook' | 'github' | 'tiktok'): string | null {
  try {
    const parsed = new URL(href)
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length === 0) return null

    switch (platform) {
      case 'linkedin': {
        // linkedin.com/company/linear or linkedin.com/in/lawand
        if (segments[0] === 'company' || segments[0] === 'in' || segments[0] === 'school') {
          return segments[1] ?? null
        }
        return null
      }
      case 'twitter': {
        // Skip intent/share/hashtag pages.
        const first = segments[0]
        if (!first) return null
        if (['intent', 'share', 'hashtag', 'home', 'i', 'search'].includes(first.toLowerCase())) {
          return null
        }
        return first.replace(/^@/, '')
      }
      case 'instagram':
      case 'tiktok': {
        const first = segments[0]
        if (!first) return null
        if (['p', 'reel', 'explore', 'tag', 'tags'].includes(first.toLowerCase())) return null
        return first.replace(/^@/, '')
      }
      case 'youtube': {
        // youtube.com/@handle, /c/name, /user/name, /channel/UC...
        const first = segments[0]
        if (!first) return null
        if (first.startsWith('@')) return first.slice(1)
        if (['c', 'user', 'channel'].includes(first.toLowerCase())) {
          return segments[1] ?? null
        }
        return first
      }
      case 'facebook': {
        const first = segments[0]
        if (!first) return null
        if (['sharer', 'dialog', 'plugins'].includes(first.toLowerCase())) return null
        return first
      }
      case 'github': {
        const first = segments[0]
        if (!first) return null
        if (['sponsors', 'about', 'features', 'pricing', 'marketplace'].includes(first.toLowerCase())) {
          return null
        }
        return first
      }
    }
  } catch {
    return null
  }
  return null
}

type StackDetectionResult = {
  stack: AgencyResearch['techStack']
  framework: string | null
  hosting: string | null
}

function detectStack(pages: FetchedPage[]): StackDetectionResult {
  const stack: AgencyResearch['techStack'] = {
    cms: null,
    crm: null,
    analytics: [],
    marketing: [],
    booking: null,
    payment: null,
    chat: null,
    automation: [],
    auth: null,
    other: [],
  }

  let framework: string | null = null
  let hosting: string | null = null

  const haystack = pages.map((p) => `${p.html}\n${p.headerSignature}`).join('\n')

  for (const fp of FINGERPRINTS) {
    if (!fp.regex.test(haystack)) continue

    switch (fp.category) {
      case 'framework':
        if (!framework) framework = fp.name
        break
      case 'hosting':
        if (!hosting) hosting = fp.name
        break
      case 'cms':
        if (!stack.cms) stack.cms = fp.name
        break
      case 'crm':
        if (!stack.crm) stack.crm = fp.name
        break
      case 'booking':
        if (!stack.booking) stack.booking = fp.name
        break
      case 'payment':
        if (!stack.payment) stack.payment = fp.name
        break
      case 'chat':
        if (!stack.chat) stack.chat = fp.name
        break
      case 'auth':
        if (!stack.auth) stack.auth = fp.name
        break
      case 'analytics':
        if (!stack.analytics.includes(fp.name)) stack.analytics.push(fp.name)
        break
      case 'marketing':
        if (!stack.marketing.includes(fp.name)) stack.marketing.push(fp.name)
        break
      case 'automation':
        if (!stack.automation.includes(fp.name)) stack.automation.push(fp.name)
        break
      case 'other':
        if (!stack.other.includes(fp.name)) stack.other.push(fp.name)
        break
    }
  }

  return { stack, framework, hosting }
}

function parseHomepage($: cheerio.CheerioAPI, research: AgencyResearch): void {
  // Title/meta
  const title = cleanText($('title').first().text(), 200)
  const metaDesc = cleanText($('meta[name="description"]').attr('content'), 300)
  const ogTitle = cleanText($('meta[property="og:title"]').attr('content'), 200)
  const ogDesc = cleanText($('meta[property="og:description"]').attr('content'), 300)

  research.homepage.metaDescription = metaDesc ?? ogDesc
  research.homepage.ogTitle = ogTitle
  research.homepage.ogDescription = ogDesc
  research.homepage.tagline = ogTitle ?? title

  // Headline — take ONLY the first h1, walk DOM with proper word spacing, then
  // truncate to HEADLINE_MAX_CHARS (120).
  const firstH1 = $('h1').first()
  const rawHeadline = firstH1.length > 0 ? extractElementText(firstH1, $, 400) : null
  research.homepage.headline = truncateHeadline(rawHeadline, HEADLINE_MAX_CHARS)

  // Sub-headline — first h2 that reads like a real sentence, or first hero
  // paragraph. We dedupe repeats (brand-tile h2s like "Metalab Metalab
  // Metalab") and require a minimum length so we don't surface a single-word
  // nav label.
  let subheadline: string | null = null
  for (const el of $('h2').toArray()) {
    const raw = extractElementText(el, $, 400)
    if (!raw) continue
    const deduped = dedupeRepeats(raw)
    if (deduped.length >= 15 && deduped.length <= 260) {
      subheadline = deduped
      break
    }
  }
  if (!subheadline) {
    // Fall back to the first <p> that's reasonably long AFTER dedupe.
    // This catches decorative/LCP paragraphs that tile a brand word (Metalab's
    // homepage has a hidden <p>Metalab<br>Metalab<br>…</p> as the first <p>).
    for (const el of $('p').toArray()) {
      const raw = extractElementText(el, $, 400)
      if (!raw) continue
      const deduped = dedupeRepeats(raw)
      if (deduped.length >= 20 && deduped.length <= 260) {
        subheadline = deduped
        break
      }
    }
  }
  // De-duplicate: if the subheadline is a prefix/suffix of the headline or vice
  // versa, drop it — it's almost always a nav or hero duplicate.
  if (subheadline && research.homepage.headline) {
    const a = subheadline.toLowerCase()
    const b = research.homepage.headline.toLowerCase()
    if (a === b || a.startsWith(b) || b.startsWith(a)) {
      subheadline = null
    }
  }
  research.homepage.subheadline = truncateHeadline(subheadline, 200)

  // Logo presence — a header <img> whose alt/src hints at "logo", or an SVG
  // tagged with a logo-ish class. Cheap heuristic, good enough for the signal.
  const hasLogo =
    $('header img[alt*="logo" i], nav img[alt*="logo" i], img[alt*="logo" i], img[src*="logo" i]').length > 0 ||
    $('header svg[aria-label*="logo" i], nav svg[aria-label*="logo" i], [class*="logo" i] svg').length > 0
  research.homepage.hasLogo = hasLogo

  // Primary CTA
  const ctaRegex = /\b(get started|book|schedule|contact|get quote|get a quote|request|start|demo|free audit|free call|free consultation|talk to|sign up|try for free|try free)\b/i
  let primaryCTA: string | null = null
  $('a, button').each((_i, el) => {
    if (primaryCTA) return
    const text = extractElementText(el, $, 120)
    if (text && ctaRegex.test(text) && text.length <= 60) {
      primaryCTA = text
    }
  })
  research.homepage.primaryCTA = primaryCTA

  // Social proof signals — client logos / testimonials / trusted-by alt text
  const proof = new Set<string>()
  $('img').each((_i, el) => {
    const alt = ($(el).attr('alt') ?? '').trim()
    if (!alt) return
    if (/client|logo|trusted by|partner|as seen|featured in/i.test(alt) && alt.length > 2 && alt.length < 80) {
      proof.add(sanitizeString(alt, 60))
    }
  })
  $('blockquote, [class*="testimonial"], [class*="quote"]').each((_i, el) => {
    const text = extractElementText(el, $, 200)
    if (text && text.length > 30) proof.add(text)
    if (proof.size >= 8) return false
  })
  research.homepage.socialProofMentioned = [...proof].slice(0, 8)

  // Services from headings — skip anything that duplicates the headline.
  const services = new Set<string>()
  const headlineLower = research.homepage.headline?.toLowerCase() ?? ''
  $('h2, h3').each((_i, el) => {
    const text = extractElementText(el, $, 120)
    if (!text) return
    if (text.length < 3 || text.length > 80) return
    if (headlineLower && text.toLowerCase() === headlineLower) return
    services.add(text)
  })
  research.services = [...services].slice(0, 12)
}

function parseSocialLinks($: cheerio.CheerioAPI, research: AgencyResearch): void {
  const setIfUnset = (
    key: 'linkedin' | 'twitter' | 'instagram' | 'youtube' | 'facebook' | 'github' | 'tiktok',
    href: string,
  ) => {
    if (research.social[key]) return
    // Ensure the URL has a protocol so new URL() works.
    const normalized = /^https?:\/\//i.test(href) ? href : `https://${href.replace(/^\/+/, '')}`
    research.social[key] = sanitizeString(normalized, 300)
    const handle = extractSocialHandle(normalized, key)
    if (handle) research.socialHandles[key] = sanitizeString(handle, 80)
  }

  $('a[href]').each((_i, el) => {
    const href = ($(el).attr('href') ?? '').trim()
    if (!href) return

    if (/linkedin\.com\/(company|in|school)\//i.test(href)) {
      setIfUnset('linkedin', href)
    } else if (/(twitter\.com|x\.com)\/[^/\s?#]+/i.test(href)) {
      setIfUnset('twitter', href)
    } else if (/instagram\.com\/[^/\s?#]+/i.test(href)) {
      setIfUnset('instagram', href)
    } else if (/(youtube\.com|youtu\.be)\//i.test(href)) {
      setIfUnset('youtube', href)
    } else if (/facebook\.com\/[^/\s?#]+/i.test(href)) {
      setIfUnset('facebook', href)
    } else if (/github\.com\/[^/\s?#]+/i.test(href)) {
      setIfUnset('github', href)
    } else if (/tiktok\.com\/@?[^/\s?#]+/i.test(href)) {
      setIfUnset('tiktok', href)
    }
  })
}

function discoverPageLinks($: cheerio.CheerioAPI, baseUrl: string): Partial<Record<PageKey, string>> {
  const found: Partial<Record<PageKey, string>> = {}
  let origin = ''
  try {
    origin = new URL(baseUrl).origin
  } catch {
    return found
  }

  $('a[href]').each((_i, el) => {
    const href = ($(el).attr('href') ?? '').trim()
    if (!href) return
    if (/^(mailto|tel|javascript):/i.test(href) || href.startsWith('#')) return

    let resolved: URL
    try {
      resolved = new URL(href, baseUrl)
    } catch {
      return
    }
    if (resolved.origin !== origin) return

    const text = cleanText($(el).text(), 80)?.toLowerCase() ?? ''
    const path = resolved.pathname.toLowerCase()
    const haystack = `${text} ${path}`

    for (const key of Object.keys(PAGE_KEYWORDS) as PageKey[]) {
      if (found[key]) continue
      const kws = PAGE_KEYWORDS[key]
      if (kws.some((kw) => haystack.includes(kw))) {
        found[key] = resolved.toString().split('#')[0]
      }
    }
  })

  return found
}

// computeSignals is intentionally a no-op — weakness and strength signals have
// been removed. Website intelligence is silent enrichment only (tools, services,
// niche) and is never surfaced as a diagnosis of the site itself.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function computeSignals(
  _research: AgencyResearch,
  _homepageHtml: string,
  _fetchedPagesHtml: Record<string, string>,
): void {
  // intentionally empty — see comment above
}

// ─── LLM positioning pass ───────────────────────────────────────────────────

const POSITIONING_TIMEOUT_MS = 5500
const POSITIONING_SYSTEM_PROMPT =
  'You are a B2B positioning consultant analyzing an agency or software website. Return STRICT JSON only. No prose, no markdown.'

function buildPositioningUserPrompt(
  research: AgencyResearch,
  pageSnippets: Array<{ label: string; title: string | null; h1: string | null; meta: string | null }>,
): string {
  const hp = research.homepage
  const lines: string[] = []
  lines.push(`URL: ${research.url}`)
  if (hp.headline) lines.push(`Homepage H1: "${hp.headline}"`)
  if (hp.subheadline) lines.push(`Homepage sub: "${hp.subheadline}"`)
  if (hp.metaDescription) lines.push(`Meta description: "${hp.metaDescription}"`)
  if (hp.ogTitle && hp.ogTitle !== hp.headline) lines.push(`OG title: "${hp.ogTitle}"`)
  if (research.services.length > 0) {
    lines.push(`Services/headings (${research.services.length}): ${research.services.slice(0, 10).join(' | ')}`)
  }
  if (hp.socialProofMentioned.length > 0) {
    lines.push(`Proof mentions: ${hp.socialProofMentioned.slice(0, 5).join(' | ')}`)
  }
  // Per-page snippets help the model see the full site narrative, not just homepage.
  for (const p of pageSnippets) {
    const parts: string[] = []
    if (p.title) parts.push(`title="${p.title}"`)
    if (p.h1) parts.push(`h1="${p.h1}"`)
    if (p.meta) parts.push(`meta="${p.meta}"`)
    if (parts.length > 0) lines.push(`Page[${p.label}]: ${parts.join(' ')}`)
  }
  const stackBits: string[] = []
  if (research.framework) stackBits.push(`framework=${research.framework}`)
  if (research.hosting) stackBits.push(`hosting=${research.hosting}`)
  if (research.techStack.cms) stackBits.push(`cms=${research.techStack.cms}`)
  if (research.techStack.crm) stackBits.push(`crm=${research.techStack.crm}`)
  if (stackBits.length > 0) lines.push(`Stack: ${stackBits.join(' ')}`)
  lines.push(
    `Pages present: pricing=${research.pages.pricingFound} caseStudies=${research.pages.caseStudiesFound} about=${research.pages.aboutFound} team=${research.pages.teamPageFound} blog=${research.pages.blogFound}`,
  )

  const extracted = sanitizeString(lines.join('\n'), 3200)

  return `Based on the extracted text below, return JSON with this exact shape:
{
  "icp": "who they appear to target (1 sentence)",
  "positioning": "how they position themselves (1 sentence)",
  "proof_strength": "weak" | "medium" | "strong",
  "positioning_gaps": ["gap 1", "gap 2"],
  "wedge_angle": "one specific opening line a consultant could use in cold outreach to this company"
}

Rules:
- "positioning_gaps" max 3 items, each a short phrase (things missing that would help conversion).
- "wedge_angle" must be ONE sentence, specific to this company, under 220 chars, usable as the first line of a cold email.
- "proof_strength" must be one of: weak, medium, strong. Base it on visible case studies, client logos, testimonials, and pricing clarity.
- If you genuinely can't tell something, use null for that field (not a made-up guess).
- Do not return any field names other than the ones listed.

Extracted text:
${extracted}`
}

function sanitizeProofStrength(value: unknown): PositioningProofStrength | null {
  if (typeof value !== 'string') return null
  const v = value.toLowerCase().trim()
  if (v === 'weak' || v === 'medium' || v === 'strong') return v
  return null
}

function sanitizeGaps(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const cleaned = sanitizeString(item.trim(), 140)
    if (cleaned) out.push(cleaned)
    if (out.length >= 3) break
  }
  return out
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(null)
      })
  })
}

async function generatePositioningAnalysis(
  research: AgencyResearch,
  pageSnippets: Array<{ label: string; title: string | null; h1: string | null; meta: string | null }>,
): Promise<PositioningAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) return null
  // Must have at least a headline or meta description, otherwise the model has nothing to work with.
  if (!research.homepage.headline && !research.homepage.metaDescription && !research.homepage.ogTitle) {
    return null
  }

  const userPrompt = buildPositioningUserPrompt(research, pageSnippets)

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 450,
        messages: [
          { role: 'system', content: POSITIONING_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      POSITIONING_TIMEOUT_MS,
    )

    if (!completion) return null
    const raw = completion.choices[0]?.message?.content
    if (!raw) return null

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }

    const icp = typeof parsed.icp === 'string' ? sanitizeString(parsed.icp.trim(), 220) : null
    const positioning =
      typeof parsed.positioning === 'string' ? sanitizeString(parsed.positioning.trim(), 220) : null
    const proofStrength = sanitizeProofStrength(parsed.proof_strength)
    const positioningGaps = sanitizeGaps(parsed.positioning_gaps)
    const wedgeAngleRaw = typeof parsed.wedge_angle === 'string' ? parsed.wedge_angle.trim() : null
    const wedgeAngle = wedgeAngleRaw ? sanitizeString(wedgeAngleRaw, 260) : null

    // If literally nothing came back, return null so the caller can drop the field cleanly.
    if (!icp && !positioning && !proofStrength && positioningGaps.length === 0 && !wedgeAngle) {
      return null
    }

    return {
      icp: icp || null,
      positioning: positioning || null,
      proofStrength,
      positioningGaps,
      wedgeAngle: wedgeAngle || null,
    }
  } catch {
    return null
  }
}

// ─── Main research function ─────────────────────────────────────────────────

export async function researchAgency(url: string): Promise<AgencyResearch> {
  const normalized = normalizeWebsiteUrlInput(url)
  const research = emptyResearch(normalized || url)

  if (!normalized) {
    research.errors.push('Invalid or blocked URL.')
    return research
  }

  // 1. Fetch homepage
  const homepage = await fetchPage(normalized)
  if (!homepage) {
    research.errors.push('Failed to fetch homepage (timeout, blocked, or non-HTML response).')
    return research
  }

  // Kick off sitemap discovery in parallel with homepage parsing — it's purely
  // network-bound and doesn't depend on any parse state.
  const sitemapPromise = discoverSitemapUrls(homepage.url).catch(() => [] as string[])

  let $: cheerio.CheerioAPI
  try {
    $ = cheerio.load(homepage.html)
  } catch (err) {
    research.errors.push(`Cheerio parse failed: ${err instanceof Error ? err.message : 'unknown'}`)
    return research
  }

  // 2. Parse homepage — wrap each extractor in try/catch so partial data still flows.
  try {
    parseHomepage($, research)
  } catch (err) {
    research.errors.push(`Homepage parse error: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  try {
    parseSocialLinks($, research)
  } catch (err) {
    research.errors.push(`Social link parse error: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // 3. Decide which inner pages to fetch.
  //    Priority: nav-discovered links > sitemap > path guessing.
  //    If a sitemap exists, we use it to expand coverage up to SITEMAP_MAX_URLS.
  const discoveredLinks = discoverPageLinks($, homepage.url)

  let origin = ''
  try {
    origin = new URL(homepage.url).origin
  } catch {
    origin = ''
  }

  const sitemapRawUrls = await sitemapPromise
  const sitemapPrioritized = prioritizeSitemapUrls(sitemapRawUrls)
  const sitemapAvailable = sitemapPrioritized.length > 0

  // Build the target list. Each entry knows its category (or null for
  // uncategorized sitemap pages that still enrich LLM context).
  type InnerTarget = { key: PageKey | null; url: string; source: 'linked' | 'sitemap' | 'probe' }
  const mergedTargets: InnerTarget[] = []

  // 3a. Nav-discovered links always win — they're the most trustworthy signal.
  for (const key of Object.keys(discoveredLinks) as PageKey[]) {
    const target = discoveredLinks[key]
    if (target) mergedTargets.push({ key, url: target, source: 'linked' })
  }

  if (sitemapAvailable) {
    // 3b. Fill in categories from sitemap that nav didn't cover; then append
    //     uncategorized sitemap URLs for extra LLM context.
    for (const item of sitemapPrioritized) {
      if (item.key && mergedTargets.some((t) => t.key === item.key)) continue
      // Skip if the URL is literally the homepage we already fetched.
      if (item.url.replace(/\/$/, '') === homepage.url.replace(/\/$/, '')) continue
      mergedTargets.push({ key: item.key, url: item.url, source: 'sitemap' })
    }
  } else {
    // 3c. No sitemap — fall back to probing common paths for missing categories.
    if (origin) {
      for (const key of Object.keys(PROBE_PATHS) as PageKey[]) {
        if (mergedTargets.some((t) => t.key === key)) continue
        const [path] = PROBE_PATHS[key]
        if (path) mergedTargets.push({ key, url: `${origin}${path}`, source: 'probe' })
      }
    }
  }

  // Cap: 15 parallel URLs if sitemap drove the list, 5 otherwise.
  const fetchCap = sitemapAvailable ? SITEMAP_MAX_URLS : 5
  const cappedTargets = mergedTargets.slice(0, fetchCap)

  // 4. Fetch inner pages in parallel with Promise.allSettled so one slow
  //    response can't block the rest.
  const innerResults = await Promise.allSettled(
    cappedTargets.map(async (target) => {
      const fetched = await fetchPage(target.url)
      return { key: target.key, source: target.source, fetched }
    }),
  )

  // Keyed map for category-specific lookups (services, blog, etc.).
  const fetchedInnerPages: Record<string, FetchedPage> = {}
  // Ordered list (keyed or not) used when building LLM snippets.
  const allFetchedInner: Array<{ key: PageKey | null; fetched: FetchedPage; label: string }> = []

  for (const result of innerResults) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { key, fetched } = result.value
    if (!fetched) continue
    // Soft-404 guard: if the fetched URL collapsed back to the homepage,
    // don't claim a page exists that doesn't.
    if (fetched.url.replace(/\/$/, '') === homepage.url.replace(/\/$/, '')) continue

    if (key) {
      // Only keep the first page per category in the keyed map — other
      // sitemap matches for the same category still feed LLM context via
      // allFetchedInner below.
      if (!fetchedInnerPages[key]) {
        fetchedInnerPages[key] = fetched
      }

      switch (key) {
        case 'about':
          research.pages.aboutFound = true
          break
        case 'services':
          research.pages.servicesFound = true
          break
        case 'pricing':
          research.pages.pricingFound = true
          break
        case 'caseStudies':
          research.pages.caseStudiesFound = true
          break
        case 'team':
          research.pages.teamPageFound = true
          break
        case 'blog':
          research.pages.blogFound = true
          break
        case 'contact':
          research.pages.contactFound = true
          break
      }
    }

    // Label for LLM snippets — use the category or the URL pathname.
    let label = key ?? ''
    if (!label) {
      try {
        label = new URL(fetched.url).pathname.replace(/^\//, '').replace(/\/$/, '') || 'page'
      } catch {
        label = 'page'
      }
    }
    allFetchedInner.push({ key, fetched, label })
  }

  // Parse social links from inner pages too — many sites only surface social
  // icons in the footer, which on Next.js-style sites lives on every page.
  for (const entry of allFetchedInner) {
    try {
      const $inner = cheerio.load(entry.fetched.html)
      parseSocialLinks($inner, research)
    } catch {
      // ignore — partial data still flows
    }
  }

  // If the services page was fetched, enrich the services list from its headings.
  if (fetchedInnerPages.services) {
    try {
      const $svc = cheerio.load(fetchedInnerPages.services.html)
      const extras = new Set(research.services)
      $svc('h2, h3').each((_i, el) => {
        const text = extractElementText(el, $svc, 120)
        if (text && text.length >= 3 && text.length <= 80) extras.add(text)
      })
      research.services = [...extras].slice(0, 20)
    } catch (err) {
      research.errors.push(`Services page parse error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // 5. Detect tech stack (framework + hosting + everything else)
  try {
    const pagesForStack: FetchedPage[] = [homepage, ...allFetchedInner.map((e) => e.fetched)]
    const detection = detectStack(pagesForStack)
    research.techStack = detection.stack
    research.framework = detection.framework
    research.hosting = detection.hosting
  } catch (err) {
    research.errors.push(`Tech stack detection error: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // 6. computeSignals (no-op — retained for structural compatibility)
  try {
    const htmlByKey: Record<string, string> = {}
    for (const [k, v] of Object.entries(fetchedInnerPages)) {
      htmlByKey[k] = v.html
    }
    computeSignals(research, homepage.html, htmlByKey)
  } catch (err) {
    research.errors.push(`Signal detection error: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // 7. Build per-page snippets for LLM positioning (title + h1 + meta only —
  //    cheap pass, no full DOM walking).
  const pageSnippets: Array<{ label: string; title: string | null; h1: string | null; meta: string | null }> = []
  for (const entry of allFetchedInner.slice(0, 12)) {
    try {
      const $p = cheerio.load(entry.fetched.html)
      const title = cleanText($p('title').first().text(), 200)
      const h1El = $p('h1').first()
      const h1 = h1El.length > 0 ? truncateHeadline(extractElementText(h1El, $p, 200), 160) : null
      const meta = cleanText($p('meta[name="description"]').attr('content'), 240)
      if (title || h1 || meta) {
        pageSnippets.push({ label: entry.label || 'page', title, h1, meta })
      }
    } catch {
      // skip unparseable pages
    }
  }

  // 8. LLM positioning pass — best-effort, non-blocking on failure.
  try {
    research.positioning = await generatePositioningAnalysis(research, pageSnippets)
  } catch (err) {
    research.errors.push(`Positioning analysis error: ${err instanceof Error ? err.message : 'unknown'}`)
    research.positioning = null
  }

  return research
}

// ─── LinkedIn job signal ────────────────────────────────────────────────────

const JOB_TITLE_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /operations manager/i, label: 'Operations Manager' },
  { regex: /operations coordinator/i, label: 'Operations Coordinator' },
  { regex: /\b(va|virtual assistant)\b/i, label: 'Virtual Assistant' },
  { regex: /automation (engineer|specialist|manager)/i, label: 'Automation Specialist' },
  { regex: /marketing operations/i, label: 'Marketing Operations' },
  { regex: /revenue operations|revops/i, label: 'Revenue Operations' },
]

const ROLE_SALARY_HINTS: Record<string, string> = {
  'Operations Manager': '$75-95K',
  'Operations Coordinator': '$50-65K',
  'Virtual Assistant': '$30-45K',
  'Automation Specialist': '$70-110K',
  'Marketing Operations': '$80-110K',
  'Revenue Operations': '$90-130K',
}

export async function findLinkedInJobSignals(companyName: string): Promise<LinkedInJobSignal[]> {
  const cleaned = sanitizeString(companyName, 120).trim()
  if (!cleaned) return []

  const keywords = encodeURIComponent(`${cleaned} operations`)
  const url = `https://www.linkedin.com/jobs/search?keywords=${keywords}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
      cache: 'no-store',
    })

    if (!response.ok) return []
    const html = (await response.text()).slice(0, 200_000)

    // LinkedIn public results typically wrap titles in <h3> or have a `base-search-card__title` class.
    const $ = cheerio.load(html)
    const titles = new Set<string>()

    $('h3, .base-search-card__title, [class*="job-title"]').each((_i, el) => {
      const text = cleanText($(el).text(), 140)
      if (text) titles.add(text)
    })

    const signals = new Set<string>()
    for (const title of titles) {
      for (const { regex, label } of JOB_TITLE_PATTERNS) {
        if (!regex.test(title)) continue
        const salary = ROLE_SALARY_HINTS[label] ?? 'competitive'
        signals.add(
          `Hiring "${title}" on LinkedIn (estimated ${salary} salary) — they already know they have an ops problem.`,
        )
        break
      }
      if (signals.size >= 5) break
    }

    return [...signals]
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Consultant-facing preview shape ────────────────────────────────────────

export type WebsitePreview = {
  url: string
  ok: boolean
  headline: string | null
  subheadline: string | null
  metaDescription: string | null
  techStack: {
    framework: string | null
    hosting: string | null
    cms: string | null
    crm: string | null
    analytics: string[]
    scheduling: string | null
    payment: string | null
    chat: string | null
    auth: string | null
  }
  pages: {
    pricing: boolean
    caseStudies: boolean
    blog: boolean
    about: boolean
    contact: boolean
    team: boolean
  }
  social: {
    linkedin: string | null
    twitter: string | null
    instagram: string | null
    youtube: string | null
    facebook: string | null
    github: string | null
    tiktok: string | null
  }
  signals: Array<{ type: 'positive' | 'negative' | 'neutral'; text: string }>
  positioning: {
    icp: string | null
    positioning: string | null
    proofStrength: PositioningProofStrength | null
    positioningGaps: string[]
    wedgeAngle: string | null
  } | null
  summary: string
}

function buildPreviewSignals(research: AgencyResearch): WebsitePreview['signals'] {
  const signals: WebsitePreview['signals'] = []

  // Pricing
  if (research.pages.pricingFound) {
    signals.push({ type: 'positive', text: 'Pricing page present — productized thinking, shorter sales cycle' })
  }

  // Case studies / proof
  if (research.pages.caseStudiesFound) {
    signals.push({ type: 'positive', text: 'Case studies / customer proof visible — credibility established' })
  }

  // Blog / content
  if (research.pages.blogFound) {
    signals.push({ type: 'positive', text: 'Blog / resources section live — content engine running' })
  }

  // Social footprint
  const socialHandles = research.socialHandles
  const socialList: string[] = []
  if (socialHandles.linkedin) socialList.push('LinkedIn')
  if (socialHandles.twitter) socialList.push('X')
  if (socialHandles.youtube) socialList.push('YouTube')
  if (socialHandles.github) socialList.push('GitHub')
  if (socialHandles.instagram) socialList.push('Instagram')
  if (socialHandles.tiktok) socialList.push('TikTok')
  if (socialList.length >= 3) {
    signals.push({ type: 'positive', text: `Strong social footprint (${socialList.slice(0, 4).join(', ')})` })
  }

  // Scheduling
  if (research.techStack.booking) {
    signals.push({ type: 'positive', text: `${research.techStack.booking} wired up — scheduling already automated` })
  }

  // CRM leverage point
  if (research.techStack.crm) {
    signals.push({
      type: 'neutral',
      text: `${research.techStack.crm} in use — CRM is a real leverage point for automation`,
    })
  }

  // Analytics
  if (research.techStack.analytics.length >= 2) {
    signals.push({
      type: 'positive',
      text: `Multiple analytics tools (${research.techStack.analytics.slice(0, 2).join(', ')}) — data-driven`,
    })
  } else if (research.techStack.analytics.length === 1) {
    signals.push({ type: 'neutral', text: `${research.techStack.analytics[0]} detected — analytics in place` })
  }

  // Hosting / infra
  if (research.hosting) {
    signals.push({ type: 'neutral', text: `Hosted on ${research.hosting} — modern infra` })
  }

  // Framework
  if (research.framework) {
    signals.push({ type: 'neutral', text: `Built on ${research.framework}` })
  }

  // Dedupe by text
  const seen = new Set<string>()
  return signals.filter((s) => {
    if (seen.has(s.text)) return false
    seen.add(s.text)
    return true
  })
}

function buildPreviewSummary(research: AgencyResearch, signals: WebsitePreview['signals']): string {
  if (!research.homepage.headline && research.errors.length > 0) {
    return 'We could only get a partial read on this site — your audit will still run on the form inputs.'
  }

  const positives = signals.filter((s) => s.type === 'positive').length
  const negatives = signals.filter((s) => s.type === 'negative').length

  const bits: string[] = []
  if (research.homepage.headline) {
    bits.push(`Positioned as "${research.homepage.headline}".`)
  }

  const stackSummary: string[] = []
  if (research.framework) stackSummary.push(research.framework)
  if (research.hosting) stackSummary.push(research.hosting)
  if (research.techStack.cms && research.techStack.cms !== research.framework) stackSummary.push(research.techStack.cms)
  if (research.techStack.crm) stackSummary.push(research.techStack.crm)
  if (stackSummary.length > 0) {
    bits.push(`Running ${stackSummary.slice(0, 3).join(' + ')}.`)
  }

  if (positives >= 2) {
    bits.push('Mature stack — leverage points are in the operational layer, not the marketing layer.')
  } else {
    bits.push('Stack detected — the audit will reference your actual tools throughout the report.')
  }

  return bits.join(' ')
}

export function buildWebsitePreview(research: AgencyResearch): WebsitePreview {
  // Normalize against older cached shapes that may be missing the newer fields.
  // We don't mutate the passed-in research to avoid surprising other consumers,
  // but we build a safe shallow copy that guarantees the keys we read below.
  const normalized: AgencyResearch = {
    ...research,
    framework: research.framework ?? null,
    hosting: research.hosting ?? null,
    homepage: {
      headline: research.homepage?.headline ?? null,
      subheadline: research.homepage?.subheadline ?? null,
      tagline: research.homepage?.tagline ?? null,
      metaDescription: research.homepage?.metaDescription ?? null,
      ogTitle: research.homepage?.ogTitle ?? null,
      ogDescription: research.homepage?.ogDescription ?? null,
      hasLogo: research.homepage?.hasLogo ?? false,
      primaryCTA: research.homepage?.primaryCTA ?? null,
      socialProofMentioned: research.homepage?.socialProofMentioned ?? [],
    },
    techStack: {
      cms: research.techStack?.cms ?? null,
      crm: research.techStack?.crm ?? null,
      analytics: research.techStack?.analytics ?? [],
      marketing: research.techStack?.marketing ?? [],
      booking: research.techStack?.booking ?? null,
      payment: research.techStack?.payment ?? null,
      chat: research.techStack?.chat ?? null,
      automation: research.techStack?.automation ?? [],
      auth: research.techStack?.auth ?? null,
      other: research.techStack?.other ?? [],
    },
    socialHandles: {
      linkedin: research.socialHandles?.linkedin ?? null,
      twitter: research.socialHandles?.twitter ?? null,
      instagram: research.socialHandles?.instagram ?? null,
      youtube: research.socialHandles?.youtube ?? null,
      facebook: research.socialHandles?.facebook ?? null,
      github: research.socialHandles?.github ?? null,
      tiktok: research.socialHandles?.tiktok ?? null,
    },
    pages: research.pages ?? {
      aboutFound: false,
      servicesFound: false,
      pricingFound: false,
      caseStudiesFound: false,
      teamPageFound: false,
      blogFound: false,
      contactFound: false,
    },
    positioning: research.positioning ?? null,
    errors: research.errors ?? [],
  }

  const fetchFailed = normalized.errors.length > 0 && !normalized.homepage.headline

  const signals = buildPreviewSignals(normalized)
  const summary = buildPreviewSummary(normalized, signals)

  return {
    url: normalized.url,
    ok: !fetchFailed,
    headline: normalized.homepage.headline,
    subheadline: normalized.homepage.subheadline,
    metaDescription: normalized.homepage.metaDescription,
    techStack: {
      framework: normalized.framework,
      hosting: normalized.hosting,
      cms: normalized.techStack.cms,
      crm: normalized.techStack.crm,
      analytics: normalized.techStack.analytics,
      scheduling: normalized.techStack.booking,
      payment: normalized.techStack.payment,
      chat: normalized.techStack.chat,
      auth: normalized.techStack.auth,
    },
    pages: {
      pricing: normalized.pages.pricingFound,
      caseStudies: normalized.pages.caseStudiesFound,
      blog: normalized.pages.blogFound,
      about: normalized.pages.aboutFound,
      contact: normalized.pages.contactFound,
      team: normalized.pages.teamPageFound,
    },
    social: { ...normalized.socialHandles },
    signals: signals.slice(0, 6),
    positioning: normalized.positioning
      ? {
          icp: normalized.positioning.icp,
          positioning: normalized.positioning.positioning,
          proofStrength: normalized.positioning.proofStrength,
          positioningGaps: normalized.positioning.positioningGaps,
          wedgeAngle: normalized.positioning.wedgeAngle,
        }
      : null,
    summary,
  }
}

// ─── Serialization for prompt injection ─────────────────────────────────────

export function serializeAgencyResearch(
  research: AgencyResearch,
  linkedInJobs: LinkedInJobSignal[] = [],
): string {
  const parts: string[] = []

  parts.push(`URL: ${research.url}`)
  parts.push(`Fetched: ${research.fetchedAt}`)

  if (research.errors.length > 0) {
    parts.push(`Fetch errors: ${research.errors.join('; ')}`)
  }

  const hp = research.homepage
  if (hp.headline) parts.push(`Homepage H1: "${hp.headline}"`)
  if (hp.subheadline) parts.push(`Homepage H2: "${hp.subheadline}"`)
  if (hp.metaDescription) parts.push(`Meta description: ${hp.metaDescription}`)
  if (hp.primaryCTA) parts.push(`Primary CTA: "${hp.primaryCTA}"`)
  if (hp.socialProofMentioned.length > 0) {
    parts.push(`Social proof on homepage: ${hp.socialProofMentioned.slice(0, 6).join(' | ')}`)
  }

  const pagesFound: string[] = []
  if (research.pages.aboutFound) pagesFound.push('about')
  if (research.pages.servicesFound) pagesFound.push('services')
  if (research.pages.pricingFound) pagesFound.push('pricing')
  if (research.pages.caseStudiesFound) pagesFound.push('case studies')
  if (research.pages.teamPageFound) pagesFound.push('team')
  if (research.pages.blogFound) pagesFound.push('blog')
  if (research.pages.contactFound) pagesFound.push('contact')
  if (pagesFound.length > 0) parts.push(`Pages found: ${pagesFound.join(', ')}`)

  const pagesMissing: string[] = []
  if (!research.pages.pricingFound) pagesMissing.push('pricing')
  if (!research.pages.caseStudiesFound) pagesMissing.push('case studies')
  if (!research.pages.teamPageFound) pagesMissing.push('team')
  if (!research.pages.blogFound) pagesMissing.push('blog')
  if (pagesMissing.length > 0) parts.push(`Pages MISSING: ${pagesMissing.join(', ')}`)

  if (research.services.length > 0) {
    parts.push(`Services (${research.services.length}): ${research.services.slice(0, 12).join(' | ')}`)
  }

  const stack = research.techStack
  const stackLines: string[] = []
  if (research.framework) stackLines.push(`Framework: ${research.framework}`)
  if (research.hosting) stackLines.push(`Hosting: ${research.hosting}`)
  if (stack.cms) stackLines.push(`CMS: ${stack.cms}`)
  if (stack.crm) stackLines.push(`CRM: ${stack.crm}`)
  if (stack.auth) stackLines.push(`Auth: ${stack.auth}`)
  if (stack.analytics.length > 0) stackLines.push(`Analytics: ${stack.analytics.join(', ')}`)
  if (stack.marketing.length > 0) stackLines.push(`Marketing: ${stack.marketing.join(', ')}`)
  if (stack.booking) stackLines.push(`Booking: ${stack.booking}`)
  if (stack.payment) stackLines.push(`Payment: ${stack.payment}`)
  if (stack.chat) stackLines.push(`Chat: ${stack.chat}`)
  if (stack.automation.length > 0) stackLines.push(`Automation: ${stack.automation.join(', ')}`)
  if (stack.other.length > 0) stackLines.push(`Other: ${stack.other.join(', ')}`)
  if (stackLines.length > 0) parts.push(`DETECTED TECH STACK: ${stackLines.join(' | ')}`)

  const socials = Object.entries(research.social).filter(([, v]) => v)
  if (socials.length > 0) {
    parts.push(`Social: ${socials.map(([k, v]) => `${k}=${v}`).join(' | ')}`)
  }

  if (linkedInJobs.length > 0) {
    parts.push('LINKEDIN JOB SIGNALS:')
    for (const job of linkedInJobs) parts.push(`  - ${job}`)
  }

  return sanitizeString(parts.join('\n'), 6000)
}
