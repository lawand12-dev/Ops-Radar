/*
 * Sparse-input test for confidence calibration / hedging behavior.
 *
 * Run with:
 *   npx tsx scripts/test-sparse-audit.ts
 *
 * This uses deliberately minimal inputs to verify the AI hedges
 * appropriately instead of stating weak-confidence numbers as facts.
 */
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const sparseInput = {
  name: 'Test',
  email: 'test@test.com',
  company: 'Test',
  agencyType: 'marketing',
  teamSize: '2-5',
  revenueRange: 'unknown',
  biggestPain: 'Things are slow',
  toolsUsed: [] as string[],
  timeHeavyWork: 'stuff',
  automationWish: '',
  processFrequency: '',
  failureImpact: '',
}

function toInternalAuditInput(input: typeof sparseInput) {
  return {
    agencyType: 'Marketing',
    teamSize: '2–5',
    revenue: 'unknown',
    activeClients: '1–10',
    tools: input.toolsUsed.join(', '),
    toolSignals: '',
    crmTool: '',
    timeHeavy: input.timeHeavyWork,
    leadEntry: '',
    onboarding: '',
    progressTracking: '',
    automationWish: input.automationWish,
    processFrequency: input.processFrequency,
    processOwner: '',
    failureImpact: input.failureImpact,
    futureVision: '',
    websiteUrl: '',
    websiteScreenshotUrl: '',
    websiteContext: '',
    websiteEvidence: '',
    websiteDetectedStack: '',
    websiteStackEvidence: '',
    websiteVisualContext: '',
    websiteVisualEvidence: '',
    agencyResearchIntel: '',
  }
}

function buildKnowledgeQuery(input: typeof sparseInput): string {
  return [
    `Pain: ${input.biggestPain}`,
    `Tools: ${input.toolsUsed.join(', ') || 'none specified'}`,
    `Time-heavy work: ${input.timeHeavyWork}`,
  ].join('\n')
}

async function main() {
  const { retrieveRelevantKnowledge, formatKnowledgeContext } = await import(
    '../src/lib/knowledge-retrieval'
  )
  const { generateAuditReport } = await import('../src/lib/audit-report')

  const auditInput = toInternalAuditInput(sparseInput)
  const knowledgeQuery = buildKnowledgeQuery(sparseInput)

  console.log('=== SPARSE TEST INPUT ===')
  console.log(JSON.stringify(sparseInput, null, 2))
  console.log()

  const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5)

  console.log('=== RETRIEVAL SUMMARY ===')
  console.log(`chunks_retrieved=${chunks.length}`)
  console.log()

  const knowledgeContext = formatKnowledgeContext(chunks)

  console.log('=== GENERATING AUDIT (sparse inputs) ===')
  const audit = await generateAuditReport(auditInput, 'full', knowledgeContext)

  // ── Report the hedging-relevant fields ──────────────────────────────────
  console.log()
  console.log('════════════════════════════════════════════════')
  console.log('  HEDGING VERIFICATION REPORT')
  console.log('════════════════════════════════════════════════')
  console.log()

  console.log('1. EXECUTIVE SUMMARY (verbatim):')
  console.log('─'.repeat(50))
  console.log(audit.executive_summary ?? '(none)')
  console.log()

  const opportunities = Array.isArray(audit.opportunities) ? audit.opportunities : []
  for (const [i, opp] of opportunities.entries()) {
    const record = opp && typeof opp === 'object' && !Array.isArray(opp)
      ? opp as Record<string, unknown>
      : {}
    console.log(`2.${i + 1} OPPORTUNITY: ${record.title ?? '(no title)'}`)
    console.log(`    confidence_level: ${record.confidence_level ?? '(not set)'}`)
    console.log(`    hard_truth (verbatim):`)
    console.log(`    ${record.hard_truth ?? '(none)'}`)
    console.log()
  }

  console.log('3. CONFIDENCE LEVEL SUMMARY:')
  const levels = opportunities.map((opp: Record<string, unknown>) => opp?.confidence_level ?? 'not_set')
  console.log(`   ${JSON.stringify(levels)}`)
  console.log()

  console.log('=== FULL AUDIT JSON ===')
  console.log(JSON.stringify(audit, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
