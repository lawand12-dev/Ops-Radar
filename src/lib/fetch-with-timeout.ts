import { AppError } from "./errors";

export interface FetchWithTimeoutInput {
  url: string;
  init?: RequestInit;
  timeoutMs: number;
  requestName?: string;
  errorCode?: string;
  timeoutStatusCode?: number;
  fetchImpl?: typeof fetch;
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { name?: string; code?: string };
  return maybeError.name === "AbortError" || maybeError.code === "ABORT_ERR";
}

export async function fetchWithTimeout(input: FetchWithTimeoutInput): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = Math.max(1, Number(input.timeoutMs || 0));
  const fetchImpl = input.fetchImpl ?? fetch;
  const requestName = input.requestName ?? "request";
  const errorCode = input.errorCode ?? "REQUEST_TIMEOUT";
  const timeoutStatusCode = input.timeoutStatusCode ?? 504;

  let timeoutTriggered = false;
  const timer = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort(`Timed out after ${timeoutMs}ms`);
  }, timeoutMs);

  const baseInit = input.init ?? {};
  const upstreamSignal = baseInit.signal ?? null;
  const upstreamAbort = () => {
    controller.abort("Aborted by upstream signal");
  };
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort("Aborted by upstream signal");
    } else {
      upstreamSignal.addEventListener("abort", upstreamAbort, { once: true });
    }
  }

  try {
    return await fetchImpl(input.url, {
      ...baseInit,
      signal: controller.signal
    });
  } catch (error) {
    if (timeoutTriggered && isAbortError(error)) {
      throw new AppError(timeoutStatusCode, errorCode, `${requestName} timed out.`, {
        request_name: requestName,
        timeout_ms: timeoutMs
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (upstreamSignal) {
      upstreamSignal.removeEventListener("abort", upstreamAbort);
    }
  }
}

