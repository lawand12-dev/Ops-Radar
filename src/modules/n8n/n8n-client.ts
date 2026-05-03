import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logInfo, logWarn } from "../../lib/logger";
import type { N8nWorkflow } from "../../types/workflow";

interface N8nCreateWorkflowRequest extends N8nWorkflow {
  name: string;
}

interface N8nUpdateWorkflowRequest extends N8nWorkflow {
  name: string;
}

export interface N8nWorkflowResponse {
  id: string;
  name?: string;
  active?: boolean;
  nodes?: Array<Record<string, unknown>>;
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface N8nCredentialSummary {
  id: string;
  name: string;
  type: string;
}

export interface N8nCredentialSchemaResponse {
  type: string;
  displayName?: string;
  properties?: unknown;
  [key: string]: unknown;
}

export interface N8nExecutionSummary {
  id: string;
  workflowId: string | null;
  workflowName: string | null;
  status: string;
  finished: boolean | null;
  mode: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  error: unknown;
  raw: Record<string, unknown>;
}

export interface N8nExecutionDetails extends N8nExecutionSummary {
  data: unknown;
  resultData: unknown;
}

function getHeaders(): Record<string, string> {
  if (!env.N8N_API_KEY) {
    throw new AppError(500, "N8N_CONFIG_ERROR", "N8N_API_KEY is required for deployment.");
  }

  return {
    "Content-Type": "application/json",
    "X-N8N-API-KEY": env.N8N_API_KEY
  };
}

/**
 * Detect whether a credential ID looks like a real n8n credential ID.
 * Real n8n credential IDs are numeric strings (e.g., "42") or short alphanumeric
 * identifiers. AI-generated placeholder IDs are human-readable slugs like
 * "gmail-oauth", "telegram-bot", etc.
 *
 * When fake credential IDs are sent to n8n, the node renders as
 * "Install this node to use it" instead of showing as unconfigured.
 */
function isPlausibleN8nCredentialId(id: unknown): boolean {
  if (typeof id !== "string" || id.trim().length === 0) {
    return false;
  }
  const trimmed = id.trim();
  // Numeric IDs (legacy n8n)
  if (/^\d+$/.test(trimmed)) {
    return true;
  }
  // Short alphanumeric IDs without hyphens/underscores (modern n8n)
  if (/^[a-zA-Z0-9]{8,}$/.test(trimmed) && !/\s/.test(trimmed)) {
    return true;
  }
  // UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return true;
  }
  // Everything else (e.g., "gmail-oauth", "telegram-bot") is a fake placeholder
  return false;
}

/**
 * Strip credential references that have fake/placeholder IDs from nodes
 * before deploying to n8n. This prevents the "Install this node to use it"
 * error that occurs when n8n receives credential references it cannot resolve.
 *
 * The DB copy keeps the original credentials so the user can see what the AI suggested.
 */
function sanitizeNodeCredentials<T extends { credentials?: unknown }>(nodes: T[]): T[] {
  return nodes.map((node) => {
    if (!node || typeof node !== "object") {
      return node;
    }
    const credentials = node.credentials;
    if (!credentials || typeof credentials !== "object") {
      return node;
    }

    const credentialEntries = Object.entries(credentials as Record<string, unknown>);
    const cleanedCredentials: Record<string, unknown> = {};
    let hasValidCredential = false;

    for (const [credType, credValue] of credentialEntries) {
      if (!credValue || typeof credValue !== "object") {
        continue;
      }
      const credRef = credValue as Record<string, unknown>;
      if (isPlausibleN8nCredentialId(credRef.id)) {
        cleanedCredentials[credType] = credRef;
        hasValidCredential = true;
      }
      // Fake/placeholder credential IDs are silently dropped from the deploy payload
    }

    if (hasValidCredential) {
      return { ...node, credentials: cleanedCredentials } as T;
    }
    // Remove the entire credentials block so n8n shows the node as unconfigured
    const { credentials: _dropped, ...nodeWithoutCredentials } = node;
    return nodeWithoutCredentials as T;
  });
}

function buildWorkflowPayload(input: N8nCreateWorkflowRequest | N8nUpdateWorkflowRequest) {
  if (!input || typeof input !== "object") {
    throw new AppError(
      400,
      "N8N_WORKFLOW_PAYLOAD_INVALID",
      "Workflow payload must include name, nodes, connections, and settings."
    );
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const rawNodes = Array.isArray(input.nodes) ? input.nodes : null;
  const connections =
    input.connections && typeof input.connections === "object" ? input.connections : null;
  const settings = input.settings && typeof input.settings === "object" ? input.settings : {};

  if (!name || !rawNodes || !connections) {
    throw new AppError(
      400,
      "N8N_WORKFLOW_PAYLOAD_INVALID",
      "Workflow payload must include name, nodes, connections, and settings.",
      {
        has_name: Boolean(name),
        has_nodes: Array.isArray(rawNodes),
        has_connections: Boolean(connections),
        has_settings: typeof settings === "object"
      }
    );
  }

  // Strip fake/placeholder credential IDs so n8n doesn't show
  // "Install this node to use it" for nodes with unresolvable credentials.
  const nodes = sanitizeNodeCredentials(rawNodes);

  return {
    name,
    nodes,
    connections,
    settings
  };
}

function buildWorkflowPayloadMeta(payload: {
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    workflow_name: payload.name,
    nodes_count: payload.nodes.length,
    node_names: payload.nodes
      .map((node) =>
        node && typeof node === "object" && "name" in node
          ? (node as { name?: unknown }).name
          : null
      )
      .filter((name): name is string => typeof name === "string" && name.trim().length > 0),
    node_types_with_versions: payload.nodes
      .map((node) => {
        if (!node || typeof node !== "object") {
          return null;
        }
        const objectNode = node as { type?: unknown; typeVersion?: unknown };
        const type =
          typeof objectNode.type === "string" && objectNode.type.trim().length > 0
            ? objectNode.type.trim()
            : "unknown";
        const typeVersion =
          typeof objectNode.typeVersion === "number" && Number.isFinite(objectNode.typeVersion)
            ? objectNode.typeVersion
            : null;
        return `${type}@${typeVersion ?? "?"}`;
      })
      .filter((item): item is string => Boolean(item)),
    connection_sources_count: Object.keys(payload.connections).length,
    settings_keys: Object.keys(payload.settings)
  };
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const base = env.N8N_BASE_URL.endsWith("/") ? env.N8N_BASE_URL.slice(0, -1) : env.N8N_BASE_URL;
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function n8nRequest(input: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  errorCode: string;
  errorMessage: string;
  notFoundCode?: string;
  notFoundMessage?: string;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.N8N_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(input.path, input.query), {
      method: input.method,
      headers: getHeaders(),
      body: input.body ? JSON.stringify(input.body) : undefined,
      signal: controller.signal
    });

    const payload = await parseResponsePayload(response);
    if (!response.ok) {
      logWarn("n8n", "n8n API request failed", {
        method: input.method,
        path: input.path,
        status: response.status,
        payload
      });
      if (response.status === 404 && input.notFoundCode && input.notFoundMessage) {
        throw new AppError(404, input.notFoundCode, input.notFoundMessage, {
          status: response.status,
          payload
        });
      }
      throw new AppError(502, input.errorCode, input.errorMessage, {
        status: response.status,
        payload
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof Error && error.name === "AbortError"
        ? `n8n request timed out after ${env.N8N_REQUEST_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : String(error);

    throw new AppError(502, "N8N_REQUEST_FAILED", "n8n API request failed.", {
      path: input.path,
      method: input.method,
      message
    });
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapDataArray(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  if (payload && typeof payload === "object") {
    const maybeData = (payload as Record<string, unknown>).data;
    if (Array.isArray(maybeData)) {
      return maybeData.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    }
  }
  return [];
}

function parseExecutionSummary(item: Record<string, unknown>): N8nExecutionSummary {
  return {
    id: String(item.id ?? ""),
    workflowId: item.workflowId ? String(item.workflowId) : null,
    workflowName: item.workflowName ? String(item.workflowName) : null,
    status: String(item.status ?? "unknown"),
    finished:
      typeof item.finished === "boolean" ? item.finished : item.stoppedAt ? true : null,
    mode: item.mode ? String(item.mode) : null,
    startedAt: item.startedAt ? String(item.startedAt) : null,
    stoppedAt: item.stoppedAt ? String(item.stoppedAt) : null,
    error: item.error ?? null,
    raw: item
  };
}

export async function createN8nWorkflow(input: N8nCreateWorkflowRequest): Promise<N8nWorkflowResponse> {
  const payload = buildWorkflowPayload(input);
  logInfo("n8n", "Submitting workflow payload to n8n (create)", buildWorkflowPayloadMeta(payload));
  const response = (await n8nRequest({
    method: "POST",
    path: "/workflows",
    body: payload,
    errorCode: "N8N_CREATE_FAILED",
    errorMessage: "n8n workflow creation failed."
  })) as N8nWorkflowResponse;
  logInfo("n8n", "n8n workflow create completed", {
    n8n_workflow_id: response.id,
    active: Boolean(response.active),
    nodes_count: Array.isArray(response.nodes) ? response.nodes.length : null
  });
  return response;
}

export async function updateN8nWorkflow(
  workflowId: string,
  input: N8nUpdateWorkflowRequest
): Promise<N8nWorkflowResponse> {
  const payload = buildWorkflowPayload(input);
  logInfo("n8n", "Submitting workflow payload to n8n (update)", {
    n8n_workflow_id: workflowId,
    ...buildWorkflowPayloadMeta(payload)
  });
  const response = (await n8nRequest({
    method: "PUT",
    path: `/workflows/${encodeURIComponent(workflowId)}`,
    body: payload,
    errorCode: "N8N_UPDATE_FAILED",
    errorMessage: "n8n workflow update failed."
  })) as N8nWorkflowResponse;
  logInfo("n8n", "n8n workflow update completed", {
    n8n_workflow_id: response.id || workflowId,
    active: Boolean(response.active),
    nodes_count: Array.isArray(response.nodes) ? response.nodes.length : null
  });
  return response;
}

export async function activateN8nWorkflow(workflowId: string): Promise<N8nWorkflowResponse> {
  return (await n8nRequest({
    method: "POST",
    path: `/workflows/${encodeURIComponent(workflowId)}/activate`,
    body: {},
    errorCode: "N8N_ACTIVATE_FAILED",
    errorMessage: "n8n workflow activation failed."
  })) as N8nWorkflowResponse;
}

export async function deactivateN8nWorkflow(workflowId: string): Promise<N8nWorkflowResponse> {
  return (await n8nRequest({
    method: "POST",
    path: `/workflows/${encodeURIComponent(workflowId)}/deactivate`,
    body: {},
    errorCode: "N8N_DEACTIVATE_FAILED",
    errorMessage: "n8n workflow deactivation failed.",
    notFoundCode: "N8N_WORKFLOW_NOT_FOUND",
    notFoundMessage: "Workflow does not exist in n8n."
  })) as N8nWorkflowResponse;
}

export async function deleteN8nWorkflow(workflowId: string): Promise<void> {
  await n8nRequest({
    method: "DELETE",
    path: `/workflows/${encodeURIComponent(workflowId)}`,
    errorCode: "N8N_DELETE_FAILED",
    errorMessage: "n8n workflow deletion failed.",
    notFoundCode: "N8N_WORKFLOW_NOT_FOUND",
    notFoundMessage: "Workflow does not exist in n8n."
  });
}

export async function getN8nWorkflowById(workflowId: string): Promise<N8nWorkflowResponse> {
  return (await n8nRequest({
    method: "GET",
    path: `/workflows/${encodeURIComponent(workflowId)}`,
    errorCode: "N8N_WORKFLOW_FETCH_FAILED",
    errorMessage: "Failed to fetch workflow from n8n.",
    notFoundCode: "N8N_WORKFLOW_NOT_FOUND",
    notFoundMessage: "Workflow does not exist in n8n."
  })) as N8nWorkflowResponse;
}

export async function listN8nExecutions(input: {
  workflowId: string;
  limit?: number;
  status?: string;
}): Promise<N8nExecutionSummary[]> {
  const cappedLimit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const payload = await n8nRequest({
    method: "GET",
    path: "/executions",
    query: {
      workflowId: input.workflowId,
      limit: cappedLimit,
      status: input.status
    },
    errorCode: "N8N_EXECUTIONS_LIST_FAILED",
    errorMessage: "Failed to fetch executions from n8n."
  });

  return unwrapDataArray(payload)
    .map((item) => parseExecutionSummary(item))
    .filter((item) => item.id.length > 0);
}

export async function getN8nExecutionById(
  executionId: string,
  options?: { includeData?: boolean }
): Promise<N8nExecutionDetails> {
  const payload = (await n8nRequest({
    method: "GET",
    path: `/executions/${encodeURIComponent(executionId)}`,
    query: {
      includeData: options?.includeData ?? false
    },
    errorCode: "N8N_EXECUTION_FETCH_FAILED",
    errorMessage: "Failed to fetch execution details from n8n.",
    notFoundCode: "N8N_EXECUTION_NOT_FOUND",
    notFoundMessage: "Execution does not exist in n8n."
  })) as Record<string, unknown>;

  const summary = parseExecutionSummary(payload);
  return {
    ...summary,
    data: payload.data ?? null,
    resultData:
      payload.resultData ??
      ((payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>).resultData
        : null) ?? null)
  };
}

export async function listN8nCredentials(): Promise<N8nCredentialSummary[]> {
  const payload = await n8nRequest({
    method: "GET",
    path: "/credentials",
    errorCode: "N8N_CREDENTIALS_LIST_FAILED",
    errorMessage: "n8n credentials list failed."
  });

  return unwrapDataArray(payload)
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      type: String(item.type ?? "")
    }))
    .filter((item) => item.id.length > 0 && item.type.length > 0);
}

export async function getN8nCredentialSchema(
  credentialType: string
): Promise<N8nCredentialSchemaResponse> {
  return (await n8nRequest({
    method: "GET",
    path: `/credentials/schema/${encodeURIComponent(credentialType)}`,
    errorCode: "N8N_CREDENTIAL_SCHEMA_FAILED",
    errorMessage: "n8n credential schema request failed."
  })) as N8nCredentialSchemaResponse;
}

export async function createN8nCredential(input: {
  name: string;
  type: string;
  data: Record<string, unknown>;
}): Promise<N8nCredentialSummary> {
  const payload = (await n8nRequest({
    method: "POST",
    path: "/credentials",
    body: {
      name: input.name,
      type: input.type,
      data: input.data
    },
    errorCode: "N8N_CREDENTIAL_CREATE_FAILED",
    errorMessage: "n8n credential creation failed."
  })) as Record<string, unknown>;

  const data =
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const id = String(data.id ?? "");
  const name = String(data.name ?? "");
  const type = String(data.type ?? "");

  if (!id || !type) {
    throw new AppError(502, "N8N_BAD_RESPONSE", "n8n did not return created credential metadata.", payload);
  }

  return {
    id,
    name,
    type
  };
}
