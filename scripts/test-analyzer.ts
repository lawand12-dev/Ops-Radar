/*
 * Quick harness to test the website analyzer end-to-end against real sites.
 * Run with: npx tsx scripts/test-analyzer.ts
 *
 * NOTE: dotenv must load BEFORE the website-research-agent module is imported,
 * because that module instantiates the OpenAI client from process.env at
 * module-load time. We use a dynamic import() inside main() to enforce order.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

const SITES = [
  'https://linear.app',
  'https://stripe.com',
  // Small marketing agency — Barrel is a ~20-person NYC ecommerce/marketing agency.
  'https://www.barrelny.com',
]

async function main() {
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'set' : 'MISSING'}`)
  const { researchAgency, buildWebsitePreview } = await import('../src/lib/website-research-agent')
  for (const url of SITES) {
    const started = Date.now()
    console.log(`\n═══════════════════════════════════════════════════`)
    console.log(`  ${url}`)
    console.log(`═══════════════════════════════════════════════════`)
    try {
      const research = await researchAgency(url)
      const preview = buildWebsitePreview(research)
      const elapsed = Date.now() - started
      console.log(JSON.stringify(preview, null, 2))
      console.log(`\n(took ${elapsed}ms, errors: ${research.errors.length})`)
      if (research.errors.length > 0) {
        console.log(`errors: ${research.errors.join(' | ')}`)
      }
    } catch (err) {
      console.error(`FAILED: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
