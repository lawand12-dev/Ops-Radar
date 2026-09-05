import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOperations } from "<npm>/lib/open-core/evaluate";
import type { OperationsDataset } from "<npm>/lib/open-core/types";

const baseDataset: OperationsDataset = {
  asOf: "2026-08-23",
  currency: "USD",
  clients: [{ id: "client-1", name: "Northstar Consulting" }],
  projects: [
    {
      id: "project-1",
      clientId: "client-1",
      name: "Expansion engagement",
      contractedRevenue: 10_000,
      budgetHours: 100,
    },
  ],
  timeEntries: [
    {
      id: "time-1",
      projectId: "project-1",
      date: "2026-08-01",
      hours: 105,
      internalCost: 8_500,
    },
  ],
  invoices: [
    {
      id: "invoice-1",
      clientId: "client-1",
      reference: "INV-101",
      amount: 2_500,
      dueDate: "2026-07-01",
      status: "overdue",
    },
  ],
};

test("reports transparent client-service risks from valid data", () => {
  const result = evaluateOperations(baseDataset);

  assert.deepEqual(
    result.risks.map((risk) => risk.rule).sort(),
    ["budget-burn", "low-delivery-margin", "overdue-receivable", "unbilled-work"],
  );
  assert.equal(result.metrics.trackedHours, 105);
  assert.equal(result.metrics.unbilledHours, 105);
  assert.equal(result.metrics.overdueReceivables, 2_500);
  assert.equal(result.metrics.estimatedDeliveryMarginPercent, 15);
  assert.equal(result.skippedRecords.length, 0);
});

test("skips malformed relationships instead of treating them as operational truth", () => {
  const result = evaluateOperations({
    ...baseDataset,
    timeEntries: [
      ...baseDataset.timeEntries,
      { id: "missing-project", projectId: "project-missing", date: "2026-08-01", hours: 3 },
      { id: "future-entry", projectId: "project-1", date: "2026-08-24", hours: 3 },
    ],
  });

  assert.deepEqual(result.skippedRecords, [
    "time entry missing-project: unknown project project-missing",
    "time entry future-entry: future date 2026-08-24",
  ]);
  assert.equal(result.metrics.trackedHours, 105);
});

test("rejects contradictory policy thresholds", () => {
  assert.throws(
    () => evaluateOperations(baseDataset, { budgetWarningPercent: 90, budgetCriticalPercent: 80 }),
    /budgetCriticalPercent/,
  );
});
