import { env } from "../config/env";
import { closePgPool } from "../lib/db-pg";
import { embedBatch } from "../modules/memory/embedding-client";
import {
  searchEmbeddings,
  type EmbeddingHit
} from "../modules/memory/embedding-store";
import { runHybridRetrieval } from "../modules/memory/hybrid-retrieval";

/**
 * Phase 2 Week 1 — memory layer benchmark harness.
 *
 * Usage
 *   npm run bench-memory -- embed   [N=10]
 *   npm run bench-memory -- search  [N=20]  [tenantId]
 *   npm run bench-memory -- hybrid  [N=20]  [tenantId]
 *   npm run bench-memory -- all
 *
 * What it measures
 *   embed   — embedBatch() latency (single-input) against the configured
 *             embedding endpoint. Reports p50/p95/p99, throughput,
 *             tokens/sec (when reported by the API), error rate.
 *   search  — searchEmbeddings() latency against the live HNSW index.
 *             Uses a random query embedding (NOT a real query) so the
 *             measurement reflects the index behavior, not the embed API.
 *   hybrid  — runHybridRetrieval() end-to-end (embed + search + score).
 *             Uses a curated set of real-shaped prompts.
 *
 * Output is plain text with the numbers needed to decide:
 *   - Is embedding latency acceptable? (target p50 < 500ms)
 *   - Is search latency acceptable? (target p50 < 40ms)
 *   - Is the orchestrator latency acceptable? (target p50 < 600ms)
 *
 * Each mode prints a clear PASS/FAIL line against the targets so the
 * smoke step is unambiguous.
 */

const TARGETS = {
  embed_p50_ms: 500,
  embed_p95_ms: 1500,
  search_p50_ms: 40,
  search_p95_ms: 200,
  hybrid_p50_ms: 600,
  hybrid_p95_ms: 2000
};

interface LatencyStats {
  count: number;
  errors: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((sortedAsc.length - 1) * p));
  return sortedAsc[idx] ?? 0;
}

function statsFrom(samples: number[], errors: number): LatencyStats {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: samples.length,
    errors,
    p50: Math.round(percentile(sorted, 0.5)),
    p95: Math.round(percentile(sorted, 0.95)),
    p99: Math.round(percentile(sorted, 0.99)),
    min: sorted.length > 0 ? Math.round(sorted[0] ?? 0) : 0,
    max: sorted.length > 0 ? Math.round(sorted[sorted.length - 1] ?? 0) : 0,
    mean: sorted.length > 0 ? Math.round(sum / sorted.length) : 0
  };
}

function fmt(s: LatencyStats): string {
  return (
    `count=${s.count}  errors=${s.errors}  ` +
    `p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  ` +
    `min=${s.min}ms  max=${s.max}ms  mean=${s.mean}ms`
  );
}

function gate(label: string, value: number, target: number): string {
  return `  ${value <= target ? "PASS" : "FAIL"}  ${label}: ${value}ms  (target ≤ ${target}ms)`;
}

const SAMPLE_PROMPTS = [
  "send a daily slack digest of overdue tasks at 9am",
  "every monday morning email the team this week's seo report",
  "when a stripe invoice is overdue 7 days, post to slack and tag the AM",
  "build a workflow that creates a clickup task for each new hubspot lead",
  "after a calendly meeting ends, send a follow-up email with the recording",
  "weekly digest of new content drafts ready for review",
  "monitor google search console for ranking drops above 5 positions",
  "when a new client signs the proposal, kick off the onboarding workflow",
  "route inbound leads to the right account manager by source",
  "generate the monthly retainer invoice on the 1st and email the contact",
  "post a slack alert when any workflow has failed twice in an hour",
  "summarize zoom transcripts and attach them to the deal in pipedrive",
  "every friday at 5pm send the leadership a weekly KPI rollup",
  "when a paid media report finishes generating, post it to the client channel",
  "build a workflow that retries failed gmail sends with exponential backoff",
  "track time entries from toggl and tag any client over 110% of budget",
  "if monthly recurring revenue drops more than 3%, ping the founders",
  "create a workflow that follows up with no-show meetings",
  "weekly automation: pull churn risk signals from intercom and surface them",
  "build a workflow that updates project status from clickup into a slack canvas"
];

async function benchEmbed(n: number): Promise<void> {
  console.log(`\n=== bench:embed (n=${n}) ===`);
  console.log(`  model=${env.AI_MODEL_EMBED}  dim=${env.AI_MODEL_EMBED_DIM}  endpoint=${env.AI_BASE_URL}/embeddings`);

  // Warm-up: 3 calls discarded so DNS, TLS, and any keep-alive setup
  // doesn't skew the first samples.
  for (let i = 0; i < Math.min(3, n); i += 1) {
    try {
      await embedBatch({ inputs: ["warmup probe"] });
    } catch {
      /* warmup errors don't count */
    }
  }

  const samples: number[] = [];
  let errors = 0;
  let totalTokens = 0;
  const startedAt = Date.now();

  for (let i = 0; i < n; i += 1) {
    const prompt = SAMPLE_PROMPTS[i % SAMPLE_PROMPTS.length] ?? "test prompt";
    const t0 = Date.now();
    try {
      const r = await embedBatch({ inputs: [prompt] });
      samples.push(Date.now() - t0);
      if (r.tokens_used) totalTokens += r.tokens_used;
    } catch (err) {
      errors += 1;
      console.log(`  err[${i}]: ${(err as Error).message}`);
    }
  }

  const durationSec = (Date.now() - startedAt) / 1000;
  const stats = statsFrom(samples, errors);
  console.log(`  ${fmt(stats)}`);
  console.log(`  total_duration=${durationSec.toFixed(2)}s  ` +
              `tokens=${totalTokens}  ` +
              `tokens/sec=${durationSec > 0 ? Math.round(totalTokens / durationSec) : 0}`);
  console.log(gate("embed p50", stats.p50, TARGETS.embed_p50_ms));
  console.log(gate("embed p95", stats.p95, TARGETS.embed_p95_ms));
}

async function benchSearch(n: number, tenantId: string): Promise<void> {
  console.log(`\n=== bench:search (n=${n}, tenant=${tenantId}) ===`);
  if (!env.POSTGRES_URL) {
    console.log("  SKIP — POSTGRES_URL not set");
    return;
  }

  // Generate a random unit-ish vector. We're benchmarking the INDEX, not
  // the embedding API; the actual recall is irrelevant for latency.
  const randomVec = Array.from(
    { length: env.AI_MODEL_EMBED_DIM },
    () => Math.random() * 2 - 1
  );

  // Warm-up
  for (let i = 0; i < 3; i += 1) {
    try {
      await searchEmbeddings({
        ownerUserIds: [tenantId],
        queryText: "warmup",
        queryEmbedding: randomVec
      });
    } catch {
      /* ignore */
    }
  }

  const samples: number[] = [];
  let errors = 0;
  let totalHits = 0;

  for (let i = 0; i < n; i += 1) {
    const t0 = Date.now();
    try {
      const hits = await searchEmbeddings({
        ownerUserIds: [tenantId],
        queryText: SAMPLE_PROMPTS[i % SAMPLE_PROMPTS.length] ?? "test",
        queryEmbedding: randomVec
      });
      samples.push(Date.now() - t0);
      totalHits += hits.length;
    } catch (err) {
      errors += 1;
      console.log(`  err[${i}]: ${(err as Error).message}`);
    }
  }

  const stats = statsFrom(samples, errors);
  console.log(`  ${fmt(stats)}`);
  console.log(`  avg_hits_per_call=${samples.length > 0 ? (totalHits / samples.length).toFixed(2) : 0}`);
  console.log(gate("search p50", stats.p50, TARGETS.search_p50_ms));
  console.log(gate("search p95", stats.p95, TARGETS.search_p95_ms));
}

async function benchHybrid(n: number, tenantId: string): Promise<void> {
  console.log(`\n=== bench:hybrid (n=${n}, tenant=${tenantId}) ===`);
  if (!env.POSTGRES_URL) {
    console.log("  SKIP — POSTGRES_URL not set");
    return;
  }
  if (!env.HYBRID_RETRIEVAL_ENABLED) {
    console.log("  NOTE — HYBRID_RETRIEVAL_ENABLED=false; orchestrator will use keyword fallback.");
    console.log("  Set HYBRID_RETRIEVAL_ENABLED=true in this shell to measure the real path.");
  }

  // Warm-up
  for (let i = 0; i < 3; i += 1) {
    try {
      await runHybridRetrieval({
        ownerUserId: tenantId,
        queryText: "warmup",
        outputKind: "workflow_json"
      });
    } catch {
      /* ignore */
    }
  }

  const samples: number[] = [];
  let errors = 0;
  let fallbackCount = 0;
  let totalHits = 0;
  let totalCards = 0;
  const cardIds = new Set<string>();

  for (let i = 0; i < n; i += 1) {
    const prompt = SAMPLE_PROMPTS[i % SAMPLE_PROMPTS.length] ?? "test";
    const t0 = Date.now();
    try {
      const r = await runHybridRetrieval({
        ownerUserId: tenantId,
        queryText: prompt,
        outputKind: "workflow_json"
      });
      samples.push(Date.now() - t0);
      totalHits += r.hits.length;
      totalCards += r.pattern_card_scores.length;
      for (const s of r.pattern_card_scores) cardIds.add(s.card.id);
      if (r.used_fallback) fallbackCount += 1;
    } catch (err) {
      errors += 1;
      console.log(`  err[${i}]: ${(err as Error).message}`);
    }
  }

  const stats = statsFrom(samples, errors);
  console.log(`  ${fmt(stats)}`);
  console.log(`  fallback_count=${fallbackCount}/${n}  ` +
              `avg_hits=${samples.length > 0 ? (totalHits / samples.length).toFixed(2) : 0}  ` +
              `avg_cards=${samples.length > 0 ? (totalCards / samples.length).toFixed(2) : 0}`);
  console.log(`  unique_cards_seen=${cardIds.size} -> [${[...cardIds].sort().join(", ")}]`);
  console.log(gate("hybrid p50", stats.p50, TARGETS.hybrid_p50_ms));
  console.log(gate("hybrid p95", stats.p95, TARGETS.hybrid_p95_ms));
}

async function main() {
  const [, , mode, ...rest] = process.argv;
  const n = Number.parseInt(rest[0] ?? "", 10);
  const tenantId = rest[1] ?? "00000000-0000-0000-0000-000000000001";

  try {
    switch (mode) {
      case "embed":
        await benchEmbed(Number.isFinite(n) && n > 0 ? n : 10);
        break;
      case "search":
        await benchSearch(Number.isFinite(n) && n > 0 ? n : 20, tenantId);
        break;
      case "hybrid":
        await benchHybrid(Number.isFinite(n) && n > 0 ? n : 20, tenantId);
        break;
      case "all":
        await benchEmbed(10);
        await benchSearch(20, tenantId);
        await benchHybrid(20, tenantId);
        break;
      default:
        console.log(
          "Usage:\n" +
            "  bench-memory embed  [N=10]\n" +
            "  bench-memory search [N=20] [tenantId]\n" +
            "  bench-memory hybrid [N=20] [tenantId]\n" +
            "  bench-memory all"
        );
        process.exit(2);
    }
  } finally {
    if (env.POSTGRES_URL) await closePgPool();
  }
}

main().catch((err) => {
  console.error("bench failed:", err);
  process.exit(1);
});
