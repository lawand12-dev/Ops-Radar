import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import type { N8nWorkflow } from "../../types/workflow";

interface N8nCreateWorkflowRequest extends N8nWorkflow {
  name: string;
}

interface N8nUpdateWorkflowRequest extends N8nWorkflow {
  name: string;
}

interface N8nWorkflowResponse {
  id: string;
  active?: boolean;
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

function getHeaders(): Record<string, string> {
  if (!env.N8N_API_KEY) {
    throw new AppError(500, "N8N_CONFIG_ERROR", "N8N_API_KEY is required for deployment.");
  }

  return {
    "Content-Type": "application/json",
    "X-N8N-API-KEY": env.N8N_API_KEY
  };
}

export async function createN8nWorkflow(input: N8nCreateWorkflowRequest): Promise<N8nWorkflowResponse> {
  const payload = {
    ...input,
    settings: input.settings ?? {}
  };

  const response = await fetch(`${env.N8N_BASE_URL}/workflows`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "N8N_CREATE_FAILED", "n8n workflow creation failed.", details);
  }

  return (await response.json()) as N8nWorkflowResponse;
}

export async function updateN8nWorkflow(
  workflowId: string,
  input: N8nUpdateWorkflowRequest
): Promise<N8nWorkflowResponse> {
  const payload = {
    ...input,
    settings: input.settings ?? {}
  };

  const response = await fetch(`${env.N8N_BASE_URL}/workflows/${workflowId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "N8N_UPDATE_FAILED", "n8n workflow update failed.", details);
  }

  return (await response.json()) as N8nWorkflowResponse;
}

export async function activateN8nWorkflow(workflowId: string): Promise<N8nWorkflowResponse> {
  const response = await fetch(`${env.N8N_BASE_URL}/workflows/${workflowId}/activate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "N8N_ACTIVATE_FAILED", "n8n workflow activation failed.", details);
  }

  return (await response.json()) as N8nWorkflowResponse;
}

export async function listN8nCredentials(): Promise<N8nCredentialSummary[]> {
  const response = await fetch(`${env.N8N_BASE_URL}/credentials`, {
    method: "GET",
    headers: getHeaders()
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "N8N_CREDENTIALS_LIST_FAILED", "n8n credentials list failed.", details);
  }

  const payload = (await response.json()) as unknown;
  const data = (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>) &&
    Array.isArray((payload as Record<string, unknown>).data)
      ? (payload as { data: Array<Record<string, unknown>> }).data
      : Array.isArray(payload)
        ? (payload as Array<Record<string, unknown>>)
        : []
  )
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      type: String(item.type ?? "")
    }))
    .filter((item) => item.id.length > 0 && item.type.length > 0);

  return data;
}

export async function getN8nCredentialSchema(
  credentialType: string
): Promise<N8nCredentialSchemaResponse> {
  const response = await fetch(
    `${env.N8N_BASE_URL}/credentials/schema/${encodeURIComponent(credentialType)}`,
    {
      method: "GET",
      headers: getHeaders()
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "N8N_CREDENTIAL_SCHEMA_FAILED", "n8n credential schema request failed.", details);
  }

  return (await response.json()) as N8nCredentialSchemaResponse;
}

export async function createN8nCredential(input: {
  name: string;
  type: string;
  data: Record<string, unknown>;
}): Promise<N8nCredentialSummary> {
  const response = await fetch(`${env.N8N_BASE_URL}/credentials`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: input.name,
      type: input.type,
      data: input.data
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new AppError(502, "N8N_CREDENTIAL_CREATE_FAILED", "n8n credential creation failed.", details);
  }

  const payload = (await response.json()) as Record<string, unknown>;
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
