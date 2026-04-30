import { openai } from './openai'
import { CALENDLY_STRATEGY_CALL_URL } from './constants'

export interface DraftResponseInput {
  name?: string
  company?: string
  agencyType?: string
  teamSize?: string
  revenueRange?: string
  tools?: string
  biggestPain?: string
  topOpportunity?: string
  annualWaste?: number | null
  readinessScore?: number
}

export interface DraftResponseOutput {
  subject: string
  body: string
}

const SYSTEM_PROMPT = `You are drafting a short, personal email from the OpsRadar team to someone who just completed a free automation audit on the site.

OPSRADAR VOICE:
- Direct, warm, specific — never corporate
- Never uses hype words: no "excited", "thrilled", "amazing", "game-changer"
- Refers to tools by name when the prospect mentioned them
- Offers one concrete next step, not a menu of options
- Signs with just "— OpsRadar"
- Writes like a human, not a template

FORMAT:
- Keep body under 120 words
- No subject-line prefixes like "Re:" (write fresh subject lines)
- No heavy formatting, no bullet lists, no bold text
- Two short paragraphs max`

export async function generateDraftResponse(
  input: DraftResponseInput,
): Promise<DraftResponseOutput | null> {
  try {
    const firstName = (input.name ?? '').trim().split(/\s+/)[0] || 'there'
    const wasteText = typeof input.annualWaste === 'number' && input.annualWaste > 0
      ? `${input.annualWaste.toLocaleString()}/year`
      : 'a significant amount'

    const userPrompt = `Draft an email from OpsRadar to this prospect:

Name: ${firstName}
Company: ${input.company || 'their agency'}
Agency type: ${input.agencyType || 'unknown'}
Team size: ${input.teamSize || 'unknown'}
Revenue: ${input.revenueRange || 'unknown'}
Tools they use: ${input.tools || 'not specified'}
Their biggest pain (their words): "${input.biggestPain || 'not specified'}"
Top opportunity from audit: ${input.topOpportunity || 'not specified'}
Annual waste identified: $${wasteText}
Readiness score: ${typeof input.readinessScore === 'number' ? `${input.readinessScore}/100` : 'not scored'}

The email must:
1. Start with "Hey ${firstName},"
2. Reference one specific detail from their audit (a tool, a number, or their pain) naturally — don't list the numbers back at them, weave one in
3. Not re-pitch what they already read in the audit
4. Offer one clear next step: a 20-minute call using ${CALENDLY_STRATEGY_CALL_URL}
5. Give an async alternative: they can reply with their top concern and the OpsRadar team will send a Loom
6. End with "— OpsRadar"
7. Stay under 120 words total

Return ONLY a JSON object with this exact shape: {"subject": "...", "body": "..."}
No markdown fences, no commentary, just the JSON.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) {
      console.warn('[draft-response] empty completion content')
      return null
    }

    const parsed = JSON.parse(content) as Partial<DraftResponseOutput>
    if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string') {
      console.warn('[draft-response] malformed JSON shape:', content.slice(0, 200))
      return null
    }

    return {
      subject: parsed.subject.trim(),
      body: parsed.body.trim(),
    }
  } catch (err) {
    console.warn(
      '[draft-response] generation failed:',
      err instanceof Error ? err.message : err,
    )
    return null
  }
}
