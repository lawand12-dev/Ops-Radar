import type {
  OperationsDataset,
  OperationsEvaluation,
  OperationsPolicies,
  OperationsRisk,
  RiskSeverity,
  ServiceTimeEntry,
} from "<npm>/lib/open-core/types";

const DEFAULT_POLICIES: Required<OperationsPolicies> = {
  unbilledWorkAgeDays: 14,
  budgetWarningPercent: 80,
  budgetCriticalPercent: 100,
  targetDeliveryMarginPercent: 35,
  criticalDeliveryMarginPercent: 20,
  criticalOverdueDays: 30,
};

function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  const [year, month, day] = value.split("-").map(Number);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function wholeDaysBetween(olderDate: string, newerDate: string): number | null {
  const older = calendarDate(olderDate);
  const newer = calendarDate(newerDate);
  if (!older || !newer) return null;
  return Math.floor((newer.valueOf() - older.valueOf()) / 86_400_000);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function amount(value: number): number {
  return Math.round(value * 100) / 100;
}

function percent(value: number): number {
  return Math.round(value * 10) / 10;
}

function riskPriority(severity: RiskSeverity): number {
  return severity === "critical" ? 0 : 1;
}

function riskId(rule: OperationsRisk["rule"], entityId: string): string {
  return `${rule}:${entityId}`;
}

function resolvePolicies(overrides: OperationsPolicies): Required<OperationsPolicies> {
  const policies = { ...DEFAULT_POLICIES, ...overrides };
  const positiveIntegers = [
    ["unbilledWorkAgeDays", policies.unbilledWorkAgeDays],
    ["criticalOverdueDays", policies.criticalOverdueDays],
  ] as const;
  for (const [name, value] of positiveIntegers) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive integer`);
    }
  }
  const percentages = [
    ["budgetWarningPercent", policies.budgetWarningPercent],
    ["budgetCriticalPercent", policies.budgetCriticalPercent],
    ["targetDeliveryMarginPercent", policies.targetDeliveryMarginPercent],
    ["criticalDeliveryMarginPercent", policies.criticalDeliveryMarginPercent],
  ] as const;
  for (const [name, value] of percentages) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`${name} must be between 0 and 100`);
    }
  }
  if (policies.budgetCriticalPercent < policies.budgetWarningPercent) {
    throw new Error("budgetCriticalPercent must be greater than or equal to budgetWarningPercent");
  }
  if (policies.criticalDeliveryMarginPercent > policies.targetDeliveryMarginPercent) {
    throw new Error("criticalDeliveryMarginPercent must be less than or equal to targetDeliveryMarginPercent");
  }
  return policies;
}

export function evaluateOperations(
  dataset: OperationsDataset,
  policyOverrides: OperationsPolicies = {},
): OperationsEvaluation {
  const policies = resolvePolicies(policyOverrides);
  const skippedRecords: string[] = [];
  const asOf = calendarDate(dataset.asOf);

  if (!asOf) {
    throw new Error("dataset.asOf must be an ISO calendar date in YYYY-MM-DD format");
  }

  const clients = new Map(dataset.clients.map((client) => [client.id, client]));
  const projects = new Map<string, (typeof dataset.projects)[number]>();
  for (const project of dataset.projects) {
    if (!clients.has(project.clientId)) {
      skippedRecords.push(`project ${project.id}: unknown client ${project.clientId}`);
      continue;
    }
    projects.set(project.id, project);
  }
  const timeEntriesByProject = new Map<string, ServiceTimeEntry[]>();

  for (const entry of dataset.timeEntries) {
    if (!projects.has(entry.projectId)) {
      skippedRecords.push(`time entry ${entry.id}: unknown project ${entry.projectId}`);
      continue;
    }
    if (!Number.isFinite(entry.hours) || entry.hours <= 0) {
      skippedRecords.push(`time entry ${entry.id}: hours must be a positive number`);
      continue;
    }
    if (!calendarDate(entry.date)) {
      skippedRecords.push(`time entry ${entry.id}: invalid date ${entry.date}`);
      continue;
    }
    const entryAgeDays = wholeDaysBetween(entry.date, dataset.asOf);
    if (entryAgeDays !== null && entryAgeDays < 0) {
      skippedRecords.push(`time entry ${entry.id}: future date ${entry.date}`);
      continue;
    }
    const entries = timeEntriesByProject.get(entry.projectId) ?? [];
    entries.push(entry);
    timeEntriesByProject.set(entry.projectId, entries);
  }

  const risks: OperationsRisk[] = [];
  let overdueReceivables = 0;

  for (const invoice of dataset.invoices) {
    if (invoice.status !== "sent" && invoice.status !== "overdue") continue;
    if (!clients.has(invoice.clientId)) {
      skippedRecords.push(`invoice ${invoice.id}: unknown client ${invoice.clientId}`);
      continue;
    }
    if (!Number.isFinite(invoice.amount) || invoice.amount < 0) {
      skippedRecords.push(`invoice ${invoice.id}: amount must be a non-negative number`);
      continue;
    }
    const daysOverdue = wholeDaysBetween(invoice.dueDate, dataset.asOf);
    if (daysOverdue === null) {
      skippedRecords.push(`invoice ${invoice.id}: invalid due date ${invoice.dueDate}`);
      continue;
    }
    if (daysOverdue <= 0) continue;

    overdueReceivables += invoice.amount;
    const client = clients.get(invoice.clientId);
    const severity: RiskSeverity =
      daysOverdue >= policies.criticalOverdueDays ? "critical" : "warning";
    risks.push({
      id: riskId("overdue-receivable", invoice.id),
      rule: "overdue-receivable",
      severity,
      title: `${invoice.reference} is overdue`,
      summary: `${client?.name ?? "This client"} has an unpaid invoice ${daysOverdue} days past its due date.`,
      recommendedAction: "Verify the invoice status and send a payment follow-up with the original payment terms.",
      entity: { type: "invoice", id: invoice.id, name: invoice.reference },
      evidence: [
        { label: "Invoice amount", value: amount(invoice.amount), unit: "amount" },
        { label: "Days overdue", value: daysOverdue, unit: "days" },
      ],
    });
  }

  let unbilledHours = 0;
  for (const project of projects.values()) {
    const entries = timeEntriesByProject.get(project.id) ?? [];
    const eligibleEntries = entries.filter((entry) => {
      const age = wholeDaysBetween(entry.date, dataset.asOf);
      return entry.billable !== false && entry.invoiced !== true && age !== null && age >= policies.unbilledWorkAgeDays;
    });
    const unbilledProjectHours = sum(eligibleEntries.map((entry) => entry.hours));
    unbilledHours += unbilledProjectHours;
    if (unbilledProjectHours === 0) continue;

    risks.push({
      id: riskId("unbilled-work", project.id),
      rule: "unbilled-work",
      severity: unbilledProjectHours >= 40 ? "critical" : "warning",
      title: `${amount(unbilledProjectHours)} billable hours are not marked invoiced`,
      summary: `${project.name} contains billable work at least ${policies.unbilledWorkAgeDays} days old that has not been marked as invoiced.`,
      recommendedAction: "Confirm the work belongs on an invoice, then bill it or explicitly mark it as non-billable.",
      entity: { type: "project", id: project.id, name: project.name },
      evidence: [
        { label: "Unbilled billable hours", value: amount(unbilledProjectHours), unit: "hours" },
        { label: "Minimum work age", value: policies.unbilledWorkAgeDays, unit: "days" },
      ],
    });
  }

  for (const project of projects.values()) {
    const entries = timeEntriesByProject.get(project.id) ?? [];
    const trackedHours = sum(entries.map((entry) => entry.hours));

    if (project.budgetHours && project.budgetHours > 0) {
      const budgetBurnPercent = (trackedHours / project.budgetHours) * 100;
      if (budgetBurnPercent >= policies.budgetWarningPercent) {
        risks.push({
          id: riskId("budget-burn", project.id),
          rule: "budget-burn",
          severity: budgetBurnPercent >= policies.budgetCriticalPercent ? "critical" : "warning",
          title: `${percent(budgetBurnPercent)}% of the project hour budget is used`,
          summary: `${project.name} has ${amount(trackedHours)} tracked hours against a ${amount(project.budgetHours)}-hour budget.`,
          recommendedAction: "Review remaining scope, delivery milestones, and whether a change order or reprioritization is needed.",
          entity: { type: "project", id: project.id, name: project.name },
          evidence: [
            { label: "Tracked hours", value: amount(trackedHours), unit: "hours" },
            { label: "Budget hours", value: amount(project.budgetHours), unit: "hours" },
            { label: "Budget burn", value: percent(budgetBurnPercent), unit: "percent" },
          ],
        });
      }
    }

    if (project.contractedRevenue && project.contractedRevenue > 0) {
      const knownCost = sum(
        entries
          .map((entry) => entry.internalCost)
          .filter((cost): cost is number => typeof cost === "number" && Number.isFinite(cost) && cost >= 0),
      );
      const hasCompleteCostData =
        entries.length > 0 &&
        entries.every(
          (entry) => typeof entry.internalCost === "number" && Number.isFinite(entry.internalCost) && entry.internalCost >= 0,
        );
      if (!hasCompleteCostData) continue;

      const deliveryMarginPercent = ((project.contractedRevenue - knownCost) / project.contractedRevenue) * 100;
      if (deliveryMarginPercent < policies.targetDeliveryMarginPercent) {
        risks.push({
          id: riskId("low-delivery-margin", project.id),
          rule: "low-delivery-margin",
          severity:
            deliveryMarginPercent < policies.criticalDeliveryMarginPercent ? "critical" : "warning",
          title: `Estimated delivery margin is ${percent(deliveryMarginPercent)}%`,
          summary: `${project.name} has ${amount(knownCost)} of known delivery cost against ${amount(project.contractedRevenue)} contracted revenue.`,
          recommendedAction: "Validate the cost data, then reduce delivery cost, change scope, or revisit pricing before more work is committed.",
          entity: { type: "project", id: project.id, name: project.name },
          evidence: [
            { label: "Contracted revenue", value: amount(project.contractedRevenue), unit: "amount" },
            { label: "Known delivery cost", value: amount(knownCost), unit: "amount" },
            { label: "Estimated delivery margin", value: percent(deliveryMarginPercent), unit: "percent" },
          ],
        });
      }
    }
  }

  const trackedHours = sum([...timeEntriesByProject.values()].flat().map((entry) => entry.hours));
  const contractedRevenue = sum(
    [...projects.values()]
      .map((project) => project.contractedRevenue)
      .filter((revenue): revenue is number => typeof revenue === "number" && Number.isFinite(revenue) && revenue >= 0),
  );
  const knownDeliveryCost = sum(
    [...timeEntriesByProject.values()]
      .flat()
      .map((entry) => entry.internalCost)
      .filter((cost): cost is number => typeof cost === "number" && Number.isFinite(cost) && cost >= 0),
  );

  risks.sort((first, second) => {
    const severityDifference = riskPriority(first.severity) - riskPriority(second.severity);
    return severityDifference !== 0 ? severityDifference : first.title.localeCompare(second.title);
  });

  const revenueProjects = [...projects.values()].filter(
    (project) => typeof project.contractedRevenue === "number" && project.contractedRevenue > 0,
  );
  const marginProjectEntries = revenueProjects.map((project) => timeEntriesByProject.get(project.id) ?? []);
  const hasCompleteMarginCostData =
    marginProjectEntries.length > 0 &&
    marginProjectEntries.every(
      (entries) =>
        entries.length > 0 &&
        entries.every(
          (entry) => typeof entry.internalCost === "number" && Number.isFinite(entry.internalCost) && entry.internalCost >= 0,
        ),
    );
  const marginProjectCost = sum(
    marginProjectEntries
      .flat()
      .map((entry) => entry.internalCost)
      .filter((cost): cost is number => typeof cost === "number" && Number.isFinite(cost) && cost >= 0),
  );

  return {
    currency: dataset.currency,
    evaluatedAt: dataset.asOf,
    metrics: {
      trackedHours: amount(trackedHours),
      unbilledHours: amount(unbilledHours),
      overdueReceivables: amount(overdueReceivables),
      contractedRevenue: amount(contractedRevenue),
      knownDeliveryCost: amount(knownDeliveryCost),
      estimatedDeliveryMarginPercent:
        contractedRevenue > 0 && hasCompleteMarginCostData
          ? percent(((contractedRevenue - marginProjectCost) / contractedRevenue) * 100)
          : null,
    },
    risks,
    skippedRecords,
  };
}
