import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";
import { env } from "../../config/env";

export type KnowledgeSection =
  | "root"
  | "patterns"
  | "tools"
  | "failures"
  | "benchmarks"
  | "agency-profiles";

export interface KnowledgeBaseResource {
  path: string;
  section: KnowledgeSection;
  title: string;
  content: string;
  tokens_estimate: number;
}

export interface SelectedKnowledgeResource extends KnowledgeBaseResource {
  score: number;
  chars: number;
}

export interface KnowledgeSelection {
  enabled: boolean;
  query: string;
  selected: SelectedKnowledgeResource[];
  total_chars: number;
}

export interface KnowledgeBaseConfig {
  enabled: boolean;
  baseDir: string;
  maxChars: number;
  fileMaxChars: number;
  topK: number;
}

export interface KnowledgeBaseLoadOptions {
  config?: Partial<KnowledgeBaseConfig>;
}

export interface KnowledgeSelectionOptions extends KnowledgeBaseLoadOptions {
  resources?: KnowledgeBaseResource[];
}

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".text"]);
const SKIP_FILE_NAMES = new Set([".gitkeep"]);
const SECTION_NAMES: KnowledgeSection[] = [
  "patterns",
  "tools",
  "failures",
  "benchmarks",
  "agency-profiles"
];
const CORE_FILE_NAMES = new Set(["CLAUDE.md", "index.md"]);

const SECTION_HINTS: Record<KnowledgeSection, string[]> = {
  root: [],
  tools: [
    "tool",
    "api",
    "node",
    "integration",
    "gmail",
    "telegram",
    "slack",
    "hubspot",
    "notion",
    "shopify",
    "webhook",
    "http"
  ],
  patterns: [
    "automation",
    "workflow",
    "build",
    "create",
    "design",
    "pattern"
  ],
  failures: [
    "fail",
    "failure",
    "error",
    "issue",
    "problem",
    "timeout",
    "rate",
    "credential",
    "bug",
    "retry"
  ],
  benchmarks: [
    "benchmark",
    "performance",
    "quality",
    "example",
    "examples",
    "latency",
    "throughput",
    "sla"
  ],
  "agency-profiles": [
    "agency",
    "client",
    "marketing",
    "recruiting",
    "design",
    "retainer",
    "seo",
    "paid"
  ]
};

let cachedResources: { cacheKey: string; resources: KnowledgeBaseResource[] } | null = null;

function normalizePath(input: string): string {
  return input.replace(/\\/g, "/");
}

function getConfig(overrides?: Partial<KnowledgeBaseConfig>): KnowledgeBaseConfig {
  return {
    enabled: overrides?.enabled ?? env.AI_WORKFLOW_KNOWLEDGE_BASE_ENABLED,
    baseDir: overrides?.baseDir ?? env.AI_WORKFLOW_KNOWLEDGE_BASE_DIR,
    maxChars: overrides?.maxChars ?? env.AI_WORKFLOW_KNOWLEDGE_BASE_MAX_CHARS,
    fileMaxChars: overrides?.fileMaxChars ?? env.AI_WORKFLOW_KNOWLEDGE_BASE_FILE_MAX_CHARS,
    topK: overrides?.topK ?? env.AI_WORKFLOW_KNOWLEDGE_BASE_TOP_K
  };
}

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u064B-\u0652\u0640]/g, "");
}

function normalizeText(input: string): string {
  const lowered = normalizeArabic(input.toLowerCase());
  return lowered.replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(/\s+/g)
    .map((value) => value.trim())
    .filter((value) => value.length >= 2)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function inferSection(relativePathFromBaseDir: string): KnowledgeSection {
  const segments = normalizePath(relativePathFromBaseDir).split("/");
  if (segments.length < 2) {
    return "root";
  }
  const candidate = segments[0];
  if (SECTION_NAMES.includes(candidate as KnowledgeSection)) {
    return candidate as KnowledgeSection;
  }
  return "root";
}

function deriveTitle(filePath: string, content: string): string {
  const heading = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("#"));
  if (heading) {
    const cleaned = heading.replace(/^#+\s*/, "").trim();
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  const fileName = basename(filePath).replace(/\.[^.]+$/, "");
  return fileName.replace(/[-_]+/g, " ").trim();
}

function isTextFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function walkFiles(dirPath: string): string[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function readResourceContent(filePath: string, fileMaxChars: number): string | null {
  if (!isTextFile(filePath)) {
    return null;
  }

  const rawBuffer = readFileSync(filePath);
  if (rawBuffer.includes(0)) {
    return null;
  }

  const rawText = rawBuffer.toString("utf8").trim();
  if (!rawText) {
    return "";
  }

  if (rawText.length <= fileMaxChars) {
    return rawText;
  }

  const suffix = "\n...[truncated]";
  const keep = Math.max(0, fileMaxChars - suffix.length);
  return `${rawText.slice(0, keep)}${suffix}`;
}

function scoreResource(userMessage: string, resource: KnowledgeBaseResource): number {
  const queryTokens = tokenize(userMessage);
  if (queryTokens.length === 0) {
    return 0;
  }

  const normalizedTitle = normalizeText(resource.title);
  const normalizedPath = normalizeText(resource.path);
  const normalizedContent = normalizeText(resource.content.slice(0, 3500));

  let score = 0;
  for (const token of queryTokens) {
    if (normalizedTitle.includes(token)) {
      score += 5;
    }
    if (normalizedPath.includes(token)) {
      score += 4;
    }
    if (normalizedContent.includes(token)) {
      score += 2;
    }
  }

  const hints = SECTION_HINTS[resource.section];
  const matchedHints = hints.filter((hint) => queryTokens.includes(normalizeText(hint)));
  if (matchedHints.length > 0) {
    score += matchedHints.length * 3;
  }

  if (normalizeText(resource.path).includes("log")) {
    const logCues = ["recent", "lesson", "incident", "log", "history"];
    if (logCues.some((cue) => queryTokens.includes(normalizeText(cue)))) {
      score += 4;
    }
  }

  return score;
}

function fitContentToBudget(content: string, remaining: number): string {
  if (remaining <= 0 || content.length === 0) {
    return "";
  }
  if (content.length <= remaining) {
    return content;
  }
  const suffix = "\n...[truncated-for-budget]";
  const keep = Math.max(0, remaining - suffix.length);
  return `${content.slice(0, keep)}${suffix}`;
}

function buildCacheKey(config: KnowledgeBaseConfig): string {
  const absoluteDir = resolve(process.cwd(), config.baseDir);
  return `${absoluteDir}::${config.fileMaxChars}`;
}

export function clearKnowledgeBaseCacheForTests(): void {
  cachedResources = null;
}

export function loadKnowledgeBaseResources(options?: KnowledgeBaseLoadOptions): KnowledgeBaseResource[] {
  const config = getConfig(options?.config);
  if (!config.enabled) {
    return [];
  }

  const absoluteDir = resolve(process.cwd(), config.baseDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const cacheKey = buildCacheKey(config);
  if (cachedResources && cachedResources.cacheKey === cacheKey) {
    return cachedResources.resources;
  }

  const discoveredFiles = walkFiles(absoluteDir)
    .filter((filePath) => !SKIP_FILE_NAMES.has(basename(filePath)))
    .filter((filePath) => {
      try {
        return statSync(filePath).isFile();
      } catch {
        return false;
      }
    });

  const resources: KnowledgeBaseResource[] = [];
  for (const absoluteFilePath of discoveredFiles) {
    const content = readResourceContent(absoluteFilePath, config.fileMaxChars);
    if (content === null) {
      continue;
    }

    const relativeToBaseDir = normalizePath(relative(absoluteDir, absoluteFilePath));
    const relativeToCwd = normalizePath(relative(process.cwd(), absoluteFilePath));
    const section = inferSection(relativeToBaseDir);
    resources.push({
      path: relativeToCwd,
      section,
      title: deriveTitle(absoluteFilePath, content),
      content,
      tokens_estimate: estimateTokens(content)
    });
  }

  resources.sort((a, b) => a.path.localeCompare(b.path));
  cachedResources = { cacheKey, resources };
  return resources;
}

export function selectKnowledgeForRequest(
  userMessage: string,
  options?: KnowledgeSelectionOptions
): KnowledgeSelection {
  const config = getConfig(options?.config);
  if (!config.enabled) {
    return {
      enabled: false,
      query: userMessage,
      selected: [],
      total_chars: 0
    };
  }

  const resources = options?.resources ?? loadKnowledgeBaseResources({ config });
  const coreResources = resources.filter((resource) => CORE_FILE_NAMES.has(basename(resource.path)));
  const nonCoreResources = resources.filter((resource) => !CORE_FILE_NAMES.has(basename(resource.path)));

  const scoredResources = nonCoreResources
    .map((resource) => ({
      resource,
      score: scoreResource(userMessage, resource)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.resource.path.localeCompare(b.resource.path);
    })
    .slice(0, config.topK);

  const rankedCore = coreResources
    .slice()
    .sort((a, b) => {
      const aRank = basename(a.path) === "CLAUDE.md" ? 0 : basename(a.path) === "index.md" ? 1 : 2;
      const bRank = basename(b.path) === "CLAUDE.md" ? 0 : basename(b.path) === "index.md" ? 1 : 2;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      return a.path.localeCompare(b.path);
    })
    .map((resource) => ({ resource, score: 1_000 }));

  const candidates = [...rankedCore, ...scoredResources];

  let remaining = config.maxChars;
  let totalChars = 0;
  const selected: SelectedKnowledgeResource[] = [];

  for (const candidate of candidates) {
    const isCore = CORE_FILE_NAMES.has(basename(candidate.resource.path));
    if (remaining <= 0 && !isCore) {
      break;
    }

    const fittedContent = fitContentToBudget(candidate.resource.content, remaining);
    const chars = fittedContent.length;
    totalChars += chars;
    remaining = Math.max(0, remaining - chars);
    selected.push({
      ...candidate.resource,
      content: fittedContent,
      chars,
      score: candidate.score,
      tokens_estimate: estimateTokens(fittedContent)
    });
  }

  return {
    enabled: true,
    query: userMessage,
    selected,
    total_chars: totalChars
  };
}

export function buildKnowledgeBasePromptBlock(selection: KnowledgeSelection): string {
  if (!selection.enabled || selection.selected.length === 0) {
    return "";
  }

  const lines: string[] = [
    "<OPS_RADAR_KNOWLEDGE_BASE>",
    "Source: knowledge-base",
    "Purpose: These are internal skill instructions, patterns, tool notes, known failures, and workflow design rules.",
    "Use them to generate more accurate n8n JSON.",
    "Do not copy prose into output.",
    "Output JSON only.",
    ""
  ];

  for (const file of selection.selected) {
    lines.push(`[FILE: ${file.path}]`);
    if (file.content.length > 0) {
      lines.push(file.content);
    }
    lines.push("");
  }

  lines.push("</OPS_RADAR_KNOWLEDGE_BASE>");
  return lines.join("\n");
}

export function buildKnowledgeBaseSelectionLogMeta(selection: KnowledgeSelection): {
  kb_enabled: boolean;
  selected_file_count: number;
  selected_paths: string[];
  total_chars: number;
} {
  return {
    kb_enabled: selection.enabled,
    selected_file_count: selection.selected.length,
    selected_paths: selection.selected.map((item) => item.path),
    total_chars: selection.total_chars
  };
}
