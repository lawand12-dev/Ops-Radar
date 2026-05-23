/**
 * Durable backfill workflow — runs after a customer connects Notion (and again per integration).
 *
 * Why durable: full historical pull can take 30 min – 2 hr per customer and must survive
 * function timeouts. Either Inngest or Vercel Queues works; this scaffold targets Inngest.
 *
 * Spec: docs/dev/specs/2026-05-23-agents-notion-composio-design.md §8
 *
 * Flow:
 *   Phase 1 — current state (<30s) — fastest possible signal so the dashboard isn't empty
 *   Phase 2 — last 90 days (5–10 min) — enough for week-over-week trend lines
 *   Phase 3 — last 12 months + pattern detection (30 min – 2 hr) — the real moat
 *   Phase 4 — notify customer that the Brain is live
 */

// import { Inngest } from 'inngest'

// export const inngest = new Inngest({ id: 'opsradar' })

// export const onNotionConnected = inngest.createFunction(
//   { id: 'backfill-on-notion-connected', retries: 3 },
//   { event: 'notion/connected' },
//   async ({ event, step }) => {
//     const { userId } = event.data
//
//     await step.run('phase-1-current', async () => {
//       await backfillCurrentState(userId)
//       await updateBackfillStatus(userId, 'phase1')
//     })
//
//     await step.run('phase-2-90d', async () => {
//       await backfill90Days(userId)
//       await updateBackfillStatus(userId, 'phase2')
//     })
//
//     await step.run('phase-3-12mo', async () => {
//       await backfill12Months(userId)
//       await updateBackfillStatus(userId, 'phase3')
//     })
//
//     await step.run('notify', async () => {
//       await sendBackfillCompleteEmail(userId)
//       await updateBackfillStatus(userId, 'complete')
//     })
//   },
// )

export async function backfillCurrentState(_userId: string): Promise<void> {
  // TODO(scaffold): for each connected Composio tool, pull "current" view
  //   (open invoices, open deals, active projects, this-week hours) and write summaries to Notion.
  throw new Error('backfillCurrentState not implemented')
}

export async function backfill90Days(_userId: string): Promise<void> {
  // TODO(scaffold): pull 90-day windows, aggregate into weekly KPI snapshot rows.
  throw new Error('backfill90Days not implemented')
}

export async function backfill12Months(_userId: string): Promise<void> {
  // TODO(scaffold): pull 12-month windows, run pattern detection, write Pattern Cards.
  throw new Error('backfill12Months not implemented')
}

export async function sendBackfillCompleteEmail(_userId: string): Promise<void> {
  // TODO(scaffold): use existing Resend client to email the owner.
  throw new Error('sendBackfillCompleteEmail not implemented')
}

export async function updateBackfillStatus(
  _userId: string,
  _status: 'pending' | 'phase1' | 'phase2' | 'phase3' | 'complete' | 'failed',
): Promise<void> {
  // TODO(scaffold): UPDATE notion_workspaces SET backfill_status = ? WHERE user_id = ?
  throw new Error('updateBackfillStatus not implemented')
}
