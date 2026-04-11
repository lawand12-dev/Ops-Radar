import * as cheerio from 'cheerio'
import { sanitizeString } from './security'
import { normalizeWebsiteUrlInput } from './website-intel'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgencyResearch {
  url: string
  fetchedAt: string
  homepage: {
    headline: string | null
    subheadline: string | null
    tagline: string | null
    metaDescription: string | null
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
    other: string[]
  }
  social: {
    linkedin: string | null
    twitter: string | null
    instagram: string | null
    youtube: string | null
    facebook: string | null
  }
  weaknessSignals: string[]
  strengthSignals: string[]
  errors: string[]
}

export type LinkedInJobSignal = string

// ─── Constants ──────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000
// Needs to accommodate WordPress/Elementor sites that inline critical CSS before the first h1.
const MAX_HTML_CHARS = 800_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; OpsRadarBot/1.0; +https://opsradar.ai)'

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
  caseStudies: ['case-studies', 'case-study', 'work', 'portfolio', 'results', 'clients', 'success-stories'],
  team: ['team', 'our-team', 'people', 'leadership'],
  blog: ['blog', 'insights', 'articles', 'news', 'resources'],
  contact: ['contact', 'get-in-touch', 'reach-us'],
}

// Tech stack fingerprints — matched against HTML + headers.
// First-match wins per category; multiple matches are allowed for list-style
// categories (analytics, marketing, automation, other).
type FingerprintCategory =
  | 'cms'
  | 'crm'
  | 'analytics'
  | 'marketing'
  | 'booking'
  | 'payment'
  | 'chat'
  | 'automation'
  | 'other'

type Fingerprint = {
  name: string
  category: FingerprintCategory
  regex: RegExp
}

const FINGERPRINTS: Fingerprint[] = [
  // CMS / site builder
  { name: 'WordPress', category: 'cms', regex: /wp-content|wp-includes|wp-json/i },
  { name: 'Webflow', category: 'cms', regex: /webflow\.(js|css)|w-webflow-badge|data-wf-page/i },
  { name: 'Framer', category: 'cms', regex: /framerusercontent\.com|framer\.static/i },
  { name: 'Next.js', category: 'cms', regex: /\/_next\/static|__NEXT_DATA__/i },
  { name: 'Shopify', category: 'cms', regex: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme/i },
  { name: 'Squarespace', category: 'cms', regex: /static\.squarespace\.com|squarespace-cdn/i },
  { name: 'Wix', category: 'cms', regex: /static\.wixstatic\.com|wix\.com\/_api/i },

  // CRM / marketing automation (single selection — crm field)
  { name: 'HubSpot', category: 'crm', regex: /js\.hs-scripts\.com|hsforms\.net|hsforms\.com|hubspot/i },
  { name: 'Salesforce', category: 'crm', regex: /salesforce\.com|force\.com|pardot/i },
  { name: 'GoHighLevel', category: 'crm', regex: /msgsndr\.com|leadconnectorhq\.com|go-highlevel/i },

  // Analytics (list)
  { name: 'Google Analytics (GA4)', category: 'analytics', regex: /googletagmanager\.com\/gtag\/js\?id=G-|gtag\(['"]config['"],\s*['"]G-/i },
  { name: 'Google Tag Manager', category: 'analytics', regex: /googletagmanager\.com\/gtm\.js\?id=GTM-/i },
  { name: 'Mixpanel', category: 'analytics', regex: /cdn\.mxpnl\.com|mixpanel/i },
  { name: 'Hotjar', category: 'analytics', regex: /static\.hotjar\.com|_hjSettings/i },
  { name: 'PostHog', category: 'analytics', regex: /posthog\.com\/static|posthog/i },
  { name: 'Plausible', category: 'analytics', regex: /plausible\.io\/js/i },
  { name: 'Segment', category: 'analytics', regex: /cdn\.segment\.com\/analytics/i },
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
    homepage: {
      headline: null,
      subheadline: null,
      tagline: null,
      metaDescription: null,
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
      other: [],
    },
    social: {
      linkedin: null,
      twitter: null,
      instagram: null,
      youtube: null,
      facebook: null,
    },
    weaknessSignals: [],
    strengthSignals: [],
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
    const headerSignature = [
      response.headers.get('x-powered-by'),
      response.headers.get('server'),
      response.headers.get('x-generator'),
    ]
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

function cleanText(value: string | null | undefined, maxLength = 300): string | null {
  if (!value) return null
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (!collapsed) return null
  return sanitizeString(collapsed, maxLength)
}

function detectStack(pages: FetchedPage[]): AgencyResearch['techStack'] {
  const stack: AgencyResearch['techStack'] = {
    cms: null,
    crm: null,
    analytics: [],
    marketing: [],
    booking: null,
    payment: null,
    chat: null,
    automation: [],
    other: [],
  }

  const haystack = pages.map((p) => `${p.html}\n${p.headerSignature}`).join('\n')

  for (const fp of FINGERPRINTS) {
    if (!fp.regex.test(haystack)) continue

    switch (fp.category) {
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

  return stack
}

function parseHomepage($: cheerio.CheerioAPI, research: AgencyResearch): void {
  // Title/meta
  const title = cleanText($('title').first().text(), 200)
  const metaDesc = cleanText($('meta[name="description"]').attr('content'), 300) ||
    cleanText($('meta[property="og:description"]').attr('content'), 300)

  research.homepage.metaDescription = metaDesc
  research.homepage.tagline = cleanText($('meta[property="og:title"]').attr('content'), 200) || title

  // Headline / subheadline
  research.homepage.headline = cleanText($('h1').first().text(), 220)
  research.homepage.subheadline = cleanText($('h2').first().text(), 220)

  // Primary CTA
  const ctaRegex = /\b(get started|book|schedule|contact|get quote|get a quote|request|start|demo|free audit|free call|free consultation|talk to)\b/i
  let primaryCTA: string | null = null
  $('a, button').each((_i, el) => {
    if (primaryCTA) return
    const text = cleanText($(el).text(), 80)
    if (text && ctaRegex.test(text)) {
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
    const text = cleanText($(el).text(), 160)
    if (text && text.length > 30) proof.add(text)
    if (proof.size >= 8) return false
  })
  research.homepage.socialProofMentioned = [...proof].slice(0, 8)

  // Services from headings / list items in services-like sections
  const services = new Set<string>()
  $('h2, h3').each((_i, el) => {
    const text = cleanText($(el).text(), 100)
    if (!text) return
    if (text.length >= 3 && text.length <= 80) {
      services.add(text)
    }
  })
  research.services = [...services].slice(0, 12)
}

function parseSocialLinks($: cheerio.CheerioAPI, research: AgencyResearch): void {
  $('a[href]').each((_i, el) => {
    const href = ($(el).attr('href') ?? '').trim()
    if (!href) return

    if (!research.social.linkedin && /linkedin\.com\/(company|in)\//i.test(href)) {
      research.social.linkedin = sanitizeString(href, 300)
    } else if (!research.social.twitter && /(twitter\.com|x\.com)\/[^/\s]+/i.test(href)) {
      research.social.twitter = sanitizeString(href, 300)
    } else if (!research.social.instagram && /instagram\.com\/[^/\s]+/i.test(href)) {
      research.social.instagram = sanitizeString(href, 300)
    } else if (!research.social.youtube && /(youtube\.com|youtu\.be)\//i.test(href)) {
      research.social.youtube = sanitizeString(href, 300)
    } else if (!research.social.facebook && /facebook\.com\/[^/\s]+/i.test(href)) {
      research.social.facebook = sanitizeString(href, 300)
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

function computeSignals(
  research: AgencyResearch,
  homepageHtml: string,
  fetchedPagesHtml: Record<string, string>,
): void {
  const weakness: string[] = []
  const strength: string[] = []

  const bodyTextLower = homepageHtml.toLowerCase()

  // Weakness — no pricing
  if (!research.pages.pricingFound) {
    weakness.push('No pricing page found — consultative sales = manual quote process that costs hours per prospect.')
  } else {
    strength.push('Pricing page present — shows productized, scalable thinking.')
  }

  // Weakness — no case studies
  if (!research.pages.caseStudiesFound) {
    weakness.push('No case studies or portfolio page found — trust gap, prospects have no proof of results.')
  } else {
    strength.push('Case studies / portfolio page found — established credibility signal.')
  }

  // Weakness — generic positioning
  const genericPhrases = [
    'we help businesses grow',
    'trusted partner',
    'take your business to the next level',
    'one-stop shop',
    'full-service agency',
    'we do it all',
    'results-driven',
  ]
  const foundGeneric = genericPhrases.find((p) => bodyTextLower.includes(p))
  if (foundGeneric) {
    weakness.push(`Generic positioning detected ("${foundGeneric}") — weak differentiation.`)
  }

  // Weakness — no team page
  if (!research.pages.teamPageFound) {
    weakness.push('No team page found — founder may be solo or hiding team size, which kills enterprise trust.')
  }

  // Weakness — social proof absent
  if (research.homepage.socialProofMentioned.length === 0) {
    weakness.push('No visible client logos or testimonials on homepage.')
  } else if (research.homepage.socialProofMentioned.length >= 4) {
    strength.push('Multiple client logos / testimonials surfaced on homepage.')
  }

  // Weakness — stale blog (check dates in any fetched blog/about/homepage HTML)
  const allFetchedHtml = homepageHtml + (fetchedPagesHtml.blog ?? '') + (fetchedPagesHtml.about ?? '')
  const yearMatches = allFetchedHtml.match(/\b(20\d{2})\b/g)
  if (yearMatches && yearMatches.length > 0) {
    const years = yearMatches.map((y) => parseInt(y, 10)).filter((y) => y >= 2018 && y <= 2100)
    if (years.length > 0) {
      const latest = Math.max(...years)
      const currentYear = new Date().getFullYear()
      if (latest < currentYear - 1 && research.pages.blogFound) {
        weakness.push(`Blog appears stale — most recent dated content is from ${latest}. Marketing engine is neglected.`)
      } else if (latest >= currentYear && research.pages.blogFound) {
        strength.push('Blog shows recent activity — marketing engine running.')
      }
    }
  }

  // Weakness — "Contact us for quote" only CTAs
  if (
    research.homepage.primaryCTA &&
    /contact|quote|talk/i.test(research.homepage.primaryCTA) &&
    !research.pages.pricingFound
  ) {
    weakness.push(`Only CTA detected is "${research.homepage.primaryCTA}" — no productized offers.`)
  }

  // Weakness — WordPress without cache plugin (heuristic — no WP Rocket / W3 Total Cache fingerprint)
  if (research.techStack.cms === 'WordPress') {
    const hasCache = /wp-rocket|w3-total-cache|wp-super-cache|litespeed-cache/i.test(homepageHtml)
    if (!hasCache) {
      weakness.push('WordPress detected with no visible caching plugin — technical debt / performance risk.')
    }
  }

  // Weakness — no analytics
  if (research.techStack.analytics.length === 0) {
    weakness.push('No analytics tools detected — operating blind on traffic, conversions, and funnel leakage.')
  } else if (research.techStack.analytics.length >= 2) {
    strength.push(`Multiple analytics tools detected (${research.techStack.analytics.join(', ')}) — data-driven culture.`)
  }

  // Weakness — Zapier / Make present
  if (research.techStack.automation.includes('Zapier')) {
    weakness.push('Zapier detected — already paying per-task fees, strong n8n migration opportunity.')
  }
  if (research.techStack.automation.includes('Make.com')) {
    weakness.push('Make.com detected — operations consume per-operation billing, migration path to n8n.')
  }

  // Strength — serious CRM
  if (research.techStack.crm === 'HubSpot' || research.techStack.crm === 'Salesforce') {
    strength.push(`${research.techStack.crm} detected — serious about ops, ready for advanced automation layer.`)
  }

  research.weaknessSignals = weakness.slice(0, 12)
  research.strengthSignals = strength.slice(0, 12)
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

  // 3. Discover and fetch inner pages — parallel, one level only
  const pageLinks = discoverPageLinks($, homepage.url)
  const pageKeys = Object.keys(pageLinks) as PageKey[]

  const fetchedInnerPages: Record<string, FetchedPage> = {}
  const innerResults = await Promise.allSettled(
    pageKeys.map(async (key) => {
      const target = pageLinks[key]
      if (!target) return null
      const fetched = await fetchPage(target)
      return { key, fetched }
    }),
  )

  for (const result of innerResults) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { key, fetched } = result.value
    if (!fetched) continue
    fetchedInnerPages[key] = fetched

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

  // If the services page was fetched, enrich the services list from its headings.
  if (fetchedInnerPages.services) {
    try {
      const $svc = cheerio.load(fetchedInnerPages.services.html)
      const extras = new Set(research.services)
      $svc('h2, h3').each((_i, el) => {
        const text = cleanText($svc(el).text(), 100)
        if (text && text.length >= 3 && text.length <= 80) extras.add(text)
      })
      research.services = [...extras].slice(0, 20)
    } catch (err) {
      research.errors.push(`Services page parse error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  // 4. Detect tech stack from all fetched pages
  try {
    const pagesForStack: FetchedPage[] = [homepage, ...Object.values(fetchedInnerPages)]
    research.techStack = detectStack(pagesForStack)
  } catch (err) {
    research.errors.push(`Tech stack detection error: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  // 5. Compute weakness / strength signals
  try {
    const htmlByKey: Record<string, string> = {}
    for (const [k, v] of Object.entries(fetchedInnerPages)) {
      htmlByKey[k] = v.html
    }
    computeSignals(research, homepage.html, htmlByKey)
  } catch (err) {
    research.errors.push(`Signal detection error: ${err instanceof Error ? err.message : 'unknown'}`)
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
  if (stack.cms) stackLines.push(`CMS: ${stack.cms}`)
  if (stack.crm) stackLines.push(`CRM: ${stack.crm}`)
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

  if (research.weaknessSignals.length > 0) {
    parts.push('WEAKNESS SIGNALS:')
    for (const w of research.weaknessSignals) parts.push(`  - ${w}`)
  }

  if (research.strengthSignals.length > 0) {
    parts.push('STRENGTH SIGNALS:')
    for (const s of research.strengthSignals) parts.push(`  - ${s}`)
  }

  if (linkedInJobs.length > 0) {
    parts.push('LINKEDIN JOB SIGNALS:')
    for (const job of linkedInJobs) parts.push(`  - ${job}`)
  }

  return sanitizeString(parts.join('\n'), 6000)
}
