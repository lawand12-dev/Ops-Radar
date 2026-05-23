import { withTransaction } from "../../lib/db";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import { redactSecrets } from "../../lib/redact";
import { getRequestContext } from "../../lib/request-context";
import { fixRejectedWorkflow } from "../ai/ai-service";
import { listMessagesByProjectId } from "../chat/chat-repository";
import { createWorkflowEvent, listRecentEventsByWorkflowId } from "../events/event-repository";
import {
  activateN8nWorkflow,
  createN8nWorkflow,
  deactivateN8nWorkflow,
  deleteN8nWorkflow,
  getN8nWorkflowById,
  listN8nCredentials,
  type N8nCredentialSummary,
  updateN8nWorkflow
} from "../n8n/n8n-client";
import {
  getCredentialPolicy,
  type CredentialField,
  type CredentialProvisioningMode
} from "../n8n/credential-policy";
import {
  deleteProjectById,
  getProjectById,
  getProjectByIdForUser,
  listProjects,
  listProjectsForUser,
  updateProjectStatus
} from "./project-repository";
import { summarizeSchedule, nextExpectedRunAt } from "../monitoring/schedule-parser";
import {
  upsertScheduleTracking,
  deleteScheduleTracking
} from "../monitoring/workflow-schedule-repository";

/**
 * Sync `workflow_schedule_tracking` with the deployed workflow definition.
 *
 *   - schedule-trigger workflow with parseable interval → upsert row, seed
 *     expected_next_run_at = NOW + interval so the first drift check waits one
 *     full cycle before alerting
 *   - schedule-trigger with unparseable rule (cron expression) → upsert row
 *     with expected_interval_seconds = NULL; drift sweep skips it
 *   - webhook/manual/no trigger → delete any prior row to keep the sweep
 *     table sparse
 */
async function registerScheduleTrackingFromDeploy(input: {
  workflowId: string;
  workflowNodes: Array<{ type?: string; parameters?: unknown }>;
}): Promise<void> {
  const summary = summarizeSchedule(input.workflowNodes);

  if (!summary || summary.expected_interval_seconds === null) {
    if (summary && summary.cron_expression) {
      await upsertScheduleTracking({
        workflowId: input.workflowId,
        triggerType: summary.trigger_type,
        cronExpression: summary.cron_expression,
        expectedIntervalSeconds: null,
        seedNextRunAt: null
      });
      return;
    }
    await deleteScheduleTracking(input.workflowId);
    return;
  }

  await upsertScheduleTracking({
    workflowId: input.workflowId,
    triggerType: summary.trigger_type,
    cronExpression: summary.cron_expression,
    expectedIntervalSeconds: summary.expected_interval_seconds,
    seedNextRunAt: nextExpectedRunAt(null, summary.expected_interval_seconds)
  });
}

/**
 * Returns the user id of the current authenticated request, or throws if the
 * call wasn't routed through `requireAuth`. Use this at every user-facing
 * service entry point so we never accidentally serve cross-tenant data.
 */
function currentUserIdOrThrow(): string {
  const ctx = getRequestContext();
  if (!ctx) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
  }
  return ctx.userId;
}

/**
 * Tenant-aware project fetch used by every user-facing service entry point.
 * Returns 404 PROJECT_NOT_FOUND for both "doesn't exist" and "exists but
 * belongs to someone else" so we don't leak project ids across tenants.
 */
async function loadProjectOwned(projectId: string) {
  const userId = currentUserIdOrThrow();
  const project = await getProjectByIdForUser(projectId, userId);
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }
  return project;
}
import { getWorkflowStatus } from "../workflows/workflow-service";
import {
  attachWorkflowToN8n,
  getLatestWorkflowByProjectId,
  listWorkflowsByProjectId,
  markWorkflowDeployed,
  updateWorkflowById,
  updateWorkflowJsonOnDeploy,
  updateWorkflowStatus
} from "../workflows/workflow-repository";
import {
  listWorkflowCredentialBindings,
  replaceWorkflowCredentialBindings,
  type WorkflowCredentialBindingWrite
} from "./credential-binding-repository";
import { normalizeWorkflowDefinition } from "../workflows/workflow-normalizer";
import {
  buildNormalizedNodeVersions,
  detectIncompatibleNodes,
  listNodeTypesWithVersions,
  type IncompatibleNodeInfo,
  type NormalizedNodeVersionInfo
} from "../n8n/node-compatibility";
import type {
  N8nNode,
  N8nWorkflow,
  WorkflowCredentialBindingRecord,
  WorkflowLifecycleState,
  WorkflowStatus
} from "../../types/workflow";

const DEPLOYABLE_INACTIVE_WORKFLOW_STATUSES = new Set<WorkflowStatus>([
  "validated",
  "deployed_inactive",
  "deployed_active"
]);
const REDEPLOYABLE_WORKFLOW_STATUSES = new Set<WorkflowStatus>([
  "deployed_inactive",
  "deployed_active"
]);

export interface CredentialBindingRef {
  id?: string;
  name?: string;
}

export interface NodeCredentialBindingRef extends CredentialBindingRef {
  node_id?: string | null;
  node_name?: string | null;
  credential_type: string;
}

export interface DeployInput {
  activate: boolean;
  credentialBindings?: NodeCredentialBindingRef[] | Record<string, CredentialBindingRef>;
}

export interface DeployCredentialRequirement {
  node_id: string;
  node_name: string;
  credential_type: string;
  placeholder_credential_name: string;
  provisioning_mode: CredentialProvisioningMode;
  fields: CredentialField[];
  manual_message: string;
  provided_binding: CredentialBindingRef | null;
  resolved_binding: CredentialBindingRef | null;
  available_credentials: Array<{ id: string; name: string }>;
  resolved: boolean;
}

export interface DeployPreflightResult {
  project_id: string;
  workflow_id: string;
  workflow_status: WorkflowStatus;
  deployable: boolean;
  n8n_workflow_id: string | null;
  requirements: DeployCredentialRequirement[];
  missing_credentials: Array<{
    node_id: string;
    node_name: string;
    credential_type: string;
    placeholder_credential_name: string;
  }>;
  manual_credentials: Array<{
    node_id: string;
    node_name: string;
    credential_type: string;
    placeholder_credential_name: string;
    manual_message: string;
  }>;
  credentials_source_ok: boolean;
  credentials_source_error: string | null;
  stored_bindings: NodeCredentialBindingRef[];
  can_deploy_inactive: boolean;
  can_activate: boolean;
  can_redeploy: boolean;
  can_delete: boolean;
  n8n_credentials_url: string;
  n8n_workflow_url: string | null;
}

export interface DeleteProjectResult {
  project_id: string;
  deleted: boolean;
  remote: {
    attempted_n8n_workflow_ids: string[];
    deactivated_n8n_workflow_ids: string[];
    deleted_n8n_workflow_ids: string[];
    not_found_n8n_workflow_ids: string[];
  };
  cleanup_warnings: Array<{ n8n_workflow_id: string; operation: "deactivate" | "delete"; error: string }>;
}

interface ProjectN8nSyncSummary {
  checked: boolean;
  exists: boolean | null;
  active: boolean | null;
  workflow_name: string | null;
  error: string | null;
}

export interface ProjectAuditItem {
  project_id: string;
  project_name: string;
  workflow_id: string | null;
  workflow_status: WorkflowStatus | null;
  lifecycle_state: WorkflowLifecycleState;
  n8n_workflow_id: string | null;
  n8n_exists: boolean | null;
  n8n_active: boolean | null;
  n8n_workflow_url: string | null;
  n8n_credentials_url: string;
  required_credentials_count: number;
  missing_credentials_count: number;
  manual_credentials_count: number;
  health_status: "healthy" | "warning" | "failing" | "unknown";
  recommended_action: string;
  can_deploy_inactive: boolean;
  can_activate: boolean;
  can_redeploy: boolean;
  can_delete: boolean;
  node_types_with_versions: string[];
  normalized_node_versions: NormalizedNodeVersionInfo[];
  incompatible_nodes: IncompatibleNodeInfo[];
}

export interface ProjectsAuditReport {
  generated_at: string;
  totals: {
    projects: number;
    rejected: number;
    validated: number;
    deployed_inactive: number;
    deployed_active: number;
    failing: number;
    warnings: number;
  };
  items: ProjectAuditItem[];
}

export interface ProjectWorkflowDebugSnapshot {
  project_id: string;
  workflow_id: string | null;
  n8n_workflow_id: string | null;
  db_node_count: number;
  n8n_node_count: number | null;
  db_node_names: string[];
  n8n_node_names: string[] | null;
  db_node_summaries: Array<{ name: string; type: string; typeVersion: number | null }>;
  n8n_node_summaries: Array<{ name: string; type: string; typeVersion: number | null }> | null;
  node_types_with_versions: { db: string[]; n8n: string[] | null };
  normalized_node_versions: NormalizedNodeVersionInfo[];
  incompatible_nodes: { db: IncompatibleNodeInfo[]; n8n: IncompatibleNodeInfo[] | null };
  same_counts: boolean;
  same_nodes: boolean;
  same_connections: boolean;
  same: boolean;
  n8n_url: string | null;
  n8n_exists: boolean | null;
  db_connection_sources_count: number;
  n8n_connection_sources_count: number | null;
  db_connection_keys: string[];
  n8n_connection_keys: string[] | null;
  workflow_status: WorkflowStatus | null;
}

export interface WorkflowLifecycleCapabilities {
  can_deploy_inactive: boolean;
  can_activate: boolean;
  can_redeploy: boolean;
  can_delete: boolean;
}

function parseN8nDetails(details: unknown): { raw: string; message: string } {
  if (typeof details !== "string") {
    return {
      raw: "",
      message: ""
    };
  }

  try {
    const parsed = JSON.parse(details) as { message?: string };
    return {
      raw: details,
      message: typeof parsed.message === "string" ? parsed.message : details
    };
  } catch {
    return {
      raw: details,
      message: details
    };
  }
}

function extractMissingCredentials(message: string): Array<{ node_name: string; credential: string }> {
  const matches = Array.from(
    message.matchAll(
      /Node\s+"([^"]+)"\s*:\s*[\r\n]+\s*-\s*Missing required credential:\s*([a-zA-Z0-9_]+)/g
    )
  );

  return matches.map((match) => ({
    node_name: match[1] ?? "unknown",
    credential: match[2] ?? "unknown"
  }));
}

function buildWorkflowRejectedError(input: {
  workflowId: string;
  validationErrors: string[] | null;
}): AppError {
  return new AppError(
    409,
    "WORKFLOW_REJECTED",
    "Workflow rejected. Fix validation errors first.",
    {
      workflow_id: input.workflowId,
      validation_errors: input.validationErrors ?? []
    }
  );
}

function assertWorkflowNotRejected(workflow: {
  id: string;
  status: WorkflowStatus;
  validation_errors: string[] | null;
}): void {
  if (workflow.status === "rejected") {
    throw buildWorkflowRejectedError({
      workflowId: workflow.id,
      validationErrors: workflow.validation_errors
    });
  }
}

function buildN8nDashboardBaseUrl(): string {
  const normalized = env.N8N_BASE_URL.replace(/\/+$/, "");
  return normalized.replace(/\/api\/v\d+$/i, "");
}

function toProjectLifecycleState(input: {
  workflowStatus: WorkflowStatus | null;
  n8nWorkflowId: string | null;
  n8nSync: ProjectN8nSyncSummary;
}): WorkflowLifecycleState {
  if (!input.workflowStatus) {
    return "no_workflow";
  }

  if (input.workflowStatus === "rejected") {
    return "rejected";
  }

  if (!input.n8nWorkflowId) {
    return input.workflowStatus;
  }

  if (input.n8nSync.exists === false) {
    return "missing_in_n8n";
  }

  if (input.n8nSync.exists === null && input.n8nSync.checked) {
    return "n8n_check_failed";
  }

  if (input.n8nSync.active === true) {
    return "deployed_active";
  }

  return "deployed_inactive";
}

async function buildProjectN8nSync(
  n8nWorkflowId: string | null,
  verifyN8n: boolean
): Promise<ProjectN8nSyncSummary> {
  if (!n8nWorkflowId) {
    return {
      checked: verifyN8n,
      exists: null,
      active: null,
      workflow_name: null,
      error: null
    };
  }

  if (!verifyN8n) {
    return {
      checked: false,
      exists: null,
      active: null,
      workflow_name: null,
      error: null
    };
  }

  try {
    const remote = await getN8nWorkflowById(n8nWorkflowId);
    return {
      checked: true,
      exists: true,
      active: Boolean(remote.active),
      workflow_name: typeof remote.name === "string" ? remote.name : null,
      error: null
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "N8N_WORKFLOW_NOT_FOUND") {
      return {
        checked: true,
        exists: false,
        active: false,
        workflow_name: null,
        error: "Workflow linked in DB but missing in n8n."
      };
    }

    return {
      checked: true,
      exists: null,
      active: null,
      workflow_name: null,
      error: toAppErrorMessage(error)
    };
  }
}

export function normalizeWorkflowForDeploy(workflow: N8nWorkflow, fallbackName: string): {
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
} {
  const sanitizeDeploySettings = (input: unknown): Record<string, unknown> => {
    if (!input || typeof input !== "object") {
      return {};
    }

    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      // Internal diagnostics metadata must never be sent to n8n workflow settings.
      if (key.startsWith("__opsRadar")) {
        continue;
      }
      output[key] = value;
    }
    return output;
  };

  const normalized = normalizeWorkflowDefinition(workflow);

  // Log normalization warnings before they get stripped from settings.
  // These warnings contain critical diagnostics (dropped connections, renamed nodes)
  // that explain why a workflow might appear empty in n8n.
  const normalizationWarnings = Array.isArray(normalized.settings.__opsRadarNormalizationWarnings)
    ? normalized.settings.__opsRadarNormalizationWarnings.filter(
        (item): item is string => typeof item === "string"
      )
    : [];
  if (normalizationWarnings.length > 0) {
    logWarn("projects", "Normalization warnings generated during deploy preparation", {
      warnings: normalizationWarnings,
      node_count: normalized.nodes.length,
      connection_sources_count: Object.keys(normalized.connections).length
    });
  }

  const workflowName =
    typeof workflow.name === "string" && workflow.name.trim().length > 0
      ? workflow.name.trim()
      : fallbackName;
  return {
    name: workflowName || "Automation Workflow",
    nodes: normalized.nodes as unknown as Array<Record<string, unknown>>,
    connections: normalized.connections as unknown as Record<string, unknown>,
    settings: sanitizeDeploySettings(normalized.settings)
  };
}

function normalizeCredentialType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  return normalized;
}

function detectCredentialTypeHint(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (/[A-Za-z]/.test(normalized) && /(oauth|auth|credential|api)/i.test(normalized)) {
    return normalized;
  }

  return null;
}

function parseCredentialRef(value: unknown): CredentialBindingRef | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return { name: value.trim() };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const objectValue = value as Record<string, unknown>;
  const id =
    typeof objectValue.id === "string" && objectValue.id.trim().length > 0
      ? objectValue.id.trim()
      : undefined;
  const name =
    typeof objectValue.name === "string" && objectValue.name.trim().length > 0
      ? objectValue.name.trim()
      : undefined;

  if (!id && !name) {
    return null;
  }

  return { id, name };
}

function toBindingKey(nodeId: string | null, nodeName: string | null, credentialType: string): string {
  return `${nodeId ?? ""}|${(nodeName ?? "").toLowerCase()}|${credentialType}`;
}

function toTypeFallbackKey(credentialType: string): string {
  return toBindingKey(null, null, credentialType);
}

function parseCredentialBindingsInput(
  input?: NodeCredentialBindingRef[] | Record<string, CredentialBindingRef>
): NodeCredentialBindingRef[] {
  if (!input) {
    return [];
  }

  const out: NodeCredentialBindingRef[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const credentialType = normalizeCredentialType(item.credential_type);
      if (!credentialType) {
        continue;
      }
      const id = typeof item.id === "string" && item.id.trim().length > 0 ? item.id.trim() : undefined;
      const name =
        typeof item.name === "string" && item.name.trim().length > 0 ? item.name.trim() : undefined;
      if (!id && !name) {
        continue;
      }
      out.push({
        node_id:
          typeof item.node_id === "string" && item.node_id.trim().length > 0
            ? item.node_id.trim()
            : null,
        node_name:
          typeof item.node_name === "string" && item.node_name.trim().length > 0
            ? item.node_name.trim()
            : null,
        credential_type: credentialType,
        id,
        name
      });
    }
    return out;
  }

  for (const [credentialTypeRaw, bindingValue] of Object.entries(input)) {
    const credentialType = normalizeCredentialType(credentialTypeRaw);
    if (!credentialType) {
      continue;
    }
    const parsed = parseCredentialRef(bindingValue);
    if (!parsed) {
      continue;
    }
    out.push({
      node_id: null,
      node_name: null,
      credential_type: credentialType,
      ...parsed
    });
  }

  return out;
}

function mergeCredentialBindings(
  primary: NodeCredentialBindingRef[],
  secondary: NodeCredentialBindingRef[]
): NodeCredentialBindingRef[] {
  const output = new Map<string, NodeCredentialBindingRef>();

  for (const binding of secondary) {
    if (!binding) {
      continue;
    }
    const key = toBindingKey(
      binding.node_id ?? null,
      binding.node_name ?? null,
      binding.credential_type
    );
    output.set(key, { ...binding });
  }

  for (const binding of primary) {
    if (!binding) {
      continue;
    }
    const key = toBindingKey(
      binding.node_id ?? null,
      binding.node_name ?? null,
      binding.credential_type
    );
    output.set(key, { ...binding });
  }

  return Array.from(output.values());
}

function mapStoredCredentialBindings(
  rows: WorkflowCredentialBindingRecord[]
): NodeCredentialBindingRef[] {
  return rows
    .map((row) => ({
      node_id: row.node_id,
      node_name: row.node_name,
      credential_type: row.credential_type,
      id: row.credential_id ?? undefined,
      name: row.credential_name ?? undefined
    }))
    .filter((item) => Boolean(item.id || item.name));
}

function mapLegacyCredentialBindings(
  rows: NodeCredentialBindingRef[]
): Record<string, CredentialBindingRef> {
  const output: Record<string, CredentialBindingRef> = {};

  for (const row of rows) {
    if (row.node_id || row.node_name) {
      continue;
    }
    const binding: CredentialBindingRef = {};
    if (row.id) {
      binding.id = row.id;
    }
    if (row.name) {
      binding.name = row.name;
    }
    if (binding.id || binding.name) {
      output[row.credential_type] = binding;
    }
  }

  return output;
}

function resolveCredentialRef(
  credentialType: string,
  binding: CredentialBindingRef | null,
  availableCredentials: N8nCredentialSummary[]
): CredentialBindingRef | null {
  if (!binding) {
    return null;
  }

  if (binding.id) {
    const foundById = availableCredentials.find(
      (credential) => credential.id === binding.id && credential.type === credentialType
    );
    if (foundById) {
      return { id: foundById.id, name: foundById.name };
    }
  }

  if (binding.name) {
    const targetName = binding.name.toLowerCase();
    const foundByName = availableCredentials.find(
      (credential) =>
        credential.type === credentialType && credential.name.toLowerCase() === targetName
    );
    if (foundByName) {
      return { id: foundByName.id, name: foundByName.name };
    }
  }

  return null;
}

function findBindingForNodeCredential(input: {
  bindings: NodeCredentialBindingRef[];
  nodeId: string;
  nodeName: string;
  credentialType: string;
  fallbackFromNodeCredentials: CredentialBindingRef | null;
}): CredentialBindingRef | null {
  const exactByNodeId = input.bindings.find(
    (binding) =>
      binding.credential_type === input.credentialType &&
      binding.node_id &&
      binding.node_id === input.nodeId
  );
  if (exactByNodeId) {
    return {
      id: exactByNodeId.id,
      name: exactByNodeId.name
    };
  }

  const exactByNodeName = input.bindings.find(
    (binding) =>
      binding.credential_type === input.credentialType &&
      !binding.node_id &&
      binding.node_name &&
      binding.node_name.toLowerCase() === input.nodeName.toLowerCase()
  );
  if (exactByNodeName) {
    return {
      id: exactByNodeName.id,
      name: exactByNodeName.name
    };
  }

  const typeFallback = input.bindings.find(
    (binding) =>
      binding.credential_type === input.credentialType &&
      !binding.node_id &&
      !binding.node_name
  );
  if (typeFallback) {
    return {
      id: typeFallback.id,
      name: typeFallback.name
    };
  }

  return input.fallbackFromNodeCredentials;
}

function isCredentialTypeLikelyNeededFromParameters(parameters: Record<string, unknown>): string[] {
  const keysToCheck = [
    "credentialType",
    "credentialsType",
    "nodeCredentialType",
    "authentication",
    "genericAuthType",
    "authType",
    "authenticationType"
  ];
  const out = new Set<string>();

  for (const key of keysToCheck) {
    const value = parameters[key];
    const detected = detectCredentialTypeHint(value);
    if (detected) {
      out.add(detected);
    }
  }

  return Array.from(out);
}

export function detectNodeCredentialTypes(node: Record<string, unknown>): string[] {
  const detected = new Set<string>();

  const existingCredentials =
    node.credentials && typeof node.credentials === "object"
      ? (node.credentials as Record<string, unknown>)
      : {};
  for (const key of Object.keys(existingCredentials)) {
    const normalized = normalizeCredentialType(key);
    if (normalized) {
      detected.add(normalized);
    }
  }

  const parameters =
    node.parameters && typeof node.parameters === "object"
      ? (node.parameters as Record<string, unknown>)
      : {};
  for (const inferredType of isCredentialTypeLikelyNeededFromParameters(parameters)) {
    detected.add(inferredType);
  }

  return Array.from(detected);
}

export function collectCredentialRequirements(input: {
  workflow: {
    nodes: Array<Record<string, unknown>>;
    connections: Record<string, unknown>;
    settings: Record<string, unknown>;
  };
  availableCredentials: N8nCredentialSummary[];
  credentialBindings?: NodeCredentialBindingRef[];
}): DeployCredentialRequirement[] {
  const requirements = new Map<string, DeployCredentialRequirement>();
  const bindings = input.credentialBindings ?? [];

  const availableByType = new Map<string, N8nCredentialSummary[]>();
  for (const credential of input.availableCredentials) {
    const list = availableByType.get(credential.type) ?? [];
    list.push(credential);
    availableByType.set(credential.type, list);
  }

  for (const node of input.workflow.nodes) {
    if (!node || typeof node !== "object") {
      continue;
    }

    const nodeId =
      typeof node.id === "string" && node.id.trim().length > 0 ? node.id.trim() : "";
    const nodeName =
      typeof node.name === "string" && node.name.trim().length > 0 ? node.name.trim() : "Unknown Node";
    if (!nodeId) {
      continue;
    }

    const existingCredentials =
      node.credentials && typeof node.credentials === "object"
        ? (node.credentials as Record<string, unknown>)
        : {};

    const requiredTypes = detectNodeCredentialTypes(node);
    for (const credentialType of requiredTypes) {
      const fromNodeCredentials = parseCredentialRef(existingCredentials[credentialType]);
      const sourceBinding = findBindingForNodeCredential({
        bindings,
        nodeId,
        nodeName,
        credentialType,
        fallbackFromNodeCredentials: fromNodeCredentials
      });
      const availableForType = availableByType.get(credentialType) ?? [];
      const resolvedBinding = resolveCredentialRef(
        credentialType,
        sourceBinding,
        availableForType
      );
      const policy = getCredentialPolicy(credentialType);

      const placeholderName =
        fromNodeCredentials?.name ??
        sourceBinding?.name ??
        `${nodeName} (${credentialType})`;
      const key = `${nodeId}|${credentialType}`;
      requirements.set(key, {
        node_id: nodeId,
        node_name: nodeName,
        credential_type: credentialType,
        placeholder_credential_name: placeholderName,
        provisioning_mode: policy.mode,
        fields: policy.fields,
        manual_message: policy.manual_message,
        provided_binding: sourceBinding,
        resolved_binding: resolvedBinding,
        available_credentials: availableForType.map((credential) => ({
          id: credential.id,
          name: credential.name
        })),
        resolved: Boolean(resolvedBinding)
      });
    }
  }

  return Array.from(requirements.values());
}

export function applyCredentialBindingsToWorkflow(
  workflow: {
    name?: string;
    nodes: Array<Record<string, unknown>>;
    connections: Record<string, unknown>;
    settings: Record<string, unknown>;
  },
  credentialBindings?: NodeCredentialBindingRef[]
) {
  if (!credentialBindings || credentialBindings.length === 0) {
    return workflow;
  }

  const next = structuredClone(workflow);
  for (const node of next.nodes) {
    if (!node || typeof node !== "object") {
      continue;
    }

    const nodeId = typeof node.id === "string" ? node.id.trim() : "";
    const nodeName = typeof node.name === "string" ? node.name.trim() : "";
    if (!nodeId && !nodeName) {
      continue;
    }

    const existingCredentials =
      node.credentials && typeof node.credentials === "object"
        ? (node.credentials as Record<string, unknown>)
        : {};

    const requiredTypes = new Set<string>(detectNodeCredentialTypes(node));
    if (requiredTypes.size === 0) {
      continue;
    }

    const credentials: Record<string, unknown> = { ...existingCredentials };
    for (const credentialType of requiredTypes) {
      const fromNode = parseCredentialRef(existingCredentials[credentialType]);
      const binding = findBindingForNodeCredential({
        bindings: credentialBindings,
        nodeId,
        nodeName,
        credentialType,
        fallbackFromNodeCredentials: fromNode
      });
      if (!binding) {
        continue;
      }

      const credentialRef: Record<string, unknown> = {};
      if (binding.id) {
        credentialRef.id = binding.id;
      }
      if (binding.name) {
        credentialRef.name = binding.name;
      }
      if (Object.keys(credentialRef).length > 0) {
        credentials[credentialType] = credentialRef;
      }
    }

    if (Object.keys(credentials).length > 0) {
      node.credentials = credentials;
    }
  }

  return next;
}

function toAppErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isN8nWorkflowMissingError(error: unknown): boolean {
  return error instanceof AppError && error.code === "N8N_WORKFLOW_NOT_FOUND";
}

function extractN8nMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const payload = (details as Record<string, unknown>).payload;
  if (payload && typeof payload === "object") {
    const msg = (payload as Record<string, unknown>).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg.trim();
  }
  return null;
}

async function emitDeploymentEvent(input: {
  workflowId: string;
  eventType:
    | "workflow_deployed"
    | "workflow_activated"
    | "workflow_deactivated"
    | "workflow_deleted";
  status?: "success" | "failure" | "info";
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await createWorkflowEvent({
      workflowId: input.workflowId,
      runId: null,
      nodeName: null,
      eventType: input.eventType,
      status: input.status ?? "info",
      durationMs: null,
      errorMessage: input.message ?? null,
      metadata: input.metadata ?? null
    });
  } catch (error) {
    logWarn("projects", "Failed to create deployment event", {
      workflow_id: input.workflowId,
      event_type: input.eventType,
      error: toAppErrorMessage(error)
    });
  }
}

function toBindingWrites(bindings: NodeCredentialBindingRef[]): WorkflowCredentialBindingWrite[] {
  return bindings
    .filter((item) => item && item.credential_type && (item.id || item.name))
    .map((item) => ({
      node_id: item.node_id ?? null,
      node_name: item.node_name ?? null,
      credential_type: item.credential_type,
      credential_id: item.id ?? null,
      credential_name: item.name ?? null
    }));
}

function buildBindingsFromPreflight(
  preflight: DeployPreflightResult,
  fallback: NodeCredentialBindingRef[]
): NodeCredentialBindingRef[] {
  const output = new Map<string, NodeCredentialBindingRef>();

  for (const row of fallback) {
    const key = toBindingKey(
      row.node_id ?? null,
      row.node_name ?? null,
      row.credential_type
    );
    output.set(key, { ...row });
  }

  for (const requirement of preflight.requirements) {
    if (!requirement.resolved_binding) {
      continue;
    }
    const key = toBindingKey(requirement.node_id, requirement.node_name, requirement.credential_type);
    output.set(key, {
      node_id: requirement.node_id,
      node_name: requirement.node_name,
      credential_type: requirement.credential_type,
      id: requirement.resolved_binding.id,
      name: requirement.resolved_binding.name
    });
  }

  return Array.from(output.values());
}

function getWorkflowLifecycleCapabilities(input: {
  workflowStatus: WorkflowStatus | null;
  missingCredentialsCount: number;
  credentialsSourceOk: boolean;
  hasN8nWorkflowId: boolean;
}): WorkflowLifecycleCapabilities {
  if (!input.workflowStatus || input.workflowStatus === "rejected") {
    return {
      can_deploy_inactive: false,
      can_activate: false,
      can_redeploy: false,
      can_delete: true
    };
  }

  const canDeployInactive = DEPLOYABLE_INACTIVE_WORKFLOW_STATUSES.has(input.workflowStatus);
  const canActivate =
    canDeployInactive &&
    input.missingCredentialsCount === 0 &&
    input.credentialsSourceOk;

  return {
    can_deploy_inactive: canDeployInactive,
    can_activate: canActivate,
    can_redeploy:
      REDEPLOYABLE_WORKFLOW_STATUSES.has(input.workflowStatus) && input.hasN8nWorkflowId,
    can_delete: true
  };
}

export { getWorkflowLifecycleCapabilities };

function buildRecommendedAction(input: {
  lifecycle: WorkflowLifecycleState;
  hasWorkflow: boolean;
  canDeployInactive: boolean;
  canActivate: boolean;
  missingCredentialsCount: number;
  healthStatus: "healthy" | "warning" | "failing" | "unknown";
}): string {
  if (!input.hasWorkflow) {
    return "Generate a workflow from chat first.";
  }

  if (input.lifecycle === "rejected") {
    return "Fix workflow validation errors, then validate again.";
  }

  if (input.lifecycle === "missing_in_n8n") {
    return "Workflow is missing in n8n. Redeploy it.";
  }

  if (input.lifecycle === "n8n_check_failed") {
    return "Could not verify workflow in n8n. Check API connectivity and retry.";
  }

  if (input.missingCredentialsCount > 0) {
    return "Create credentials in n8n, bind by id/name, then activate.";
  }

  if (input.canDeployInactive && !input.canActivate) {
    return "Deploy as inactive first, then resolve credentials and activate.";
  }

  if (input.lifecycle === "validated") {
    return "Deploy workflow to n8n as inactive.";
  }

  if (input.lifecycle === "deployed_inactive") {
    return "Activate workflow in n8n.";
  }

  if (input.healthStatus === "failing" || input.healthStatus === "warning") {
    return "Review recent failed executions and redeploy if workflow changed.";
  }

  return "Workflow is active. Continue monitoring health.";
}

async function loadAvailableCredentialsSafe(): Promise<{
  credentials: N8nCredentialSummary[];
  sourceOk: boolean;
  sourceError: string | null;
}> {
  try {
    const credentials = await listN8nCredentials();
    return {
      credentials,
      sourceOk: true,
      sourceError: null
    };
  } catch (error) {
    return {
      credentials: [],
      sourceOk: false,
      sourceError: toAppErrorMessage(error)
    };
  }
}

function inferHealthStatusFromWorkflowSnapshot(statusSnapshot: Awaited<
  ReturnType<typeof getWorkflowStatus>
> | null): "healthy" | "warning" | "failing" | "unknown" {
  if (!statusSnapshot) {
    return "unknown";
  }
  if (!statusSnapshot.health.is_working && statusSnapshot.health.last_run_status === "failure") {
    return "failing";
  }
  if (!statusSnapshot.health.is_working) {
    return "warning";
  }
  return "healthy";
}

function buildPreflightPayload(input: {
  projectId: string;
  workflowId: string;
  workflowStatus: WorkflowStatus;
  n8nWorkflowId: string | null;
  workflowJson: N8nWorkflow;
  projectName: string;
  storedBindings: NodeCredentialBindingRef[];
  mergedBindings: NodeCredentialBindingRef[];
  credentials: N8nCredentialSummary[];
  credentialsSourceOk: boolean;
  credentialsSourceError: string | null;
}): DeployPreflightResult {
  const n8nDashboardBaseUrl = buildN8nDashboardBaseUrl();
  const normalizedWorkflow = normalizeWorkflowForDeploy(input.workflowJson, input.projectName);
  const workflowJsonWithBindings = applyCredentialBindingsToWorkflow(
    normalizedWorkflow,
    input.mergedBindings
  );

  const requirements = collectCredentialRequirements({
    workflow: workflowJsonWithBindings,
    availableCredentials: input.credentials,
    credentialBindings: input.mergedBindings
  });

  const missingCredentials = requirements
    .filter((item) => !item.resolved)
    .map((item) => ({
      node_id: item.node_id,
      node_name: item.node_name,
      credential_type: item.credential_type,
      placeholder_credential_name: item.placeholder_credential_name
    }));

  const manualCredentials = requirements.map((item) => ({
    node_id: item.node_id,
    node_name: item.node_name,
    credential_type: item.credential_type,
    placeholder_credential_name: item.placeholder_credential_name,
    manual_message: item.manual_message
  }));

  const lifecycle = getWorkflowLifecycleCapabilities({
    workflowStatus: input.workflowStatus,
    missingCredentialsCount: missingCredentials.length,
    credentialsSourceOk: input.credentialsSourceOk,
    hasN8nWorkflowId: Boolean(input.n8nWorkflowId)
  });

  return {
    project_id: input.projectId,
    workflow_id: input.workflowId,
    workflow_status: input.workflowStatus,
    deployable: lifecycle.can_deploy_inactive,
    n8n_workflow_id: input.n8nWorkflowId,
    requirements,
    missing_credentials: missingCredentials,
    manual_credentials: manualCredentials,
    credentials_source_ok: input.credentialsSourceOk,
    credentials_source_error: input.credentialsSourceError,
    stored_bindings: input.storedBindings,
    can_deploy_inactive: lifecycle.can_deploy_inactive,
    can_activate: lifecycle.can_activate,
    can_redeploy: lifecycle.can_redeploy,
    can_delete: lifecycle.can_delete,
    n8n_credentials_url: `${n8nDashboardBaseUrl}/credentials`,
    n8n_workflow_url: input.n8nWorkflowId
      ? `${n8nDashboardBaseUrl}/workflow/${encodeURIComponent(input.n8nWorkflowId)}`
      : null
  };
}

export async function listProjectsSnapshot(
  limit = 20,
  offset = 0,
  options?: { verifyN8n?: boolean }
) {
  // Always scope to the authenticated user. Background callers don't go through
  // this path (they hit listProjects / listWorkflowsWithN8nWorkflowId directly).
  const userId = currentUserIdOrThrow();
  const projects = await listProjectsForUser(userId, { limit, offset });
  const verifyN8n = options?.verifyN8n ?? env.PROJECTS_VERIFY_N8N_ON_LIST;

  const records = await Promise.all(
    projects.map(async (project) => {
      const workflow = await getLatestWorkflowByProjectId(project.id);
      const statusSnapshot = workflow ? await getWorkflowStatus(workflow.id) : null;
      const n8nSync = await buildProjectN8nSync(workflow?.n8n_workflow_id ?? null, verifyN8n);
      const lifecycleState = toProjectLifecycleState({
        workflowStatus: workflow?.status ?? null,
        n8nWorkflowId: workflow?.n8n_workflow_id ?? null,
        n8nSync
      });

      return {
        project,
        workflow: workflow
          ? {
              id: workflow.id,
              status: workflow.status,
              created_at: workflow.created_at,
              n8n_workflow_id: workflow.n8n_workflow_id
            }
          : null,
        health: statusSnapshot
          ? {
              is_working: statusSnapshot.health.is_working,
              last_run_status: statusSnapshot.health.last_run_status,
              unresolved_alerts: statusSnapshot.health.unresolved_alerts
            }
          : null,
        lifecycle_state: lifecycleState,
        n8n_sync: n8nSync
      };
    })
  );

  return records;
}

export async function getProjectsAuditReport(
  input?: { limit?: number; offset?: number; verifyN8n?: boolean }
): Promise<ProjectsAuditReport> {
  const items = await listProjectsSnapshot(input?.limit ?? 200, input?.offset ?? 0, {
    verifyN8n: input?.verifyN8n ?? true
  });

  const availableCredentials = await loadAvailableCredentialsSafe();
  const auditItems: ProjectAuditItem[] = [];

  for (const item of items) {
    const workflow = item.workflow
      ? await getLatestWorkflowByProjectId(item.project.id)
      : null;
    const healthStatus = inferHealthStatusFromWorkflowSnapshot(
      workflow ? await getWorkflowStatus(workflow.id) : null
    );

    let requiredCredentialsCount = 0;
    let missingCredentialsCount = 0;
    let manualCredentialsCount = 0;
    let canDeployInactive = false;
    let canActivate = false;
    let canRedeploy = false;
    let n8nWorkflowUrl: string | null = null;
    let n8nCredentialsUrl = `${buildN8nDashboardBaseUrl()}/credentials`;
    let nodeTypesWithVersions: string[] = [];
    let normalizedNodeVersions: NormalizedNodeVersionInfo[] = [];
    let incompatibleNodes: IncompatibleNodeInfo[] = [];

    if (workflow) {
      const workflowNodes = Array.isArray(workflow.json.nodes) ? workflow.json.nodes : [];
      nodeTypesWithVersions = listNodeTypesWithVersions(workflowNodes as Array<Partial<N8nNode>>);
      normalizedNodeVersions = buildNormalizedNodeVersions(workflowNodes as Array<Partial<N8nNode>>);
      incompatibleNodes = detectIncompatibleNodes(workflowNodes as Array<Partial<N8nNode>>);
    }

    if (workflow && workflow.status !== "rejected") {

      const storedRows = await listWorkflowCredentialBindings(workflow.id);
      const storedBindings = mapStoredCredentialBindings(storedRows);
      const preflight = buildPreflightPayload({
        projectId: item.project.id,
        workflowId: workflow.id,
        workflowStatus: workflow.status,
        n8nWorkflowId: workflow.n8n_workflow_id,
        workflowJson: workflow.json,
        projectName: item.project.name,
        storedBindings,
        mergedBindings: storedBindings,
        credentials: availableCredentials.credentials,
        credentialsSourceOk: availableCredentials.sourceOk,
        credentialsSourceError: availableCredentials.sourceError
      });

      requiredCredentialsCount = preflight.requirements.length;
      missingCredentialsCount = preflight.missing_credentials.length;
      manualCredentialsCount = preflight.manual_credentials.length;
      canDeployInactive = preflight.can_deploy_inactive;
      canActivate = preflight.can_activate;
      canRedeploy = preflight.can_redeploy;
      n8nWorkflowUrl = preflight.n8n_workflow_url;
      n8nCredentialsUrl = preflight.n8n_credentials_url;
    }

    const recommendedAction = buildRecommendedAction({
      lifecycle: item.lifecycle_state,
      hasWorkflow: Boolean(item.workflow),
      canDeployInactive,
      canActivate,
      missingCredentialsCount,
      healthStatus
    });

    auditItems.push({
      project_id: item.project.id,
      project_name: item.project.name,
      workflow_id: item.workflow?.id ?? null,
      workflow_status: item.workflow?.status ?? null,
      lifecycle_state: item.lifecycle_state,
      n8n_workflow_id: item.workflow?.n8n_workflow_id ?? null,
      n8n_exists: item.n8n_sync.exists,
      n8n_active: item.n8n_sync.active,
      n8n_workflow_url: n8nWorkflowUrl,
      n8n_credentials_url: n8nCredentialsUrl,
      required_credentials_count: requiredCredentialsCount,
      missing_credentials_count: missingCredentialsCount,
      manual_credentials_count: manualCredentialsCount,
      health_status: healthStatus,
      recommended_action: recommendedAction,
      can_deploy_inactive: canDeployInactive,
      can_activate: canActivate,
      can_redeploy: canRedeploy,
      can_delete: true,
      node_types_with_versions: nodeTypesWithVersions,
      normalized_node_versions: normalizedNodeVersions,
      incompatible_nodes: incompatibleNodes
    });
  }

  const totals = {
    projects: auditItems.length,
    rejected: auditItems.filter((item) => item.workflow_status === "rejected").length,
    validated: auditItems.filter((item) => item.workflow_status === "validated").length,
    deployed_inactive: auditItems.filter((item) => item.workflow_status === "deployed_inactive").length,
    deployed_active: auditItems.filter((item) => item.workflow_status === "deployed_active").length,
    failing: auditItems.filter((item) => item.health_status === "failing").length,
    warnings: auditItems.filter((item) => item.health_status === "warning").length
  };

  return {
    generated_at: new Date().toISOString(),
    totals,
    items: auditItems
  };
}

export async function getProjectWithWorkflow(projectId: string) {
  // Tenant-scoped: returns 404 for both "doesn't exist" and "not yours" so we
  // never leak the existence of another tenant's project ids.
  const project = await loadProjectOwned(projectId);

  const workflow = await getLatestWorkflowByProjectId(projectId);
  const workflowStatus = workflow ? await getWorkflowStatus(workflow.id) : null;

  return {
    project,
    workflow,
    health: workflowStatus
      ? {
          is_working: workflowStatus.health.is_working,
          last_run_status: workflowStatus.health.last_run_status,
          last_run_at: workflowStatus.health.last_run_at,
          recent_errors: workflowStatus.recent_errors,
          ai_suggestion: workflowStatus.ai_suggestion
        }
      : null
  };
}

export async function getProjectWorkflowDebugSnapshot(
  projectId: string,
  options?: { verifyN8n?: boolean }
): Promise<ProjectWorkflowDebugSnapshot> {
  // Tenant-scoped: ownership check folded into loadProjectOwned (404 on miss).
  await loadProjectOwned(projectId);

  const workflow = await getLatestWorkflowByProjectId(projectId);
  const n8nDashboardBaseUrl = buildN8nDashboardBaseUrl();
  if (!workflow) {
    return {
      project_id: projectId,
      workflow_id: null,
      n8n_workflow_id: null,
      db_node_count: 0,
      n8n_node_count: null,
      db_node_names: [],
      n8n_node_names: null,
      db_node_summaries: [],
      n8n_node_summaries: null,
      node_types_with_versions: { db: [], n8n: null },
      normalized_node_versions: [],
      incompatible_nodes: { db: [], n8n: null },
      same_counts: false,
      same_nodes: false,
      same_connections: false,
      same: false,
      n8n_url: null,
      n8n_exists: null,
      db_connection_sources_count: 0,
      n8n_connection_sources_count: null,
      db_connection_keys: [],
      n8n_connection_keys: null,
      workflow_status: null
    };
  }

  const dbNodeCount = Array.isArray(workflow.json.nodes) ? workflow.json.nodes.length : 0;
  const dbNodeNames = Array.isArray(workflow.json.nodes)
    ? workflow.json.nodes
        .map((node) =>
          node && typeof node.name === "string" && node.name.trim().length > 0 ? node.name.trim() : null
        )
        .filter((name): name is string => Boolean(name))
    : [];
  const dbNodeSummaries = Array.isArray(workflow.json.nodes)
    ? workflow.json.nodes.map((node) => ({
        name:
          node && typeof node.name === "string" && node.name.trim().length > 0
            ? node.name.trim()
            : "unknown",
        type:
          node && typeof node.type === "string" && node.type.trim().length > 0
            ? node.type.trim()
            : "unknown",
        typeVersion:
          node && typeof node.typeVersion === "number" && Number.isFinite(node.typeVersion)
            ? node.typeVersion
            : null
      }))
    : [];
  const dbNodeTypesWithVersions = listNodeTypesWithVersions(
    (Array.isArray(workflow.json.nodes) ? workflow.json.nodes : []) as Array<Partial<N8nNode>>
  );
  const normalizedNodeVersions = buildNormalizedNodeVersions(
    (Array.isArray(workflow.json.nodes) ? workflow.json.nodes : []) as Array<Partial<N8nNode>>
  );
  const dbIncompatibleNodes = detectIncompatibleNodes(
    (Array.isArray(workflow.json.nodes) ? workflow.json.nodes : []) as Array<Partial<N8nNode>>
  );
  const dbConnectionSourcesCount =
    workflow.json.connections && typeof workflow.json.connections === "object"
      ? Object.keys(workflow.json.connections).length
      : 0;
  const dbConnectionKeys =
    workflow.json.connections && typeof workflow.json.connections === "object"
      ? Object.keys(workflow.json.connections)
      : [];

  const verifyN8n = options?.verifyN8n ?? true;
  let n8nNodeCount: number | null = null;
  let n8nExists: boolean | null = null;
  let n8nConnectionSourcesCount: number | null = null;
  let n8nNodeNames: string[] | null = null;
  let n8nConnectionKeys: string[] | null = null;
  let n8nNodeSummaries: Array<{ name: string; type: string; typeVersion: number | null }> | null = null;
  let n8nNodeTypesWithVersions: string[] | null = null;
  let n8nIncompatibleNodes: IncompatibleNodeInfo[] | null = null;

  if (workflow.n8n_workflow_id && verifyN8n) {
    try {
      const remote = await getN8nWorkflowById(workflow.n8n_workflow_id);
      n8nExists = true;
      n8nNodeCount = Array.isArray(remote.nodes) ? remote.nodes.length : 0;
      n8nNodeNames = Array.isArray(remote.nodes)
        ? remote.nodes
            .map((node) =>
              node && typeof node.name === "string" && node.name.trim().length > 0
                ? node.name.trim()
                : null
            )
            .filter((name): name is string => Boolean(name))
        : [];
      n8nNodeSummaries = Array.isArray(remote.nodes)
        ? remote.nodes.map((node) => {
            const objectNode = node && typeof node === "object" ? (node as Record<string, unknown>) : {};
            return {
              name:
                typeof objectNode.name === "string" && objectNode.name.trim().length > 0
                  ? objectNode.name.trim()
                  : "unknown",
              type:
                typeof objectNode.type === "string" && objectNode.type.trim().length > 0
                  ? objectNode.type.trim()
                  : "unknown",
              typeVersion:
                typeof objectNode.typeVersion === "number" && Number.isFinite(objectNode.typeVersion)
                  ? objectNode.typeVersion
                  : null
            };
          })
        : [];
      n8nNodeTypesWithVersions = listNodeTypesWithVersions(
        (Array.isArray(remote.nodes) ? (remote.nodes as Array<Partial<N8nNode>>) : [])
      );
      n8nIncompatibleNodes = detectIncompatibleNodes(
        (Array.isArray(remote.nodes) ? (remote.nodes as Array<Partial<N8nNode>>) : [])
      );
      n8nConnectionSourcesCount =
        remote.connections && typeof remote.connections === "object"
          ? Object.keys(remote.connections as Record<string, unknown>).length
          : 0;
      n8nConnectionKeys =
        remote.connections && typeof remote.connections === "object"
          ? Object.keys(remote.connections as Record<string, unknown>)
          : [];
    } catch (error) {
      if (error instanceof AppError && error.code === "N8N_WORKFLOW_NOT_FOUND") {
        n8nExists = false;
      } else {
        n8nExists = null;
      }
    }
  }

  const sameCounts = Boolean(
    workflow.n8n_workflow_id &&
      n8nExists === true &&
      n8nNodeCount === dbNodeCount &&
      n8nConnectionSourcesCount === dbConnectionSourcesCount
  );

  const normalizeNodeSummary = (items: Array<{ name: string; type: string; typeVersion: number | null }>) =>
    items
      .map((item) => `${item.name}|${item.type}|${item.typeVersion ?? "null"}`)
      .sort((a, b) => a.localeCompare(b));

  const sameNodes =
    n8nNodeSummaries !== null &&
    JSON.stringify(normalizeNodeSummary(dbNodeSummaries)) ===
      JSON.stringify(normalizeNodeSummary(n8nNodeSummaries));

  const sameConnections =
    n8nConnectionKeys !== null &&
    JSON.stringify([...dbConnectionKeys].sort((a, b) => a.localeCompare(b))) ===
      JSON.stringify([...n8nConnectionKeys].sort((a, b) => a.localeCompare(b)));

  const same = sameCounts && sameNodes && sameConnections;

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: workflow.n8n_workflow_id,
    db_node_count: dbNodeCount,
    n8n_node_count: n8nNodeCount,
    db_node_names: dbNodeNames,
    n8n_node_names: n8nNodeNames,
    db_node_summaries: dbNodeSummaries,
    n8n_node_summaries: n8nNodeSummaries,
    node_types_with_versions: {
      db: dbNodeTypesWithVersions,
      n8n: n8nNodeTypesWithVersions
    },
    normalized_node_versions: normalizedNodeVersions,
    incompatible_nodes: {
      db: dbIncompatibleNodes,
      n8n: n8nIncompatibleNodes
    },
    same_counts: sameCounts,
    same_nodes: sameNodes,
    same_connections: sameConnections,
    same,
    n8n_url: workflow.n8n_workflow_id
      ? `${n8nDashboardBaseUrl}/workflow/${encodeURIComponent(workflow.n8n_workflow_id)}`
      : null,
    n8n_exists: n8nExists,
    db_connection_sources_count: dbConnectionSourcesCount,
    n8n_connection_sources_count: n8nConnectionSourcesCount,
    db_connection_keys: dbConnectionKeys,
    n8n_connection_keys: n8nConnectionKeys,
    workflow_status: workflow.status
  };
}

export async function getProjectChatMessages(projectId: string) {
  await loadProjectOwned(projectId);

  const messages = await listMessagesByProjectId(projectId);

  return {
    project_id: projectId,
    messages
  };
}

function defaultEventRecommendedAction(eventType: string): string | null {
  const lookup: Record<string, string> = {
    workflow_rejected: "Fix validation errors and regenerate workflow.",
    workflow_deployed: "Open workflow in n8n and verify node settings.",
    workflow_activated: "Monitor executions and alerts for the next runs.",
    workflow_deactivated: "Resolve dependencies/credentials before reactivation.",
    workflow_execution_failed: "Open failed execution details in n8n and inspect failed node.",
    workflow_health_warning: "Review warnings and resolve before they become failures.",
    workflow_health_failing: "Investigate root cause immediately and redeploy if workflow changed.",
    workflow_alert_created: "Resolve the alert and confirm recovery on next executions.",
    workflow_deleted: "Confirm all linked resources were cleaned up in n8n."
  };
  return lookup[eventType] ?? null;
}

export async function getProjectActivity(
  projectId: string,
  options?: { limit?: number }
): Promise<{
  project_id: string;
  workflow_id: string | null;
  n8n_workflow_id: string | null;
  items: Array<{
    id: string;
    event_time: string;
    severity: "low" | "medium" | "high";
    event_type: string;
    message: string | null;
    n8n_workflow_id: string | null;
    execution_id: string | null;
    failed_node: string | null;
    recommended_action: string | null;
    metadata: Record<string, unknown> | null;
  }>;
}> {
  const snapshot = await getProjectWithWorkflow(projectId);
  if (!snapshot.workflow) {
    return {
      project_id: projectId,
      workflow_id: null,
      n8n_workflow_id: null,
      items: []
    };
  }

  const workflow = snapshot.workflow;
  const events = await listRecentEventsByWorkflowId(workflow.id, options?.limit ?? 100);

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: workflow.n8n_workflow_id,
    items: events.map((event) => {
      const metadata =
        event.metadata && typeof event.metadata === "object"
          ? (event.metadata as Record<string, unknown>)
          : null;
      const metadataSeverity =
        typeof metadata?.severity === "string" &&
        ["low", "medium", "high"].includes(metadata.severity)
          ? (metadata.severity as "low" | "medium" | "high")
          : null;
      const severity =
        metadataSeverity ??
        (event.status === "failure" ? "high" : event.status === "success" ? "low" : "medium");

      const recommendedAction =
        (typeof metadata?.recommended_action === "string" && metadata.recommended_action) ||
        defaultEventRecommendedAction(event.event_type);

      const failedNode =
        event.node_name ||
        (typeof metadata?.failed_node === "string" ? metadata.failed_node : null);

      return {
        id: event.id,
        event_time: event.created_at.toISOString(),
        severity,
        event_type: event.event_type,
        message: event.error_message,
        n8n_workflow_id:
          (typeof metadata?.n8n_workflow_id === "string" && metadata.n8n_workflow_id) ||
          workflow.n8n_workflow_id,
        execution_id:
          event.run_id ||
          (typeof metadata?.execution_id === "string" ? metadata.execution_id : null),
        failed_node: failedNode,
        recommended_action: recommendedAction ?? null,
        metadata
      };
    })
  };
}

export async function fixProjectWorkflow(projectId: string) {
  const snapshot = await getProjectWithWorkflow(projectId);
  const workflow = snapshot.workflow;
  if (!workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }

  if (workflow.status !== "rejected") {
    throw new AppError(
      409,
      "WORKFLOW_NOT_REJECTED",
      "Workflow is not rejected. Fix is only available for rejected workflows.",
      {
        workflow_id: workflow.id,
        workflow_status: workflow.status
      }
    );
  }

  const messages = await listMessagesByProjectId(projectId);
  const originalRequest =
    messages.find((message) => message.role === "user")?.content ?? snapshot.project.description;

  const fixed = await fixRejectedWorkflow({
    originalRequest,
    workflow: workflow.json,
    validationErrors: workflow.validation_errors ?? []
  });

  const nextStatus: WorkflowStatus = fixed.validation.valid ? "validated" : "rejected";
  const nextErrors = fixed.validation.valid ? null : fixed.validation.errors;
  const nextWorkflowJson = fixed.validation.valid
    ? fixed.workflow
    : redactSecrets(fixed.workflow);

  await withTransaction(async (connection) => {
    await updateWorkflowById(
      workflow.id,
      {
        json: nextWorkflowJson,
        status: nextStatus,
        validationErrors: nextErrors
      },
      connection
    );
    await updateProjectStatus(projectId, "draft", connection);
  });

  await createWorkflowEvent({
    workflowId: workflow.id,
    runId: null,
    nodeName: null,
    eventType: nextStatus === "validated" ? "workflow_validated" : "workflow_rejected",
    status: nextStatus === "validated" ? "success" : "failure",
    durationMs: null,
    errorMessage:
      nextStatus === "validated"
        ? "Workflow fixed and validated."
        : "Workflow remains rejected after fix attempt.",
    metadata: nextStatus === "validated" ? null : { validation_errors: nextErrors ?? [] }
  });

  return {
    workflow_id: workflow.id,
    workflow_status: nextStatus,
    validation_errors: nextErrors ?? []
  };
}

async function getStoredProjectCredentialBindings(
  projectId: string
): Promise<{
  workflowId: string;
  workflowStatus: WorkflowStatus;
  validationErrors: string[] | null;
  bindings: NodeCredentialBindingRef[];
}> {
  const snapshot = await getProjectWithWorkflow(projectId);
  const workflow = snapshot.workflow;
  if (!workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }

  const stored = await listWorkflowCredentialBindings(workflow.id);
  return {
    workflowId: workflow.id,
    workflowStatus: workflow.status,
    validationErrors: workflow.validation_errors,
    bindings: mapStoredCredentialBindings(stored)
  };
}

export async function getProjectCredentialBindings(projectId: string) {
  const payload = await getStoredProjectCredentialBindings(projectId);
  return {
    project_id: projectId,
    workflow_id: payload.workflowId,
    workflow_status: payload.workflowStatus,
    bindings: payload.bindings,
    credential_bindings: payload.bindings,
    legacy_bindings: mapLegacyCredentialBindings(payload.bindings)
  };
}

export async function saveProjectCredentialBindings(
  projectId: string,
  input: { credentialBindings: NodeCredentialBindingRef[] | Record<string, CredentialBindingRef> }
) {
  const payload = await getStoredProjectCredentialBindings(projectId);
  if (payload.workflowStatus === "rejected") {
    throw buildWorkflowRejectedError({
      workflowId: payload.workflowId,
      validationErrors: payload.validationErrors
    });
  }

  const parsedBindings = parseCredentialBindingsInput(input.credentialBindings);

  await withTransaction(async (connection) => {
    await replaceWorkflowCredentialBindings(
      projectId,
      payload.workflowId,
      toBindingWrites(parsedBindings),
      connection
    );
    await updateProjectStatus(projectId, "draft", connection);
  });

  const refreshed = await getProjectCredentialBindings(projectId);
  return refreshed;
}

export async function getProjectDeployPreflight(
  projectId: string,
  input?: { credentialBindings?: NodeCredentialBindingRef[] | Record<string, CredentialBindingRef> }
): Promise<DeployPreflightResult> {
  const snapshot = await getProjectWithWorkflow(projectId);
  const workflow = snapshot.workflow;
  if (!workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }
  assertWorkflowNotRejected(workflow);

  const storedRows = await listWorkflowCredentialBindings(workflow.id);
  const storedBindings = mapStoredCredentialBindings(storedRows);
  const inputBindings = parseCredentialBindingsInput(input?.credentialBindings);
  const mergedBindings = mergeCredentialBindings(inputBindings, storedBindings);

  const available = await loadAvailableCredentialsSafe();
  return buildPreflightPayload({
    projectId,
    workflowId: workflow.id,
    workflowStatus: workflow.status,
    n8nWorkflowId: workflow.n8n_workflow_id,
    workflowJson: workflow.json,
    projectName: snapshot.project.name,
    storedBindings,
    mergedBindings,
    credentials: available.credentials,
    credentialsSourceOk: available.sourceOk,
    credentialsSourceError: available.sourceError
  });
}

// In-memory lock to prevent concurrent deploys on the same project.
// Without this, two simultaneous /deploy requests both see n8n_workflow_id=null
// and both create new workflows in n8n, leaving one orphaned.
const deployLock = new Set<string>();

export async function deployProject(projectId: string, input: DeployInput) {
  if (deployLock.has(projectId)) {
    throw new AppError(
      409,
      "DEPLOY_IN_PROGRESS",
      "A deploy is already in progress for this project. Please wait and try again."
    );
  }
  deployLock.add(projectId);
  try {
    return await _deployProjectInner(projectId, input);
  } finally {
    deployLock.delete(projectId);
  }
}

async function _deployProjectInner(projectId: string, input: DeployInput) {
  const activate = input.activate;
  const snapshot = await getProjectWithWorkflow(projectId);
  const workflow = snapshot.workflow;
  if (!workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }
  assertWorkflowNotRejected(workflow);

  const providedBindings = parseCredentialBindingsInput(input.credentialBindings);
  const preflight = await getProjectDeployPreflight(projectId, {
    credentialBindings: providedBindings
  });

  if (!preflight.can_deploy_inactive) {
    throw new AppError(
      400,
      "WORKFLOW_NOT_DEPLOYABLE",
      `Workflow status '${workflow.status}' is not deployable.`
    );
  }

  if (activate && !preflight.credentials_source_ok) {
    throw new AppError(
      502,
      "N8N_CREDENTIALS_PRECHECK_FAILED",
      "Unable to verify n8n credentials before activation.",
      {
        credentials_source_error: preflight.credentials_source_error
      }
    );
  }

  if (activate && preflight.missing_credentials.length > 0) {
    throw new AppError(
      409,
      "CREDENTIAL_BINDINGS_REQUIRED",
      "Missing credential bindings. Fill required credentials before activation.",
      {
        project_id: projectId,
        workflow_id: workflow.id,
        required_credentials: preflight.requirements,
        missing_credentials: preflight.missing_credentials
      }
    );
  }

  const finalBindings = buildBindingsFromPreflight(preflight, providedBindings);
  if (finalBindings.length > 0) {
    await replaceWorkflowCredentialBindings(
      projectId,
      workflow.id,
      toBindingWrites(finalBindings)
    );
  }

  const normalizedWorkflow = normalizeWorkflowForDeploy(workflow.json, snapshot.project.name);
  const workflowJsonWithBindings = applyCredentialBindingsToWorkflow(
    normalizedWorkflow,
    finalBindings
  );

  // Persist the normalized/canonical workflow JSON before talking to n8n so DB stays source-of-truth.
  await updateWorkflowJsonOnDeploy(workflow.id, workflowJsonWithBindings as unknown as N8nWorkflow);
  const deployNodeTypesWithVersions = listNodeTypesWithVersions(
    workflowJsonWithBindings.nodes as Array<Partial<N8nNode>>
  );
  const deployNormalizedNodeVersions = buildNormalizedNodeVersions(
    workflowJsonWithBindings.nodes as Array<Partial<N8nNode>>
  );
  const deployIncompatibleNodes = detectIncompatibleNodes(
    workflowJsonWithBindings.nodes as Array<Partial<N8nNode>>
  );

  const payloadConnectionSourcesCount = Object.keys(workflowJsonWithBindings.connections).length;

  logInfo("projects", "Deploy payload prepared", {
    project_id: projectId,
    workflow_id: workflow.id,
    requested_activate: activate,
    existing_n8n_workflow_id: workflow.n8n_workflow_id,
    payload_name: workflowJsonWithBindings.name,
    payload_nodes_count: workflowJsonWithBindings.nodes.length,
    payload_connection_sources_count: payloadConnectionSourcesCount,
    payload_settings_keys: Object.keys(workflowJsonWithBindings.settings),
    node_types_with_versions: deployNodeTypesWithVersions,
    normalized_node_versions: deployNormalizedNodeVersions,
    incompatible_nodes: deployIncompatibleNodes
  });

  // Safety net: warn when the normalizer produces a multi-node workflow with no connections.
  // This typically means the normalizer silently dropped all connections during name resolution.
  if (workflowJsonWithBindings.nodes.length > 1 && payloadConnectionSourcesCount === 0) {
    logWarn("projects", "Deploy payload has multiple nodes but zero connections — workflow may appear empty in n8n UI", {
      project_id: projectId,
      workflow_id: workflow.id,
      nodes_count: workflowJsonWithBindings.nodes.length,
      node_names: workflowJsonWithBindings.nodes
        .map((n) => (n && typeof n === "object" && "name" in n ? (n as { name?: unknown }).name : null))
        .filter((name): name is string => typeof name === "string")
    });
  }

  let n8nWorkflowId = workflow.n8n_workflow_id;
  if (!n8nWorkflowId) {
    const created = await createN8nWorkflow({
      name: workflowJsonWithBindings.name ?? snapshot.project.name,
      nodes: workflowJsonWithBindings.nodes as unknown as typeof workflow.json.nodes,
      connections: workflowJsonWithBindings.connections as unknown as typeof workflow.json.connections,
      settings: workflowJsonWithBindings.settings
    });

    if (!created.id) {
      throw new AppError(502, "N8N_BAD_RESPONSE", "n8n did not return workflow id.");
    }

    n8nWorkflowId = created.id;
    logInfo("projects", "n8n workflow created", {
      project_id: projectId,
      workflow_id: workflow.id,
      n8n_workflow_id: n8nWorkflowId,
      response_nodes_count: Array.isArray(created.nodes) ? created.nodes.length : null
    });
    await withTransaction(async (connection) => {
      await attachWorkflowToN8n(workflow.id, n8nWorkflowId!, connection);
      await updateProjectStatus(projectId, "draft", connection);
    });
  } else {
    const updated = await updateN8nWorkflow(n8nWorkflowId, {
      name: workflowJsonWithBindings.name ?? snapshot.project.name,
      nodes: workflowJsonWithBindings.nodes as unknown as typeof workflow.json.nodes,
      connections: workflowJsonWithBindings.connections as unknown as typeof workflow.json.connections,
      settings: workflowJsonWithBindings.settings
    });
    logInfo("projects", "n8n workflow updated", {
      project_id: projectId,
      workflow_id: workflow.id,
      n8n_workflow_id: n8nWorkflowId,
      response_nodes_count: Array.isArray(updated.nodes) ? updated.nodes.length : null
    });
  }

  let activationWarning: string | null = null;
  let effectiveActivate = activate;

  if (activate && n8nWorkflowId) {
    try {
      await activateN8nWorkflow(n8nWorkflowId);
    } catch (error) {
      if (error instanceof AppError && error.code === "N8N_ACTIVATE_FAILED") {
        const details = parseN8nDetails(error.details);
        const missingCredentials = extractMissingCredentials(details.message);
        if (missingCredentials.length > 0) {
          throw new AppError(
            409,
            "N8N_MISSING_CREDENTIALS",
            "n8n workflow has missing credentials and cannot be activated.",
            {
              n8n_workflow_id: n8nWorkflowId,
              missing_credentials: missingCredentials,
              n8n_message: details.message
            }
          );
        }
        // Non-credentials n8n validation error (e.g. invalid node config, "Could not find
        // property option"). The workflow already exists in n8n — degrade gracefully to
        // deployed_inactive so the caller can open it in n8n and fix the configuration.
        const n8nMsg = extractN8nMessage(error.details);
        activationWarning =
          n8nMsg ??
          "n8n rejected activation — workflow saved as inactive. Open in n8n to fix the node configuration.";
        effectiveActivate = false;
        logWarn("projects", "Activation failed — deploying as inactive", {
          project_id: projectId,
          n8n_workflow_id: n8nWorkflowId,
          n8n_message: activationWarning
        });
      } else {
        throw error;
      }
    }
  }

  if (!activate && n8nWorkflowId) {
    try {
      await deactivateN8nWorkflow(n8nWorkflowId);
      await emitDeploymentEvent({
        workflowId: workflow.id,
        eventType: "workflow_deactivated",
        status: "success",
        message: "Workflow deactivated in n8n.",
        metadata: {
          project_id: projectId,
          n8n_workflow_id: n8nWorkflowId
        }
      });
    } catch (error) {
      if (!isN8nWorkflowMissingError(error)) {
        throw error;
      }
    }
  }

  await withTransaction(async (connection) => {
    await markWorkflowDeployed(workflow.id, n8nWorkflowId!, effectiveActivate, connection);
    await updateProjectStatus(projectId, effectiveActivate ? "active" : "draft", connection);
  });

  // Schedule tracking — register or update the row used by the drift sweep.
  // We use the normalized + binding-applied workflow definition so the
  // recorded trigger matches what n8n actually executes. Soft-failing because
  // schedule tracking is observability, not a deploy blocker.
  try {
    await registerScheduleTrackingFromDeploy({
      workflowId: workflow.id,
      workflowNodes: workflowJsonWithBindings.nodes as Array<{ type?: string; parameters?: unknown }>
    });
  } catch (err) {
    logWarn("projects", "Schedule tracking registration failed", {
      project_id: projectId,
      workflow_id: workflow.id,
      error: toAppErrorMessage(err)
    });
  }

  await emitDeploymentEvent({
    workflowId: workflow.id,
    eventType: "workflow_deployed",
    status: "success",
    message: "Workflow deployed to n8n.",
    metadata: {
      project_id: projectId,
      n8n_workflow_id: n8nWorkflowId,
      active: activate
    }
  });

  if (effectiveActivate) {
    await emitDeploymentEvent({
      workflowId: workflow.id,
      eventType: "workflow_activated",
      status: "success",
      message: "Workflow activated in n8n.",
      metadata: {
        project_id: projectId,
        n8n_workflow_id: n8nWorkflowId
      }
    });
  }

  logInfo("projects", "Deploy completed", {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: n8nWorkflowId,
    workflow_status: effectiveActivate ? "deployed_active" : "deployed_inactive",
    activation_warning: activationWarning ?? undefined,
    payload_nodes_count: workflowJsonWithBindings.nodes.length,
    payload_connection_sources_count: Object.keys(workflowJsonWithBindings.connections).length
  });

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    workflow_status: effectiveActivate ? "deployed_active" : "deployed_inactive",
    n8n_workflow_id: n8nWorkflowId,
    activated: effectiveActivate,
    activation_warning: activationWarning ?? undefined
  };
}

export async function deleteProjectAutomation(projectId: string): Promise<DeleteProjectResult> {
  // Tenant-scoped: deleting someone else's project returns 404, never 403.
  await loadProjectOwned(projectId);

  const workflows = await listWorkflowsByProjectId(projectId);
  const n8nWorkflowIds = Array.from(
    new Set(
      workflows
        .map((workflow) => workflow.n8n_workflow_id)
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
    )
  );

  const deactivated: string[] = [];
  const deleted: string[] = [];
  const notFound: string[] = [];
  const remoteFailures: Array<{ n8n_workflow_id: string; operation: "deactivate" | "delete"; error: string }> =
    [];

  for (const n8nWorkflowId of n8nWorkflowIds) {
    try {
      await deactivateN8nWorkflow(n8nWorkflowId);
      deactivated.push(n8nWorkflowId);
    } catch (error) {
      if (isN8nWorkflowMissingError(error)) {
        notFound.push(n8nWorkflowId);
      } else {
        remoteFailures.push({
          n8n_workflow_id: n8nWorkflowId,
          operation: "deactivate",
          error: toAppErrorMessage(error)
        });
      }
    }

    try {
      await deleteN8nWorkflow(n8nWorkflowId);
      deleted.push(n8nWorkflowId);
    } catch (error) {
      if (isN8nWorkflowMissingError(error)) {
        notFound.push(n8nWorkflowId);
      } else {
        remoteFailures.push({
          n8n_workflow_id: n8nWorkflowId,
          operation: "delete",
          error: toAppErrorMessage(error)
        });
      }
    }
  }

  const removed = await deleteProjectById(projectId);
  if (!removed) {
    throw new AppError(500, "PROJECT_DELETE_FAILED", "Project delete failed.");
  }

  for (const workflow of workflows) {
    await emitDeploymentEvent({
      workflowId: workflow.id,
      eventType: "workflow_deleted",
      status: remoteFailures.length > 0 ? "info" : "success",
      message:
        remoteFailures.length > 0
          ? "Workflow deleted locally with remote cleanup warnings."
          : "Workflow deleted.",
      metadata: {
        project_id: projectId,
        n8n_workflow_id: workflow.n8n_workflow_id
      }
    });
  }

  return {
    project_id: projectId,
    deleted: true,
    remote: {
      attempted_n8n_workflow_ids: n8nWorkflowIds,
      deactivated_n8n_workflow_ids: deactivated,
      deleted_n8n_workflow_ids: deleted,
      not_found_n8n_workflow_ids: Array.from(new Set(notFound))
    },
    cleanup_warnings: remoteFailures
  };
}
