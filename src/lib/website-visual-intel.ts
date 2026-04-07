import { openai } from './openai'
import { sanitizeString } from './security'
import { normalizeWebsiteUrlInput } from './website-intel'

type RawVisualEvidence = {
  label: string
  detail: string
}

export type WebsiteVisualEvidence = {
  label: string
  detail: string
  sourceLabel: string
  sourcePath: string
}

export type WebsiteVisualSignals = {
  screenshotUrl: string
  summary: string
  evidence: WebsiteVisualEvidence[]
}

const SCREENSHOT_BASE_URL = process.env.WEBSITE_SCREENSHOT_BASE_URL || 'https://image.thum.io/get'

const VISUAL_SYSTEM_PROMPT = `
You are the OpsRadar visual website analyst.

You review a single public website screenshot and extract only what is visibly supported.

Return valid JSON with this shape:
{
  "visual_summary": "1-2 sentences on positioning clarity, perceived maturity, and CTA quality.",
  "hero_headline": "visible or strongly implied hero message, or empty string",
  "design_tone": "short phrase like premium, generic, dated, bold, corporate, polished",
  "cta_strength": "strong | moderate | weak",
  "trust_signals": ["up to 3 visible cues"],
  "concerns": ["up to 2 visible concerns"],
  "evidence": [
    {
      "label": "short label",
      "detail": "specific visual cue"
    }
  ]
}

Rules:
- Only describe what can be seen in the screenshot.
- If text is hard to read, focus on structure, hierarchy, CTA prominence, density, and trust presentation.
- Keep evidence labels short and specific.
- Max 4 evidence items.
- No markdown.
`.trim()

function sanitizeList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function sanitizeEvidence(value: unknown): RawVisualEvidence[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      const label = typeof record.label === 'string' ? sanitizeString(record.label, 32) : ''
      const detail = typeof record.detail === 'string' ? sanitizeString(record.detail, 120) : ''
      if (!label || !detail) return null
      return { label, detail }
    })
    .filter((item): item is RawVisualEvidence => Boolean(item))
    .slice(0, 4)
}

function buildFallbackEvidence(parsed: {
  heroHeadline: string
  designTone: string
  ctaStrength: string
  trustSignals: string[]
  concerns: string[]
}): RawVisualEvidence[] {
  const fallback: RawVisualEvidence[] = []

  if (parsed.heroHeadline) {
    fallback.push({ label: 'Hero read', detail: parsed.heroHeadline })
  }

  if (parsed.designTone) {
    fallback.push({ label: 'Visual tone', detail: parsed.designTone })
  }

  if (parsed.ctaStrength) {
    fallback.push({ label: 'CTA pressure', detail: parsed.ctaStrength })
  }

  if (parsed.trustSignals[0]) {
    fallback.push({ label: 'Trust cue', detail: parsed.trustSignals[0] })
  }

  if (parsed.concerns[0]) {
    fallback.push({ label: 'Friction cue', detail: parsed.concerns[0] })
  }

  return fallback.slice(0, 4)
}

function buildSummary(parsed: {
  visualSummary: string
  heroHeadline: string
  designTone: string
  ctaStrength: string
  trustSignals: string[]
  concerns: string[]
}): string {
  const parts = [
    parsed.visualSummary,
    parsed.heroHeadline ? `Hero read: ${parsed.heroHeadline}` : '',
    parsed.designTone ? `Perceived design tone: ${parsed.designTone}` : '',
    parsed.ctaStrength ? `CTA strength: ${parsed.ctaStrength}` : '',
    parsed.trustSignals.length > 0 ? `Visible trust cues: ${parsed.trustSignals.join(' | ')}` : '',
    parsed.concerns.length > 0 ? `Visible visual concerns: ${parsed.concerns.join(' | ')}` : '',
  ].filter(Boolean)

  return sanitizeString(parts.join(' | '), 700)
}

export function buildWebsiteScreenshotUrl(rawUrl: string): string {
  const normalized = normalizeWebsiteUrlInput(rawUrl)
  if (!normalized) return ''
  return `${SCREENSHOT_BASE_URL}/width/1440/crop/1200/noanimate/${normalized}`
}

export function serializeWebsiteVisualEvidence(evidence: WebsiteVisualEvidence[]): string {
  if (evidence.length === 0) return ''

  try {
    return JSON.stringify(evidence.slice(0, 4).map((item) => ({
      label: sanitizeString(item.label, 32),
      detail: sanitizeString(item.detail, 120),
      sourceLabel: sanitizeString(item.sourceLabel, 24),
      sourcePath: sanitizeString(item.sourcePath, 32),
    })))
  } catch {
    return ''
  }
}

export async function analyzeWebsiteVisualSignals(rawUrl: string): Promise<WebsiteVisualSignals | null> {
  const normalized = normalizeWebsiteUrlInput(rawUrl)
  if (!normalized) return null

  const screenshotUrl = buildWebsiteScreenshotUrl(normalized)
  if (!screenshotUrl) return null

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 550,
      messages: [
        {
          role: 'system',
          content: VISUAL_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this public homepage screenshot for OpsRadar. Website: ${normalized}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshotUrl,
              },
            },
          ],
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const visualSummary = typeof parsed.visual_summary === 'string'
      ? sanitizeString(parsed.visual_summary, 240)
      : ''
    const heroHeadline = typeof parsed.hero_headline === 'string'
      ? sanitizeString(parsed.hero_headline, 120)
      : ''
    const designTone = typeof parsed.design_tone === 'string'
      ? sanitizeString(parsed.design_tone, 80)
      : ''
    const ctaStrength = typeof parsed.cta_strength === 'string'
      ? sanitizeString(parsed.cta_strength, 32)
      : ''
    const trustSignals = sanitizeList(parsed.trust_signals, 3, 100)
    const concerns = sanitizeList(parsed.concerns, 2, 110)
    const rawEvidence = sanitizeEvidence(parsed.evidence)
    const evidenceItems = (rawEvidence.length > 0 ? rawEvidence : buildFallbackEvidence({
      heroHeadline,
      designTone,
      ctaStrength,
      trustSignals,
      concerns,
    }))
      .map((item) => ({
        ...item,
        sourceLabel: 'Screenshot',
        sourcePath: '/ (visual)',
      }))
      .slice(0, 4)

    const summary = buildSummary({
      visualSummary,
      heroHeadline,
      designTone,
      ctaStrength,
      trustSignals,
      concerns,
    })

    if (!summary && evidenceItems.length === 0) return null

    return {
      screenshotUrl,
      summary,
      evidence: evidenceItems,
    }
  } catch {
    return null
  }
}
