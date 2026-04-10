export type FunnelEventName =
  | 'audit_started'
  | 'lead_modal_opened'
  | 'audit_submitted'
  | 'results_viewed'
  | 'report_section_viewed'
  | 'strategy_call_clicked'
  | 'build_request_opened'
  | 'build_request_submitted'
  | 'build_request_success'
  | 'unlock_email_requested'
  | 'unlock_email_sent'

export type FunnelEventPayload = {
  event: FunnelEventName
  sessionId?: string | null
  auditId?: string | null
  step?: number
  source?: string
  sectionId?: string
  reportStage?: 'preview' | 'full'
  metadata?: Record<string, string | number | boolean | null>
}

const AUDIT_SESSION_KEY = 'opsradar_audit_session'

export function getOrCreateAuditSessionId(): string {
  if (typeof window === 'undefined') return ''

  const existing = window.sessionStorage.getItem(AUDIT_SESSION_KEY)
  if (existing) return existing

  const next = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.sessionStorage.setItem(AUDIT_SESSION_KEY, next)
  return next
}

export function sendFunnelEvent(payload: FunnelEventPayload): void {
  if (typeof window === 'undefined') return

  const body = JSON.stringify({
    ...payload,
    sessionId: payload.sessionId || getOrCreateAuditSessionId(),
  })

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      const queued = navigator.sendBeacon('/api/funnel-event', blob)
      if (queued) return
    }
  } catch {
    // Fall through to fetch
  }

  void fetch('/api/funnel-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
