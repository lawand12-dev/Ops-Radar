import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId, getSessionSupabaseClient } from '<npm>/lib/supabase-ssr'
import { getServerSupabaseClient } from '<npm>/lib/supabase-server'
import { decryptApiKey } from '<npm>/lib/integrations/crypto'
import { applyRateLimit } from '<npm>/lib/rate-limit'
import { openai } from '<npm>/lib/openai'
import { buildCooContext } from '<npm>/lib/coo/context'
import { canAccess, getUserPlan, upgradeRequiredBody } from '<npm>/lib/tier'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTED_QUESTIONS = [
  'How did we do this month?',
  'Which clients should I worry about?',
  'Will I make payroll next month?',
  'Which clients should I reprice?',
  'How close are we to capacity?',
  'What are the most important things to do today?',
]

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ suggested_questions: SUGGESTED_QUESTIONS })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getCurrentUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const limited = await applyRateLimit(request, 'dashboard-coo', userId)
  if (limited) return limited as NextResponse

  const body = (await request.json().catch(() => ({}))) as { messages?: Message[] }
  const messages = (body.messages ?? []).slice(-10)

  if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'invalid_messages' }, { status: 400 })
  }

  const service = getServerSupabaseClient()
  const { data: { user }, error: userErr } = await service.auth.admin.getUserById(userId)
  if (userErr || !user) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  const plan = getUserPlan(meta)
  if (!canAccess(plan, 'coo_chat')) {
    return NextResponse.json(upgradeRequiredBody('growth'), { status: 402 })
  }

  const blendedRate = typeof meta.blended_hourly_rate_usd === 'number'
    ? meta.blended_hourly_rate_usd
    : 85
  const companyName = typeof meta.company_name === 'string' ? meta.company_name : 'your agency'
  const teamSizeRaw = typeof meta.team_size === 'string' ? meta.team_size : ''

  const session = await getSessionSupabaseClient()
  const { data: keyRows } = await session
    .from('integrations')
    .select('tool, encrypted_token, iv, auth_tag, status')
    .eq('client_id', userId)
    .eq('status', 'connected')

  const connectedTools = (keyRows ?? []).map((r) => r.tool as string)
  const getKey = (tool: string): string | null => {
    const row = (keyRows ?? []).find((r) => r.tool === tool)
    try { return row ? decryptApiKey(row) : null } catch { return null }
  }

  const { data: pendingRows } = await session
    .from('agent_actions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')

  const pendingActionsCount = (pendingRows ?? []).length

  let ctx
  try {
    ctx = await buildCooContext({
      stripeApiKey: getKey('stripe'),
      harvestApiKey: getKey('harvest'),
      blendedRate,
      companyName,
      teamSizeRaw,
      connectedTools,
      pendingActionsCount,
    })
  } catch (err) {
    console.error('[coo] context build failed:', err)
    return NextResponse.json({ error: 'context_failed' }, { status: 500 })
  }

  const systemPrompt = `You are the COO of ${ctx.overview.company_name}. You have access to today's live agency data below. Answer questions based ONLY on this data — never guess or invent numbers. Be concise and direct. Always suggest a specific action when you identify a problem. Format responses as clear prose (no markdown headers, no bullet overload).

## Today's Agency Data

### Overview
- Company: ${ctx.overview.company_name}
- Active clients this month: ${ctx.overview.active_clients}
- Total revenue MTD: $${ctx.overview.total_revenue_mtd.toFixed(0)}
- Median client margin: ${ctx.overview.median_margin_pct !== null ? `${ctx.overview.median_margin_pct.toFixed(1)}%` : 'N/A'}
- Clients below break-even: ${ctx.overview.clients_below_breakeven}
- Overdue invoices: ${ctx.overview.overdue_invoices.count} totalling $${ctx.overview.overdue_invoices.total_usd.toFixed(0)}
- Connected tools: ${ctx.overview.connected_tools.join(', ') || 'none'}

### Cash Flow (next 30 days)
- Open invoices total: $${ctx.cash_flow.open_invoices_total_usd.toFixed(0)}
- Due in next 30 days: $${ctx.cash_flow.open_invoices_due_next_30d_usd.toFixed(0)}
- Average days to pay: ${ctx.cash_flow.avg_days_to_pay !== null ? `${ctx.cash_flow.avg_days_to_pay}d` : 'N/A'}

### Team Capacity
- Team size: ${ctx.capacity.team_size_raw}
- Estimated monthly capacity: ${ctx.capacity.estimated_monthly_capacity_hours !== null ? `${ctx.capacity.estimated_monthly_capacity_hours}h` : 'N/A'}
- Hours tracked this month: ${ctx.capacity.hours_tracked_this_month !== null ? `${ctx.capacity.hours_tracked_this_month}h` : 'N/A'}
- Utilization: ${ctx.capacity.utilization_pct !== null ? `${ctx.capacity.utilization_pct}%` : 'N/A'}
- Available hours: ${ctx.capacity.available_hours !== null ? `${ctx.capacity.available_hours}h` : 'N/A'}

### Rate & Repricing
- Current blended rate: $${ctx.rate_advice.current_blended_rate_usd}/hr
- Suggested rate: ${ctx.rate_advice.suggested_rate_usd !== null ? `$${ctx.rate_advice.suggested_rate_usd}/hr` : 'current rate looks healthy'}
- Annual impact of rate increase: ${ctx.rate_advice.annual_impact_usd !== null ? `+$${ctx.rate_advice.annual_impact_usd.toLocaleString()}` : 'N/A'}
- Clients to reprice (below 20% margin): ${ctx.rate_advice.clients_to_reprice.length > 0 ? ctx.rate_advice.clients_to_reprice.map((c) => `${c.name} (${c.margin_pct}%)`).join(', ') : 'none'}

### Actions
- Pending agent actions awaiting your approval: ${ctx.pending_actions_count}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.4,
      max_tokens: 600,
    })

    const reply = completion.choices[0]?.message?.content ?? 'I couldn\'t generate a response. Please try again.'
    return NextResponse.json({ message: reply })
  } catch (err) {
    console.error('[coo] GPT-4o call failed:', err)
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 })
  }
}
