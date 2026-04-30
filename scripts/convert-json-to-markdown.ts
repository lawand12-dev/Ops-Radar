// scripts/convert-json-to-markdown.ts
// Run with: npx tsx scripts/convert-json-to-markdown.ts
// Reads research-*.json from knowledge-base/ and writes organized markdown notes.

import fs from 'fs'
import path from 'path'

const KB_DIR = path.join(process.cwd(), 'knowledge-base')
const CATEGORIES = ['benchmarks', 'tools', 'patterns', 'failures', 'agency-profiles']

// Category assignment map: research-id → folder
const CATEGORY_MAP: Record<string, string> = {
  'research-01': 'benchmarks',
  'research-02': 'patterns',
  'research-03': 'agency-profiles',
  'research-04': 'benchmarks',
  'research-05': 'benchmarks',
  'research-06': 'benchmarks',
  'research-07': 'agency-profiles',
  'research-08': 'benchmarks',
  'research-09': 'agency-profiles',
  'research-10': 'agency-profiles',
  'research-11': 'tools',
  'research-12': 'failures',
  'research-13': 'tools',
  'research-14': 'agency-profiles',
  'research-15': 'patterns',
  'research-16': 'patterns',
  'research-17': 'tools',
  'research-18': 'failures',
  'research-19': 'tools',
  'research-20': 'tools',
  'research-21': 'benchmarks',
  'research-22': 'benchmarks',
  'research-23': 'benchmarks',
  'research-24': 'benchmarks',
  'research-25': 'benchmarks',
  'research-26': 'agency-profiles',
  'research-27': 'tools',
  'research-28': 'agency-profiles',
  'research-29': 'benchmarks',
  'research-30': 'tools',
  'research-31': 'agency-profiles',
  'research-32': 'patterns',
  'research-33': 'patterns',
  'research-34': 'patterns',
  'research-35': 'benchmarks',
  'research-36': 'patterns',
  'research-37': 'agency-profiles',
  'research-38': 'agency-profiles',
}

// Related-note cross-links: research-id → list of linked research-ids
const RELATED_MAP: Record<string, string[]> = {
  'research-01': ['research-04', 'research-05', 'research-08', 'research-21', 'research-22', 'research-23'],
  'research-02': ['research-12', 'research-15', 'research-16', 'research-36'],
  'research-03': ['research-07', 'research-09', 'research-26', 'research-01'],
  'research-04': ['research-01', 'research-08', 'research-05'],
  'research-05': ['research-01', 'research-06', 'research-03'],
  'research-06': ['research-05', 'research-27', 'research-29'],
  'research-07': ['research-03', 'research-09', 'research-14', 'research-26'],
  'research-08': ['research-01', 'research-04', 'research-25'],
  'research-09': ['research-10', 'research-37', 'research-14'],
  'research-10': ['research-09', 'research-37', 'research-12'],
  'research-11': ['research-13', 'research-17', 'research-20', 'research-29'],
  'research-12': ['research-18', 'research-02', 'research-13'],
  'research-13': ['research-11', 'research-12', 'research-17', 'research-20'],
  'research-14': ['research-09', 'research-38', 'research-36'],
  'research-15': ['research-16', 'research-02', 'research-05'],
  'research-16': ['research-15', 'research-19', 'research-18'],
  'research-17': ['research-13', 'research-12', 'research-02'],
  'research-18': ['research-12', 'research-16', 'research-02'],
  'research-19': ['research-16', 'research-20', 'research-11'],
  'research-20': ['research-13', 'research-19', 'research-11'],
  'research-21': ['research-01', 'research-03', 'research-05', 'research-22'],
  'research-22': ['research-01', 'research-03', 'research-05', 'research-21'],
  'research-23': ['research-01', 'research-03', 'research-05', 'research-21'],
  'research-24': ['research-11', 'research-13', 'research-25'],
  'research-25': ['research-24', 'research-08', 'research-36'],
  'research-26': ['research-03', 'research-07', 'research-05'],
  'research-27': ['research-29', 'research-30', 'research-06'],
  'research-28': ['research-31', 'research-27', 'research-03'],
  'research-29': ['research-11', 'research-27', 'research-01'],
  'research-30': ['research-27', 'research-28', 'research-03'],
  'research-31': ['research-28', 'research-30', 'research-27'],
  'research-32': ['research-33', 'research-34', 'research-03'],
  'research-33': ['research-32', 'research-34', 'research-05'],
  'research-34': ['research-33', 'research-32', 'research-15'],
  'research-35': ['research-36', 'research-14', 'research-38'],
  'research-36': ['research-35', 'research-14', 'research-38'],
  'research-37': ['research-09', 'research-10', 'research-36'],
  'research-38': ['research-14', 'research-36', 'research-37'],
}

type KeyFact = {
  fact: string
  context?: string
  source?: string
  source_url?: string
  use_case?: string
  quote?: string
  quote_attribution?: string
  [key: string]: unknown
}

type ResearchJson = {
  topic: string
  research_id: string
  research_date: string
  tier: number
  description: string
  key_facts: KeyFact[]
}

function slugify(topic: string): string {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function categoryLabel(category: string): string {
  return category.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function formatKeyFact(fact: KeyFact, index: number): string {
  const lines: string[] = []
  lines.push(`### ${index + 1}. ${fact.fact}`)
  lines.push('')
  if (fact.context) lines.push(`**Context:** ${fact.context}`)
  if (fact.quote) {
    const attribution = fact.quote_attribution ? ` — *${fact.quote_attribution}*` : ''
    lines.push(`**Quote:** "${fact.quote}"${attribution}`)
  }
  if (fact.use_case) lines.push(`**Use Case:** ${fact.use_case}`)
  if (fact.source) {
    const sourceLink = fact.source_url
      ? `[${fact.source}](${fact.source_url})`
      : fact.source
    lines.push(`**Source:** ${sourceLink}`)
  }

  // Surface any extra numeric/structured fields
  const skip = new Set(['fact', 'context', 'source', 'source_url', 'use_case', 'quote', 'quote_attribution'])
  for (const [key, value] of Object.entries(fact)) {
    if (skip.has(key) || value == null) continue
    const label = key.replace(/_/g, ' ')
    const formatted = Array.isArray(value) ? value.join(', ') : String(value)
    lines.push(`**${label}:** ${formatted}`)
  }

  return lines.join('\n')
}

function jsonToMarkdown(json: ResearchJson, category: string): string {
  const relatedIds = RELATED_MAP[json.research_id] ?? []
  const relatedLinks = relatedIds.map((id) => `[[${id}]]`).join(' · ')

  const lines: string[] = [
    `# ${json.topic}`,
    '',
    `**Category:** ${categoryLabel(category)}  `,
    `**Research ID:** \`${json.research_id}\`  `,
    `**Tier:** ${json.tier}  `,
    `**Updated:** ${json.research_date}`,
    '',
    '## Overview',
    '',
    json.description,
    '',
  ]

  if (relatedLinks) {
    lines.push('## Related Notes', '', relatedLinks, '')
  }

  lines.push('## Key Facts', '')

  json.key_facts.forEach((fact, i) => {
    lines.push(formatKeyFact(fact, i))
    lines.push('')
  })

  return lines.join('\n')
}

async function main() {
  // Create category subdirectories
  for (const cat of CATEGORIES) {
    fs.mkdirSync(path.join(KB_DIR, cat), { recursive: true })
  }

  const files = fs.readdirSync(KB_DIR).filter((f) => f.match(/^research-\d+.*\.json$/))
  let converted = 0

  for (const file of files) {
    const jsonPath = path.join(KB_DIR, file)
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ResearchJson
    const id = raw.research_id
    const category = CATEGORY_MAP[id]

    if (!category) {
      console.warn(`No category mapped for ${id} — skipping`)
      continue
    }

    const slug = slugify(raw.topic)
    const markdownContent = jsonToMarkdown(raw, category)
    const outFile = path.join(KB_DIR, category, `${id}-${slug}.md`)

    fs.writeFileSync(outFile, markdownContent, 'utf-8')
    console.log(`✓ ${id} → ${category}/${id}-${slug}.md`)
    converted++
  }

  console.log(`\nConverted ${converted} JSON files to markdown.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
