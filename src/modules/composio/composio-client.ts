import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logWarn } from "../../lib/logger";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

export interface ComposioApp {
  name: string;
  displayName: string;
  description: string | null;
  logo: string | null;
  categories: string[];
}

export interface ComposioConnectedAccount {
  id: string;
  appName: string;
  status: string;
  entityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComposioAction {
  name: string;
  appName: string;
  displayName: string;
  description: string | null;
  parameters: Record<string, unknown>;
}

export interface ComposioExecuteResult {
  successful: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
}

export interface ComposioConnectionInitResult {
  redirectUrl: string;
  connectedAccountId: string;
}

function getHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey
  };
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | undefined>
): string {
  const base = env.COMPOSIO_BASE_URL.endsWith("/")
    ? env.COMPOSIO_BASE_URL.slice(0, -1)
    : env.COMPOSIO_BASE_URL;
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && String(v).length > 0) {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function composioRequest(
  apiKey: string,
  input: {
    method: "GET" | "POST" | "DELETE";
    path: string;
    query?: Record<string, string | number | undefined>;
    body?: Record<string, unknown>;
    errorCode: string;
    errorMessage: string;
  }
): Promise<unknown> {
  const url = buildUrl(input.path, input.query);

  let response: Response;
  try {
    response = await fetchWithTimeout({
      url,
      timeoutMs: env.COMPOSIO_REQUEST_TIMEOUT_MS,
      requestName: `composio:${input.path}`,
      errorCode: input.errorCode,
      init: {
        method: input.method,
        headers: getHeaders(apiKey),
        body: input.body !== undefined ? JSON.stringify(input.body) : undefined
      }
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, input.errorCode, input.errorMessage);
  }

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    /* keep raw text */
  }

  if (!response.ok) {
    logWarn("composio", "Composio API request failed", {
      path: input.path,
      status: response.status,
      body: text.slice(0, 300)
    });
    if (response.status === 401 || response.status === 403) {
      throw new AppError(401, "COMPOSIO_AUTH_FAILED", "Invalid or missing Composio API key.");
    }
    throw new AppError(502, input.errorCode, input.errorMessage, {
      status: response.status,
      body: text.slice(0, 200)
    });
  }

  return payload;
}

function unwrapItems(payload: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    for (const key of keys) {
      const v = (payload as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function composioListApps(apiKey: string): Promise<ComposioApp[]> {
  const payload = await composioRequest(apiKey, {
    method: "GET",
    path: "/apps",
    errorCode: "COMPOSIO_APPS_LIST_FAILED",
    errorMessage: "Failed to list Composio apps."
  });

  const items = unwrapItems(payload, "items", "apps", "data") as Record<string, unknown>[];
  return items
    .map((item) => ({
      name: String(item.name ?? item.appId ?? item.key ?? ""),
      displayName: String(item.displayName ?? item.name ?? ""),
      description: item.description ? String(item.description) : null,
      logo: item.logo ? String(item.logo) : null,
      categories: Array.isArray(item.categories) ? item.categories.map(String) : []
    }))
    .filter((a) => a.name.length > 0);
}

export async function composioListConnectedAccounts(
  apiKey: string,
  entityId: string
): Promise<ComposioConnectedAccount[]> {
  const payload = await composioRequest(apiKey, {
    method: "GET",
    path: "/connectedaccounts",
    query: { entityId },
    errorCode: "COMPOSIO_ACCOUNTS_LIST_FAILED",
    errorMessage: "Failed to list connected accounts."
  });

  const items = unwrapItems(payload, "items", "data", "connectedAccounts") as Record<
    string,
    unknown
  >[];
  return items
    .map((item) => ({
      id: String(item.id ?? item.connectedAccountId ?? ""),
      appName: String(item.appName ?? item.appId ?? item.app ?? ""),
      status: String(item.status ?? "active"),
      entityId: String(item.entityId ?? entityId),
      createdAt: String(item.createdAt ?? item.created_at ?? ""),
      updatedAt: String(item.updatedAt ?? item.updated_at ?? "")
    }))
    .filter((a) => a.id.length > 0);
}

export async function composioInitiateConnection(
  apiKey: string,
  input: { appName: string; entityId: string; redirectUri?: string }
): Promise<ComposioConnectionInitResult> {
  const body: Record<string, unknown> = {
    appName: input.appName,
    entityId: input.entityId
  };
  if (input.redirectUri) body.redirectUri = input.redirectUri;

  const payload = (await composioRequest(apiKey, {
    method: "POST",
    path: "/connectedaccounts",
    body,
    errorCode: "COMPOSIO_CONNECT_FAILED",
    errorMessage: `Failed to initiate connection to ${input.appName}.`
  })) as Record<string, unknown>;

  return {
    redirectUrl: String(
      payload?.redirectUrl ?? payload?.connectionUrl ?? payload?.authUrl ?? ""
    ),
    connectedAccountId: String(payload?.connectedAccountId ?? payload?.id ?? "")
  };
}

export async function composioListActions(
  apiKey: string,
  options: { appNames?: string; useCase?: string; limit?: number } = {}
): Promise<ComposioAction[]> {
  const payload = await composioRequest(apiKey, {
    method: "GET",
    path: "/actions",
    query: {
      appNames: options.appNames,
      useCase: options.useCase,
      limit: options.limit ?? 50
    },
    errorCode: "COMPOSIO_ACTIONS_LIST_FAILED",
    errorMessage: "Failed to list Composio actions."
  });

  const items = unwrapItems(payload, "items", "actions", "data") as Record<string, unknown>[];
  return items
    .map((item) => ({
      name: String(item.name ?? item.actionId ?? ""),
      appName: String(item.appName ?? item.appId ?? item.app ?? ""),
      displayName: String(item.displayName ?? item.name ?? ""),
      description: item.description ? String(item.description) : null,
      parameters: (item.parameters ?? item.schema ?? item.inputSchema ?? {}) as Record<
        string,
        unknown
      >
    }))
    .filter((a) => a.name.length > 0);
}

export async function composioExecuteAction(
  apiKey: string,
  actionId: string,
  input: { entityId: string; params: Record<string, unknown> }
): Promise<ComposioExecuteResult> {
  const payload = (await composioRequest(apiKey, {
    method: "POST",
    path: `/actions/${encodeURIComponent(actionId)}/execute`,
    body: { entityId: input.entityId, input: input.params },
    errorCode: "COMPOSIO_EXECUTE_FAILED",
    errorMessage: `Failed to execute Composio action ${actionId}.`
  })) as Record<string, unknown>;

  const successful =
    payload?.successfull !== false &&
    payload?.successful !== false &&
    payload?.success !== false;

  return {
    successful,
    data: (payload?.data ?? payload?.result ?? payload?.response ?? null) as Record<
      string,
      unknown
    > | null,
    error: payload?.error ? String(payload.error) : null
  };
}

export async function composioDeleteConnectedAccount(
  apiKey: string,
  connectedAccountId: string
): Promise<void> {
  await composioRequest(apiKey, {
    method: "DELETE",
    path: `/connectedaccounts/${encodeURIComponent(connectedAccountId)}`,
    errorCode: "COMPOSIO_DELETE_ACCOUNT_FAILED",
    errorMessage: "Failed to remove connected account."
  });
}
