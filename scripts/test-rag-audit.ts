/*
 * Diagnostic test for the RAG-enabled audit pipeline.
 *
 * Run with:
 *   npx tsx scripts/test-rag-audit.ts
 *
 * Notes:
 * - dotenv must load before importing any module that reads env at import time.
 * - The user-provided test payload uses the public questionnaire shape, so this
 *   script maps it into the current internal AuditInput shape used by
 *   generateAuditReport().
 */
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

type PublicTestInput = {
  name: string
  email: string
  company: string
  agencyType: string
  teamSize: string
  revenueRange: string
  biggestPain: string
  toolsUsed: string[]
  timeHeavyWork: string
  automationWish: string
  processFrequency: string
  failureImpact: string
}

const testInput: PublicTestInput = {
  name: 'Test Founder',
  email: 'test@example.com',
  company: 'Test Marketing Agency',
  agencyType: 'marketing',
  teamSize: '11-25',
  revenueRange: '$500k-$1M',
  biggestPain:
    'Weekly client reporting eats 8 hours every Monday morning. We pull data from Meta Ads, Google Ads, GA4, and HubSpot by hand into spreadsheets, then format custom reports for each client. Account managers are burnt out and two left last quarter.',
  toolsUsed: [
    'HubSpot',
    'Google Analytics 4',
    'Meta Ads Manager',
    'Google Ads',
    'Slack',
    'Asana',
  ],
  timeHeavyWork: 'Client reporting, lead follow-ups, internal status updates',
  automationWish: 'Automated weekly client reporting',
  processFrequency: 'Weekly',
  failureImpact: 'Account managers burning out and quitting — lost 2 in Q1',
}

function toInternalAuditInput(input: PublicTestInput) {
  return {
    agencyType: 'Marketing',
    // Map the public range onto the closest internal bucket used by the app.
    teamSize: '16–30',
    revenue: '$50K–$100K',
    activeClients: '11–25',
    tools: input.toolsUsed.join(', '),
    toolSignals:
      'Reporting is still assembled manually across marketing tools | Lead routing and assignment still needs manual cleanup | Status updates still need to be posted in multiple places',
    crmTool: 'Functional but inefficient — we ship, but we\'re burning hours',
    timeHeavy: input.timeHeavyWork,
    leadEntry:
      'When reporting slips or data is wrong, account managers scramble across Slack, Asana, HubSpot, and spreadsheets to patch it manually.',
    onboarding:
      'Weekly client reporting currently requires manual data pulls, spreadsheet cleanup, and custom formatting before anything can go out.',
    progressTracking:
      'Account managers share internal status updates in Slack and Asana, then manually translate that work into client-facing report updates.',
    automationWish: input.automationWish,
    processFrequency: input.processFrequency,
    processOwner: 'Account managers',
    failureImpact: input.failureImpact,
    futureVision:
      'Client reporting runs automatically every Monday so account managers can focus on strategy, retention, and lead follow-ups instead of spreadsheet work.',
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

function buildKnowledgeQuery(input: PublicTestInput): string {
  return [
    `Pain: ${input.biggestPain}`,
    `Tools: ${input.toolsUsed.join(', ')}`,
    `Time-heavy work: ${input.timeHeavyWork}`,
  ].join('\n')
}

async function main() {
  const { retrieveRelevantKnowledge, formatKnowledgeContext } = await import(
    '../src/lib/knowledge-retrieval'
  )
  const { generateAuditReport } = await import('../src/lib/audit-report')

  const auditInput = toInternalAuditInput(testInput)
  const knowledgeQuery = buildKnowledgeQuery(testInput)

  console.log('=== TEST INPUT ===')
  console.log(JSON.stringify(testInput, null, 2))
  console.log()

  console.log('=== KNOWLEDGE QUERY ===')
  console.log(knowledgeQuery)
  console.log()

  const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5)

  console.log('=== RETRIEVAL SUMMARY ===')
  console.log(`chunks_retrieved=${chunks.length}`)
  console.log(`source_files=${JSON.stringify(chunks.map((chunk) => chunk.sourceFile), null, 2)}`)
  console.log(`similarity_scores=${JSON.stringify(chunks.map((chunk) => chunk.similarity), null, 2)}`)
  console.log()

  for (const [index, chunk] of chunks.entries()) {
    console.log(`--- CHUNK ${index + 1} ---`)
    console.log(`source_file=${chunk.sourceFile}`)
    console.log(`similarity=${chunk.similarity}`)
    console.log(`content_preview=${JSON.stringify(chunk.content.slice(0, 200))}`)
    console.log()
  }

  const knowledgeContext = formatKnowledgeContext(chunks)

  console.log('=== GENERATING AUDIT ===')
  const audit = await generateAuditReport(auditInput, 'full', knowledgeContext)

  console.log('=== FULL AUDIT JSON ===')
  console.log(JSON.stringify(audit, null, 2))
  console.log()

  const opportunities = Array.isArray(audit.opportunities) ? audit.opportunities : []
  const populated: Array<{
    rank: unknown
    title: unknown
    source_file: unknown
    similarity_note: unknown
  }> = []
  const nullMatches: Array<{
    rank: unknown
    title: unknown
  }> = []

  for (const opportunity of opportunities) {
    const record = opportunity && typeof opportunity === 'object' && !Array.isArray(opportunity)
      ? opportunity as Record<string, unknown>
      : {}

    const patternMatch = record.pattern_match
    if (patternMatch && typeof patternMatch === 'object' && !Array.isArray(patternMatch)) {
      const match = patternMatch as Record<string, unknown>
      populated.push({
        rank: record.rank ?? null,
        title: record.title ?? null,
        source_file: match.source_file ?? null,
        similarity_note: match.similarity_note ?? null,
      })
      continue
    }

    nullMatches.push({
      rank: record.rank ?? null,
      title: record.title ?? null,
    })
  }

  console.log('=== PATTERN MATCH SUMMARY ===')
  console.log(`pattern_match_populated=${populated.length}`)
  console.log(`pattern_match_null=${nullMatches.length}`)
  console.log()

  if (populated.length > 0) {
    console.log('pattern_match_populated_details=')
    console.log(JSON.stringify(populated, null, 2))
    console.log()
  }

  if (nullMatches.length > 0) {
    console.log('pattern_match_null_details=')
    console.log(JSON.stringify(nullMatches, null, 2))
    console.log()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
