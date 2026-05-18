import { describe, expect, it } from "bun:test";
import { extractNodeTelemetry, type NodeTelemetry } from "./telemetry-extractor";

/**
 * The extractor is on the hot path of the monitoring cycle. Every test below
 * exercises an input that would naturally crash a naive parser. The acceptance
 * criterion is "returns an array, never throws" — wrapped here as not-throwing
 * + a structural assertion on the resulting rows.
 */

function makeDetail(runData: unknown, extra: Record<string, unknown> = {}): unknown {
  return { resultData: { runData }, ...extra };
}

describe("extractNodeTelemetry — malformed input safety", () => {
  it("returns [] when executionDetail is null/undefined/primitive", () => {
    expect(extractNodeTelemetry({ executionDetail: null, parentExecutionStatus: "success" })).toEqual([]);
    expect(extractNodeTelemetry({ executionDetail: undefined, parentExecutionStatus: "success" })).toEqual([]);
    expect(extractNodeTelemetry({ executionDetail: 42, parentExecutionStatus: "success" })).toEqual([]);
    expect(extractNodeTelemetry({ executionDetail: "string", parentExecutionStatus: "success" })).toEqual([]);
  });

  it("returns [] when resultData missing or runData missing", () => {
    expect(extractNodeTelemetry({ executionDetail: { resultData: null }, parentExecutionStatus: "success" })).toEqual([]);
    expect(extractNodeTelemetry({ executionDetail: { resultData: { runData: "not an object" } }, parentExecutionStatus: "success" })).toEqual([]);
  });

  it("tolerates nested data.resultData wrapper from older n8n shapes", () => {
    const detail = { data: { resultData: { runData: { N: [{ data: { main: [[{}, {}]] } }] } } } };
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out).toHaveLength(1);
    expect(out[0]!.items_out).toBe(2);
  });

  it("skips node entries that are not arrays without crashing", () => {
    const detail = makeDetail({ Good: [{ data: { main: [[{}]] } }], Bad: "string", Worse: 42 });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out.map((n) => n.node_name)).toEqual(["Good"]);
  });

  it("skips non-object run entries within a node array", () => {
    const detail = makeDetail({ N: [null, 42, { data: { main: [[{}, {}]] } }, "x"] });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out).toHaveLength(1);
    expect(out[0]!.items_out).toBe(2);
  });

  it("returns items_out=null (not 0) when data.main is missing or malformed", () => {
    const detail = makeDetail({ N: [{ error: { message: "boom" } }] });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "error" });
    expect(out).toHaveLength(1);
    expect(out[0]!.items_out).toBeNull();
    expect(out[0]!.had_error).toBe(true);
  });
});

describe("extractNodeTelemetry — item counting", () => {
  it("sums items across multiple outputs (branch fan-out)", () => {
    const detail = makeDetail({
      Splitter: [{ data: { main: [[{}, {}, {}], [{}], []] } }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.items_out).toBe(4); // 3 + 1 + 0
    expect(out[0]!.branch_index).toBe(0); // first non-empty output
  });

  it("captures branch_index of the first non-empty output", () => {
    const detail = makeDetail({
      Switch: [{ data: { main: [[], [], [{}, {}]] } }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.items_out).toBe(2);
    expect(out[0]!.branch_index).toBe(2);
  });

  it("sums items across multiple runs of the same node (looped)", () => {
    const detail = makeDetail({
      Loop: [
        { data: { main: [[{}, {}]] } },
        { data: { main: [[{}, {}, {}]] } }
      ]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.items_out).toBe(5);
  });

  it("returns items_in=null when source is missing", () => {
    const detail = makeDetail({ Orphan: [{ data: { main: [[{}]] } }] });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.items_in).toBeNull();
  });

  it("resolves items_in by walking source into upstream runData", () => {
    const detail = makeDetail({
      Upstream: [{ data: { main: [[{}, {}, {}]] } }],
      Downstream: [{
        source: [[{ previousNode: "Upstream", previousNodeOutput: 0 }]],
        data: { main: [[{}]] }
      }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    const downstream = out.find((n) => n.node_name === "Downstream")!;
    expect(downstream.items_in).toBe(3);
    expect(downstream.items_out).toBe(1);
  });
});

describe("extractNodeTelemetry — continue-on-fail detection", () => {
  it("flags continued_on_fail when node errored but parent execution succeeded", () => {
    const detail = makeDetail({
      Bad: [{ error: { message: "Forbidden" }, data: { main: [[]] } }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.had_error).toBe(true);
    expect(out[0]!.continued_on_fail).toBe(true);
  });

  it("does NOT flag continued_on_fail when execution itself failed", () => {
    const detail = makeDetail({
      Bad: [{ error: { message: "Forbidden" }, data: { main: [[]] } }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "error" });
    expect(out[0]!.had_error).toBe(true);
    expect(out[0]!.continued_on_fail).toBe(false);
  });

  it("also catches errors signalled via executionStatus string", () => {
    const detail = makeDetail({
      Bad: [{ executionStatus: "error", data: { main: [[]] } }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.continued_on_fail).toBe(true);
  });

  it("OR-aggregates across multiple runs (one bad run is enough)", () => {
    const detail = makeDetail({
      Mixed: [
        { data: { main: [[{}]] } },
        { error: { message: "x" }, data: { main: [[]] } }
      ]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.had_error).toBe(true);
    expect(out[0]!.continued_on_fail).toBe(true);
  });
});

describe("extractNodeTelemetry — duration aggregation + node_type lookup", () => {
  it("sums executionTime across runs and rounds to integer ms", () => {
    const detail = makeDetail({
      N: [
        { executionTime: 120.4, data: { main: [[]] } },
        { executionTime: 80.1, data: { main: [[]] } }
      ]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.duration_ms).toBe(201);
  });

  it("returns duration_ms=null when no run reports executionTime", () => {
    const detail = makeDetail({ N: [{ data: { main: [[]] } }] });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.duration_ms).toBeNull();
  });

  it("fills node_type from workflowNodesByName when provided", () => {
    const detail = makeDetail({ "Send Telegram": [{ data: { main: [[]] } }] });
    const map = new Map([["Send Telegram", { type: "n8n-nodes-base.telegram" }]]);
    const out = extractNodeTelemetry({
      executionDetail: detail,
      parentExecutionStatus: "success",
      workflowNodesByName: map
    });
    expect(out[0]!.node_type).toBe("n8n-nodes-base.telegram");
  });

  it("leaves node_type=null when the static lookup is missing", () => {
    const detail = makeDetail({ Unknown: [{ data: { main: [[]] } }] });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out[0]!.node_type).toBeNull();
  });
});

describe("extractNodeTelemetry — output shape contract", () => {
  it("emits exactly one row per node regardless of run count", () => {
    const detail = makeDetail({
      A: [{ data: { main: [[]] } }, { data: { main: [[]] } }, { data: { main: [[]] } }],
      B: [{ data: { main: [[]] } }]
    });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    expect(out).toHaveLength(2);
    const names = out.map((n) => n.node_name).sort();
    expect(names).toEqual(["A", "B"]);
  });

  it("every row has the expected column set (defense against schema drift)", () => {
    const detail = makeDetail({ N: [{ data: { main: [[{}]] } }] });
    const out = extractNodeTelemetry({ executionDetail: detail, parentExecutionStatus: "success" });
    const expectedKeys: (keyof NodeTelemetry)[] = [
      "node_name", "node_type", "items_in", "items_out",
      "branch_index", "duration_ms", "had_error", "continued_on_fail"
    ];
    for (const key of expectedKeys) {
      expect(out[0]).toHaveProperty(key);
    }
  });
});
