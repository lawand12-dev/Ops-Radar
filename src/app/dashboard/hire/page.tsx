/**
 * /dashboard/hire — the dedicated Hiring chat surface (CP-38).
 *
 * Sibling to /dashboard/coo. Where COO answers business questions, this
 * surface is purpose-built for the customer to BUILD their AI workforce —
 * matching the Notion 3.3 / Lindy 3.0 / Microsoft Copilot Studio pattern
 * where Q&A and agent-builder live on separate routes.
 */

import { HireShell } from './_components/hire-shell'

export const dynamic = 'force-dynamic'

export default function HirePage() {
  // Full-bleed: the Hire surface is its own app screen (ChatGPT-style), so it
  // claims the whole dashboard content area with no breadcrumb/title chrome —
  // the chat's own header + empty state carry the framing.
  return (
    <div className="h-[calc(100vh-72px)]">
      <HireShell />
    </div>
  )
}
