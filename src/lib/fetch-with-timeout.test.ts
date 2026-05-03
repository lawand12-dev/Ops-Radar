import { describe, expect, it } from "bun:test";
import { AppError } from "./errors";
import { fetchWithTimeout } from "./fetch-with-timeout";

describe("fetchWithTimeout", () => {
  it("throws AI_REQUEST_TIMEOUT when request exceeds timeout", async () => {
    const stalledFetch: typeof fetch = ((_: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    }) as typeof fetch;

    const promise = fetchWithTimeout({
      url: "https://example.com/hang",
      timeoutMs: 20,
      errorCode: "AI_REQUEST_TIMEOUT",
      requestName: "ai-test",
      fetchImpl: stalledFetch
    });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      code: "AI_REQUEST_TIMEOUT",
      statusCode: 504
    });
  });
});
