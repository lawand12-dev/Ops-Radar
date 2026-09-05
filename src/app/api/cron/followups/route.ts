/**
 * Follow-up email cron — RETIRED in CP-16 alongside the audit funnel.
 *
 * The prospect-facing audit (`/audit`, `/results`, `audits` table) was taken
 * down in `aca9dbe`. The Day 1 / Day 3 / Day 7 follow-up emails this cron
 * used to send have nothing left to fire against. We keep the GET handler
 * so the Vercel Cron entry that still points here resolves to a clean
 * no-op instead of a 500.
 *
 * If/when the audit funnel is rebuilt, restore from git history at commit
 * `aca9dbe~1` (the file before the audit takedown).
 */

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return Response.json({
    ok: true,
    retired: 'audit-funnel-followups',
    note: 'audits table was dropped in CP-16; this cron is a no-op',
    sent: { day1: 0, day3: 0, day7: 0, errors: 0 },
  })
}
