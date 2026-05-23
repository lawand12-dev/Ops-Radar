/**
 * Anthropic Agent Skills loader.
 *
 * Implements the canonical three-tier progressive disclosure pattern
 * (per https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills):
 *
 *   Tier 1 — Boot:    only `name` + `description` of every skill are concatenated
 *                     into the system prompt (cheap, deterministic, prompt-cacheable).
 *   Tier 2 — Trigger: when the description matches the task, the agent calls
 *                     the `load_skill` tool, which returns the full SKILL.md body.
 *   Tier 3 — On-demand: the loaded skill can reference `reference/*.md` siblings;
 *                     the agent reads those only when explicitly told to.
 *
 * Folder convention (one folder per skill):
 *   knowledge-base/skills/<domain>/<skill-name>/SKILL.md
 *   knowledge-base/skills/<domain>/<skill-name>/reference/*.md   (optional)
 *
 * Frontmatter is the Anthropic spec: only `name` (required) and `description`
 * (required, ≤1024 chars, fold trigger terms into the prose). Optional fields
 * like `allowed-tools`, `model`, `effort` are preserved but unused for v1.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

/** Resolved at module init so the catalog is cached for the lifetime of the lambda. */
const SKILLS_ROOT = path.join(process.cwd(), 'knowledge-base', 'skills')

export type SkillMeta = {
  /** Kebab-case identifier, ≤64 chars, matches the folder name. */
  name: string
  /** ≤1024 chars; should include trigger terms ("use when X happens"). */
  description: string
  /** Domain folder (revenue/profitability/delivery/...). For grouping only. */
  domain: string
  /** Absolute path to SKILL.md — used by load_skill to read the body. */
  path: string
  /** Optional tool allowlist from frontmatter. */
  allowedTools?: string[]
}

let _cache: SkillMeta[] | null = null
let _cacheError: string | null = null

/**
 * Walks knowledge-base/skills/ once, parses frontmatter only (NOT bodies).
 * Returns an empty array (with a warning) if the folder doesn't exist yet —
 * the agent loop and COO route call this defensively at boot.
 */
export async function loadSkillCatalog(): Promise<SkillMeta[]> {
  if (_cache !== null) return _cache
  if (_cacheError) return []

  try {
    const skills: SkillMeta[] = []
    const domains = await safeReaddir(SKILLS_ROOT)

    for (const domain of domains) {
      const domainPath = path.join(SKILLS_ROOT, domain)
      const skillFolders = await safeReaddir(domainPath)

      for (const slug of skillFolders) {
        const skillFile = path.join(domainPath, slug, 'SKILL.md')
        let content: string
        try {
          content = await fs.readFile(skillFile, 'utf8')
        } catch {
          continue // silently skip folders without SKILL.md
        }
        const fm = parseFrontmatter(content)
        if (!fm.name || !fm.description) {
          console.warn('[skills] missing required frontmatter:', skillFile)
          continue
        }
        skills.push({
          name: fm.name,
          description: fm.description,
          domain,
          path: skillFile,
          allowedTools: fm.allowedTools,
        })
      }
    }

    _cache = skills
    return skills
  } catch (err) {
    _cacheError = err instanceof Error ? err.message : String(err)
    console.warn('[skills] catalog load failed (continuing without skills):', _cacheError)
    return []
  }
}

/**
 * Returns the full SKILL.md body (including frontmatter) for a named skill.
 * Throws if the skill is unknown — the agent loop catches and reports back
 * to the model so it can try a different skill name or proceed without one.
 */
export async function loadSkillBody(name: string): Promise<string> {
  const catalog = await loadSkillCatalog()
  const skill = catalog.find((s) => s.name === name)
  if (!skill) {
    throw new Error(
      `Unknown skill: ${name}. Available skills: ${catalog.map((s) => s.name).join(', ')}`,
    )
  }
  return fs.readFile(skill.path, 'utf8')
}

/**
 * Builds the "skills catalog" block that goes into every agent's system prompt.
 * Format: `- <name>: <description>` per line. Designed to be small and
 * prompt-cacheable — Claude/GPT only need name + description to decide whether
 * to call load_skill.
 *
 * Returns an empty string when no skills are loaded so the prompt is unchanged.
 */
export function buildSkillsSystemBlock(catalog: SkillMeta[]): string {
  if (catalog.length === 0) return ''
  const lines = catalog.map((s) => `- ${s.name}: ${s.description}`)
  return [
    'Available skills (call the `load_skill` tool with the name to read the full instructions):',
    '',
    ...lines,
  ].join('\n')
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

/**
 * Minimal YAML-ish frontmatter parser — handles the only fields we care about:
 * `name` (string), `description` (string, supports `>` and `|` folded scalars),
 * `allowed-tools` (array). No dep on gray-matter / js-yaml.
 */
function parseFrontmatter(content: string): {
  name?: string
  description?: string
  allowedTools?: string[]
} {
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end < 0) return {}
  const yaml = content.slice(3, end).trim()

  const out: { name?: string; description?: string; allowedTools?: string[] } = {}
  const lines = yaml.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let value = m[2].trim()

    // Folded scalar (`>` or `|`): collect subsequent indented lines until a
    // non-indented line. Newlines collapse to spaces for `>`.
    if (value === '>' || value === '|') {
      const parts: string[] = []
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        i++
        parts.push(lines[i].trim())
      }
      value = parts.join(value === '>' ? ' ' : '\n')
    }

    // Inline array: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arr = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
      if (key === 'allowed-tools') out.allowedTools = arr
      continue
    }

    // Block array: lines starting with `- ` after the key
    if (value === '') {
      const arr: string[] = []
      while (i + 1 < lines.length && /^\s*-\s/.test(lines[i + 1])) {
        i++
        arr.push(lines[i].trim().replace(/^-\s*/, '').replace(/^["']|["']$/g, ''))
      }
      if (arr.length > 0) {
        if (key === 'allowed-tools') out.allowedTools = arr
        continue
      }
    }

    // Quoted scalar
    value = value.replace(/^["']|["']$/g, '')

    if (key === 'name') out.name = value
    if (key === 'description') out.description = value
  }

  return out
}
