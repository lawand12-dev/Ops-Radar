import { ImageResponse } from 'next/og'
import { getServerSupabaseClient } from '../../lib/supabase-server'

export const runtime = 'nodejs'
export const alt = 'OpsRadar Automation Audit'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string; access?: string }> | { id?: string; access?: string }
}) {
  const resolvedSearchParams = searchParams
    ? await searchParams
    : {}
  const id = typeof resolvedSearchParams?.id === 'string'
    ? resolvedSearchParams.id
    : ''

  let company    = ''
  let score      = 0
  let annualWaste = 0
  let oppCount   = 0
  let headline   = 'Your Automation Audit Is Ready'

  if (id) {
    const supabase = getServerSupabaseClient()
    const { data } = await supabase
      .from('audits')
      .select('company, result')
      .eq('id', id)
      .maybeSingle()

    if (data?.result) {
      company    = data.company ?? ''
      const r    = data.result as Record<string, unknown> | null
      score      = (r?.automation_readiness_score as number) ?? 0
      annualWaste = (r?.estimated_annual_waste as number) ?? 0
      const opps = (r?.opportunities as unknown[]) ?? []
      oppCount   = opps.length
      headline   = (r?.summary as Record<string, unknown>)?.headline as string
                ?? (r?.executive_summary as string)?.slice(0, 80)
                ?? headline
    }
  }

  const scoreColor = score >= 60 ? '#10b981' : score >= 30 ? '#f59e0b' : '#ef4444'
  const wasteStr   = annualWaste >= 1000
    ? `$${(annualWaste / 1000).toFixed(0)}K`
    : annualWaste > 0 ? `$${annualWaste}` : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #060c1e 0%, #0c1836 50%, #060c1e 100%)',
          display: 'flex', flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          position: 'relative', overflow: 'hidden',
          padding: '60px',
        }}
      >
        {/* Background glow */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 600, height: 600, background: 'rgba(59,130,246,0.08)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -100, width: 500, height: 500, background: 'rgba(139,92,246,0.07)', borderRadius: '50%', filter: 'blur(80px)' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>O</div>
            </div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>OpsRadar</div>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '6px 14px', color: '#10b981', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            Audit Complete
          </div>
        </div>

        {/* Headline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {company && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
              {company}
            </div>
          )}
          <div style={{ color: 'white', fontSize: 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1, maxWidth: 700, marginBottom: 32 }}>
            {headline.length > 70 ? headline.slice(0, 70) + '…' : headline}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16 }}>
            {score > 0 && (
              <div style={{ background: `${scoreColor}12`, border: `1px solid ${scoreColor}30`, borderRadius: 14, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Readiness</div>
                <div style={{ color: scoreColor, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{score}<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>/100</span></div>
              </div>
            )}
            {wasteStr && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Annual Savings</div>
                <div style={{ color: '#f59e0b', fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{wasteStr}</div>
              </div>
            )}
            {oppCount > 0 && (
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Opportunities</div>
                <div style={{ color: '#60a5fa', fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{oppCount}</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, marginTop: 32 }}>opsradar.co · Done-For-You Agency Automation</div>
      </div>
    ),
    { ...size },
  )
}
