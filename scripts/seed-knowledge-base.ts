// scripts/seed-knowledge-base.ts
// Run with: OPENAI_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/seed-knowledge-base.ts
// Reads all markdown notes from knowledge-base/{category}/ and upserts them
// into the Supabase knowledge_base table with embeddings.

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const KB_DIR = path.join(process.cwd(), 'knowledge-base')
const CATEGORIES = ['benchmarks', 'tools', 'patterns', 'failures', 'agency-profiles']
const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_CHUNK_CHARS = 4000
const CHUNK_OVERLAP_CHARS = 200

type MarkdownChunk = {
  content: string
  headingPath: string[]
}

function chunkText(text: string, maxChars: number, overlap: number): string[] {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length)
    chunks.push(text.slice(start, end))
    start = end - overlap
    if (start >= text.length) break
  }
  return chunks
}

function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match?.[1]?.trim() || fallback.replace(/\.md$/, '')
}

function markdownSections(content: string): Array<{ headingPath: string[]; content: string }> {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const sections: Array<{ headingPath: string[]; content: string }> = []
  const headingStack: Array<{ level: number; text: string }> = []
  let currentLines: string[] = []
  let currentPath: string[] = []

  function flush() {
    const body = currentLines.join('\n').trim()
    if (body) {
      sections.push({
        headingPath: currentPath,
        content: body,
      })
    }
  }

  for (const line of lines) {
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line)
    if (heading) {
      flush()
      const level = heading[1].length
      const text = heading[2].trim()
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop()
      }
      headingStack.push({ level, text })
      currentPath = headingStack.map((item) => item.text)
      currentLines = [line]
      continue
    }

    currentLines.push(line)
  }

  flush()
  return sections.length > 0
    ? sections
    : [{ headingPath: [], content }]
}

function chunkMarkdown(
  content: string,
  category: string,
  file: string,
  maxChars: number,
  overlap: number,
): MarkdownChunk[] {
  const title = titleFromMarkdown(content, file)
  const chunks: MarkdownChunk[] = []

  for (const section of markdownSections(content)) {
    const headingPath = section.headingPath.length > 0 ? section.headingPath : [title]
    const prefix = [
      `Title: ${title}`,
      `Category: ${category}`,
      `Source file: ${file}`,
      `Heading path: ${headingPath.join(' > ')}`,
    ].join('\n')
    const bodyLimit = Math.max(1000, maxChars - prefix.length - 2)

    for (const part of chunkText(section.content, bodyLimit, overlap)) {
      chunks.push({
        content: `${prefix}\n\n${part}`,
        headingPath,
      })
    }
  }

  return chunks
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '').toLowerCase()
}

function extractLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) ?? []
  return matches.map((m) => m.replace(/^\[\[|\]\]$/g, ''))
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? ''
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? ''
  const openaiKey = process.env.OPENAI_API_KEY ?? ''

  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are required')
    process.exit(1)
  }
  if (!openaiKey) {
    console.error('OPENAI_API_KEY env var is required')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const openai = new OpenAI({ apiKey: openaiKey })

  let totalUpserted = 0

  for (const category of CATEGORIES) {
    const catDir = path.join(KB_DIR, category)
    if (!fs.existsSync(catDir)) {
      console.warn(`Category dir not found: ${catDir}`)
      continue
    }

    const mdFiles = fs.readdirSync(catDir).filter((f) => f.endsWith('.md')).sort()

    for (const file of mdFiles) {
      const filePath = path.join(catDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const slug = slugFromFilename(file)
      const links = extractLinks(content)
      const title = titleFromMarkdown(content, file)

      const sourceFile = file // the .md file itself

      const chunks = chunkMarkdown(content, category, file, MAX_CHUNK_CHARS, CHUNK_OVERLAP_CHARS)

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]
        const chunkSlug = chunks.length === 1 ? slug : `${slug}--chunk-${chunkIndex + 1}`

        process.stdout.write(`  Embedding ${chunkSlug}...`)

        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: chunk.content.slice(0, 8000),
        })

        const embedding = embeddingResponse.data[0]?.embedding
        if (!embedding || embedding.length !== 1536) {
          console.error(`\n  ✗ Bad embedding for ${chunkSlug}`)
          continue
        }

        const { error } = await supabase
          .from('knowledge_base')
          .upsert(
            {
              slug: chunkSlug,
              source_file: sourceFile,
              category,
              content: chunk.content,
              links,
              embedding: embedding as unknown as string,
              metadata: {
                file,
                title,
                category,
                heading_path: chunk.headingPath,
                chunk_index: chunkIndex,
                total_chunks: chunks.length,
                chunk_strategy: 'markdown-heading-v2',
                embedding_model: EMBEDDING_MODEL,
              },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'slug' },
          )

        if (error) {
          console.error(`\n  ✗ Supabase upsert failed for ${chunkSlug}:`, error.message)
          continue
        }

        console.log(' ✓')
        totalUpserted++
      }
    }
  }

  console.log(`\nSeeded ${totalUpserted} chunks into knowledge_base.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
