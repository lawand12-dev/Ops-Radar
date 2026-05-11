import type { Context, Next } from "hono";
import { AppError } from "../../lib/errors";
import { decryptSecret, verifyJwt, type JwtPayload } from "../../lib/crypto";
import {
  getRequestContext,
  runWithRequestContext,
  type RequestContext
} from "../../lib/request-context";
import { getUserById } from "./user-repository";

export const AUTH_CONTEXT_KEY = "auth";

export interface AuthContextValue {
  userId: string;
  email: string;
  claims: JwtPayload;
}

/**
 * Verifies the bearer token, loads the user, decrypts their per-account
 * credentials, and runs the rest of the request inside an AsyncLocalStorage
 * scope so deep call chains (n8n-client, ai-service) can resolve the user's
 * keys without changes to their signatures.
 *
 * Throws 401 on every auth failure — never leaks the underlying reason
 * (invalid signature vs expired vs user deleted) so the response can't be used
 * for token-state enumeration.
 */
export async function requireAuth(c: Context, next: Next): Promise<void | Response> {
  const header = c.req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
  }
  const token = header.slice("bearer ".length).trim();
  if (!token) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  const claims = verifyJwt(token);
  if (!claims) {
    throw new AppError(401, "UNAUTHENTICATED", "Invalid or expired token.");
  }

  // Load the user fresh on every request so credential rotations + account
  // deletions take effect on the next call instead of waiting for token expiry.
  const user = await getUserById(claims.sub);
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Invalid or expired token.");
  }

  const auth: AuthContextValue = {
    userId: user.id,
    email: user.email,
    claims
  };
  c.set(AUTH_CONTEXT_KEY, auth);

  // Decryption errors here would mean SECRETS_ENCRYPTION_KEY was rotated since
  // the credential was stored. Treat that as "credential not configured" and
  // let downstream code fall back to env (or surface a better error).
  const requestCtx: RequestContext = {
    userId: user.id,
    email: user.email,
    n8nBaseUrl: user.n8n_base_url,
    n8nApiKey: decryptSecret(user.n8n_api_key_encrypted),
    anthropicApiKey: decryptSecret(user.anthropic_api_key_encrypted),
    canUseRagAgent: user.can_use_rag_agent,
    isAdmin: user.is_admin
  };

  // Hono awaits whatever requireAuth returns, so wrapping next() inside
  // runWithRequestContext propagates the ALS scope to every downstream handler.
  return runWithRequestContext(requestCtx, async () => {
    await next();
  });
}

export function getAuth(c: Context): AuthContextValue {
  const value = c.get(AUTH_CONTEXT_KEY) as AuthContextValue | undefined;
  if (!value) {
    // This indicates a routing mistake — `requireAuth` wasn't applied to the route.
    throw new AppError(500, "AUTH_NOT_APPLIED", "Auth context missing on protected route.");
  }
  return value;
}

/**
 * Composite middleware: requires a valid bearer token AND that the resolved
 * user has is_admin = 1. Apply to every /admin/* route. Returns 403 on the
 * authz failure (separate from 401 for the authn failure) so a watchful
 * frontend can distinguish "log in" from "you're logged in but not admin".
 */
export async function requireAdmin(c: Context, next: Next): Promise<void | Response> {
  return requireAuth(c, async () => {
    const ctx = getRequestContext();
    if (!ctx?.isAdmin) {
      throw new AppError(403, "ADMIN_REQUIRED", "Admin privileges required.");
    }
    await next();
  });
}
