/*
 * One-off RAG diagnostic. Hits the real /api/generate-audit endpoint with a
 * 15-person marketing agency profile, and *also* runs retrieveRelevantKnowledge
 * directly so we can log the full chunk details (sim scores, sample content)
 * that the route only logs by source_file name.
 *
 * The retrieval query is constructed identically to generate-audit/route.ts
 * (same fields, same join order), so the chunks logged here are exactly the
 * chunks the route injects.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

const ENDPOINT = process.env.RAG_DIAG_ENDPOINT || 'http://localhost:3100/api/generate-audit'

async function main() {
  const { retrieveRelevantKnowledge, formatKnowledgeContext } = await import(
    '../src/lib/knowledge-retrieval'
  )

  // 15-person marketing agency, deliberately seeded with pains that the
  // research library should match on (manual reporting, spreadsheet CRM,
  // tool sprawl, onboarding drag).
  const body = {
    name: 'Diag Tester',
    email: 'diag@example.com',
    company: 'Northwind Marketing',
    agencyType: 'marketing agency',
    teamSize: '11-20 people',
    revenue: '$100k-$250k/mo',
    activeClients: '20-40',
    tools: ['Slack', 'HubSpot', 'Google Sheets', 'Notion', 'Asana', 'Loom', 'Gmail', 'Meta Ads', 'Google Ads', 'GA4'],
    toolSignals: 'HubSpot has the deals but Sheets has the actual delivery status — they drift apart constantly',
    websiteUrl: '',
    crmTool: 'HubSpot for sales, Google Sheets for client delivery tracking',
    timeHeavy: ['weekly client reporting', 'status updates across Slack and email', 'campaign QA', 'onboarding new clients'],
    leadEntry: 'Leads come into HubSpot from a web form but our SDR copies them into a sheet to assign owners — no automation between the two',
    onboarding: ['intake call', 'manual Notion workspace creation', 'Slack channel setup', 'kickoff deck', 'shared drive folders'],
    progressTracking: 'Account managers ping each other in Slack and screenshot Asana cards into client weekly updates',
    automationWish: 'Weekly reporting eats 25 hours across the team — we manually pull Meta Ads, Google Ads, GA4 and HubSpot data into branded slide decks every Monday',
    processFrequency: 'weekly',
    processOwner: 'two account managers + one analyst share the load',
    failureImpact: 'Two clients churned last quarter citing late reports and one inaccurate ROAS figure — about $32k ARR lost',
    futureVision: 'Reporting becomes one-click so AMs spend their Mondays on strategy calls instead of data entry',
  }

  // Mirror the exact query construction in src/app/api/generate-audit/route.ts
  const knowledgeQuery = [
    `Agency type: ${body.agencyType}`,
    `Tools: ${body.tools.join(', ')}`,
    `CRM / operations: ${body.crmTool}`,
    `Time-heavy work: ${body.timeHeavy.join(', ')}`,
    `Biggest failing process: ${body.automationWish}`,
    body.processFrequency ? `Frequency: ${body.processFrequency}` : '',
    body.failureImpact ? `Cost of staying manual: ${body.failureImpact}` : '',
    body.futureVision ? `Vision: ${body.futureVision}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  RAG END-TO-END DIAGNOSTIC')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n[1] RETRIEVAL QUERY (same as route)\n')
  console.log(knowledgeQuery)

  // Step 1: capture full retrieval details locally
  const chunks = await retrieveRelevantKnowledge(knowledgeQuery, 5)

  console.log('\n[2] RETRIEVED CHUNKS (top 5)\n')
  console.log(`    count: ${chunks.length}`)
  for (const [i, c] of chunks.entries()) {
    console.log(`\n    ── chunk ${i + 1} ─────────────────────────────`)
    console.log(`    source_file : ${c.sourceFile}`)
    console.log(`    similarity  : ${c.similarity.toFixed(4)}`)
    console.log(`    chunk_id    : ${c.id}`)
    const preview = c.content.replace(/\s+/g, ' ').slice(0, 300)
    console.log(`    sample      : ${preview}…`)
  }

  console.log('\n[3] TOP SIMILARITY SCORES (sorted)\n')
  const sims = [...chunks].map((c) => c.similarity).sort((a, b) => b - a)
  sims.forEach((s, i) => console.log(`    rank ${i + 1}: ${s.toFixed(4)}`))

  const injectedContext = formatKnowledgeContext(chunks)
  console.log(`\n[4] INJECTED CONTEXT BLOCK\n`)
  console.log(`    total length     : ${injectedContext.length} chars`)
  console.log(`    distinct sources : ${new Set(chunks.map((c) => c.sourceFile)).size}`)
  console.log(`    first 600 chars  :`)
  console.log('    ┌────────────────────────────────────────────────')
  for (const line of injectedContext.slice(0, 600).split('\n')) {
    console.log(`    │ ${line}`)
  }
  console.log('    └────────────────────────────────────────────────')

  // Step 2: hit the real HTTP endpoint
  console.log(`\n[5] POST → ${ENDPOINT}\n`)
  const t0 = Date.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const elapsedMs = Date.now() - t0
  console.log(`    status   : ${res.status} ${res.statusText}`)
  console.log(`    elapsed  : ${(elapsedMs / 1000).toFixed(1)}s`)

  const text = await res.text()
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    console.error('    response was not JSON:')
    console.error(text.slice(0, 1000))
    process.exit(1)
  }

  if (!res.ok) {
    console.error('    endpoint returned error:')
    console.error(JSON.stringify(parsed, null, 2))
    process.exit(1)
  }

  const audit = parsed.audit ?? parsed
  const opportunities: any[] = Array.isArray(audit.opportunities) ? audit.opportunities : []

  console.log(`\n[6] OPPORTUNITIES.pattern_match INSPECTION\n`)
  console.log(`    total opportunities: ${opportunities.length}`)
  let populated = 0
  let nullCount = 0
  for (const [i, opp] of opportunities.entries()) {
    const pm = opp?.pattern_match
    const isPopulated = pm && typeof pm === 'object' && Object.keys(pm).length > 0
    if (isPopulated) populated += 1
    else nullCount += 1
    console.log(`\n    opportunity ${i + 1}: ${opp.title ?? '(untitled)'}`)
    console.log(`      pattern_match: ${isPopulated ? 'POPULATED' : 'NULL/EMPTY'}`)
    if (isPopulated) {
      console.log(`        observed_in    : ${pm.observed_in ?? '—'}`)
      console.log(`        source_file    : ${pm.source_file ?? '—'}`)
      console.log(`        similarity_note: ${(pm.similarity_note ?? '').slice(0, 200)}`)
    }
  }
  console.log(`\n    SUMMARY: ${populated}/${opportunities.length} opportunities have pattern_match populated`)

  // Cross-check: do any of the source_files cited in the audit match
  // the chunks we retrieved? That tells us whether GPT-4o actually used
  // what was injected, vs. inventing source filenames.
  const retrievedFiles = new Set(chunks.map((c) => c.sourceFile))
  const citedFiles = opportunities
    .map((o) => o?.pattern_match?.source_file)
    .filter((f): f is string => typeof f === 'string' && f.length > 0)
  const matched = citedFiles.filter((f) => retrievedFiles.has(f))
  const fabricated = citedFiles.filter((f) => !retrievedFiles.has(f))
  console.log(`\n[7] GROUNDING — cited source_file vs. retrieved chunks\n`)
  console.log(`    cited files     : ${citedFiles.length}`)
  console.log(`    matched         : ${matched.length}  (cited file was in the retrieved set)`)
  console.log(`    fabricated      : ${fabricated.length}  (cited file NOT in retrieved set)`)
  if (matched.length > 0) {
    for (const f of matched) console.log(`      ✔ ${f}`)
  }
  if (fabricated.length > 0) {
    for (const f of fabricated) console.log(`      ✘ ${f} (fabricated or hallucinated)`)
  }

  console.log(`\n[8] HEADLINE FIELDS\n`)
  console.log(`    verdict.headline       : ${audit.verdict?.headline ?? '—'}`)
  console.log(`    estimated_annual_waste : ${audit.estimated_annual_waste ?? '—'}`)
  console.log(`    automation_readiness   : ${audit.automation_readiness_score ?? '—'}`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  END')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
