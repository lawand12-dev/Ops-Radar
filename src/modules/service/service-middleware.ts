import type { Context, Next } from "hono";
import { timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";

const HEADER_NAME = "x-service-api-key";

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Gate for /service/* — verifies a static service API key sent as
 * `X-Service-API-Key: <key>` or `Authorization: Bearer <key>`. Compared with
 * `timingSafeEqual` so we can't be probed for key length / prefix.
 *
 * Returns 401 SERVICE_AUTH_NOT_CONFIGURED when the env var is unset so the
 * /service/* surface is effectively dormant on deployments that haven't
 * enabled service-to-service access. Returns 401 SERVICE_UNAUTHORIZED for
 * every other auth failure with a uniform message — never leaks whether the
 * key was missing vs incorrect.
 */
export async function requireServiceApiKey(c: Context, next: Next): Promise<void | Response> {
  const expected = env.CHATV2_SERVICE_API_KEY;
  if (!expected) {
    throw new AppError(
      401,
      "SERVICE_AUTH_NOT_CONFIGURED",
      "Service API key not configured."
    );
  }

  const headerKey = c.req.header(HEADER_NAME)?.trim();
  const authHeader = c.req.header("authorization");
  const bearerKey = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("bearer ".length).trim()
    : null;

  const provided = headerKey || bearerKey;
  if (!provided) {
    throw new AppError(401, "SERVICE_UNAUTHORIZED", "Missing service API key.");
  }

  if (!constantTimeEqual(provided, expected)) {
    throw new AppError(401, "SERVICE_UNAUTHORIZED", "Invalid service API key.");
  }

  await next();
}
