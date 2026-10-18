// scripts/embed-kb.ts
//
// Generate / refresh embeddings for every KB markdown file.
// Idempotent — only re-embeds files whose content hash changed.
//
// Usage:
//   npx tsx scripts/embed-kb.ts
//
// Requires env: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL.

import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

// Tiny frontmatter parser — matches the convention used by
// src/lib/knowledge-retrieval.ts so we don't pull in gray-matter.
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { data: {}, content: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { data, content: m[2] };
}

const KB_ROOT = path.resolve(process.cwd(), 'knowledge-base');
const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIM = 1536;

type ChunkInput = {
  sourceFile: string;
  category: string | null;
  title: string | null;
  summary: string | null;
  content: string;
};

async function walkMarkdownFiles(dir: string, base: string = dir): Promise<string[]> {
  const entries = await readdir(dir);
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      out.push(...(await walkMarkdownFiles(full, base)));
    } else if (entry.endsWith('.md') && !entry.startsWith('.') && entry !== 'index.md' && entry !== 'log.md' && entry !== 'CLAUDE.md') {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

async function loadChunk(sourceFile: string): Promise<ChunkInput> {
  const full = path.join(KB_ROOT, sourceFile);
  const raw = await readFile(full, 'utf8');
  const { data, content } = parseFrontmatter(raw);
  const category = sourceFile.split(path.sep)[0] ?? null;
  return {
    sourceFile,
    category,
    title: typeof data.title === 'string' ? data.title : null,
    summary: typeof data.summary === 'string' ? data.summary : null,
    content: content.trim(),
  };
}

function hashContent(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!url || !key) throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  if (!openaiKey) throw new Error('Missing OPENAI_API_KEY');

  const supabase = createClient(url, key);
  const openaiProvider = createOpenAI({ apiKey: openaiKey });
  const embedModel = openaiProvider.textEmbeddingModel(EMBED_MODEL);

  console.log(`[embed-kb] scanning ${KB_ROOT} ...`);
  const files = await walkMarkdownFiles(KB_ROOT);
  console.log(`[embed-kb] found ${files.length} markdown files`);

  // Existing hashes — skip files whose content hasn't changed
  const { data: existing } = await supabase
    .from('kb_embeddings')
    .select('source_file, content_hash');
  const existingMap = new Map<string, string>(
    (existing ?? []).map((r) => [r.source_file as string, r.content_hash as string]),
  );

  let embedded = 0;
  let skipped = 0;

  for (const file of files) {
    const chunk = await loadChunk(file);
    const hash = hashContent(chunk.content);

    if (existingMap.get(file) === hash) {
      skipped++;
      continue;
    }

    // Embed: combine title + summary + content so semantic queries can
    // match against the file's stated purpose, not just its body.
    const embedText = [chunk.title, chunk.summary, chunk.content].filter(Boolean).join('\n\n').slice(0, 8000);

    const { embedding } = await embed({
      model: embedModel,
      value: embedText,
    });
    if (!embedding || embedding.length !== EMBED_DIM) {
      console.error(`[embed-kb] unexpected embedding shape for ${file}`);
      continue;
    }

    const { error } = await supabase
      .from('kb_embeddings')
      .upsert({
        source_file: file,
        category: chunk.category,
        title: chunk.title,
        summary: chunk.summary,
        content_preview: chunk.content.slice(0, 500),
        content_hash: hash,
        embedding: embedding as unknown as string, // pgvector accepts JSON array
      }, { onConflict: 'source_file' });
    if (error) {
      console.error(`[embed-kb] upsert failed for ${file}:`, error.message);
      continue;
    }

    embedded++;
    console.log(`[embed-kb] embedded ${file} (${embedding.length}d)`);
  }

  console.log(`[embed-kb] done — embedded=${embedded} skipped=${skipped} total=${files.length}`);
}

main().catch((err) => {
  console.error('[embed-kb] fatal:', err);
  process.exit(1);
});
