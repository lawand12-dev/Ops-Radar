import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { env } from "../config/env";
import { dbQuery, getDb } from "../lib/db";
import { closePgPool } from "../lib/db-pg";
import { selectPatternCards } from "../modules/memory/pattern-cards";
import { runHybridRetrieval } from "../modules/memory/hybrid-retrieval";

/**
 * Retrieval quality eval — Phase 1 keyword selector vs Phase 2 hybrid.
 *
 * Sources
 * -------
 *   - Default: read recent ai_interactions where outcome IN
 *     ('deployed','validated') AND matched_pattern_ids IS NOT NULL.
 *     `matched_pattern_ids` is the ground truth: the cards the model
 *     successfully grounded on for a prompt that made it to deployment.
 *   - Fallback: load src/scripts/eval-retrieval.curated.json — 20
 *     hand-labeled prompts/cards. Used when MySQL has <20 usable rows
 *     (e.g. early in Phase 2 rollout before traffic has settled the
 *     ai_interactions outcome lineage).
 *
 * Metrics (per prompt, then averaged)
 * -----------------------------------
 *   P@3    Precision in the top 3:    |G ∩ top3| / 3
 *   P@5    Precision in the top 5:    |G ∩ top5| / 5
 *   R@5    Recall in the top 5:       |G ∩ top5| / |G|
 *   MRR    Mean reciprocal rank:      1 / (position of first ground-truth hit)
 *
 * Agreement
 * ---------
 *   top1_agreement       — fraction of prompts where keyword.top1 == hybrid.top1
 *   keyword_only_wins    — prompts where keyword got a hit and hybrid didn't
 *   hybrid_only_wins     — prompts where hybrid got a hit and keyword didn't
 *
 * Decision rule for flipping HYBRID_RETRIEVAL_ENABLED globally:
 *   1) hybrid.P@3   >= keyword.P@3   (no precision regression)
 *   2) hybrid.R@5   >= keyword.R@5 + 0.05 (recall improves by ≥5pp)
 *   3) hybrid_only_wins >= keyword_only_wins (net gain in tricky cases)
 *
 * If any rule fails, DO NOT enable hybrid retrieval globally yet.
 */

interface EvalSample {
  prompt: string;
  /** Pattern card ids without @version suffix. */
  expected: string[];
  /** Optional source — for the run report. */
  user_id?: string;
}

interface Curated {
  name: string;
  samples: EvalSample[];
}

interface SelectorResult {
  /** Card ids in rank order, without @version. */
  ranked: string[];
  /** Latency in ms. */
  latency_ms: number;
  /** True if the selector errored or returned 0 results. */
  empty: boolean;
}

interface PerSampleEval {
  prompt_excerpt: string;
  expected: string[];
  keyword: SelectorResult;
  hybrid: SelectorResult;
}

function stripVersionSuffix(id: string): string {
  // e.g. "workflow-slack-digest@v1" -> "workflow-slack-digest"
  return id.replace(/@v?\d+$/i, "");
}

function precisionAt(k: number, ranked: string[], expected: Set<string>): number {
  if (k === 0) return 0;
  const head = ranked.slice(0, k);
  const hits = head.filter((id) => expected.has(id)).length;
  return hits / k;
}

function recallAt(k: number, ranked: string[], expected: Set<string>): number {
  if (expected.size === 0) return 0;
  const head = new Set(ranked.slice(0, k));
  let hits = 0;
  for (const e of expected) if (head.has(e)) hits += 1;
  return hits / expected.size;
}

function reciprocalRank(ranked: string[], expected: Set<string>): number {
  for (let i = 0; i < ranked.length; i += 1) {
    const id = ranked[i];
    if (id !== undefined && expected.has(id)) return 1 / (i + 1);
  }
  return 0;
}

async function loadCurated(): Promise<EvalSample[]> {
  const path = resolve(process.cwd(), "src/scripts/eval-retrieval.curated.json");
  const raw = await readFile(path, "utf8");
  const data = JSON.parse(raw) as Curated;
  return data.samples;
}

async function loadFromMysql(limit: number): Promise<EvalSample[]> {
  type Row = RowDataPacket & {
    user_id: string | null;
    user_prompt: string;
    matched_pattern_ids: unknown;
  };
  const [rows] = await dbQuery<Row[]>(
    getDb(),
    `SELECT user_id, user_prompt, matched_pattern_ids
       FROM ai_interactions
      WHERE matched_pattern_ids IS NOT NULL
        AND outcome IN ('deployed', 'validated')
        AND CHAR_LENGTH(user_prompt) > 8
      ORDER BY created_at DESC
      LIMIT ?`,
    [limit]
  );

  const samples: EvalSample[] = [];
  for (const row of rows) {
    const raw = row.matched_pattern_ids;
    let parsed: unknown = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
    }
    if (!Array.isArray(parsed)) continue;
    const expected = parsed
      .filter((v): v is string => typeof v === "string")
      .map(stripVersionSuffix);
    if (expected.length === 0) continue;
    samples.push({
      prompt: row.user_prompt,
      expected,
      user_id: row.user_id ?? undefined
    });
  }
  return samples;
}

async function evalKeyword(sample: EvalSample): Promise<SelectorResult> {
  const t0 = Date.now();
  try {
    const cards = selectPatternCards({
      prompt: sample.prompt,
      outputKind: "workflow_json",
      topN: 5
    });
    return {
      ranked: cards.map((s) => stripVersionSuffix(s.card.id)),
      latency_ms: Date.now() - t0,
      empty: cards.length === 0
    };
  } catch {
    return { ranked: [], latency_ms: Date.now() - t0, empty: true };
  }
}

async function evalHybrid(
  sample: EvalSample,
  tenantId: string
): Promise<SelectorResult> {
  const t0 = Date.now();
  try {
    // Use the sample's user_id when present (real historical case) so the
    // tenant-stamped breadcrumb embeddings come into scope too. Curated
    // samples fall through to the synthetic tenant id, which still gets
    // global pattern cards via the NULL-owner branch in searchEmbeddings.
    const result = await runHybridRetrieval({
      ownerUserId: sample.user_id ?? tenantId,
      queryText: sample.prompt,
      outputKind: "workflow_json",
      topK: 5
    });
    return {
      ranked: result.pattern_card_scores.map((s) => stripVersionSuffix(s.card.id)),
      latency_ms: Date.now() - t0,
      empty: result.pattern_card_scores.length === 0
    };
  } catch {
    return { ranked: [], latency_ms: Date.now() - t0, empty: true };
  }
}

function printPerSampleTable(rows: PerSampleEval[]): void {
  console.log("\n--- per-sample results ---");
  for (const r of rows) {
    console.log(`\nprompt: ${r.prompt_excerpt}`);
    console.log(`  expected:    ${r.expected.join(", ") || "(none)"}`);
    console.log(`  keyword[5]:  ${r.keyword.ranked.slice(0, 5).join(", ") || "(empty)"}   (${r.keyword.latency_ms}ms)`);
    console.log(`  hybrid[5]:   ${r.hybrid.ranked.slice(0, 5).join(", ") || "(empty)"}   (${r.hybrid.latency_ms}ms)`);
  }
}

function summarize(label: string, rows: PerSampleEval[]): void {
  if (rows.length === 0) {
    console.log(`\n${label}: no rows`);
    return;
  }
  let kw_p3 = 0, kw_p5 = 0, kw_r5 = 0, kw_mrr = 0, kw_empty = 0, kw_lat = 0;
  let hy_p3 = 0, hy_p5 = 0, hy_r5 = 0, hy_mrr = 0, hy_empty = 0, hy_lat = 0;
  let top1_agree = 0;
  let kw_only = 0, hy_only = 0;

  for (const r of rows) {
    const expected = new Set(r.expected);
    const k_p3 = precisionAt(3, r.keyword.ranked, expected);
    const k_p5 = precisionAt(5, r.keyword.ranked, expected);
    const k_r5 = recallAt(5, r.keyword.ranked, expected);
    const k_mrr = reciprocalRank(r.keyword.ranked, expected);
    const h_p3 = precisionAt(3, r.hybrid.ranked, expected);
    const h_p5 = precisionAt(5, r.hybrid.ranked, expected);
    const h_r5 = recallAt(5, r.hybrid.ranked, expected);
    const h_mrr = reciprocalRank(r.hybrid.ranked, expected);

    kw_p3 += k_p3; kw_p5 += k_p5; kw_r5 += k_r5; kw_mrr += k_mrr;
    hy_p3 += h_p3; hy_p5 += h_p5; hy_r5 += h_r5; hy_mrr += h_mrr;
    kw_lat += r.keyword.latency_ms; hy_lat += r.hybrid.latency_ms;
    if (r.keyword.empty) kw_empty += 1;
    if (r.hybrid.empty) hy_empty += 1;

    const k_top1 = r.keyword.ranked[0];
    const h_top1 = r.hybrid.ranked[0];
    if (k_top1 !== undefined && h_top1 !== undefined && k_top1 === h_top1) {
      top1_agree += 1;
    }

    // "Win": at least one of top-5 was correct
    const k_hit = k_p5 > 0;
    const h_hit = h_p5 > 0;
    if (k_hit && !h_hit) kw_only += 1;
    if (h_hit && !k_hit) hy_only += 1;
  }

  const n = rows.length;
  const div = (x: number) => x / n;

  console.log(`\n${label}  (n=${n})`);
  console.log("                  keyword       hybrid");
  console.log(`  P@3             ${div(kw_p3).toFixed(3)}        ${div(hy_p3).toFixed(3)}`);
  console.log(`  P@5             ${div(kw_p5).toFixed(3)}        ${div(hy_p5).toFixed(3)}`);
  console.log(`  R@5             ${div(kw_r5).toFixed(3)}        ${div(hy_r5).toFixed(3)}`);
  console.log(`  MRR             ${div(kw_mrr).toFixed(3)}        ${div(hy_mrr).toFixed(3)}`);
  console.log(`  empty_results   ${kw_empty}/${n}           ${hy_empty}/${n}`);
  console.log(`  avg_latency_ms  ${Math.round(div(kw_lat))}            ${Math.round(div(hy_lat))}`);
  console.log(`  top1_agreement  ${top1_agree}/${n}  (${(div(top1_agree) * 100).toFixed(1)}%)`);
  console.log(`  keyword_only_wins=${kw_only}   hybrid_only_wins=${hy_only}`);

  // Decision gates
  console.log("\n  -- rollout decision gates --");
  const g1 = div(hy_p3) >= div(kw_p3);
  const g2 = div(hy_r5) >= div(kw_r5) + 0.05;
  const g3 = hy_only >= kw_only;
  console.log(`  [${g1 ? "PASS" : "FAIL"}]  hybrid P@3 >= keyword P@3`);
  console.log(`  [${g2 ? "PASS" : "FAIL"}]  hybrid R@5 >= keyword R@5 + 0.05`);
  console.log(`  [${g3 ? "PASS" : "FAIL"}]  hybrid_only_wins >= keyword_only_wins`);
  console.log(`  ${g1 && g2 && g3 ? "OVERALL: PASS — safe to flip HYBRID_RETRIEVAL_ENABLED=true"
                                  : "OVERALL: FAIL — do not enable globally yet"}`);
}

async function main() {
  const args = new Map<string, string>();
  for (const a of process.argv.slice(2)) {
    const m = /^--([\w-]+)=(.+)$/.exec(a);
    if (m && m[1] !== undefined && m[2] !== undefined) args.set(m[1], m[2]);
  }
  const source = args.get("source") ?? "auto";
  const limit = Number.parseInt(args.get("limit") ?? "100", 10);
  const tenantId = args.get("tenant") ?? "00000000-0000-0000-0000-000000000001";

  if (!env.HYBRID_RETRIEVAL_ENABLED) {
    console.log(
      "NOTE: HYBRID_RETRIEVAL_ENABLED=false — hybrid path will fall back to keyword.\n" +
      "      Set HYBRID_RETRIEVAL_ENABLED=true in this shell ONLY for the eval run.\n"
    );
  }
  if (!env.POSTGRES_URL) {
    console.log("WARN: POSTGRES_URL not set — hybrid retrieval will fall back to keyword.\n");
  }

  let samples: EvalSample[] = [];
  if (source === "curated") {
    samples = await loadCurated();
    console.log(`[eval] loaded ${samples.length} curated samples`);
  } else if (source === "mysql") {
    samples = await loadFromMysql(limit);
    console.log(`[eval] loaded ${samples.length} samples from MySQL`);
  } else {
    // auto: prefer mysql, fall back if too few
    try {
      samples = await loadFromMysql(limit);
      console.log(`[eval] mysql returned ${samples.length} samples`);
      if (samples.length < 20) {
        console.log(`[eval] <20 mysql samples; appending curated set`);
        const curated = await loadCurated();
        samples = [...samples, ...curated];
      }
    } catch (err) {
      console.log(`[eval] mysql read failed (${(err as Error).message}); using curated only`);
      samples = await loadCurated();
    }
  }

  if (samples.length === 0) {
    console.error("[eval] no samples to evaluate. Aborting.");
    process.exit(2);
  }

  const results: PerSampleEval[] = [];
  for (const sample of samples) {
    const kw = await evalKeyword(sample);
    const hy = await evalHybrid(sample, tenantId);
    results.push({
      prompt_excerpt: sample.prompt.replace(/\s+/g, " ").slice(0, 120),
      expected: sample.expected,
      keyword: kw,
      hybrid: hy
    });
  }

  printPerSampleTable(results);
  summarize("AGGREGATE", results);

  // Clean shutdown so node exits.
  try {
    await closePgPool();
  } catch {
    // ignore
  }
  // The mysql pool keeps the process alive; close it explicitly.
  try {
    await getDb().end();
  } catch {
    // already ended
  }
}

main().catch((err) => {
  console.error("[eval] failed:", err);
  process.exit(1);
});
