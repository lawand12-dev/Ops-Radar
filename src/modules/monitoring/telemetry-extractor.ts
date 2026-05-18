/**
 * Pure functions that turn n8n's `executionData.resultData.runData` blob into
 * structured per-node telemetry rows. The output shape matches
 * `execution_node_stats` columns 1:1 so the repository layer can do batched
 * INSERTs with no further transformation.
 *
 * Hard contract for the monitoring cycle:
 *   - NEVER THROW on malformed input. Return [] and log nothing — the calling
 *     site decides how to surface bad data. A thrown error here would crash
 *     the whole 5-minute cycle for one bad workflow.
 *   - NEVER reach beyond the runData blob into network or DB. These are pure
 *     functions to make them unit-testable against fixture data.
 *
 * What n8n gives us per node (best-effort schema, varies by version):
 *
 *   runData["NodeName"] = [
 *     {
 *       startTime: number,
 *       executionTime: number,                    // per-node ms
 *       executionStatus: "success" | "error",
 *       source: [[{ previousNode, previousNodeOutput }]],
 *       data: { main: [ [items...], [items...] ] }, // one array per output
 *       error: { ... }                            // present even when parent execution.status = success
 *     },
 *     ...                                          // multiple runs if the node looped
 *   ]
 *
 * What we emit per node (one row regardless of how many runs the node had,
 * aggregated):
 *
 *   {
 *     node_name, node_type, items_in, items_out, branch_index, duration_ms,
 *     had_error, continued_on_fail
 *   }
 *
 *  - items_in is the count of items routed INTO the node across all its runs.
 *    Looked up by walking each run's `source[*]` upstream into the previous
 *    node's matching output. If we cannot resolve cleanly we leave it null
 *    rather than risk a bogus number.
 *  - items_out is total items emitted across all runs and all outputs (sum).
 *  - branch_index is the index of the FIRST non-empty output across all runs.
 *    Used by the zero-output / branch-coverage detectors. Stored as a scalar
 *    column (not array) per the schema; callers needing the full coverage
 *    bitmap can derive it from items_out > 0 across multiple stat rows.
 *  - duration_ms is summed executionTime across runs (closer to the wall-clock
 *    cost of that node than max).
 *  - had_error is OR-aggregated across runs.
 *  - continued_on_fail = had_error AND parent execution status was success.
 *    This is the exact signal the continue-on-fail anomaly detector reads.
 */

export interface NodeTelemetry {
  node_name: string;
  node_type: string | null;
  items_in: number | null;
  items_out: number | null;
  branch_index: number | null;
  duration_ms: number | null;
  had_error: boolean;
  continued_on_fail: boolean;
}

export interface TelemetryExtractInput {
  /** Whatever n8n returned for the execution. We accept `unknown` because the
   *  shape drifts between n8n versions and we never trust it without checks. */
  executionDetail: unknown;
  /** The execution's overall status as n8n classified it. Needed to derive
   *  `continued_on_fail` (a node with an error inside an execution n8n called
   *  successful is the canonical continue-on-fail silent failure). */
  parentExecutionStatus: string;
  /** The workflow's static node list, indexed by name. We use it only to fill
   *  in `node_type` (which n8n omits from runData entries). Optional — we
   *  still emit telemetry without it; node_type just becomes null. */
  workflowNodesByName?: Map<string, { type?: string | null }>;
}

interface RunEntry {
  startTime?: unknown;
  executionTime?: unknown;
  executionStatus?: unknown;
  source?: unknown;
  data?: unknown;
  error?: unknown;
}

const NUMERIC_FIELDS = new Set(["startTime", "executionTime"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickRunData(executionDetail: unknown): Record<string, unknown> | null {
  if (!isPlainObject(executionDetail)) return null;
  // n8n returns runData under either `resultData` (newer) or
  // `data.resultData` (older paths). Tolerate both.
  const direct = isPlainObject(executionDetail.resultData)
    ? (executionDetail.resultData as Record<string, unknown>)
    : null;
  const nested =
    !direct && isPlainObject(executionDetail.data) && isPlainObject(executionDetail.data.resultData)
      ? (executionDetail.data.resultData as Record<string, unknown>)
      : null;
  const resultData = direct ?? nested;
  if (!resultData) return null;
  if (!isPlainObject(resultData.runData)) return null;
  return resultData.runData as Record<string, unknown>;
}

function asRunArray(value: unknown): RunEntry[] {
  if (!Array.isArray(value)) return [];
  // Skip non-object entries silently rather than refuse the whole node.
  return value.filter((entry): entry is RunEntry => isPlainObject(entry));
}

/**
 * Sum items across all outputs of `run.data.main`. Returns null when the
 * shape is missing or malformed (vs 0, which means "the node ran and produced
 * nothing" — the latter is the actual zero-output signal).
 */
function countOutputItems(run: RunEntry): { total: number | null; firstNonEmptyOutput: number | null } {
  if (!isPlainObject(run.data)) return { total: null, firstNonEmptyOutput: null };
  const main = (run.data as Record<string, unknown>).main;
  if (!Array.isArray(main)) return { total: null, firstNonEmptyOutput: null };

  let total = 0;
  let firstNonEmptyOutput: number | null = null;
  for (let i = 0; i < main.length; i++) {
    const branch = main[i];
    if (!Array.isArray(branch)) continue;
    total += branch.length;
    if (firstNonEmptyOutput === null && branch.length > 0) {
      firstNonEmptyOutput = i;
    }
  }
  return { total, firstNonEmptyOutput };
}

/**
 * Resolve `items_in` for a single run by walking each `source[*]` entry into
 * the upstream node's matching output and counting items there. n8n's source
 * shape is `[[{ previousNode, previousNodeOutput }]]` — an outer array per
 * input slot, an inner array per parallel connection on that slot. We sum
 * across all of them. Returns null if any required pointer is missing so
 * downstream detectors don't act on a half-derived number.
 */
function resolveRunItemsIn(
  run: RunEntry,
  runDataByNode: Record<string, unknown>
): number | null {
  if (!Array.isArray(run.source)) return null;
  let total = 0;
  let resolvedAny = false;

  for (const slot of run.source) {
    if (!Array.isArray(slot)) continue;
    for (const conn of slot) {
      if (!isPlainObject(conn)) continue;
      const prevNode = typeof conn.previousNode === "string" ? conn.previousNode : null;
      const prevOutput =
        typeof conn.previousNodeOutput === "number" && Number.isInteger(conn.previousNodeOutput)
          ? conn.previousNodeOutput
          : 0;
      if (!prevNode) continue;

      const prevRuns = asRunArray(runDataByNode[prevNode]);
      // We do not know which exact run of the upstream node fed this one when
      // there are multiple. Sum across all upstream runs — over-counts loops
      // but is consistent and never silently zero.
      for (const prevRun of prevRuns) {
        if (!isPlainObject(prevRun.data)) continue;
        const prevMain = (prevRun.data as Record<string, unknown>).main;
        if (!Array.isArray(prevMain)) continue;
        const out = prevMain[prevOutput];
        if (!Array.isArray(out)) continue;
        total += out.length;
        resolvedAny = true;
      }
    }
  }

  return resolvedAny ? total : null;
}

/**
 * Main entry point. Walks runData and produces one row per node. Always
 * returns an array (never throws) — empty when there is no runData to mine.
 */
export function extractNodeTelemetry(input: TelemetryExtractInput): NodeTelemetry[] {
  let runData: Record<string, unknown> | null = null;
  try {
    runData = pickRunData(input.executionDetail);
  } catch {
    runData = null;
  }
  if (!runData) return [];

  const parentStatusLower = String(input.parentExecutionStatus || "").toLowerCase();
  const parentSucceeded = parentStatusLower === "success" || parentStatusLower === "succeeded";
  const nodesByName = input.workflowNodesByName ?? new Map();

  const out: NodeTelemetry[] = [];

  for (const [nodeName, rawRuns] of Object.entries(runData)) {
    if (typeof nodeName !== "string" || nodeName.length === 0) continue;

    const runs = asRunArray(rawRuns);
    if (runs.length === 0) continue;

    let totalOut: number | null = null;
    let firstNonEmptyOutput: number | null = null;
    let totalIn: number | null = null;
    let durationSum: number | null = null;
    let hadError = false;

    for (const run of runs) {
      const { total, firstNonEmptyOutput: firstIdx } = countOutputItems(run);
      if (total !== null) {
        totalOut = (totalOut ?? 0) + total;
      }
      if (firstNonEmptyOutput === null && firstIdx !== null) {
        firstNonEmptyOutput = firstIdx;
      }

      const itemsIn = resolveRunItemsIn(run, runData);
      if (itemsIn !== null) {
        totalIn = (totalIn ?? 0) + itemsIn;
      }

      const dur = toFiniteNumber(run.executionTime);
      if (dur !== null) {
        durationSum = (durationSum ?? 0) + dur;
      }

      if (run.error !== undefined && run.error !== null) {
        hadError = true;
      } else if (typeof run.executionStatus === "string" && run.executionStatus.toLowerCase() === "error") {
        hadError = true;
      }
    }

    const nodeMeta = nodesByName.get(nodeName);
    out.push({
      node_name: nodeName,
      node_type: nodeMeta?.type ?? null,
      items_in: totalIn,
      items_out: totalOut,
      branch_index: firstNonEmptyOutput,
      duration_ms: durationSum === null ? null : Math.round(durationSum),
      had_error: hadError,
      continued_on_fail: hadError && parentSucceeded
    });
  }

  return out;
}

// Re-export the numeric field list for tests that want to assert we are not
// accidentally treating other fields as numeric (regression guard).
export const TELEMETRY_NUMERIC_FIELDS_FOR_TEST = NUMERIC_FIELDS;
