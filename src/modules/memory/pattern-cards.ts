import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { env } from "../../config/env";

/**
 * Pattern Cards — versioned, structured prompts for the model.
 *
 * A pattern card is a markdown file in `knowledge-base/patterns/` whose top
 * carries YAML frontmatter (id, version, intent, triggers, tools,
 * output_kind, ...). The selector is deterministic keyword + intent scoring;
 * Phase 2 will layer a vector recall pass on top of this.
 *
 * Files without frontmatter are treated as legacy KB content — they're
 * loaded by the existing `knowledge-base-loader.ts` path and ignored here.
 * This keeps the rollout incremental: every new card we frontmatter goes
 * through the new selector; the old keyword loader still sees everything.
 *
 * Why we don't use a YAML library
 * --------------------------------
 * The brief calls for minimal deps. Frontmatter is a tiny dialect we control:
 *   key: value
 *   key: [a, b, c]
 *   key:
 *     - block_value_1
 *     - block_value_2
 * Anything more exotic (nested objects, multi-line strings) is intentionally
 * not supported — we keep the schema flat so the model gets a stable, easy
 * surface to ground on. The parser silently skips lines it can't interpret.
 */

export type PatternOutputKind = "workflow_json" | "coo_playbook" | "failure_playbook";

export interface PatternCard {
  id: string;
  version: number;
  intent: string | null;
  triggers: string[];
  tools: string[];
  output_kind: PatternOutputKind;
  /** Markdown body below the closing `---`. */
  body: string;
  /** Source path relative to cwd (for logging only). */
  source_path: string;
}

export interface PatternCardScore {
  card: PatternCard;
  score: number;
  matched_triggers: string[];
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const ARRAY_INLINE_RE = /^\[([^\]]*)\]$/;
const BLOCK_LIST_ITEM_RE = /^\s*-\s*(.+?)\s*$/;
const VALID_OUTPUT_KINDS: PatternOutputKind[] = [
  "workflow_json",
  "coo_playbook",
  "failure_playbook"
];

interface RawFrontmatter {
  id?: string;
  version?: number;
  intent?: string;
  triggers?: string[];
  tools?: string[];
  output_kind?: string;
}

function parseInlineArray(value: string): string[] | null {
  const match = ARRAY_INLINE_RE.exec(value.trim());
  if (!match) return null;
  const body = match[1] ?? "";
  return body
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter((item) => item.length > 0);
}

function parseScalar(value: string): string | number {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function parseFrontmatterText(yaml: string): RawFrontmatter {
  const lines = yaml.split(/\r?\n/);
  const fm: RawFrontmatter = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    // skip blank + comment lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }

    // top-level keys are 0-indented
    const m = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!m) {
      i += 1;
      continue;
    }

    const key = m[1] ?? "";
    const inlineValue = m[2] ?? "";

    if (inlineValue.length === 0) {
      // Block list collection. Consume subsequent lines that start with `-`.
      const collected: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j] ?? "";
        const itemMatch = BLOCK_LIST_ITEM_RE.exec(nextLine);
        if (!itemMatch) break;
        const rawItem = itemMatch[1] ?? "";
        const item = rawItem.replace(/^['"]|['"]$/g, "").trim();
        // Skip nested-object items like "{ name: foo, required: true }"
        if (item.length > 0 && !item.startsWith("{")) {
          collected.push(item);
        }
        j += 1;
      }
      assignArrayField(fm, key, collected);
      i = j;
      continue;
    }

    const inlineArr = parseInlineArray(inlineValue);
    if (inlineArr) {
      assignArrayField(fm, key, inlineArr);
      i += 1;
      continue;
    }

    const scalar = parseScalar(inlineValue);
    assignScalarField(fm, key, scalar);
    i += 1;
  }

  return fm;
}

function assignScalarField(fm: RawFrontmatter, key: string, value: string | number): void {
  switch (key) {
    case "id":
      if (typeof value === "string") fm.id = value;
      break;
    case "version":
      if (typeof value === "number") fm.version = value;
      else if (typeof value === "string" && /^\d+$/.test(value)) fm.version = Number(value);
      break;
    case "intent":
      if (typeof value === "string") fm.intent = value;
      break;
    case "output_kind":
      if (typeof value === "string") fm.output_kind = value;
      break;
    default:
      // Ignore unknown scalar keys — we keep the schema closed.
      break;
  }
}

function assignArrayField(fm: RawFrontmatter, key: string, value: string[]): void {
  if (key === "triggers") fm.triggers = value;
  else if (key === "tools") fm.tools = value;
  // Other arrays (inputs, confidence_factors, common_failures) are intentionally
  // dropped — they're prose for the model, not selector inputs.
}

function isValidOutputKind(value: string | undefined): value is PatternOutputKind {
  return Boolean(value) && VALID_OUTPUT_KINDS.includes(value as PatternOutputKind);
}

function buildCardFromFile(absolutePath: string, relativePath: string): PatternCard | null {
  let raw: string;
  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }

  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return null;

  const fmText = match[1] ?? "";
  const bodyText = match[2] ?? "";
  const fm = parseFrontmatterText(fmText);
  if (!fm.id || typeof fm.version !== "number" || !isValidOutputKind(fm.output_kind)) {
    // Required fields missing — treat as legacy KB content, not a card.
    return null;
  }

  return {
    id: fm.id,
    version: fm.version,
    intent: fm.intent ?? null,
    triggers: fm.triggers ?? [],
    tools: fm.tools ?? [],
    output_kind: fm.output_kind,
    body: bodyText.trim(),
    source_path: relativePath
  };
}

let cache: { dir: string; cards: PatternCard[] } | null = null;

export function clearPatternCardCacheForTests(): void {
  cache = null;
}

export function loadAllPatternCards(dirOverride?: string): PatternCard[] {
  const baseDir = resolve(process.cwd(), dirOverride ?? env.AI_PATTERN_CARDS_DIR);
  if (cache && cache.dir === baseDir) return cache.cards;

  if (!existsSync(baseDir)) {
    cache = { dir: baseDir, cards: [] };
    return [];
  }

  const cards: PatternCard[] = [];
  let entries: string[];
  try {
    entries = readdirSync(baseDir);
  } catch {
    cache = { dir: baseDir, cards: [] };
    return [];
  }

  for (const entry of entries) {
    if (extname(entry).toLowerCase() !== ".md") continue;
    const abs = resolve(baseDir, entry);
    try {
      const stat = statSync(abs);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }
    const card = buildCardFromFile(abs, `${env.AI_PATTERN_CARDS_DIR}/${entry}`);
    if (card) cards.push(card);
  }

  cards.sort((a, b) => a.id.localeCompare(b.id));
  cache = { dir: baseDir, cards };
  return cards;
}

function tokenize(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((token) => token.length >= 2)
  );
}

function scoreCard(card: PatternCard, tokens: Set<string>): PatternCardScore {
  let score = 0;
  const matched: string[] = [];

  for (const trigger of card.triggers) {
    const t = trigger.toLowerCase().trim();
    if (!t) continue;
    if (tokens.has(t)) {
      score += 1.0;
      matched.push(trigger);
      continue;
    }
    // Multi-word triggers — credit if every word is present.
    if (t.includes(" ")) {
      const parts = t.split(/\s+/);
      if (parts.every((p) => tokens.has(p))) {
        score += 0.8;
        matched.push(trigger);
      }
    }
  }

  if (card.intent) {
    const intentTokens = card.intent.toLowerCase().split(/_+/);
    const intentMatch = intentTokens.filter((t) => tokens.has(t)).length;
    if (intentMatch > 0) score += 0.5 * intentMatch;
  }

  return { card, score, matched_triggers: matched };
}

export interface SelectPatternCardsOptions {
  prompt: string;
  outputKind: PatternOutputKind;
  topN?: number;
  dirOverride?: string;
}

export function selectPatternCards(options: SelectPatternCardsOptions): PatternCardScore[] {
  if (!env.AI_PATTERN_CARDS_ENABLED) return [];

  const all = loadAllPatternCards(options.dirOverride);
  const tokens = tokenize(options.prompt);
  if (tokens.size === 0 || all.length === 0) return [];

  const topN = Math.max(1, options.topN ?? env.AI_PATTERN_CARDS_TOP_N);

  const scored = all
    .filter((c) => c.output_kind === options.outputKind)
    .map((c) => scoreCard(c, tokens))
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.card.id.localeCompare(b.card.id);
    })
    .slice(0, topN);

  return scored;
}

/**
 * Render selected cards into a prompt block. Each card contributes a short
 * tagged section so the model knows it's reading reference material, not
 * the user request.
 *
 * We DON'T inline the full markdown body for every card — that would
 * dominate the prompt token budget. We give the model:
 *   - the card id @version (so we can cite it in matched_pattern_ids)
 *   - the intent + triggers + tools (top-level "what is this for")
 *   - a hard-capped excerpt of the body
 */
export function buildPatternCardsPromptBlock(
  scored: PatternCardScore[],
  options?: { bodyCharsPerCard?: number; header?: string }
): string {
  if (scored.length === 0) return "";

  const bodyMax = Math.max(200, options?.bodyCharsPerCard ?? 1200);
  const header = options?.header ?? "PATTERN_CARDS";
  const lines: string[] = [
    `<${header}>`,
    "These are curated pattern cards selected for this request.",
    "Ground your output on them. If none fits, prefer caution over invention.",
    ""
  ];

  for (const s of scored) {
    const c = s.card;
    lines.push(`[CARD: ${c.id}@v${c.version}]`);
    if (c.intent) lines.push(`intent: ${c.intent}`);
    if (c.triggers.length > 0) lines.push(`triggers: ${c.triggers.join(", ")}`);
    if (c.tools.length > 0) lines.push(`tools: ${c.tools.join(", ")}`);
    const bodyExcerpt = c.body.length > bodyMax ? `${c.body.slice(0, bodyMax)}...[trimmed]` : c.body;
    lines.push(bodyExcerpt);
    lines.push("");
  }

  lines.push(`</${header}>`);
  return lines.join("\n");
}

/**
 * Stable identifier for downstream tracking — written into
 * ai_interactions.matched_pattern_ids and later cited in audit logs.
 */
export function patternCardCitation(card: PatternCard): string {
  return `${card.id}@v${card.version}`;
}
