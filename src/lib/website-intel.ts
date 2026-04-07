import { sanitizeString } from './security'

export type WebsitePageSignal = {
  label: string
  url: string
  path: string
  title?: string
  description?: string
  headings: string[]
  ctas: string[]
  snippet?: string
}

export type WebsiteEvidence = {
  label: string
  detail: string
  sourceLabel: string
  sourcePath: string
}

export type WebsiteStackSignal = {
  tool: string
  detail: string
  sourceLabel: string
  sourcePath: string
}

export type WebsiteSignals = {
  requestedUrl: string
  finalUrl?: string
  title?: string
  description?: string
  headings: string[]
  ctas: string[]
  snippet?: string
  pages: WebsitePageSignal[]
  evidence: WebsiteEvidence[]
  detectedStack: WebsiteStackSignal[]
  summary: string
}

type LinkCandidate = {
  url: string
  text: string
}

type FetchedWebsitePage = {
  page: WebsitePageSignal
  html: string
  headerSignature: string
}

type StackFingerprint = {
  tool: string
  patterns: Array<{
    regex: RegExp
    detail: string
  }>
}

const FETCH_TIMEOUT_MS = 4500
const MAX_HTML_CHARS = 120_000
const MAX_EXTRA_PAGE_FETCHES = 3
const MAX_SUMMARY_CHARS = 900

const CTA_PATTERNS = [
  'book',
  'schedule',
  'get started',
  'start',
  'request',
  'talk',
  'contact',
  'demo',
  'audit',
  'free',
  'call',
]

const PAGE_DISCOVERY_TARGETS = [
  { label: 'Services', keywords: ['service', 'services', 'solution', 'solutions', 'capabilities', 'offer', 'offers'] },
  { label: 'Proof', keywords: ['case', 'cases', 'work', 'results', 'result', 'client', 'clients', 'portfolio', 'testimonial', 'testimonials', 'success'] },
  { label: 'Process', keywords: ['process', 'approach', 'workflow', 'method', 'how it works'] },
  { label: 'About', keywords: ['about', 'team', 'agency', 'company', 'who we are'] },
] as const

const STACK_FINGERPRINTS: StackFingerprint[] = [
  {
    tool: 'HubSpot',
    patterns: [
      { regex: /js\.hs-scripts\.com/i, detail: 'HubSpot tracking script found' },
      { regex: /js\.hsforms\.net|hsforms\.com/i, detail: 'HubSpot form embed found' },
    ],
  },
  {
    tool: 'Calendly',
    patterns: [
      { regex: /assets\.calendly\.com|calendly\.com\/assets\/external/i, detail: 'Calendly widget script found' },
      { regex: /calendly-inline-widget|data-calendly-url|Calendly\.initInlineWidget/i, detail: 'Calendly booking widget found' },
    ],
  },
  {
    tool: 'Shopify',
    patterns: [
      { regex: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|ShopifyAnalytics/i, detail: 'Shopify storefront assets found' },
      { regex: /x-shopify-stage|x-shopid/i, detail: 'Shopify response headers found' },
    ],
  },
  {
    tool: 'Google Analytics',
    patterns: [
      { regex: /googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/i, detail: 'GA4 tag found' },
      { regex: /gtag\(['"]config['"],\s*['"]G-[A-Z0-9]+/i, detail: 'GA4 configuration found' },
      { regex: /google-analytics\.com\/g\/collect/i, detail: 'Google Analytics collection endpoint found' },
    ],
  },
  {
    tool: 'Google Tag Manager',
    patterns: [
      { regex: /googletagmanager\.com\/gtm\.js\?id=GTM-[A-Z0-9]+/i, detail: 'Google Tag Manager container found' },
      { regex: /GTM-[A-Z0-9]{4,}/i, detail: 'Google Tag Manager container ID found' },
    ],
  },
  {
    tool: 'Meta Pixel',
    patterns: [
      { regex: /connect\.facebook\.net\/.*fbevents\.js/i, detail: 'Meta Pixel script found' },
      { regex: /fbq\(['"]init['"]|fbq\(['"]track['"]/i, detail: 'Meta Pixel tracking calls found' },
    ],
  },
  {
    tool: 'Intercom',
    patterns: [
      { regex: /js\.intercomcdn\.com|widget\.intercom\.io/i, detail: 'Intercom widget script found' },
      { regex: /intercomSettings/i, detail: 'Intercom settings object found' },
    ],
  },
  {
    tool: 'Klaviyo',
    patterns: [
      { regex: /static\.klaviyo\.com|klaviyo\.js/i, detail: 'Klaviyo script found' },
      { regex: /_learnq/i, detail: 'Klaviyo event queue found' },
    ],
  },
  {
    tool: 'Stripe',
    patterns: [
      { regex: /js\.stripe\.com\/v3|checkout\.stripe\.com/i, detail: 'Stripe checkout script found' },
    ],
  },
  {
    tool: 'Typeform',
    patterns: [
      { regex: /embed\.typeform\.com|widget\.typeform\.com/i, detail: 'Typeform embed found' },
    ],
  },
  {
    tool: 'Zendesk',
    patterns: [
      { regex: /static\.zdassets\.com|widget-mediator\.zendesk/i, detail: 'Zendesk widget found' },
      { regex: /zE\(/i, detail: 'Zendesk chat API found' },
    ],
  },
  {
    tool: 'Hotjar',
    patterns: [
      { regex: /static\.hotjar\.com|_hjSettings/i, detail: 'Hotjar snippet found' },
      { regex: /hj\(['"]|hotjar/i, detail: 'Hotjar tracking call found' },
    ],
  },
  {
    tool: 'Segment',
    patterns: [
      { regex: /cdn\.segment\.com|segment\.com\/analytics\.js/i, detail: 'Segment analytics script found' },
      { regex: /analytics\.load\(/i, detail: 'Segment loader found' },
    ],
  },
  {
    tool: 'WordPress',
    patterns: [
      { regex: /wp-content|wp-includes/i, detail: 'WordPress assets found' },
      { regex: /generator["'][^>]*WordPress/i, detail: 'WordPress generator tag found' },
    ],
  },
  {
    tool: 'Webflow',
    patterns: [
      { regex: /webflow\.(js|css)|data-wf-page|w-webflow-badge/i, detail: 'Webflow assets found' },
      { regex: /generator["'][^>]*Webflow/i, detail: 'Webflow generator tag found' },
    ],
  },
  {
    tool: 'Framer',
    patterns: [
      { regex: /framerusercontent\.com|framer\.static/i, detail: 'Framer assets found' },
      { regex: /generator["'][^>]*Framer/i, detail: 'Framer generator tag found' },
    ],
  },
  {
    tool: 'Mailchimp',
    patterns: [
      { regex: /list-manage\.com|mcjs/i, detail: 'Mailchimp signup embed found' },
    ],
  },
]

function collapseWhitespace(value: string, maxLength = 400): string {
  return sanitizeString(value.replace(/\s+/g, ' '), maxLength)
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function stripTags(value: string, maxLength = 400): string {
  return collapseWhitespace(decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ')), maxLength)
}

function extractTagContent(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const matches: string[] = []

  for (const match of html.matchAll(regex)) {
    const content = stripTags(match[1] ?? '')
    if (content) matches.push(content)
  }

  return matches
}

function extractMetaContent(html: string, attr: 'name' | 'property', key: string): string {
  const regex = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')
  const match = html.match(regex)
  return match ? collapseWhitespace(match[1], 220) : ''
}

function extractBodySnippet(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')

  return stripTags(withoutNoise, 320)
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function getPathname(rawUrl: string): string {
  try {
    return normalizePath(new URL(rawUrl).pathname)
  } catch {
    return '/'
  }
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false
  const octets = hostname.split('.').map((part) => Number(part))
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  )
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.home') ||
    normalized === '0.0.0.0' ||
    normalized === '::1' ||
    normalized.startsWith('[') ||
    isPrivateIpv4(normalized)
  )
}

export function normalizeWebsiteUrlInput(value: string): string {
  const trimmed = sanitizeString(value, 300)
  if (!trimmed) return ''

  const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(prefixed)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.username || url.password) return ''
    if (!url.hostname || isBlockedHostname(url.hostname)) return ''

    url.hash = ''
    return url.toString()
  } catch {
    return ''
  }
}

function extractLinks(html: string, baseUrl: string): LinkCandidate[] {
  let origin: string

  try {
    origin = new URL(baseUrl).origin
  } catch {
    return []
  }

  const links = new Map<string, LinkCandidate>()
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi

  for (const match of html.matchAll(regex)) {
    const href = (match[1] ?? '').trim()
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue

    try {
      const resolved = new URL(href, baseUrl)
      if (!['http:', 'https:'].includes(resolved.protocol)) continue
      if (resolved.origin !== origin) continue

      resolved.hash = ''
      const url = resolved.toString()
      if (getPathname(url) === '/') continue

      const text = stripTags(match[2] ?? '', 120)
      if (!text && resolved.pathname.split('/').filter(Boolean).length === 0) continue

      links.set(url, { url, text })
    } catch {
      continue
    }
  }

  return [...links.values()]
}

function scoreLink(candidate: LinkCandidate, keywords: readonly string[]): number {
  const haystack = `${candidate.text} ${getPathname(candidate.url)}`.toLowerCase()
  if (!haystack) return 0

  return keywords.reduce((score, keyword) => {
    if (!haystack.includes(keyword)) return score
    const path = getPathname(candidate.url).toLowerCase()
    return score + (path.includes(keyword) ? 5 : 2)
  }, 0)
}

function pickPageCandidates(links: LinkCandidate[]): Array<{ label: string; url: string }> {
  const selected: Array<{ label: string; url: string }> = []
  const usedUrls = new Set<string>()

  for (const target of PAGE_DISCOVERY_TARGETS) {
    const best = links
      .filter((candidate) => !usedUrls.has(candidate.url))
      .map((candidate) => ({
        candidate,
        score: scoreLink(candidate, target.keywords),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)[0]

    if (!best) continue

    usedUrls.add(best.candidate.url)
    selected.push({ label: target.label, url: best.candidate.url })

    if (selected.length >= MAX_EXTRA_PAGE_FETCHES) break
  }

  return selected
}

async function fetchWebsitePage(rawUrl: string, label: string): Promise<FetchedWebsitePage | null> {
  const requestedUrl = normalizeWebsiteUrlInput(rawUrl)
  if (!requestedUrl) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(requestedUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'OpsRadarBot/1.0 (+https://opsradar.ai)',
      },
      cache: 'no-store',
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('text/html')) return null

    const finalUrl = normalizeWebsiteUrlInput(response.url || requestedUrl)
    if (!finalUrl) return null
    const headerSignature = [
      response.headers.get('x-powered-by'),
      response.headers.get('server'),
      response.headers.get('x-shopify-stage'),
      response.headers.get('x-shopid'),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' | ')

    const html = (await response.text()).slice(0, MAX_HTML_CHARS)
    const title = extractTagContent(html, 'title')[0] ?? ''
    const description =
      extractMetaContent(html, 'name', 'description') ||
      extractMetaContent(html, 'property', 'og:description')
    const headings = uniqueStrings([
      ...extractTagContent(html, 'h1').slice(0, 2),
      ...extractTagContent(html, 'h2').slice(0, 4),
    ]).slice(0, 5)
    const ctas = uniqueStrings(
      [...extractTagContent(html, 'a'), ...extractTagContent(html, 'button')]
        .filter((text) => {
          const normalized = text.toLowerCase()
          return CTA_PATTERNS.some((pattern) => normalized.includes(pattern))
        })
        .slice(0, 6),
    )
    const snippet = extractBodySnippet(html)

    if (!title && !description && headings.length === 0 && ctas.length === 0 && !snippet) {
      return null
    }

    return {
      page: {
        label,
        url: finalUrl,
        path: getPathname(finalUrl),
        title,
        description,
        headings,
        ctas,
        snippet,
      },
      html,
      headerSignature,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function pickPageDetail(page: WebsitePageSignal | undefined, maxLength = 150): string {
  if (!page) return ''
  return collapseWhitespace(
    page.headings[0] ||
      page.description ||
      page.title ||
      page.snippet ||
      '',
    maxLength,
  )
}

function buildWebsiteEvidence(pages: WebsitePageSignal[]): WebsiteEvidence[] {
  const homepage = pages.find((page) => page.label === 'Homepage')
  const servicesPage = pages.find((page) => page.label === 'Services')
  const proofPage = pages.find((page) => page.label === 'Proof')
  const processPage = pages.find((page) => page.label === 'Process')

  const evidence: WebsiteEvidence[] = []
  const positioningDetail = collapseWhitespace(
    homepage?.title || homepage?.headings[0] || homepage?.description || '',
    140,
  )

  if (positioningDetail) {
    evidence.push({
      label: 'Positioning',
      detail: positioningDetail,
      sourceLabel: homepage?.label ?? 'Homepage',
      sourcePath: homepage?.path ?? '/',
    })
  }

  const offerDetail = pickPageDetail(servicesPage, 145) || collapseWhitespace(homepage?.description || '', 145)
  if (offerDetail) {
    evidence.push({
      label: 'Offer detected',
      detail: offerDetail,
      sourceLabel: servicesPage?.label ?? homepage?.label ?? 'Homepage',
      sourcePath: servicesPage?.path ?? homepage?.path ?? '/',
    })
  }

  const proofDetail = pickPageDetail(proofPage, 145)
  if (proofDetail) {
    evidence.push({
      label: 'Proof marker',
      detail: proofDetail,
      sourceLabel: proofPage?.label ?? 'Proof',
      sourcePath: proofPage?.path ?? '/',
    })
  }

  const deliveryDetail = pickPageDetail(processPage, 145)
  if (deliveryDetail) {
    evidence.push({
      label: 'Delivery cue',
      detail: deliveryDetail,
      sourceLabel: processPage?.label ?? 'Process',
      sourcePath: processPage?.path ?? '/',
    })
  }

  const ctaSource = pages.find((page) => page.ctas.length > 0)
  const ctaDetail = ctaSource ? collapseWhitespace(ctaSource.ctas.slice(0, 2).join(' / '), 120) : ''
  if (ctaDetail) {
    evidence.push({
      label: 'Primary CTA',
      detail: ctaDetail,
      sourceLabel: ctaSource?.label ?? 'Homepage',
      sourcePath: ctaSource?.path ?? '/',
    })
  }

  return evidence.slice(0, 4)
}

function detectStackSignals(results: FetchedWebsitePage[]): WebsiteStackSignal[] {
  const detected: WebsiteStackSignal[] = []
  const seen = new Set<string>()

  for (const result of results) {
    const haystack = `${result.html}\n${result.headerSignature}`

    for (const fingerprint of STACK_FINGERPRINTS) {
      if (seen.has(fingerprint.tool)) continue

      const match = fingerprint.patterns.find((pattern) => pattern.regex.test(haystack))
      if (!match) continue

      seen.add(fingerprint.tool)
      detected.push({
        tool: fingerprint.tool,
        detail: match.detail,
        sourceLabel: result.page.label,
        sourcePath: result.page.path,
      })
    }
  }

  return detected.slice(0, 8)
}

function buildSummary(
  pages: WebsitePageSignal[],
  evidence: WebsiteEvidence[],
  detectedStack: WebsiteStackSignal[],
): string {
  const pageLines = pages
    .slice(0, 4)
    .map((page) => {
      const fragments = [
        page.title ? `title "${collapseWhitespace(page.title, 90)}"` : '',
        page.headings[0] ? `heading "${collapseWhitespace(page.headings[0], 90)}"` : '',
        page.ctas[0] ? `cta "${collapseWhitespace(page.ctas[0], 60)}"` : '',
      ].filter(Boolean)

      return fragments.length > 0 ? `${page.label} ${page.path}: ${fragments.join(' | ')}` : ''
    })
    .filter(Boolean)

  const evidenceLine = evidence.length > 0
    ? `Evidence cues: ${evidence.map((item) => `${item.label} from ${item.sourceLabel} ${item.sourcePath}: ${item.detail}`).join(' || ')}`
    : ''
  const stackLine = detectedStack.length > 0
    ? `Public stack fingerprints: ${detectedStack.map((signal) => `${signal.tool} from ${signal.sourceLabel} ${signal.sourcePath} (${signal.detail})`).join(' || ')}`
    : ''

  return sanitizeString(
    [...pageLines, evidenceLine, stackLine].filter(Boolean).join(' | '),
    MAX_SUMMARY_CHARS,
  )
}

export function serializeWebsiteEvidence(evidence: WebsiteEvidence[]): string {
  if (evidence.length === 0) return ''

  try {
    return JSON.stringify(evidence.slice(0, 4).map((item) => ({
      label: sanitizeString(item.label, 32),
      detail: sanitizeString(item.detail, 110),
      sourceLabel: sanitizeString(item.sourceLabel, 24),
      sourcePath: sanitizeString(item.sourcePath, 48),
    })))
  } catch {
    return ''
  }
}

export function serializeWebsiteDetectedStack(signals: WebsiteStackSignal[]): string {
  return signals
    .map((signal) => sanitizeString(signal.tool, 40))
    .filter(Boolean)
    .join(', ')
}

export function serializeWebsiteStackSignals(signals: WebsiteStackSignal[]): string {
  if (signals.length === 0) return ''

  try {
    return JSON.stringify(signals.slice(0, 8).map((signal) => ({
      label: sanitizeString(signal.tool, 32),
      detail: sanitizeString(signal.detail, 110),
      sourceLabel: sanitizeString(signal.sourceLabel, 24),
      sourcePath: sanitizeString(signal.sourcePath, 48),
    })))
  } catch {
    return ''
  }
}

export async function fetchWebsiteSignals(rawUrl: string): Promise<WebsiteSignals | null> {
  const requestedUrl = normalizeWebsiteUrlInput(rawUrl)
  if (!requestedUrl) return null

  const homepageResult = await fetchWebsitePage(requestedUrl, 'Homepage')
  if (!homepageResult) return null

  const candidatePages = pickPageCandidates(extractLinks(homepageResult.html, homepageResult.page.url))
  const extraPageResults = await Promise.all(
    candidatePages.map(async (candidate) => fetchWebsitePage(candidate.url, candidate.label)),
  )

  const fetchedPages = [homepageResult, ...extraPageResults.filter((entry): entry is FetchedWebsitePage => Boolean(entry))]
  const seenUrls = new Set<string>()
  const uniqueFetchedPages = fetchedPages.filter((entry) => {
    if (seenUrls.has(entry.page.url)) return false
    seenUrls.add(entry.page.url)
    return true
  })
  const pages = uniqueFetchedPages.map((entry) => entry.page)

  const evidence = buildWebsiteEvidence(pages)
  const detectedStack = detectStackSignals(uniqueFetchedPages)
  const summary = buildSummary(pages, evidence, detectedStack)
  if (!summary) return null

  return {
    requestedUrl,
    finalUrl: homepageResult.page.url,
    title: homepageResult.page.title,
    description: homepageResult.page.description,
    headings: homepageResult.page.headings,
    ctas: homepageResult.page.ctas,
    snippet: homepageResult.page.snippet,
    pages,
    evidence,
    detectedStack,
    summary,
  }
}
