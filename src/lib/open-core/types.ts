/**
 * Portable input model for the OpsRadar open core.
 *
 * Amounts must use one currency per dataset. The core deliberately does not
 * perform currency conversion or infer revenue/cost values it cannot prove.
 */

export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid" | "void";

export type ProjectStatus = "active" | "completed" | "on_hold" | "cancelled";

export interface ServiceClient {
  id: string;
  name: string;
}

export interface ServiceProject {
  id: string;
  clientId: string;
  name: string;
  status?: ProjectStatus;
  /** Fixed or expected delivery revenue, excluding tax. */
  contractedRevenue?: number;
  /** Expected delivery effort. */
  budgetHours?: number;
}

export interface ServiceTimeEntry {
  id: string;
  projectId: string;
  /** ISO calendar date (`YYYY-MM-DD`). */
  date: string;
  hours: number;
  /** Defaults to true when omitted. */
  billable?: boolean;
  /** Set to true only once the work has been included in an invoice. */
  invoiced?: boolean;
  /** Direct internal cost for this entry, in the dataset currency. */
  internalCost?: number;
}

export interface ServiceInvoice {
  id: string;
  clientId: string;
  reference: string;
  amount: number;
  /** ISO calendar date (`YYYY-MM-DD`). */
  dueDate: string;
  status: InvoiceStatus;
}

export interface OperationsDataset {
  /** The evaluation date, represented as `YYYY-MM-DD` to avoid timezone surprises. */
  asOf: string;
  currency: string;
  clients: ServiceClient[];
  projects: ServiceProject[];
  timeEntries: ServiceTimeEntry[];
  invoices: ServiceInvoice[];
}

export interface OperationsPolicies {
  /** Default: 14 days. */
  unbilledWorkAgeDays?: number;
  /** Default: 80%. */
  budgetWarningPercent?: number;
  /** Default: 100%. */
  budgetCriticalPercent?: number;
  /** Default: 35%. */
  targetDeliveryMarginPercent?: number;
  /** Default: 20%. */
  criticalDeliveryMarginPercent?: number;
  /** Default: 30 days. */
  criticalOverdueDays?: number;
}

export type RiskSeverity = "critical" | "warning";

export type OperationsRuleId =
  | "overdue-receivable"
  | "unbilled-work"
  | "budget-burn"
  | "low-delivery-margin";

export interface RiskEvidence {
  label: string;
  value: number | string;
  unit?: "amount" | "hours" | "percent" | "days";
}

export interface OperationsRisk {
  id: string;
  rule: OperationsRuleId;
  severity: RiskSeverity;
  title: string;
  summary: string;
  recommendedAction: string;
  entity: {
    type: "client" | "project" | "invoice";
    id: string;
    name: string;
  };
  evidence: RiskEvidence[];
}

export interface OperationsMetrics {
  trackedHours: number;
  unbilledHours: number;
  overdueReceivables: number;
  contractedRevenue: number;
  knownDeliveryCost: number;
  estimatedDeliveryMarginPercent: number | null;
}

export interface OperationsEvaluation {
  currency: string;
  evaluatedAt: string;
  metrics: OperationsMetrics;
  risks: OperationsRisk[];
  /** Input records ignored because they were malformed or could not be matched. */
  skippedRecords: string[];
}
