import { Composio } from '@composio/core'
import * as fs from 'fs'

const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY ?? '' })

const TOOLKITS: [string, string][] = [
  ['notion','Notion'], ['gmail','Gmail'], ['slack','Slack'],
  ['stripe','Stripe'], ['hubspot','HubSpot'], ['pipedrive','Pipedrive'],
  ['apollo','Apollo'], ['quickbooks','QuickBooks'], ['clickup','ClickUp'],
  ['asana','Asana'], ['monday','Monday'], ['harvest','Harvest'],
  ['toggl','Toggl'], ['bamboohr','BambooHR'], ['gusto','Gusto'],
  ['googlecalendar','Google Calendar'], ['calendly','Calendly'],
  ['google_analytics','Google Analytics'], ['linkedin','LinkedIn'],
  ['linkedin_ads','LinkedIn Ads'], ['googleads','Google Ads'],
  ['intercom','Intercom'], ['zendesk','Zendesk'], ['typeform','Typeform'],
]

async function main() {
  const lines: string[] = [
    '# Composio Verified Action Catalog',
    `> Generated: ${new Date().toISOString()}`,
    '> Source of truth for all action names. Never guess — reference this file.',
    '',
  ]

  for (const [slug, label] of TOOLKITS) {
    process.stderr.write(`Fetching ${label}... `)
    try {
      const raw = await composio.tools.get('test-user', { toolkits: [slug] })
      const arr: any[] = Array.isArray(raw) ? raw : Array.from(raw as any)
      const names = arr.map((t: any) => t?.function?.name ?? '').filter(Boolean)

      const read  = names.filter(n => /_(GET|LIST|FETCH|SEARCH|QUERY|READ|RETRIEVE|FIND|COUNT|ALL|INCREMENTAL|BATCH_RUN)/.test(n))
      const write = names.filter(n => /_(CREATE|INSERT|ADD|UPDATE|SEND|POST|APPEND|PATCH|PUT|DELETE|REMOVE|ARCHIVE|MOVE|UPLOAD|CANCEL)/.test(n))
      const other = names.filter(n => !read.includes(n) && !write.includes(n))

      process.stderr.write(`${names.length} actions\n`)

      lines.push(`## ${label} \`${slug}\` — ${names.length} actions`)
      lines.push('')
      lines.push(`### READ / FETCH (${read.length})`)
      read.forEach(n => lines.push(`- \`${n}\``))
      lines.push('')
      lines.push(`### WRITE / CREATE / DELETE (${write.length})`)
      write.forEach(n => lines.push(`- \`${n}\``))
      if (other.length) {
        lines.push('')
        lines.push(`### OTHER (${other.length})`)
        other.forEach(n => lines.push(`- \`${n}\``))
      }
    } catch (e: any) {
      process.stderr.write(`ERROR: ${e.message?.slice(0,60)}\n`)
      lines.push(`## ${label} \`${slug}\` — ERROR: ${e.message?.slice(0,60)}`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  fs.writeFileSync('docs/superpowers/specs/composio-verified-actions.md', lines.join('\n'))
  process.stderr.write('\n✅ Saved.\n')
}

main()
