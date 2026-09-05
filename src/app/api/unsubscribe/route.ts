/**
 * Unsubscribe endpoint — RETIRED in CP-16 with the audit funnel.
 *
 * Tokens were stored on the `audits` table; that table has been dropped.
 * The endpoint stays in place so legacy email links still resolve cleanly
 * instead of 500ing.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token || typeof token !== 'string') {
    return Response.json({ error: 'Invalid token' }, { status: 400 })
  }
  return Response.json({
    success: true,
    retired: true,
    message:
      'The audit funnel has been retired. You have been unsubscribed from any future emails by default.',
  })
}
