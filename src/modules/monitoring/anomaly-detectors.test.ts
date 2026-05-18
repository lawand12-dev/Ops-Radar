import { describe, expect, it } from "bun:test";
import {
  detectContinueOnFail,
  detectZeroOutput,
  detectDurationAnomaly,
  evaluateScheduleDrift
} from "./anomaly-detectors";
import type { NodeTelemetry } from "./telemetry-extractor";

function nodeStat(overrides: Partial<NodeTelemetry> = {}): NodeTelemetry {
  return {
    node_name: "Test Node",
    node_type: "n8n-nodes-base.set",
    items_in: 1,
    items_out: 1,
    branch_index: 0,
    duration_ms: 100,
    had_error: false,
    continued_on_fail: false,
    ...overrides
  };
}

describe("detectContinueOnFail", () => {
  it("emits an anomaly per node with continued_on_fail=true", () => {
    const out = detectContinueOnFail({
      workflowId: "wf",
      executionId: "exec-1",
      telemetry: [
        nodeStat({ node_name: "A", continued_on_fail: true, had_error: true }),
        nodeStat({ node_name: "B" }),
        nodeStat({ node_name: "C", continued_on_fail: true, had_error: true, items_out: 0 })
      ]
    });
    expect(out).toHaveLength(2);
    expect(out.map((a) => a.node_name)).toEqual(["A", "C"]);
    expect(out[0]!.anomaly_type).toBe("continue_on_fail_swallowed");
    expect(out[0]!.severity).toBe("high");
  });

  it("emits nothing on a clean execution", () => {
    expect(
      detectContinueOnFail({
        workflowId: "wf",
        executionId: "exec",
        telemetry: [nodeStat()]
      })
    ).toEqual([]);
  });

  it("emits nothing when nodes erred but parent failed (the error itself is the signal)", () => {
    // continued_on_fail is FALSE on these nodes (the extractor sets it that way)
    expect(
      detectContinueOnFail({
        workflowId: "wf",
        executionId: "exec",
        telemetry: [nodeStat({ had_error: true, continued_on_fail: false })]
      })
    ).toEqual([]);
  });
});

describe("detectZeroOutput", () => {
  it("emits when current items_out=0 and baseline mean > threshold", () => {
    const out = detectZeroOutput({
      workflowId: "wf",
      executionId: "exec",
      telemetry: [nodeStat({ node_name: "Fetcher", items_out: 0 })],
      itemsOutMeanByNode: new Map([["Fetcher", 12.5]])
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.anomaly_score).toBe(12.5);
    expect(out[0]!.severity).toBe("medium");
  });

  it("skips when baseline is missing (first run scenario)", () => {
    expect(
      detectZeroOutput({
        workflowId: "wf",
        executionId: "exec",
        telemetry: [nodeStat({ items_out: 0 })],
        itemsOutMeanByNode: new Map()
      })
    ).toEqual([]);
  });

  it("skips when baseline is at-or-below the bursty-node threshold", () => {
    expect(
      detectZeroOutput({
        workflowId: "wf",
        executionId: "exec",
        telemetry: [nodeStat({ node_name: "Bursty", items_out: 0 })],
        itemsOutMeanByNode: new Map([["Bursty", 0.7]]),
        meanThreshold: 1
      })
    ).toEqual([]);
  });

  it("skips when the node itself errored (different signal owns this)", () => {
    expect(
      detectZeroOutput({
        workflowId: "wf",
        executionId: "exec",
        telemetry: [nodeStat({ items_out: 0, had_error: true })],
        itemsOutMeanByNode: new Map([["Test Node", 5]])
      })
    ).toEqual([]);
  });
});

describe("evaluateScheduleDrift", () => {
  it("stays healthy when within one interval of expected fire time", () => {
    const now = new Date("2026-05-10T12:00:30Z");
    const expected = new Date("2026-05-10T12:00:00Z");
    const out = evaluateScheduleDrift({
      workflowId: "wf",
      expectedNextRunAt: expected,
      lastSeenRunAt: new Date("2026-05-10T11:00:00Z"),
      expectedIntervalSeconds: 3600,
      now
    });
    expect(out.schedulerStatus).toBe("healthy");
    expect(out.anomaly).toBeNull();
  });

  it("flags drifting between 1 and 3 intervals overdue", () => {
    const now = new Date("2026-05-10T14:30:00Z");
    const expected = new Date("2026-05-10T12:00:00Z");
    const out = evaluateScheduleDrift({
      workflowId: "wf",
      expectedNextRunAt: expected,
      lastSeenRunAt: new Date("2026-05-10T11:00:00Z"),
      expectedIntervalSeconds: 3600,
      now
    });
    expect(out.schedulerStatus).toBe("drifting");
    expect(out.anomaly?.severity).toBe("medium");
    expect(out.anomaly?.anomaly_type).toBe("scheduler_drift");
  });

  it("flags stopped at >= 3 intervals overdue with critical severity", () => {
    const now = new Date("2026-05-10T15:30:00Z");
    const expected = new Date("2026-05-10T12:00:00Z");
    const out = evaluateScheduleDrift({
      workflowId: "wf",
      expectedNextRunAt: expected,
      lastSeenRunAt: new Date("2026-05-10T11:00:00Z"),
      expectedIntervalSeconds: 3600,
      now
    });
    expect(out.schedulerStatus).toBe("stopped");
    expect(out.anomaly?.severity).toBe("critical");
    expect(out.anomaly?.anomaly_score).toBeGreaterThanOrEqual(3);
  });
});

describe("detectDurationAnomaly", () => {
  const base = { workflowId: "wf", executionId: "exec" } as const;

  it("emits when |z| crosses threshold (slow execution)", () => {
    const out = detectDurationAnomaly({
      ...base,
      currentDurationMs: 5000,
      baselineMeanMs: 1000,
      baselineStddevMs: 200,
      baselineSampleSize: 20
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.metadata!.direction).toBe("slower");
    expect(out[0]!.anomaly_score).toBeGreaterThan(3);
  });

  it("emits when |z| crosses threshold (suspiciously fast execution)", () => {
    const out = detectDurationAnomaly({
      ...base,
      currentDurationMs: 50,
      baselineMeanMs: 1000,
      baselineStddevMs: 200,
      baselineSampleSize: 20
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.metadata!.direction).toBe("faster");
  });

  it("bails on tiny baselines (< 5 samples)", () => {
    expect(
      detectDurationAnomaly({
        ...base,
        currentDurationMs: 99999,
        baselineMeanMs: 1000,
        baselineStddevMs: 1,
        baselineSampleSize: 3
      })
    ).toEqual([]);
  });

  it("bails on zero stddev to avoid Infinity z-scores", () => {
    expect(
      detectDurationAnomaly({
        ...base,
        currentDurationMs: 99999,
        baselineMeanMs: 1000,
        baselineStddevMs: 0,
        baselineSampleSize: 20
      })
    ).toEqual([]);
  });

  it("bails when current duration is missing or non-positive", () => {
    expect(
      detectDurationAnomaly({
        ...base,
        currentDurationMs: null,
        baselineMeanMs: 1000,
        baselineStddevMs: 200,
        baselineSampleSize: 20
      })
    ).toEqual([]);
    expect(
      detectDurationAnomaly({
        ...base,
        currentDurationMs: 0,
        baselineMeanMs: 1000,
        baselineStddevMs: 200,
        baselineSampleSize: 20
      })
    ).toEqual([]);
  });

  it("does NOT emit when within threshold", () => {
    expect(
      detectDurationAnomaly({
        ...base,
        currentDurationMs: 1500, // z = 2.5 < 3
        baselineMeanMs: 1000,
        baselineStddevMs: 200,
        baselineSampleSize: 20
      })
    ).toEqual([]);
  });
});
