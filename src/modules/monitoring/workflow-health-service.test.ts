import { describe, expect, it } from "bun:test";
import {
  getMonitoringSchedulerState,
  withMonitoringCycleLock
} from "./workflow-health-service";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("monitoring scheduler lock", () => {
  it("prevents overlapping cycles", async () => {
    const first = withMonitoringCycleLock(async () => {
      await sleep(80);
      return "first";
    });

    await sleep(10);
    const second = await withMonitoringCycleLock(async () => "second");
    const firstResult = await first;

    expect(second.skipped).toBe(true);
    expect(second.result).toBeNull();
    expect(firstResult.skipped).toBe(false);
    expect(firstResult.result).toBe("first");

    const state = getMonitoringSchedulerState();
    expect(state.running).toBe(false);
  });
});
