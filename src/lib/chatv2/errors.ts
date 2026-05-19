/**
 * Unified error for all chatv2 calls. Thrown by `chatV2Fetch` on any failure.
 * Status 0 = network/timeout (no HTTP response received).
 */
export class ChatV2Error extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ChatV2Error';
  }

  /** True for transient errors where stale cache or "unavailable" UX is appropriate. */
  isUnavailable(): boolean {
    return this.status === 0 || this.status >= 500;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }
}
