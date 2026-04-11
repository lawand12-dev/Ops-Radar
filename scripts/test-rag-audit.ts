/*
 * End-to-end test of the RAG-enabled audit pipeline.
 *
 * Runs the exact code path production uses (retrieveRelevantKnowledge →
 * generateAuditReport), prints the retrieved chunks, generates a full audit,
 * and then greps the output for references to research source files so we
 * can confirm the model is actually grounding in the injected context.
 *
 * Run with: npx tsx scripts/test-rag-audit.ts
 *
 * NOTE: dotenv must load BEFORE any module that reads process.env at import
 * time (openai.ts, supabase-server.ts). Use dynamic imports inside main().
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

async function main() {
  const { retrieveRelevantKnowledge, formatKnowledgeContext } = await import(
    '../src/lib/knowledge-retrieval'
  )
  const { generateAuditReport } = await import('../src/lib/audit-report')

  // Realistic mid-market creative agency profile. The answers deliberately
  // echo pains that appear in the research library (onboarding, reporting,
  // spreadsheet CRM, context-switching) so we can judge whether the top
  // chunks the retriever pulls are actually relevant.
  const auditInput = {
    agencyType: 'creative / branding agency',
    teamSize: '6-10 people',
    revenue: '$50k-$100k/mo',
    activeClients: '15-25',
    tools: 'Slack, Notion, Google Sheets, Gmail, Figma, Loom',
    toolSignals:
      'Client status lives in Notion but invoices in Sheets — no one knows what is current',
    crmTool: 'Google Sheets — we track leads and clients in one master sheet',
    timeHeavy:
      'Weekly client reporting, status updates, onboarding new freelancers',
    leadEntry:
      'Leads come in through contact form and get pasted manually into the sheet',
    onboarding:
      'New client onboarding takes 3-5 days — intake forms, Slack channel setup, Notion workspace, kickoff deck',
    progressTracking:
      'Project leads ping people in Slack and screenshot Notion pages into client updates',
    automationWish:
      'Our weekly client reporting is killing us — we pull screenshots from Meta Ads, Google Ads, and GA4 by hand every Monday, 6-8 hours per client',
    processFrequency: 'weekly',
    processOwner: 'two account managers share it',
    failureImpact:
      'Clients churned last quarter because reports were late and had errors — lost about $18k ARR',
    futureVision:
      'Stop doing manual reporting entirely so account managers can actually talk to clients about strategy',
  }

  // Step 1: build the retrieval query the same way generate-audit/route.ts does
  const knowledgeQuery = [
    `Agency type: ${auditInput.agencyType}`,
    `Tools: ${auditInput.tools}`,
    `CRM / operations: ${auditInput.crmTool}`,
    `Time-heavy work: ${auditInput.timeHeavy}`,
    `Biggest failing process: ${auditInput.automationWish}`,
    auditInput.processFrequency ? `Frequency: ${auditInput.processFrequency}` : '',
    auditInput.failureImpact ? `Cost of staying manual: ${auditInput.failureImpact}` : '',
    auditInput.futureVision ? `Vision: ${auditInput.futureVision}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  console.log('━━━ RETRIEVAL QUERY ━━━')
  console.log(knowledgeQuery)
  console.log()

  const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5)
  console.log(`━━━ RETRIEVED ${chunks.length} CHUNK(S) ━━━`)
  for (const chunk of chunks) {
    console.log(
      `  ${chunk.sourceFile}  sim=${chunk.similarity.toFixed(3)}  ${chunk.content.slice(0, 120).replace(/\n/g, ' ')}...`,
    )
  }
  console.log()

  const knowledgeContext = formatKnowledgeContext(chunks)
  console.log(`━━━ INJECTED CONTEXT SIZE: ${knowledgeContext.length} chars ━━━\n`)

  // Step 2: A/B — generate one audit WITH RAG context and one WITHOUT,
  // so we can diff the outputs and see whether the injected knowledge is
  // actually influencing the model.
  console.log('━━━ GENERATING AUDIT WITH RAG (this takes ~10-30s) ━━━')
  const startA = Date.now()
  const audit = await generateAuditReport(auditInput, 'full', knowledgeContext)
  console.log(`  generated in ${((Date.now() - startA) / 1000).toFixed(1)}s`)

  console.log('━━━ GENERATING AUDIT WITHOUT RAG (baseline) ━━━')
  const startB = Date.now()
  const baselineAudit = await generateAuditReport(auditInput, 'full')
  console.log(`  generated in ${((Date.now() - startB) / 1000).toFixed(1)}s\n`)

  // Step 3: analyze whether the output actually references the research library
  const auditJson = JSON.stringify(audit, null, 2)
  const baselineJson = JSON.stringify(baselineAudit, null, 2)

  console.log('━━━ GROUNDING CHECK (RAG audit) ━━━')
  const lower = auditJson.toLowerCase()
  const sourceHits = chunks
    .map((c) => c.sourceFile)
    .filter((f) => lower.includes(f.toLowerCase()))
  console.log(`Source filenames mentioned in audit: ${sourceHits.length}/${chunks.length}`)
  if (sourceHits.length > 0) {
    for (const f of sourceHits) console.log(`  - ${f}`)
  }

  const distinctiveFragments = chunks.flatMap((chunk) => {
    const matches = chunk.content.match(/\d+[-–]\d+\s*hours?(?:\/year|\/week)?|\$[\d,]+\b/g)
    return matches ? matches.slice(0, 3) : []
  })
  const uniqueFragments = Array.from(new Set(distinctiveFragments))
  const fragmentHitsA = uniqueFragments.filter((frag) => auditJson.includes(frag))
  const fragmentHitsB = uniqueFragments.filter((frag) => baselineJson.includes(frag))
  console.log(`Chunk numeric fragments in RAG audit:      ${fragmentHitsA.length}/${uniqueFragments.length}`)
  console.log(`Chunk numeric fragments in BASELINE audit: ${fragmentHitsB.length}/${uniqueFragments.length}`)
  if (uniqueFragments.length > 0) console.log(`  chunk fragments: ${uniqueFragments.join(' | ')}`)

  console.log('\n━━━ A/B COMPARISON: headline fields ━━━')
  const compareField = (path: string, a: unknown, b: unknown) => {
    const sa = typeof a === 'string' ? a : JSON.stringify(a)
    const sb = typeof b === 'string' ? b : JSON.stringify(b)
    console.log(`  [${path}]`)
    console.log(`    RAG:      ${sa}`)
    console.log(`    BASELINE: ${sb}`)
    console.log(`    ${sa === sb ? 'IDENTICAL' : 'DIFFERENT'}`)
  }
  const a = audit as Record<string, any>
  const b = baselineAudit as Record<string, any>
  compareField('verdict.headline', a.verdict?.headline, b.verdict?.headline)
  compareField('executive_summary', a.executive_summary, b.executive_summary)
  compareField('estimated_annual_waste', a.estimated_annual_waste, b.estimated_annual_waste)
  compareField('automation_readiness_score', a.automation_readiness_score, b.automation_readiness_score)
  compareField('opportunities[0].title', a.opportunities?.[0]?.title, b.opportunities?.[0]?.title)
  compareField('opportunities[0].hard_truth', a.opportunities?.[0]?.hard_truth, b.opportunities?.[0]?.hard_truth)
  compareField('benchmarks.hours_wasted_vs_average.industry_average', a.benchmarks?.hours_wasted_vs_average?.industry_average, b.benchmarks?.hours_wasted_vs_average?.industry_average)

  const identicalChars = auditJson.length === baselineJson.length && auditJson === baselineJson
  console.log(`\n  Total output identical: ${identicalChars}`)
  console.log(`  RAG output length:      ${auditJson.length} chars`)
  console.log(`  BASELINE output length: ${baselineJson.length} chars`)

  console.log('\n━━━ RAG AUDIT (full JSON) ━━━')
  console.log(auditJson)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
