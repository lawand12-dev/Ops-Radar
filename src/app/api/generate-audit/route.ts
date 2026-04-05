import { openai } from '../../../lib/openai'
import { SYSTEM_PROMPT, buildUserPrompt, type AuditInput } from '../../../lib/prompts'
import { supabase } from '../../../lib/supabase'
import { checkRateLimit } from '../../../lib/rate-limit'
import type { NotifyPayload } from '../notify/route'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RequestBody = AuditInput & {
  name: string
  email: string
  company: string
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()

    const {
      name, email, company,
      agencyType, teamSize, revenue, activeClients,
      tools, crmTool, timeHeavy, leadEntry,
      onboarding, progressTracking, automationWish, futureVision,
    } = body

    if (!name || !email || !company || !agencyType || !teamSize || !revenue || !automationWish) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for') || 'anonymous'
    if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) { // 5 requests per hour
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserPrompt({
            agencyType, teamSize, revenue, activeClients,
            tools, crmTool, timeHeavy, leadEntry,
            onboarding, progressTracking, automationWish, futureVision,
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const raw = completion.choices[0].message.content
    if (!raw) {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    const audit = JSON.parse(raw)

    // ── Supabase ────────────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    console.log('[supabase] URL defined:', !!supabaseUrl, '| URL prefix:', supabaseUrl?.slice(0, 30))
    console.log('[supabase] Key defined:', !!supabaseKey, '| Key prefix:', supabaseKey?.slice(0, 20))

    const insertPayload = {
      name,
      email,
      company,
      answers: {
        agencyType, teamSize, revenue, activeClients,
        tools, crmTool, timeHeavy, leadEntry,
        onboarding, progressTracking, automationWish, futureVision,
      },
      result: audit,
    }
    console.log('[supabase] Inserting into audits, payload keys:', Object.keys(insertPayload))

    const { data, error } = await supabase
      .from('audits')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      console.error('[supabase] Insert failed:')
      console.error('  message :', error.message)
      console.error('  code    :', error.code)
      console.error('  details :', error.details)
      console.error('  hint    :', error.hint)
      return Response.json({ audit })
    }

    console.log('[supabase] Insert success, id:', data.id)

    // ── Fire-and-forget notification ────────────────────────────────────────
    const notifyPayload: NotifyPayload = {
      company,
      name,
      email,
      teamSize,
      agencyType,
      timeWasters: automationWish,
      automationReadinessScore: audit.automation_readiness_score ?? 0,
      estimatedAnnualWaste: audit.estimated_annual_waste ?? null,
    }
    fetch(new URL('/api/notify', request.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifyPayload),
    }).catch((err) => console.error('[notify] Failed to send notification:', err))

    return Response.json({ audit, id: data.id })
  } catch (err) {
    console.error('generate-audit error:', err)
    return Response.json({ error: 'Failed to generate audit' }, { status: 500 })
  }
}
