import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request user context propagated via AsyncLocalStorage so deep call chains
 * (chat → ai-service, project-service → n8n-client, etc.) can read the caller's
 * identity and decrypted external credentials without threading parameters
 * through every signature.
 *
 * Background tasks (monitoring scheduler, event ingest) do NOT enter this scope,
 * so consumers must always handle `getRequestContext() === undefined` and fall
 * back to env-level configuration where appropriate.
 */
export interface RequestContext {
  userId: string;
  email: string;
  /** User's per-account n8n base URL (already validated/normalized). null = use env fallback. */
  n8nBaseUrl: string | null;
  /** User's decrypted n8n API key. null = use env fallback. */
  n8nApiKey: string | null;
  /** User's decrypted Anthropic API key. null = use env fallback. */
  anthropicApiKey: string | null;
  /** Operator-granted: when true the AI service routes this user's workflow
   *  generation through the platform RAG agent (env.RAG_AGENT_*) and skips
   *  the local system prompt + knowledge-base block. */
  canUseRagAgent: boolean;
  /** Admin flag — re-read from the DB row on every request (we never trust
   *  a JWT claim for authorization, only for identification). Required by
   *  every /admin/* endpoint. */
  isAdmin: boolean;
}

const als = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

/**
 * Convenience: returns the current user id, or throws if there is no user
 * context. Use only on code paths that are *always* invoked from authenticated
 * routes (e.g. project creation). Read paths that may run unauthenticated
 * should call `getRequestContext()` directly and branch on undefined.
 */
export function requireUserId(): string {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error(
      "requireUserId() called outside of an authenticated request context"
    );
  }
  return ctx.userId;
}

export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => Promise<T> | T
): Promise<T> | T {
  return als.run(ctx, fn);
}
