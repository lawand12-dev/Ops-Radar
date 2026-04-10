import { sanitizeString } from './security'
import { normalizeWebsiteUrlInput } from './website-intel'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgencyResearch = {
  url: string
  fetchedSuccessfully: boolean

  // Homepage signals
  headline: string
  subheadline: string
  servicesList: string[]
  pricingMentions: string[]
  clientLogos: string[]
  testimonials: string[]
  ctaButtons: string[]
  contactInfo: string[]
  teamPageLink: string
  blogLink: string

  // About page
  teamSizeHint: string
  foundingYear: string
  companyDescription: string

  // Services page
  fullServicesList: string[]

  // Social links
  socialLinks: {
    linkedin: string
    twitter: string
    instagram: string
    facebook: string
  }

  // LinkedIn public about (if available)
  linkedinAbout: string

  // Tech stack detection
  detectedStack: Array<{ tool: string; detail: string }>

  // Weakness signals
  weaknessSignals: Array<{ signal: string; detail: string }>

  // Raw summary for AI prompt
  researchSummary: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 5000
const MAX_HTML_CHARS = 150_000

const SOCIAL_PATTERNS: Array<{ platform: keyof AgencyResearch['socialLinks']; regex: RegExp }> = [
  { platform: 'linkedin', regex: /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^"'\s]+)["']/gi },
  { platform: 'twitter', regex: /href=["'](https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^"'\s]+)["']/gi },
  { platform: 'instagram', regex: /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/gi },
  { platform: 'facebook', regex: /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)["']/gi },
]

const STACK_FINGERPRINTS: Array<{ tool: string; patterns: Array<{ regex: RegExp; detail: string }> }> = [
  { tool: 'HubSpot', patterns: [
    { regex: /js\.hs-scripts\.com|hsforms\.net|hsforms\.com/i, detail: 'HubSpot tracking or forms detected' },
  ]},
  { tool: 'Calendly', patterns: [
    { regex: /assets\.calendly\.com|calendly-inline-widget|data-calendly-url/i, detail: 'Calendly booking widget detected' },
  ]},
  { tool: 'Intercom', patterns: [
    { regex: /js\.intercomcdn\.com|widget\.intercom\.io|intercomSettings/i, detail: 'Intercom chat widget detected' },
  ]},
  { tool: 'Drift', patterns: [
    { regex: /js\.driftt\.com|drift\.load/i, detail: 'Drift chat widget detected' },
  ]},
  { tool: 'GoHighLevel', patterns: [
    { regex: /msgsndr\.com|go-highlevel|ghl-chat|leadconnectorhq\.com/i, detail: 'GoHighLevel / LeadConnector detected' },
  ]},
  { tool: 'Webflow', patterns: [
    { regex: /webflow\.(js|css)|data-wf-page|w-webflow-badge/i, detail: 'Webflow site builder detected' },
  ]},
  { tool: 'WordPress', patterns: [
    { regex: /wp-content|wp-includes/i, detail: 'WordPress CMS detected' },
  ]},
  { tool: 'Framer', patterns: [
    { regex: /framerusercontent\.com|framer\.static/i, detail: 'Framer site builder detected' },
  ]},
  { tool: 'Google Analytics', patterns: [
    { regex: /googletagmanager\.com\/gtag\/js\?id=G-|gtag\(['"]config['"],\s*['"]G-/i, detail: 'Google Analytics (GA4) detected' },
  ]},
  { tool: 'Google Tag Manager', patterns: [
    { regex: /googletagmanager\.com\/gtm\.js\?id=GTM-/i, detail: 'Google Tag Manager detected' },
  ]},
  { tool: 'Meta Pixel', patterns: [
    { regex: /connect\.facebook\.net\/.*fbevents\.js|fbq\(['"]init['"]/i, detail: 'Meta Pixel tracking detected' },
  ]},
  { tool: 'Stripe', patterns: [
    { regex: /js\.stripe\.com\/v3|checkout\.stripe\.com/i, detail: 'Stripe checkout detected' },
  ]},
  { tool: 'Hotjar', patterns: [
    { regex: /static\.hotjar\.com|_hjSettings/i, detail: 'Hotjar analytics detected' },
  ]},
  { tool: 'Mailchimp', patterns: [
    { regex: /list-manage\.com|mcjs/i, detail: 'Mailchimp embed detected' },
  ]},
  { tool: 'Klaviyo', patterns: [
    { regex: /static\.klaviyo\.com|_learnq/i, detail: 'Klaviyo email marketing detected' },
  ]},
  { tool: 'Typeform', patterns: [
    { regex: /embed\.typeform\.com|widget\.typeform\.com/i, detail: 'Typeform embed detected' },
  ]},
  { tool: 'Zendesk', patterns: [
    { regex: /static\.zdassets\.com|widget-mediator\.zendesk/i, detail: 'Zendesk support widget detected' },
  ]},
  { tool: 'Shopify', patterns: [
    { regex: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme/i, detail: 'Shopify storefront detected' },
  ]},
  { tool: 'Crisp', patterns: [
    { regex: /client\.crisp\.chat/i, detail: 'Crisp chat widget detected' },
  ]},
  { tool: 'Tawk.to', patterns: [
    { regex: /embed\.tawk\.to/i, detail: 'Tawk.to chat widget detected' },
  ]},
  { tool: 'ActiveCampaign', patterns: [
    { regex: /trackcmp\.net|activehosted\.com/i, detail: 'ActiveCampaign tracking detected' },
  ]},
]

// ─── HTML helpers ───────────────────────────────────────────────────────────

function stripTags(html: string, maxLength = 400): string {
  return sanitizeString(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim(),
    maxLength,
  )
}

function extractTagContent(html: string, tag: string, max = 10): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const results: string[] = []
  for (const match of html.matchAll(regex)) {
    const text = stripTags(match[1] ?? '', 300)
    if (text && text.length > 2) results.push(text)
    if (results.length >= max) break
  }
  return results
}

function extractMetaContent(html: string, attr: 'name' | 'property', key: string): string {
  const regex = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')
  const match = html.match(regex)
  return match ? sanitizeString(match[1], 300) : ''
}

function extractHrefsByPattern(html: string, pattern: RegExp): string[] {
  const results: string[] = []
  for (const match of html.matchAll(pattern)) {
    const href = sanitizeString(match[1] ?? '', 300)
    if (href) results.push(href)
  }
  return [...new Set(results)]
}

function findInternalLink(html: string, baseUrl: string, keywords: string[]): string {
  const origin = new URL(baseUrl).origin
  const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(regex)) {
    const href = (match[1] ?? '').trim()
    const text = stripTags(match[2] ?? '', 100).toLowerCase()
    const path = href.toLowerCase()
    const haystack = `${text} ${path}`
    if (keywords.some((kw) => haystack.includes(kw))) {
      try {
        const resolved = new URL(href, baseUrl)
        if (resolved.origin === origin) return resolved.toString()
      } catch {
        continue
      }
    }
  }
  return ''
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  const normalized = normalizeWebsiteUrlInput(url)
  if (!normalized) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(normalized, {
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

    return (await response.text()).slice(0, MAX_HTML_CHARS)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Weakness detection ─────────────────────────────────────────────────────

function detectWeaknesses(
  homepageHtml: string,
  aboutHtml: string | null,
  servicesHtml: string | null,
  research: Partial<AgencyResearch>,
): Array<{ signal: string; detail: string }> {
  const signals: Array<{ signal: string; detail: string }> = []
  const bodyText = stripTags(homepageHtml, 5000).toLowerCase()

  // Generic language
  const genericPhrases = [
    'we help businesses grow',
    'take your business to the next level',
    'one-stop shop',
    'full-service agency',
    'we do it all',
    'your trusted partner',
    'results-driven',
  ]
  const foundGeneric = genericPhrases.filter((p) => bodyText.includes(p))
  if (foundGeneric.length > 0) {
    signals.push({
      signal: 'weak_positioning',
      detail: `Generic language detected: "${foundGeneric[0]}". This signals weak market positioning.`,
    })
  }

  // No client logos
  if (research.clientLogos?.length === 0 && research.testimonials?.length === 0) {
    signals.push({
      signal: 'no_social_proof',
      detail: 'No client logos or testimonials found on homepage. Likely small or new agency.',
    })
  }

  // No case studies
  const hasCaseStudies = bodyText.includes('case stud') ||
    bodyText.includes('success stor') ||
    bodyText.includes('portfolio') ||
    (aboutHtml && stripTags(aboutHtml, 3000).toLowerCase().includes('case stud'))
  if (!hasCaseStudies) {
    signals.push({
      signal: 'no_case_studies',
      detail: 'No case studies or portfolio found. Missing proof of results.',
    })
  }

  // No booking system — manual contact form only
  const hasBooking = research.detectedStack?.some(
    (s) => ['Calendly', 'HubSpot', 'Drift', 'Intercom', 'GoHighLevel', 'Crisp', 'Tawk.to'].includes(s.tool)
  )
  const hasContactForm = bodyText.includes('contact us') || bodyText.includes('get in touch') || bodyText.includes('send us a message')
  if (!hasBooking && hasContactForm) {
    signals.push({
      signal: 'no_booking_system',
      detail: 'Manual contact form only — no automated booking system detected.',
    })
  }

  // No pricing page
  const hasPricing = bodyText.includes('pricing') ||
    bodyText.includes('packages') ||
    bodyText.includes('investment') ||
    (research.pricingMentions?.length ?? 0) > 0
  if (!hasPricing) {
    signals.push({
      signal: 'no_pricing_page',
      detail: 'No pricing page found. "Contact for quote" suggests manual consultative sales process.',
    })
  }

  // Stale blog
  const blogHtml = homepageHtml + (aboutHtml ?? '')
  const datePatterns = blogHtml.match(/\b(20[0-9]{2})[^0-9]/g) ?? []
  const years = datePatterns.map((d) => parseInt(d.slice(0, 4))).filter((y) => y >= 2020)
  const currentYear = new Date().getFullYear()
  const recentYears = years.filter((y) => y >= currentYear - 1)
  if (years.length > 0 && recentYears.length === 0) {
    signals.push({
      signal: 'stale_blog',
      detail: `Most recent content dates appear to be from ${Math.max(...years)}. Marketing appears neglected.`,
    })
  }

  // Many services but likely small team
  if ((research.fullServicesList?.length ?? 0) >= 8 && research.teamSizeHint?.toLowerCase().includes('small')) {
    signals.push({
      signal: 'scope_vs_capacity',
      detail: `${research.fullServicesList?.length} services listed but team appears small. Scope-to-capacity risk.`,
    })
  }

  return signals.slice(0, 8)
}

// ─── Main research function ─────────────────────────────────────────────────

export async function researchAgency(rawUrl: string): Promise<AgencyResearch | null> {
  const url = normalizeWebsiteUrlInput(rawUrl)
  if (!url) return null

  const emptyResearch: AgencyResearch = {
    url,
    fetchedSuccessfully: false,
    headline: '',
    subheadline: '',
    servicesList: [],
    pricingMentions: [],
    clientLogos: [],
    testimonials: [],
    ctaButtons: [],
    contactInfo: [],
    teamPageLink: '',
    blogLink: '',
    teamSizeHint: '',
    foundingYear: '',
    companyDescription: '',
    fullServicesList: [],
    socialLinks: { linkedin: '', twitter: '', instagram: '', facebook: '' },
    linkedinAbout: '',
    detectedStack: [],
    weaknessSignals: [],
    researchSummary: '',
  }

  // 1. Fetch homepage
  const homepageHtml = await fetchPage(url)
  if (!homepageHtml) {
    return { ...emptyResearch, researchSummary: `Could not fetch ${url}. The site may be down, blocking bots, or loading entirely via JavaScript.` }
  }

  const research: AgencyResearch = { ...emptyResearch, fetchedSuccessfully: true }

  // Extract homepage signals
  const h1s = extractTagContent(homepageHtml, 'h1', 2)
  const h2s = extractTagContent(homepageHtml, 'h2', 6)
  research.headline = h1s[0] ?? ''
  research.subheadline = h2s[0] ?? h1s[1] ?? ''

  // Meta description
  research.companyDescription = extractMetaContent(homepageHtml, 'name', 'description') ||
    extractMetaContent(homepageHtml, 'property', 'og:description')

  // CTAs
  const allButtons = [
    ...extractTagContent(homepageHtml, 'a', 20),
    ...extractTagContent(homepageHtml, 'button', 10),
  ]
  const ctaKeywords = ['book', 'schedule', 'get started', 'start', 'request', 'demo', 'audit', 'free', 'call', 'contact', 'quote']
  research.ctaButtons = allButtons
    .filter((t) => ctaKeywords.some((kw) => t.toLowerCase().includes(kw)))
    .slice(0, 6)

  // Services from homepage
  const serviceKeywords = ['service', 'solution', 'offer', 'what we do', 'capabilities']
  const allHeadings = [...h1s, ...h2s, ...extractTagContent(homepageHtml, 'h3', 10)]
  research.servicesList = allHeadings
    .filter((h) => serviceKeywords.some((kw) => h.toLowerCase().includes(kw)) || h.length < 60)
    .slice(0, 10)

  // Client logos — look for img alt text in a section near "client", "trusted", "partner"
  const logoRegex = /<img[^>]*alt=["']([^"']{3,80})["'][^>]*>/gi
  const allImgAlts: string[] = []
  for (const match of homepageHtml.matchAll(logoRegex)) {
    allImgAlts.push(sanitizeString(match[1], 80))
  }
  // Heuristic: logos are near "client" or "trusted by" sections
  const clientSection = homepageHtml.match(/(?:client|trusted|partner|featured|as seen)[^]*?(?=<\/section|<\/div>\s*<(?:section|footer))/i)?.[0] ?? ''
  const clientLogos: string[] = []
  for (const match of clientSection.matchAll(logoRegex)) {
    const alt = sanitizeString(match[1], 80)
    if (alt && !alt.toLowerCase().includes('logo') || alt.length > 3) clientLogos.push(alt)
  }
  research.clientLogos = [...new Set(clientLogos)].slice(0, 8)

  // Testimonials
  const testimonialPatterns = homepageHtml.match(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi) ?? []
  research.testimonials = testimonialPatterns
    .map((t) => stripTags(t, 200))
    .filter((t) => t.length > 20)
    .slice(0, 4)

  // Pricing mentions
  const pricingMentions = stripTags(homepageHtml, 10000).match(/\$[\d,]+(?:\/(?:mo|month|yr|year|project|hour))?/gi) ?? []
  research.pricingMentions = [...new Set(pricingMentions)].slice(0, 5)

  // Contact info
  const emails = homepageHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []
  const phones = homepageHtml.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) ?? []
  research.contactInfo = [...new Set([...emails, ...phones])].slice(0, 4)

  // Social links
  for (const { platform, regex } of SOCIAL_PATTERNS) {
    const matches = extractHrefsByPattern(homepageHtml, regex)
    if (matches[0]) research.socialLinks[platform] = matches[0]
  }

  // Internal links
  research.teamPageLink = findInternalLink(homepageHtml, url, ['about', 'team', 'who we are', 'our story'])
  research.blogLink = findInternalLink(homepageHtml, url, ['blog', 'news', 'insights', 'articles', 'resources'])

  // 2. Fetch about page
  const aboutUrl = research.teamPageLink || findInternalLink(homepageHtml, url, ['about'])
  let aboutHtml: string | null = null
  if (aboutUrl) {
    aboutHtml = await fetchPage(aboutUrl)
    if (aboutHtml) {
      const aboutText = stripTags(aboutHtml, 5000)

      // Team size hints
      const teamMatch = aboutText.match(/(\d+)\+?\s*(?:team members|employees|people|staff|experts|specialists)/i)
      if (teamMatch) research.teamSizeHint = `~${teamMatch[1]} team members`

      // Founding year
      const yearMatch = aboutText.match(/(?:founded|established|since|started)\s*(?:in\s*)?(\d{4})/i)
      if (yearMatch) research.foundingYear = yearMatch[1]

      // Better company description from about
      const aboutDesc = extractMetaContent(aboutHtml, 'name', 'description') || extractTagContent(aboutHtml, 'p', 3).join(' ')
      if (aboutDesc.length > research.companyDescription.length) {
        research.companyDescription = sanitizeString(aboutDesc, 500)
      }
    }
  }

  // 3. Fetch services page
  const servicesUrl = findInternalLink(homepageHtml, url, ['services', 'what-we-do', 'solutions', 'offerings', 'capabilities'])
  let servicesHtml: string | null = null
  if (servicesUrl) {
    servicesHtml = await fetchPage(servicesUrl)
    if (servicesHtml) {
      const svcHeadings = [
        ...extractTagContent(servicesHtml, 'h2', 15),
        ...extractTagContent(servicesHtml, 'h3', 15),
      ]
      research.fullServicesList = [...new Set(svcHeadings.filter((h) => h.length > 3 && h.length < 100))].slice(0, 15)
    }
  }

  // 4. Detect tech stack
  const allHtml = [homepageHtml, aboutHtml, servicesHtml].filter(Boolean).join('\n')
  const seenTools = new Set<string>()
  for (const fp of STACK_FINGERPRINTS) {
    if (seenTools.has(fp.tool)) continue
    const match = fp.patterns.find((p) => p.regex.test(allHtml))
    if (match) {
      seenTools.add(fp.tool)
      research.detectedStack.push({ tool: fp.tool, detail: match.detail })
    }
  }

  // 5. LinkedIn public about (if link found)
  if (research.socialLinks.linkedin) {
    try {
      const linkedinHtml = await fetchPage(research.socialLinks.linkedin)
      if (linkedinHtml) {
        const aboutSection = extractMetaContent(linkedinHtml, 'property', 'og:description') ||
          extractMetaContent(linkedinHtml, 'name', 'description')
        if (aboutSection) research.linkedinAbout = sanitizeString(aboutSection, 400)
      }
    } catch {
      // LinkedIn often blocks — this is expected
    }
  }

  // 6. Detect weakness signals
  research.weaknessSignals = detectWeaknesses(homepageHtml, aboutHtml, servicesHtml, research)

  // 7. Build summary
  const summaryParts: string[] = []
  if (research.headline) summaryParts.push(`Homepage headline: "${research.headline}"`)
  if (research.companyDescription) summaryParts.push(`Description: ${research.companyDescription}`)
  if (research.fullServicesList.length > 0) summaryParts.push(`Services (${research.fullServicesList.length}): ${research.fullServicesList.slice(0, 6).join(', ')}`)
  if (research.detectedStack.length > 0) summaryParts.push(`Tech stack: ${research.detectedStack.map((s) => s.tool).join(', ')}`)
  if (research.clientLogos.length > 0) summaryParts.push(`Client logos found: ${research.clientLogos.slice(0, 4).join(', ')}`)
  if (research.testimonials.length > 0) summaryParts.push(`${research.testimonials.length} testimonials found`)
  if (research.teamSizeHint) summaryParts.push(`Team: ${research.teamSizeHint}`)
  if (research.foundingYear) summaryParts.push(`Founded: ${research.foundingYear}`)
  if (research.ctaButtons.length > 0) summaryParts.push(`CTAs: ${research.ctaButtons.slice(0, 3).join(', ')}`)
  if (research.socialLinks.linkedin) summaryParts.push(`LinkedIn: ${research.socialLinks.linkedin}`)
  if (research.weaknessSignals.length > 0) summaryParts.push(`Weakness signals (${research.weaknessSignals.length}): ${research.weaknessSignals.map((s) => s.signal).join(', ')}`)

  research.researchSummary = sanitizeString(summaryParts.join(' | '), 2000)

  return research
}

export function serializeAgencyResearch(research: AgencyResearch): string {
  const parts: string[] = []

  parts.push(`URL: ${research.url}`)
  parts.push(`Fetch status: ${research.fetchedSuccessfully ? 'Success' : 'Failed'}`)

  if (research.headline) parts.push(`Homepage headline: "${research.headline}"`)
  if (research.subheadline) parts.push(`Subheadline: "${research.subheadline}"`)
  if (research.companyDescription) parts.push(`About: ${research.companyDescription}`)
  if (research.teamSizeHint) parts.push(`Team size hint: ${research.teamSizeHint}`)
  if (research.foundingYear) parts.push(`Founded: ${research.foundingYear}`)

  if (research.fullServicesList.length > 0) {
    parts.push(`Services offered (${research.fullServicesList.length}): ${research.fullServicesList.join(' | ')}`)
  } else if (research.servicesList.length > 0) {
    parts.push(`Homepage services: ${research.servicesList.join(' | ')}`)
  }

  if (research.detectedStack.length > 0) {
    parts.push(`Detected tech stack: ${research.detectedStack.map((s) => `${s.tool} (${s.detail})`).join(' | ')}`)
  }

  if (research.clientLogos.length > 0) {
    parts.push(`Client logos/mentions: ${research.clientLogos.join(', ')}`)
  }

  if (research.testimonials.length > 0) {
    parts.push(`Testimonials found: ${research.testimonials.length}. Sample: "${research.testimonials[0]}"`)
  }

  if (research.pricingMentions.length > 0) {
    parts.push(`Pricing mentions: ${research.pricingMentions.join(', ')}`)
  }

  if (research.ctaButtons.length > 0) {
    parts.push(`CTA buttons: ${research.ctaButtons.join(' | ')}`)
  }

  if (research.contactInfo.length > 0) {
    parts.push(`Contact info: ${research.contactInfo.join(', ')}`)
  }

  const socials = Object.entries(research.socialLinks).filter(([, v]) => v)
  if (socials.length > 0) {
    parts.push(`Social links: ${socials.map(([k, v]) => `${k}: ${v}`).join(' | ')}`)
  }

  if (research.linkedinAbout) {
    parts.push(`LinkedIn about: ${research.linkedinAbout}`)
  }

  if (research.weaknessSignals.length > 0) {
    parts.push(`WEAKNESS SIGNALS DETECTED:`)
    for (const ws of research.weaknessSignals) {
      parts.push(`  - ${ws.signal}: ${ws.detail}`)
    }
  }

  return sanitizeString(parts.join('\n'), 4000)
}
