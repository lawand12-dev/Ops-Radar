/*
 * Ingest JSON research files from ./knowledge-base into the Supabase
 * `knowledge_base` table with OpenAI embeddings for RAG retrieval during audit
 * generation.
 *
 * Run with: npx tsx scripts/ingest-knowledge.ts
 *
 * Required env (loaded from .env.local):
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (needed — RLS blocks the anon key from writing)
 *
 * Notes:
 *   - JSON files can have arbitrary nested shapes. We walk the tree and emit
 *     readable "keyPath: value" lines so the semantic content of every field
 *     is preserved for embedding, not just the leaves.
 *   - Chunking is ~500 tokens with ~50 token overlap, approximated as
 *     2000 / 200 characters (≈4 chars/token for English prose).
 *   - The embedding model is text-embedding-3-small (1536 dims) to match the
 *     `vector(1536)` column in the migration.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const KNOWLEDGE_DIR = resolve(process.cwd(), 'knowledge-base')
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMS = 1536
const CHUNK_CHARS = 2000 // ~500 tokens
const CHUNK_OVERLAP_CHARS = 200 // ~50 tokens
const EMBEDDING_BATCH = 50
const INSERT_BATCH = 100

type Chunk = {
  content: string
  metadata: {
    source_file: string
    chunk_index: number
    char_start: number
    char_end: number
  }
}

function requireEnv(name: string): string {
  const value = (process.env[name] ?? '').trim()
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return value
}

/**
 * Walk a JSON value and produce readable text lines of the form
 *   "parent > child > field: value"
 * so the key context travels with the value into the embedding.
 */
function extractJsonText(value: unknown, keyPath: string[] = []): string[] {
  if (value == null) return []

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    const prefix = keyPath.length > 0 ? `${keyPath.join(' > ')}: ` : ''
    return [`${prefix}${trimmed}`]
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const prefix = keyPath.length > 0 ? `${keyPath.join(' > ')}: ` : ''
    return [`${prefix}${String(value)}`]
  }

  if (Array.isArray(value)) {
    const parts: string[] = []
    value.forEach((item, index) => {
      parts.push(...extractJsonText(item, [...keyPath, `[${index}]`]))
    })
    return parts
  }

  if (typeof value === 'object') {
    const parts: string[] = []
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      parts.push(...extractJsonText(child, [...keyPath, key]))
    }
    return parts
  }

  return []
}

function chunkText(text: string, sourceFile: string): Chunk[] {
  // Normalize whitespace so chunks read cleanly.
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
  if (!normalized) return []

  const chunks: Chunk[] = []
  const step = CHUNK_CHARS - CHUNK_OVERLAP_CHARS
  let index = 0
  let chunkIndex = 0

  while (index < normalized.length) {
    const end = Math.min(index + CHUNK_CHARS, normalized.length)
    const slice = normalized.slice(index, end).trim()
    if (slice.length > 0) {
      chunks.push({
        content: slice,
        metadata: {
          source_file: sourceFile,
          chunk_index: chunkIndex,
          char_start: index,
          char_end: end,
        },
      })
      chunkIndex += 1
    }
    if (end >= normalized.length) break
    index += step
  }

  return chunks
}

async function listJsonFiles(dir: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      console.error(`Knowledge directory not found: ${dir}`)
      console.error('Create it and drop your research JSON files in, then re-run.')
      process.exit(1)
    }
    throw err
  }
  return entries
    .filter((name) => name.toLowerCase().endsWith('.json'))
    .sort()
    .map((name) => join(dir, name))
}

async function embedBatch(openai: OpenAI, inputs: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  })
  const vectors = response.data.map((item) => item.embedding)
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIMS) {
      throw new Error(
        `Unexpected embedding dimension ${v.length} (expected ${EMBEDDING_DIMS})`,
      )
    }
  }
  return vectors
}

async function main() {
  const openaiKey = requireEnv('OPENAI_API_KEY')
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY fallback)')
    process.exit(1)
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      '[ingest] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key.\n'
        + '         RLS will block writes to knowledge_base unless a policy grants them.\n'
        + '         Add SUPABASE_SERVICE_ROLE_KEY to .env.local before running in production.',
    )
  }

  const openai = new OpenAI({ apiKey: openaiKey })
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const jsonFiles = await listJsonFiles(KNOWLEDGE_DIR)
  if (jsonFiles.length === 0) {
    console.log(`No JSON files found in ${KNOWLEDGE_DIR}. Drop your research JSONs in and re-run.`)
    return
  }

  console.log(`Found ${jsonFiles.length} JSON file(s) in ${KNOWLEDGE_DIR}`)

  const allChunks: Chunk[] = []
  for (const filePath of jsonFiles) {
    const sourceFile = filePath.split('/').pop() ?? filePath
    try {
      const raw = await readFile(filePath, 'utf8')
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch (parseErr) {
        console.error(`  ${sourceFile}: FAILED to parse JSON — ${parseErr instanceof Error ? parseErr.message : parseErr}`)
        continue
      }
      const lines = extractJsonText(parsed)
      const text = lines.join('\n')
      const chunks = chunkText(text, sourceFile)
      console.log(`  ${sourceFile}: ${chunks.length} chunk(s) from ${text.length} chars`)
      allChunks.push(...chunks)
    } catch (err) {
      console.error(`  ${sourceFile}: FAILED — ${err instanceof Error ? err.message : err}`)
    }
  }

  if (allChunks.length === 0) {
    console.log('No chunks to ingest.')
    return
  }

  console.log(`\nGenerating embeddings for ${allChunks.length} chunk(s)…`)
  const embeddings: number[][] = []
  for (let i = 0; i < allChunks.length; i += EMBEDDING_BATCH) {
    const batch = allChunks.slice(i, i + EMBEDDING_BATCH).map((c) => c.content)
    const vectors = await embedBatch(openai, batch)
    embeddings.push(...vectors)
    process.stdout.write(`  embedded ${Math.min(i + EMBEDDING_BATCH, allChunks.length)}/${allChunks.length}\r`)
  }
  process.stdout.write('\n')

  // Wipe prior rows for the same files so re-runs are idempotent.
  const sourceFiles = Array.from(new Set(allChunks.map((c) => c.metadata.source_file)))
  console.log(`\nClearing existing rows for ${sourceFiles.length} source file(s)…`)
  const { error: deleteError } = await supabase
    .from('knowledge_base')
    .delete()
    .in('source_file', sourceFiles)
  if (deleteError) {
    console.error(`Failed to clear existing rows: ${deleteError.message}`)
    process.exit(1)
  }

  console.log(`Inserting ${allChunks.length} row(s)…`)
  for (let i = 0; i < allChunks.length; i += INSERT_BATCH) {
    const slice = allChunks.slice(i, i + INSERT_BATCH)
    const rows = slice.map((chunk, offset) => ({
      source_file: chunk.metadata.source_file,
      content: chunk.content,
      embedding: embeddings[i + offset],
      metadata: chunk.metadata,
    }))
    const { error } = await supabase.from('knowledge_base').insert(rows)
    if (error) {
      console.error(`Insert failed at batch ${i}: ${error.message}`)
      process.exit(1)
    }
    process.stdout.write(`  inserted ${Math.min(i + INSERT_BATCH, allChunks.length)}/${allChunks.length}\r`)
  }
  process.stdout.write('\n')

  console.log(`\nDone. Ingested ${allChunks.length} chunks across ${sourceFiles.length} file(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
