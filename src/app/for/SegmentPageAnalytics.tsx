'use client'

import { useEffect } from 'react'
import { getOrCreateAuditSessionId, sendFunnelEvent, type FunnelEventName } from '../../lib/funnel'

interface SegmentPageAnalyticsProps {
  segment: 'paid-media' | 'seo' | 'full-service'
}

export default function SegmentPageAnalytics({ segment }: SegmentPageAnalyticsProps) {
  useEffect(() => {
    const sessionId = getOrCreateAuditSessionId()
    sendFunnelEvent({
      sessionId,
      event: 'segment_page_view' as FunnelEventName,
      metadata: { segment },
    })
  }, [segment])

  return null
}
