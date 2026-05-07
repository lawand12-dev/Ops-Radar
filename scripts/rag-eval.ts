/*
 * Retrieval evaluation harness for the OpsRadar knowledge base.
 *
 * Run with:
 *   npx tsx scripts/rag-eval.ts
 *
 * Useful options:
 *   --top-k 5
 *   --min-pass-rate 0.8
 *   --case paid-media-reporting,seo-onboarding
 *   --cases scripts/fixtures/rag-eval-cases.json
 *   --json
 *
 * Required env is the same as runtime RAG:
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type EvalCase = {
  id: string
  name: string
  query: string
  category?: string
  agencyType?: string
  automationWish?: string
  topK?: number
  expectedCategories?: string[]
  expectedSourceIncludes: string[]
  minDistinctSources?: number
}

type Args = {
  casesPath: string
  caseIds: Set<string> | null
  topK: number
  minPassRate: number
  json: boolean
  verbose: boolean
}

type RetrievalResult = {
  id: string
  name: string
  passed: boolean
  checks: {
    sourceHit: boolean
    categoryHit: boolean
    diversityHit: boolean
  }
  expectedSourceIncludes: string[]
  matchedSourceIncludes: string[]
  expectedCategories: string[]
  observedCategories: string[]
  distinctSources: number
  minDistinctSources: number
  topSources: string[]
  topSimilarities: number[]
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    casesPath: 'scripts/fixtures/rag-eval-cases.json',
    caseIds: null,
    topK: 5,
    minPassRate: 0.8,
    json: false,
    verbose: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--cases' && next) {
      args.casesPath = next
      i++
      continue
    }
    if (arg === '--case' && next) {
      args.caseIds = new Set(next.split(',').map((id) => id.trim()).filter(Boolean))
      i++
      continue
    }
    if (arg === '--top-k' && next) {
      args.topK = Math.max(1, Number.parseInt(next, 10) || args.topK)
      i++
      continue
    }
    if (arg === '--min-pass-rate' && next) {
      args.minPassRate = Math.max(0, Math.min(1, Number.parseFloat(next)))
      i++
      continue
    }
    if (arg === '--json') {
      args.json = true
      continue
    }
    if (arg === '--verbose') {
      args.verbose = true
      continue
    }
  }

  return args
}

function readCases(casesPath: string, caseIds: Set<string> | null): EvalCase[] {
  const resolved = resolve(process.cwd(), casesPath)
  const parsed = JSON.parse(readFileSync(resolved, 'utf8')) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${casesPath} to contain an array of eval cases`)
  }

  const cases = parsed.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Invalid eval case: expected object')
    }
    const record = item as Record<string, unknown>
    const id = String(record.id ?? '').trim()
    const name = String(record.name ?? '').trim()
    const query = String(record.query ?? '').trim()
    const expectedSourceIncludes = Array.isArray(record.expectedSourceIncludes)
      ? record.expectedSourceIncludes.map(String).filter(Boolean)
      : []

    if (!id || !name || !query || expectedSourceIncludes.length === 0) {
      throw new Error(`Invalid eval case ${id || '(missing id)'}: id, name, query, and expectedSourceIncludes are required`)
    }

    return {
      id,
      name,
      query,
      category: typeof record.category === 'string' ? record.category : undefined,
      agencyType: typeof record.agencyType === 'string' ? record.agencyType : undefined,
      automationWish: typeof record.automationWish === 'string' ? record.automationWish : undefined,
      topK: typeof record.topK === 'number' ? record.topK : undefined,
      expectedCategories: Array.isArray(record.expectedCategories)
        ? record.expectedCategories.map(String).filter(Boolean)
        : undefined,
      expectedSourceIncludes,
      minDistinctSources: typeof record.minDistinctSources === 'number'
        ? record.minDistinctSources
        : undefined,
    } satisfies EvalCase
  })

  return caseIds ? cases.filter((testCase) => caseIds.has(testCase.id)) : cases
}

function sourceHaystack(chunk: {
  slug: string | null
  sourceFile: string
  content: string
  metadata: Record<string, unknown> | null
}): string {
  return [
    chunk.slug ?? '',
    chunk.sourceFile,
    JSON.stringify(chunk.metadata ?? {}),
    chunk.content.slice(0, 500),
  ]
    .join(' ')
    .toLowerCase()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cases = readCases(args.casesPath, args.caseIds)
  if (cases.length === 0) {
    throw new Error('No eval cases selected')
  }

  const { retrieveRelevantKnowledge } = await import('../src/lib/knowledge-retrieval')

  const results: RetrievalResult[] = []

  for (const testCase of cases) {
    const topK = testCase.topK ?? args.topK
    const chunks = await retrieveRelevantKnowledge(testCase.query, topK, {
      agencyType: testCase.agencyType,
      automationWish: testCase.automationWish,
      category: testCase.category,
    })

    const haystacks = chunks.map(sourceHaystack)
    const matchedSourceIncludes = testCase.expectedSourceIncludes.filter((needle) => {
      const normalizedNeedle = needle.toLowerCase()
      return haystacks.some((haystack) => haystack.includes(normalizedNeedle))
    })
    const expectedCategories = testCase.expectedCategories ?? []
    const observedCategories = Array.from(
      new Set(chunks.map((chunk) => chunk.category).filter((category): category is string => Boolean(category))),
    )
    const distinctSources = new Set(chunks.map((chunk) => chunk.sourceFile)).size
    const minDistinctSources = testCase.minDistinctSources ?? Math.min(2, topK)

    const sourceHit = matchedSourceIncludes.length > 0
    const categoryHit = expectedCategories.length === 0
      || observedCategories.some((category) => expectedCategories.includes(category))
    const diversityHit = distinctSources >= minDistinctSources

    results.push({
      id: testCase.id,
      name: testCase.name,
      passed: sourceHit && categoryHit && diversityHit,
      checks: {
        sourceHit,
        categoryHit,
        diversityHit,
      },
      expectedSourceIncludes: testCase.expectedSourceIncludes,
      matchedSourceIncludes,
      expectedCategories,
      observedCategories,
      distinctSources,
      minDistinctSources,
      topSources: chunks.map((chunk) => chunk.sourceFile),
      topSimilarities: chunks.map((chunk) => Number(chunk.similarity.toFixed(4))),
    })
  }

  const passed = results.filter((result) => result.passed).length
  const passRate = passed / results.length
  const summary = {
    passed,
    total: results.length,
    passRate: Number(passRate.toFixed(3)),
    minPassRate: args.minPassRate,
  }

  if (args.json) {
    console.log(JSON.stringify({ summary, results }, null, 2))
  } else {
    console.log('RAG retrieval eval')
    console.log(`cases=${summary.total} passed=${summary.passed} pass_rate=${summary.passRate}`)
    console.log()

    for (const result of results) {
      const status = result.passed ? 'PASS' : 'FAIL'
      const matched = result.matchedSourceIncludes.length > 0
        ? result.matchedSourceIncludes.join(', ')
        : 'none'
      console.log(`${status} ${result.id}`)
      console.log(`  source_hit=${result.checks.sourceHit} matched=${matched}`)
      console.log(`  category_hit=${result.checks.categoryHit} observed=${result.observedCategories.join(', ') || 'none'}`)
      console.log(`  diversity_hit=${result.checks.diversityHit} distinct_sources=${result.distinctSources}/${result.minDistinctSources}`)
      console.log(`  top_sources=${result.topSources.join(' | ') || 'none'}`)
      if (args.verbose) {
        console.log(`  top_similarities=${result.topSimilarities.join(', ') || 'none'}`)
        console.log(`  expected_sources=${result.expectedSourceIncludes.join(', ')}`)
      }
      console.log()
    }
  }

  if (passRate < args.minPassRate) {
    console.error(
      `RAG eval failed: pass_rate=${summary.passRate} is below min_pass_rate=${summary.minPassRate}`,
    )
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
