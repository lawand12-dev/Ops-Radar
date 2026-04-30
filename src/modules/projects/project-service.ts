import { withTransaction } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { listMessagesByProjectId } from "../chat/chat-repository";
import {
  activateN8nWorkflow,
  createN8nWorkflow,
  listN8nCredentials,
  type N8nCredentialSummary,
  updateN8nWorkflow
} from "../n8n/n8n-client";
import { getProjectById, listProjects, updateProjectStatus } from "./project-repository";
import { getWorkflowStatus } from "../workflows/workflow-service";
import {
  attachWorkflowToN8n,
  getLatestWorkflowByProjectId,
  markWorkflowDeployed,
  updateWorkflowStatus
} from "../workflows/workflow-repository";
import {
  listWorkflowCredentialBindings,
  replaceWorkflowCredentialBindings
} from "./credential-binding-repository";

const DEPLOYABLE_WORKFLOW_STATUSES = new Set(["validated", "approved"]);

export interface CredentialBindingRef {
  id?: string;
  name?: string;
}

export interface DeployInput {
  activate: boolean;
  credentialBindings?: Record<string, CredentialBindingRef>;
}

export interface DeployCredentialRequirement {
  credential_type: string;
  nodes: string[];
  provided_binding: CredentialBindingRef | null;
  resolved_binding: CredentialBindingRef | null;
  available_credentials: Array<{ id: string; name: string }>;
  resolved: boolean;
}

export interface DeployPreflightResult {
  project_id: string;
  workflow_id: string;
  workflow_status: string;
  deployable: boolean;
  n8n_workflow_id: string | null;
  requirements: DeployCredentialRequirement[];
  missing_credentials: Array<{
    credential_type: string;
    nodes: string[];
  }>;
  credentials_source_ok: boolean;
  credentials_source_error: string | null;
  stored_bindings: Record<string, CredentialBindingRef>;
  can_activate: boolean;
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

export async function listProjectsSnapshot(limit = 20, offset = 0) {
  const projects = await listProjects({ limit, offset });

  const records = await Promise.all(
    projects.map(async (project) => {
      const workflow = await getLatestWorkflowByProjectId(project.id);
      const statusSnapshot = workflow ? await getWorkflowStatus(workflow.id) : null;
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
          : null
      };
    })
  );

  return records;
}

export async function getProjectWithWorkflow(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

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

export async function getProjectChatMessages(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found.");
  }

  const messages = await listMessagesByProjectId(projectId);

  return {
    project_id: projectId,
    messages
  };
}

export async function getProjectCredentialBindings(projectId: string) {
  const payload = await getStoredProjectCredentialBindings(projectId);
  return {
    project_id: projectId,
    workflow_id: payload.workflowId,
    workflow_status: payload.workflowStatus,
    credential_bindings: payload.bindings
  };
}

export async function saveProjectCredentialBindings(
  projectId: string,
  input: { credentialBindings: Record<string, CredentialBindingRef> }
) {
  const payload = await getStoredProjectCredentialBindings(projectId);
  await withTransaction(async (connection) => {
    await replaceWorkflowCredentialBindings(payload.workflowId, input.credentialBindings, connection);
    await updateProjectStatus(projectId, "draft", connection);
  });

  const refreshed = await getProjectCredentialBindings(projectId);
  return refreshed;
}

const DEFAULT_NODE_CREDENTIALS: Record<string, string[]> = {
  "n8n-nodes-base.imapEmail": ["imap"],
  "n8n-nodes-base.emailReadImap": ["imap"],
  "n8n-nodes-base.telegram": ["telegramApi"],
  "n8n-nodes-base.slack": ["slackApi"],
  "n8n-nodes-base.gmail": ["gmailOAuth2"],
  "n8n-nodes-base.microsoftOutlook": ["microsoftOutlookOAuth2Api"]
};

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

function collectCredentialRequirements(input: {
  workflow: {
    nodes: Array<Record<string, unknown>>;
    connections: Record<string, unknown>;
    settings?: Record<string, unknown>;
  };
  availableCredentials: N8nCredentialSummary[];
  credentialBindings?: Record<string, CredentialBindingRef>;
}): DeployCredentialRequirement[] {
  const requirements = new Map<
    string,
    {
      credential_type: string;
      nodes: Set<string>;
      provided_binding: CredentialBindingRef | null;
      resolved_binding: CredentialBindingRef | null;
      available_credentials: Array<{ id: string; name: string }>;
      resolved: boolean;
    }
  >();

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

    const nodeName =
      typeof node.name === "string" && node.name.trim().length > 0 ? node.name.trim() : "Unknown Node";
    const nodeType = typeof node.type === "string" ? node.type : "";
    const existingCredentials =
      node.credentials && typeof node.credentials === "object"
        ? (node.credentials as Record<string, unknown>)
        : {};

    const requiredTypes = new Set<string>([
      ...Object.keys(existingCredentials),
      ...(DEFAULT_NODE_CREDENTIALS[nodeType] ?? [])
    ]);

    for (const credentialType of requiredTypes) {
      const sourceBinding =
        input.credentialBindings?.[credentialType] ?? parseCredentialRef(existingCredentials[credentialType]);
      const availableForType = availableByType.get(credentialType) ?? [];
      const resolvedBinding = resolveCredentialRef(
        credentialType,
        sourceBinding,
        availableForType
      );

      const existing = requirements.get(credentialType);
      if (!existing) {
        requirements.set(credentialType, {
          credential_type: credentialType,
          nodes: new Set([nodeName]),
          provided_binding: sourceBinding,
          resolved_binding: resolvedBinding,
          available_credentials: availableForType.map((credential) => ({
            id: credential.id,
            name: credential.name
          })),
          resolved: Boolean(resolvedBinding)
        });
        continue;
      }

      existing.nodes.add(nodeName);
      if (!existing.provided_binding && sourceBinding) {
        existing.provided_binding = sourceBinding;
      }
      if (!existing.resolved_binding && resolvedBinding) {
        existing.resolved_binding = resolvedBinding;
      }
      existing.resolved = existing.resolved && Boolean(resolvedBinding);
    }
  }

  return Array.from(requirements.values()).map((item) => ({
    credential_type: item.credential_type,
    nodes: Array.from(item.nodes),
    provided_binding: item.provided_binding,
    resolved_binding: item.resolved_binding,
    available_credentials: item.available_credentials,
    resolved: item.resolved
  }));
}

function applyCredentialBindingsToWorkflow(
  workflow: {
    nodes: Array<Record<string, unknown>>;
    connections: Record<string, unknown>;
    settings?: Record<string, unknown>;
  },
  credentialBindings?: Record<string, CredentialBindingRef>
) {
  if (!credentialBindings || Object.keys(credentialBindings).length === 0) {
    return workflow;
  }

  const next = structuredClone(workflow);
  for (const node of next.nodes) {
    const nodeType = typeof node.type === "string" ? node.type : "";
    const existingCredentials =
      node.credentials && typeof node.credentials === "object"
        ? (node.credentials as Record<string, unknown>)
        : {};

    const requiredTypes = new Set<string>([
      ...Object.keys(existingCredentials),
      ...(DEFAULT_NODE_CREDENTIALS[nodeType] ?? [])
    ]);

    if (requiredTypes.size === 0) {
      continue;
    }

    const credentials: Record<string, unknown> = { ...existingCredentials };
    for (const credentialType of requiredTypes) {
      const binding = credentialBindings[credentialType];
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

async function resolveCredentialBindings(
  credentialBindings?: Record<string, CredentialBindingRef>,
  availableCredentials?: N8nCredentialSummary[]
): Promise<Record<string, CredentialBindingRef> | undefined> {
  if (!credentialBindings || Object.keys(credentialBindings).length === 0) {
    return undefined;
  }

  const needsLookup = Object.entries(credentialBindings).some(
    ([, binding]) => binding?.name && !binding?.id
  );
  if (!needsLookup) {
    return credentialBindings;
  }

  const available = availableCredentials ?? (await listN8nCredentials());
  const out: Record<string, CredentialBindingRef> = {};

  for (const [type, binding] of Object.entries(credentialBindings)) {
    if (!binding) {
      continue;
    }
    if (binding.id) {
      out[type] = binding;
      continue;
    }
    if (!binding.name) {
      out[type] = binding;
      continue;
    }

    const found = available.find(
      (credential) =>
        credential.type === type &&
        credential.name.toLowerCase() === binding.name!.toLowerCase()
    );

    out[type] = found ? { id: found.id, name: found.name } : binding;
  }

  return out;
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

function buildBindingsFromPreflight(
  preflight: DeployPreflightResult,
  fallback?: Record<string, CredentialBindingRef>
): Record<string, CredentialBindingRef> | undefined {
  const output: Record<string, CredentialBindingRef> = {};

  if (fallback) {
    for (const [type, binding] of Object.entries(fallback)) {
      if (!binding) {
        continue;
      }
      output[type] = { ...binding };
    }
  }

  for (const requirement of preflight.requirements) {
    if (!requirement.resolved_binding) {
      continue;
    }
    output[requirement.credential_type] = { ...requirement.resolved_binding };
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

function mergeCredentialBindings(
  primary?: Record<string, CredentialBindingRef>,
  secondary?: Record<string, CredentialBindingRef>
): Record<string, CredentialBindingRef> | undefined {
  const output: Record<string, CredentialBindingRef> = {};

  if (secondary) {
    for (const [type, binding] of Object.entries(secondary)) {
      if (!binding) {
        continue;
      }
      output[type] = { ...binding };
    }
  }

  if (primary) {
    for (const [type, binding] of Object.entries(primary)) {
      if (!binding) {
        continue;
      }
      output[type] = { ...binding };
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

function mapStoredCredentialBindings(
  rows: Array<{
    credential_type: string;
    credential_id: string | null;
    credential_name: string | null;
  }>
): Record<string, CredentialBindingRef> {
  const output: Record<string, CredentialBindingRef> = {};
  for (const row of rows) {
    const binding: CredentialBindingRef = {};
    if (row.credential_id) {
      binding.id = row.credential_id;
    }
    if (row.credential_name) {
      binding.name = row.credential_name;
    }
    if (binding.id || binding.name) {
      output[row.credential_type] = binding;
    }
  }
  return output;
}

async function getStoredProjectCredentialBindings(
  projectId: string
): Promise<{
  workflowId: string;
  workflowStatus: string;
  bindings: Record<string, CredentialBindingRef>;
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
    bindings: mapStoredCredentialBindings(stored)
  };
}

export async function getProjectDeployPreflight(
  projectId: string,
  input?: { credentialBindings?: Record<string, CredentialBindingRef> }
): Promise<DeployPreflightResult> {
  const snapshot = await getProjectWithWorkflow(projectId);
  const workflow = snapshot.workflow;
  if (!workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }

  const deployable = DEPLOYABLE_WORKFLOW_STATUSES.has(workflow.status);
  const storedRows = await listWorkflowCredentialBindings(workflow.id);
  const storedBindings = mapStoredCredentialBindings(storedRows);

  let availableCredentials: N8nCredentialSummary[] = [];
  let credentialsSourceOk = true;
  let credentialsSourceError: string | null = null;

  try {
    availableCredentials = await listN8nCredentials();
  } catch (error) {
    credentialsSourceOk = false;
    credentialsSourceError = toAppErrorMessage(error);
  }

  const mergedBindings = mergeCredentialBindings(input?.credentialBindings, storedBindings);
  const normalizedBindings = credentialsSourceOk
    ? await resolveCredentialBindings(mergedBindings, availableCredentials)
    : mergedBindings;
  const workflowJsonWithBindings = applyCredentialBindingsToWorkflow(
    workflow.json as unknown as {
      nodes: Array<Record<string, unknown>>;
      connections: Record<string, unknown>;
      settings?: Record<string, unknown>;
    },
    normalizedBindings
  );

  const requirements = collectCredentialRequirements({
    workflow: workflowJsonWithBindings,
    availableCredentials,
    credentialBindings: normalizedBindings
  });

  const missingCredentials = requirements
    .filter((item) => !item.resolved)
    .map((item) => ({
      credential_type: item.credential_type,
      nodes: item.nodes
    }));

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    workflow_status: workflow.status,
    deployable,
    n8n_workflow_id: workflow.n8n_workflow_id,
    requirements,
    missing_credentials: missingCredentials,
    credentials_source_ok: credentialsSourceOk,
    credentials_source_error: credentialsSourceError,
    stored_bindings: storedBindings,
    can_activate: deployable && missingCredentials.length === 0 && credentialsSourceOk
  };
}

export async function deployProject(projectId: string, input: DeployInput) {
  const activate = input.activate;
  const snapshot = await getProjectWithWorkflow(projectId);
  const workflow = snapshot.workflow;
  if (!workflow) {
    throw new AppError(400, "WORKFLOW_NOT_FOUND", "Project has no workflow.");
  }

  if (!DEPLOYABLE_WORKFLOW_STATUSES.has(workflow.status)) {
    throw new AppError(
      400,
      "WORKFLOW_NOT_DEPLOYABLE",
      `Workflow status '${workflow.status}' is not deployable.`
    );
  }

  const preflight = await getProjectDeployPreflight(projectId, {
    credentialBindings: input.credentialBindings
  });

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
        missing_credentials: preflight.missing_credentials,
        hint: "Call POST /projects/:projectId/deploy with credential_bindings."
      }
    );
  }

  const normalizedBindings = buildBindingsFromPreflight(preflight, input.credentialBindings);
  if (normalizedBindings && Object.keys(normalizedBindings).length > 0) {
    await replaceWorkflowCredentialBindings(workflow.id, normalizedBindings);
  }
  const workflowJsonWithBindings = applyCredentialBindingsToWorkflow(
    workflow.json as unknown as {
      nodes: Array<Record<string, unknown>>;
      connections: Record<string, unknown>;
      settings?: Record<string, unknown>;
    },
    normalizedBindings
  );

  let n8nWorkflowId = workflow.n8n_workflow_id;
  if (!n8nWorkflowId) {
    const created = await createN8nWorkflow({
      name: snapshot.project.name,
      nodes: workflowJsonWithBindings.nodes as unknown as typeof workflow.json.nodes,
      connections: workflowJsonWithBindings.connections as unknown as typeof workflow.json.connections,
      settings: workflowJsonWithBindings.settings ?? {}
    });

    if (!created.id) {
      throw new AppError(502, "N8N_BAD_RESPONSE", "n8n did not return workflow id.");
    }

    n8nWorkflowId = created.id;
    await withTransaction(async (connection) => {
      await attachWorkflowToN8n(workflow.id, n8nWorkflowId!, connection);
      await updateProjectStatus(projectId, "draft", connection);
    });
  } else {
    await updateN8nWorkflow(n8nWorkflowId, {
      name: snapshot.project.name,
      nodes: workflowJsonWithBindings.nodes as unknown as typeof workflow.json.nodes,
      connections: workflowJsonWithBindings.connections as unknown as typeof workflow.json.connections,
      settings: workflowJsonWithBindings.settings ?? {}
    });
  }

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
              credential_bindings_hint: {
                imap: { id: "YOUR_IMAP_CREDENTIAL_ID" },
                telegramApi: { id: "YOUR_TELEGRAM_CREDENTIAL_ID" }
              },
              n8n_message: details.message
            }
          );
        }
      }
      throw error;
    }
  }

  await withTransaction(async (connection) => {
    if (activate) {
      await markWorkflowDeployed(workflow.id, n8nWorkflowId!, connection);
      await updateProjectStatus(projectId, "active", connection);
    } else {
      await updateWorkflowStatus(workflow.id, "approved", connection);
      await updateProjectStatus(projectId, "draft", connection);
    }
  });

  return {
    project_id: projectId,
    workflow_id: workflow.id,
    n8n_workflow_id: n8nWorkflowId,
    activated: activate
  };
}
