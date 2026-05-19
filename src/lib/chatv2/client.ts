// Server-side HTTP client for chatv2.
// All call sites must originate from a Next.js API route (Node runtime).
// Never imported by client components — the service key would leak to the browser.

import { ChatV2Error } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT = 'OpsRadar-Next/1.0 (+server)';

export type ChatV2FetchOpts = {
  /** If set, path is rewritten to `/service/projects/:projectId{path}`. */
  projectId?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
  /** Optional abort signal merged with the timeout. */
  signal?: AbortSignal;
};

type ChatV2Config = {
  apiUrl: string;
  serviceKey: string;
};

function loadConfig(): ChatV2Config {
  const apiUrl = process.env.CHATV2_API_URL;
  const serviceKey = process.env.CHATV2_SERVICE_API_KEY;
  if (!apiUrl || !serviceKey) {
    throw new ChatV2Error(
      500,
      'NOT_CONFIGURED',
      'CHATV2_API_URL or CHATV2_SERVICE_API_KEY is not set',
    );
  }
  return { apiUrl: apiUrl.replace(/\/+$/, ''), serviceKey };
}

function buildUrl(base: string, path: string, projectId: string | undefined): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (projectId) {
    return `${base}/service/projects/${encodeURIComponent(projectId)}${cleanPath}`;
  }
  return `${base}${cleanPath}`;
}

/**
 * Makes an authenticated request to chatv2.
 * - Returns parsed JSON on 2xx.
 * - Throws ChatV2Error on any failure (network, timeout, non-2xx).
 * - Returns undefined for 204 No Content.
 */
export async function chatV2Fetch<T = unknown>(
  path: string,
  opts: ChatV2FetchOpts = {},
): Promise<T> {
  const { apiUrl, serviceKey } = loadConfig();
  const {
    projectId,
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
  } = opts;

  const url = buildUrl(apiUrl, path, projectId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = externalSignal
    ? anySignal([externalSignal, controller.signal])
    : controller.signal;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ChatV2Error(0, 'TIMEOUT', `chatv2 timed out after ${timeoutMs}ms`, err);
    }
    throw new ChatV2Error(
      0,
      'NETWORK',
      err instanceof Error ? err.message : 'network error',
      err,
    );
  }
  clearTimeout(timer);

  if (response.status === 204) return undefined as unknown as T;

  if (!response.ok) {
    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch {
      // fall through with empty body
    }
    let parsed: { code?: string; message?: string } = {};
    try {
      parsed = bodyText ? (JSON.parse(bodyText) as { code?: string; message?: string }) : {};
    } catch {
      // non-JSON error body — keep raw text
    }
    throw new ChatV2Error(
      response.status,
      parsed.code ?? `HTTP_${response.status}`,
      parsed.message ?? bodyText.slice(0, 200) ?? `chatv2 returned ${response.status}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    throw new ChatV2Error(
      response.status,
      'BAD_JSON',
      'chatv2 returned non-JSON success body',
      err,
    );
  }
}

/** Merges multiple AbortSignals into one. Aborts when any source aborts. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort();
      break;
    }
    sig.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}
