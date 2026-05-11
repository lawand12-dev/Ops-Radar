import { AppError } from "../../lib/errors";
import {
  encryptSecret,
  hashPassword,
  signJwt,
  verifyPassword,
  type JwtPayload
} from "../../lib/crypto";
import {
  createUser,
  getUserByEmail,
  getUserById,
  toUserPublic,
  updateUserCredentials,
  type UserPublic,
  type UserRecord
} from "./user-repository";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "BAD_REQUEST", "email is required.");
  }
  const trimmed = value.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    throw new AppError(400, "INVALID_EMAIL", "email is not a valid address.");
  }
  return trimmed;
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "BAD_REQUEST", "name is required.");
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new AppError(400, "INVALID_NAME", "name must be 2-120 characters.");
  }
  return trimmed;
}

function validatePassword(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(400, "BAD_REQUEST", "password is required.");
  }
  if (value.length < 8 || value.length > 256) {
    throw new AppError(400, "INVALID_PASSWORD", "password must be 8-256 characters.");
  }
  return value;
}

export async function registerUser(input: {
  email: unknown;
  name: unknown;
  password: unknown;
}): Promise<{ user: UserPublic; token: string }> {
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const password = validatePassword(input.password);

  const existing = await getUserByEmail(email);
  if (existing) {
    // Don't disclose whether email exists vs other validation issue in the
    // public message — but the code is specific enough for clients to handle.
    throw new AppError(409, "EMAIL_TAKEN", "An account with that email already exists.");
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, name, passwordHash });
  const token = signJwt({ sub: user.id, email: user.email });
  return { user: toUserPublic(user), token };
}

export async function loginUser(input: {
  email: unknown;
  password: unknown;
}): Promise<{ user: UserPublic; token: string }> {
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);

  const user = await getUserByEmail(email);
  // Generic error so the response can't be used to enumerate registered emails.
  const invalid = new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  if (!user) {
    // Run a dummy verify to keep response time roughly constant whether the
    // email exists or not (defence against timing-based enumeration).
    await verifyPassword(password, "scrypt$N=16384,r=8,p=1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    throw invalid;
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    throw invalid;
  }

  const token = signJwt({ sub: user.id, email: user.email });
  return { user: toUserPublic(user), token };
}

export async function getCurrentUser(claims: JwtPayload): Promise<UserPublic> {
  const user = await getUserById(claims.sub);
  if (!user) {
    throw new AppError(401, "USER_NOT_FOUND", "Account no longer exists.");
  }
  return toUserPublic(user);
}

/**
 * Updates the user's stored external-service credentials. All three fields are
 * independently optional. Passing `null` clears a credential; passing a string
 * sets/replaces it.
 */
export async function updateMyCredentials(
  userId: string,
  input: {
    n8n_base_url?: string | null;
    n8n_api_key?: string | null;
    anthropic_api_key?: string | null;
  }
): Promise<UserPublic> {
  const patch: {
    n8nBaseUrl?: string | null;
    n8nApiKeyEncrypted?: string | null;
    anthropicApiKeyEncrypted?: string | null;
  } = {};

  if (input.n8n_base_url !== undefined) {
    if (input.n8n_base_url === null) {
      patch.n8nBaseUrl = null;
    } else {
      const v = String(input.n8n_base_url).trim();
      if (!v) {
        patch.n8nBaseUrl = null;
      } else {
        try {
          // Reject malformed URLs early instead of letting them break n8n calls later.
          new URL(v);
        } catch {
          throw new AppError(400, "INVALID_N8N_BASE_URL", "n8n_base_url must be a valid URL.");
        }
        patch.n8nBaseUrl = v;
      }
    }
  }
  // Normalize an incoming credential field to either `null` (clear it) or a
  // non-empty trimmed string (encrypt + store it). Anything else — empty
  // string, whitespace-only, etc. — must be treated as "clear", otherwise we
  // would store an encrypted blob of whitespace and `has_*_api_key` would
  // falsely report `true` while every downstream API call fails on the
  // useless key.
  const normalizeKey = (value: string | null | undefined): string | null => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  if (input.n8n_api_key !== undefined) {
    const v = normalizeKey(input.n8n_api_key);
    patch.n8nApiKeyEncrypted = v === null ? null : encryptSecret(v);
  }
  if (input.anthropic_api_key !== undefined) {
    const v = normalizeKey(input.anthropic_api_key);
    patch.anthropicApiKeyEncrypted = v === null ? null : encryptSecret(v);
  }

  const updated = await updateUserCredentials(userId, patch);
  return toUserPublic(updated);
}

export type { UserPublic, UserRecord };
